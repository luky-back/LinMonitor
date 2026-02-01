import os
import sys
import subprocess
import time

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def install_dependencies():
    print("Installing Server dependencies (flask, flask-cors, requests, psutil)...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "flask-cors", "requests", "psutil"])
        print("✓ Dependencies installed.")
    except Exception as e:
        print(f"X Error installing dependencies: {e}")
        sys.exit(1)

def generate_server_script(port):
    # Using double braces {{ }} to escape them in f-string
    code = f"""
import time, os, json, threading, requests, zipfile, io, shutil, sys, uuid, socket, psutil, platform, subprocess, signal
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

PORT = {port}
MAX_HISTORY = 50
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app, resources={{r"/*": {{"origins": "*"}}}})

devices_store = {{}}
pending_updates = {{}}
pending_commands = {{}} # Key: DeviceID, Value: 'reboot' | 'shutdown'

# Cache for update checking
update_cache = {{
    "last_check": 0,
    "status": "up-to-date",
    "remote_hash": None,
    "changed_files": [],
    "error": None
}}

def ensure_data_dir():
    if not os.path.exists(DATA_DIR): os.makedirs(DATA_DIR)

def load_json(filepath, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f: return json.load(f)
        except: return default
    return default

def save_json(filepath, data):
    ensure_data_dir()
    with open(filepath, 'w') as f: json.dump(data, f, indent=2)

server_settings = load_json(SETTINGS_FILE, {{ "repoUrl": "", "localHash": "init" }})

# --- UPDATER SYSTEM ---
def create_updater_scripts():
    # Script B: The Worker (Executes setup -> npm build -> start server)
    script_b = \"\"\"
import os
import sys
import time
import shutil
import subprocess
import signal

PID = int(sys.argv[1])
UPDATE_DIR = sys.argv[2]
TARGET_DIR = sys.argv[3]
PYTHON_EXEC = sys.argv[4]

print(f"[B] Killing Server PID {{PID}}...")
try:
    if os.name == 'nt':
        subprocess.call(['taskkill', '/F', '/PID', str(PID)])
    else:
        os.kill(PID, signal.SIGKILL)
except: pass

print(f"[B] Waiting for PID {{PID}}...")
time.sleep(2)

print("[B] Copying files...")
for item in os.listdir(UPDATE_DIR):
    s = os.path.join(UPDATE_DIR, item)
    d = os.path.join(TARGET_DIR, item)
    try:
        if os.path.isdir(s):
            if os.path.exists(d): shutil.rmtree(d)
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
    except Exception as e:
        print(f"Copy Error {{item}}: {{e}}")

print("[B] Cleanup temp...")
try: shutil.rmtree(UPDATE_DIR)
except: pass

# --- NEW BUILD FLOW ---
# 1. Exec setup_server.py
print("[B] Running setup_server.py...")
subprocess.call([PYTHON_EXEC, "setup_server.py"])

# 2. npm run build
print("[B] Running npm build...")
npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
try:
    subprocess.call([npm_cmd, "install"], cwd=TARGET_DIR) # Ensure deps
    subprocess.call([npm_cmd, "run", "build"], cwd=TARGET_DIR)
except Exception as e:
    print(f"[B] Build failed: {{e}}")

# 3. Start Server
print(f"[B] Starting Server...")
subprocess.Popen([PYTHON_EXEC, "pimonitor_server.py"])
\"\"\"
    with open("update_script_B.py", "w", encoding="utf-8") as f:
        f.write(script_b)

    # Script A: The Launcher (Downloads & Unzips)
    script_a = \"\"\"
import os, sys, subprocess, zipfile, requests, io, shutil
URL, TOKEN, SERVER_PID = sys.argv[1], sys.argv[2], sys.argv[3]
TARGET_DIR = os.getcwd()
UPDATE_DIR = os.path.join(TARGET_DIR, "temp_update")

try:
    download_url = URL
    if "github.com" in URL and not URL.endswith(".zip"):
        download_url = URL.rstrip('/') + "/archive/refs/heads/main.zip"
    
    headers = {{}}
    if TOKEN: headers['Authorization'] = f"token {{TOKEN}}"

    print(f"Downloading {{download_url}}...")
    r = requests.get(download_url, headers=headers)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    
    if os.path.exists(UPDATE_DIR): shutil.rmtree(UPDATE_DIR)
    os.makedirs(UPDATE_DIR)
    z.extractall(UPDATE_DIR)
    
    # Flatten
    extracted = os.listdir(UPDATE_DIR)
    if len(extracted) == 1 and os.path.isdir(os.path.join(UPDATE_DIR, extracted[0])):
        root = os.path.join(UPDATE_DIR, extracted[0])
        for item in os.listdir(root):
            shutil.move(os.path.join(root, item), UPDATE_DIR)
        os.rmdir(root)
        
    cmd = [sys.executable, "update_script_B.py", SERVER_PID, UPDATE_DIR, TARGET_DIR, sys.executable]
    
    if os.name == 'nt': subprocess.Popen(cmd, creationflags=subprocess.CREATE_NEW_CONSOLE)
    else: subprocess.Popen(cmd, start_new_session=True)
        
except Exception as e:
    print(f"Update Prep Error: {{e}}")
\"\"\"
    with open("update_script_A.py", "w", encoding="utf-8") as f:
        f.write(script_a)

def monitor_local_system():
    device_id = 'server-local'
    while True:
        try:
            cpu_pct = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            net1 = psutil.net_io_counters()
            time.sleep(1)
            net2 = psutil.net_io_counters()
            net_in = (net2.bytes_recv - net1.bytes_recv) / 1024
            net_out = (net2.bytes_sent - net1.bytes_sent) / 1024
            
            # Local PM2 Check
            pm2_procs = []
            try:
                if os.name == 'nt': res = subprocess.check_output(['pm2', 'jlist'], shell=True)
                else: res = subprocess.check_output(['pm2', 'jlist'])
                for p in json.loads(res):
                    pm2_procs.append({{
                        "pid": p.get("pid"), "name": p.get("name"), "pm_id": p.get("pm_id"),
                        "status": p.get('pm2_env', {{}}).get('status', 'stopped'),
                        "cpu": p.get('monit', {{}}).get('cpu', 0),
                        "memory": round(p.get('monit', {{}}).get('memory', 0)/1024/1024, 1),
                        "uptime": "0s", "restarts": p.get('pm2_env', {{}}).get('restart_time', 0)
                    }})
            except: pass

            stats = {{
                "cpuUsage": cpu_pct, "memoryUsage": mem.percent,
                "memoryUsed": round((mem.total - mem.available) / (1024**3), 2),
                "memoryTotal": round(mem.total / (1024**3), 2),
                "temperature": 0, "networkIn": round(net_in, 1), "networkOut": round(net_out, 1),
                "diskUsage": psutil.disk_usage('/').percent
            }}
            
            hw = {{
                "cpu": {{ "model": platform.processor(), "cores": psutil.cpu_count(), "architecture": platform.machine() }},
                "memory": {{ "total": f"{{round(mem.total / (1024**3), 1)}} GB" }},
                "storage": []
            }}

            now_str = datetime.now().strftime('%H:%M:%S')
            if device_id not in devices_store:
                devices_store[device_id] = {{
                    'id': device_id, 'name': 'Local Server', 'ip': '127.0.0.1', 'os': platform.system(),
                    'status': 'online', 'lastSeen': time.time(), 'stats': stats, 'processes': pm2_procs, 'hardware': hw,
                    'history': {{ 'cpu': [], 'memory': [], 'network': [] }}
                }}
            else:
                dev = devices_store[device_id]
                dev['status'] = 'online'; dev['lastSeen'] = time.time(); dev['stats'] = stats; dev['processes'] = pm2_procs
                dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
                if len(dev['history']['cpu']) > MAX_HISTORY: dev['history']['cpu'] = dev['history']['cpu'][-MAX_HISTORY:]

        except Exception as e: print(f"Monitor error: {{e}}"); time.sleep(1)

@app.route('/api/auth/check', methods=['GET'])
def check_setup():
    users = load_json(USERS_FILE, [])
    return jsonify({{'setupRequired': len(users) == 0}})

@app.route('/api/auth/setup', methods=['POST'])
def setup_owner():
    users = load_json(USERS_FILE, [])
    if len(users) > 0: return jsonify({{'error': 'Setup already completed'}}), 400
    data = request.json
    new_user = {{ 'id': str(uuid.uuid4()), 'username': data['username'], 'password': data['password'], 'role': 'Owner', 'joinedAt': datetime.now().isoformat() }}
    users.append(new_user)
    save_json(USERS_FILE, users)
    return jsonify(new_user)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    users = load_json(USERS_FILE, [])
    user = next((u for u in users if u['username'] == data.get('username') and u['password'] == data.get('password')), None)
    if user: return jsonify(user)
    return jsonify({{'error': 'Invalid credentials'}}), 401

@app.route('/api/devices', methods=['GET'])
def get_devices():
    results = []
    now = time.time()
    for d_id, dev in devices_store.items():
        if now - dev['lastSeen'] > 15: dev['status'] = 'offline'
        results.append(dev)
    return jsonify(results)

@app.route('/api/devices/power', methods=['POST'])
def device_power_action():
    data = request.json
    device_id = data.get('deviceId')
    action = data.get('action') # 'reboot' or 'shutdown'
    
    if not device_id or action not in ['reboot', 'shutdown']:
        return jsonify({{'error': 'Invalid parameters'}}), 400
        
    # Queue command
    pending_commands[device_id] = action
    print(f"Queued {{action}} for device {{device_id}}")
    return jsonify({{'status': 'queued'}})

@app.route('/api/telemetry', methods=['GET', 'POST'])
def receive_telemetry():
    if request.method == 'GET':
        return jsonify({{'status': 'active', 'message': 'Endpoint ready.'}})
    
    try:
        data = request.json
        d_id = data.get('id')
        
        response = {{'status': 'success'}}

        # Check for Pending Power Commands
        if d_id in pending_commands:
            response['command'] = pending_commands[d_id]
            print(f"[Telemetry] Sending {{pending_commands[d_id]}} to {{d_id}}")
            del pending_commands[d_id]
        
        # Check for Pending Updates
        if d_id in pending_updates:
            response['command'] = 'update'
            response['repoUrl'] = pending_updates[d_id]['url']
            response['token'] = pending_updates[d_id]['token']
            del pending_updates[d_id]

        if d_id not in devices_store:
            devices_store[d_id] = {{ 'id': d_id, 'name': data.get('name', d_id), 'ip': request.remote_addr, 'os': data.get('os', 'Unknown'), 'status': 'online', 'lastSeen': time.time(), 'stats': data.get('stats', {{}}), 'processes': data.get('processes', []), 'hardware': data.get('hardware', {{}}), 'history': {{ 'cpu': [], 'memory': [], 'network': [] }} }}
        else:
            dev = devices_store[d_id]
            dev['status'] = 'online'; dev['lastSeen'] = time.time(); dev['stats'] = data.get('stats'); dev['processes'] = data.get('processes')
            
            now_str = datetime.now().strftime('%H:%M:%S')
            stats = data.get('stats', {{}})
            dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
            if len(dev['history']['cpu']) > MAX_HISTORY: 
                dev['history']['cpu'] = dev['history']['cpu'][-MAX_HISTORY:]
                dev['history']['memory'] = dev['history']['memory'][-MAX_HISTORY:]

        return jsonify(response)
    except Exception as e:
        return jsonify({{'error': str(e)}}), 500

@app.route('/api/update/check', methods=['GET'])
def check_update():
    global update_cache
    repo_url = server_settings.get('repoUrl', '')
    local_hash = server_settings.get('localHash', 'init')
    github_token = server_settings.get('githubToken', '')
    
    force = request.args.get('force') == 'true'
    now = time.time()
    
    if force or (now - update_cache['last_check'] > 60):
        update_cache['last_check'] = now
        update_cache['error'] = None
        try:
            if repo_url and "github.com" in repo_url:
                 parts = repo_url.rstrip('/').split('/')
                 if len(parts) >= 2:
                    owner, repo = parts[-2], parts[-1]
                    if repo.endswith('.git'): repo = repo[:-4]
                    
                    api_url = f"https://api.github.com/repos/{{owner}}/{{repo}}/commits/main"
                    headers = {{}}
                    if github_token: headers['Authorization'] = f"token {{github_token}}"
                    
                    r = requests.get(api_url, headers=headers, timeout=5)
                    
                    if r.status_code == 200:
                        data = r.json()
                        remote_hash = data.get('sha')
                        update_cache['remote_hash'] = remote_hash
                        
                        if remote_hash and remote_hash != local_hash:
                            update_cache['status'] = "update-available"
                            r_commit = requests.get(data.get('url'), headers=headers, timeout=5)
                            if r_commit.status_code == 200:
                                files = r_commit.json().get('files', [])
                                update_cache['changed_files'] = [f['filename'] for f in files]
                            else:
                                update_cache['changed_files'] = []
                        else:
                            update_cache['status'] = "up-to-date"
                            update_cache['changed_files'] = []
                    else:
                         update_cache['error'] = f"GitHub Error {{r.status_code}}"
            else:
                update_cache['status'] = "up-to-date"
        except Exception as e:
            update_cache['error'] = str(e)
            
    return jsonify({{
        "status": update_cache['status'],
        "localHash": local_hash,
        "remoteHash": update_cache['remote_hash'],
        "error": update_cache['error'],
        "changedFiles": update_cache['changed_files']
    }})

@app.route('/api/update/execute', methods=['POST'])
def execute_update():
    repo_url = server_settings.get('repoUrl')
    token = server_settings.get('githubToken', '')
    if not repo_url: return jsonify({{"error": "No repo URL"}}), 400
    create_updater_scripts()
    
    def trigger():
        time.sleep(1)
        # Update local hash before killing server to prevent re-update loop
        try:
             # Basic fetch to get new hash
             parts = repo_url.rstrip('/').split('/')
             owner, repo = parts[-2], parts[-1]
             if repo.endswith('.git'): repo = repo[:-4]
             r = requests.get(f"https://api.github.com/repos/{{owner}}/{{repo}}/commits/main", headers={{'Authorization': f'token {{token}}'}} if token else {{}})
             if r.status_code == 200:
                 server_settings['localHash'] = r.json().get('sha')
                 save_json(SETTINGS_FILE, server_settings)
        except: pass
        
        subprocess.Popen([sys.executable, "update_script_A.py", repo_url, token, str(os.getpid())])
    
    threading.Thread(target=trigger).start()
    return jsonify({{"status": "Update started"}})

@app.route('/api/system/power', methods=['POST'])
def power_ops():
    data = request.json
    action = data.get('action')
    # Server power ops not fully implemented in this safe version
    return jsonify({{'status': 'Simulated Server Power Action'}})

@app.route('/')
def serve_index():
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')): return send_from_directory(DIST_DIR, 'index.html')
    return "PiMonitor Server Running. Please build the React frontend.", 200

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(DIST_DIR, path)): return send_from_directory(DIST_DIR, path)
    return serve_index()

def get_all_ips():
    ips = ['127.0.0.1']
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ips.append(s.getsockname()[0])
        s.close()
    except: pass
    return ips

if __name__ == '__main__':
    ensure_data_dir()
    ips = get_all_ips()
    print(f"------------------------------------------------")
    print(f"PiMonitor Server running on port {{PORT}}")
    print(f"Addresses:")
    for ip in ips: print(f"  http://{{ip}}:{{PORT}}")
    print(f"------------------------------------------------")
    threading.Thread(target=monitor_local_system, daemon=True).start()
    app.run(host='0.0.0.0', port=PORT)
"""
    filename = "pimonitor_server.py"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(code)
    return filename

def main():
    clear_screen()
    print("Generating Server Script...")
    generate_server_script(3000)
    print("Done: pimonitor_server.py")

if __name__ == "__main__":
    main()
