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
pending_commands = {{}}

update_cache = {{
    "last_check": 0, "status": "up-to-date", "remote_hash": None, "changed_files": [], "error": None
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
    script_b = \"\"\"
import os, sys, time, shutil, subprocess, signal

PID = int(sys.argv[1])
UPDATE_DIR = sys.argv[2]
TARGET_DIR = sys.argv[3]
PYTHON_EXEC = sys.argv[4]

print(f"[B] Killing PID {{PID}}...")
try:
    if os.name == 'nt': subprocess.call(['taskkill', '/F', '/PID', str(PID)])
    else: os.kill(PID, signal.SIGKILL)
except: pass

time.sleep(2)
print("[B] Copying...")
for item in os.listdir(UPDATE_DIR):
    s, d = os.path.join(UPDATE_DIR, item), os.path.join(TARGET_DIR, item)
    try:
        if os.path.isdir(s):
            if os.path.exists(d): shutil.rmtree(d)
            shutil.copytree(s, d)
        else: shutil.copy2(s, d)
    except: pass

try: shutil.rmtree(UPDATE_DIR)
except: pass

print("[B] Running setup...")
subprocess.call([PYTHON_EXEC, "setup_server.py"])

print("[B] Building...")
npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
try:
    subprocess.call([npm_cmd, "install"], cwd=TARGET_DIR)
    subprocess.call([npm_cmd, "run", "build"], cwd=TARGET_DIR)
except: pass

print("[B] Starting...")
subprocess.Popen([PYTHON_EXEC, "pimonitor_server.py"])
\"\"\"
    with open("update_script_B.py", "w", encoding="utf-8") as f: f.write(script_b)

    script_a = \"\"\"
import os, sys, subprocess, zipfile, requests, io, shutil
URL, TOKEN, SERVER_PID = sys.argv[1], sys.argv[2], sys.argv[3]
TARGET_DIR = os.getcwd()
UPDATE_DIR = os.path.join(TARGET_DIR, "temp_update")

try:
    dl_url = URL
    if "github.com" in URL and not URL.endswith(".zip"): dl_url = URL.rstrip('/') + "/archive/refs/heads/main.zip"
    headers = {{}}
    if TOKEN: headers['Authorization'] = f"token {{TOKEN}}"
    r = requests.get(dl_url, headers=headers)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    if os.path.exists(UPDATE_DIR): shutil.rmtree(UPDATE_DIR)
    os.makedirs(UPDATE_DIR)
    z.extractall(UPDATE_DIR)
    
    extracted = os.listdir(UPDATE_DIR)
    if len(extracted) == 1 and os.path.isdir(os.path.join(UPDATE_DIR, extracted[0])):
        root = os.path.join(UPDATE_DIR, extracted[0])
        for item in os.listdir(root): shutil.move(os.path.join(root, item), UPDATE_DIR)
        os.rmdir(root)
        
    cmd = [sys.executable, "update_script_B.py", SERVER_PID, UPDATE_DIR, TARGET_DIR, sys.executable]
    if os.name == 'nt': subprocess.Popen(cmd, creationflags=subprocess.CREATE_NEW_CONSOLE)
    else: subprocess.Popen(cmd, start_new_session=True)
except Exception as e: print(e)
\"\"\"
    with open("update_script_A.py", "w", encoding="utf-8") as f: f.write(script_a)

def monitor_local_system():
    device_id = 'server-local'
    while True:
        try:
            cpu_pct = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            net1 = psutil.net_io_counters()
            time.sleep(1)
            net2 = psutil.net_io_counters()
            
            # PM2
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
                "temperature": 0, "networkIn": round((net2.bytes_recv - net1.bytes_recv)/1024, 1), "networkOut": round((net2.bytes_sent - net1.bytes_sent)/1024, 1),
                "diskUsage": psutil.disk_usage('/').percent
            }}
            
            # FULL HARDWARE INFO FOR FRONTEND STABILITY
            hw = {{
                "cpu": {{ 
                    "model": platform.processor() or "Unknown", 
                    "cores": psutil.cpu_count() or 1, 
                    "threads": psutil.cpu_count(logical=True) or 1,
                    "baseSpeed": "N/A",
                    "architecture": platform.machine() 
                }},
                "memory": {{ 
                    "total": f"{{round(mem.total / (1024**3), 1)}} GB",
                    "type": "RAM",
                    "speed": "N/A",
                    "formFactor": "N/A" 
                }},
                "gpu": {{
                    "model": "N/A",
                    "vram": "N/A",
                    "driver": "N/A"
                }},
                "storage": []
            }}
            try:
                for part in psutil.disk_partitions(all=False):
                    try:
                         usage = psutil.disk_usage(part.mountpoint)
                         hw['storage'].append({{
                             "name": part.device,
                             "model": "Generic",
                             "size": f"{{round(usage.total / (1024**3), 1)}} GB",
                             "type": part.fstype,
                             "interface": part.mountpoint,
                             "usage": usage.percent
                         }})
                    except: pass
            except: pass

            now_str = datetime.now().strftime('%H:%M:%S')
            if device_id not in devices_store:
                devices_store[device_id] = {{
                    'id': device_id, 'name': 'Local Server', 'ip': '127.0.0.1', 'os': platform.system(),
                    'status': 'online', 'lastSeen': time.time(), 'stats': stats, 'processes': pm2_procs, 'hardware': hw,
                    'history': {{ 'cpu': [], 'memory': [], 'network': [] }}
                }}
            else:
                dev = devices_store[device_id]
                dev['status'] = 'online'; dev['lastSeen'] = time.time(); dev['stats'] = stats; dev['processes'] = pm2_procs; dev['hardware'] = hw
                dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
                dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
                dev['history']['network'].append({{ 'time': now_str, 'value': stats.get('networkIn', 0) }})
                if len(dev['history']['cpu']) > MAX_HISTORY: 
                    dev['history']['cpu'] = dev['history']['cpu'][-MAX_HISTORY:]
                    dev['history']['memory'] = dev['history']['memory'][-MAX_HISTORY:]
                    dev['history']['network'] = dev['history']['network'][-MAX_HISTORY:]

        except Exception as e: print(f"Monitor error: {{e}}"); time.sleep(1)

@app.route('/api/auth/check', methods=['GET'])
def check_setup():
    return jsonify({{'setupRequired': len(load_json(USERS_FILE, [])) == 0}})

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
    user = next((u for u in load_json(USERS_FILE, []) if u['username'] == data.get('username') and u['password'] == data.get('password')), None)
    if user: return jsonify(user)
    return jsonify({{'error': 'Invalid credentials'}}), 401

@app.route('/api/devices', methods=['GET'])
def get_devices():
    results = []
    now = time.time()
    for _, dev in devices_store.items():
        if now - dev['lastSeen'] > 15: dev['status'] = 'offline'
        results.append(dev)
    return jsonify(results)

@app.route('/api/devices/power', methods=['POST'])
def device_power_action():
    data = request.json
    d_id = data.get('deviceId')
    action = data.get('action')
    if d_id and action in ['reboot', 'shutdown']:
        pending_commands[d_id] = action
        return jsonify({{'status': 'queued'}})
    return jsonify({{'error': 'Invalid'}}), 400

@app.route('/api/telemetry', methods=['GET', 'POST'])
def receive_telemetry():
    if request.method == 'GET': return jsonify({{'status': 'active'}})
    try:
        data = request.json
        d_id = data.get('id')
        resp = {{'status': 'success'}}
        
        if d_id in pending_commands:
            resp['command'] = pending_commands[d_id]
            del pending_commands[d_id]
        
        if d_id in pending_updates:
            resp['command'] = 'update'
            resp['repoUrl'] = pending_updates[d_id]['url']
            resp['token'] = pending_updates[d_id]['token']
            del pending_updates[d_id]

        if d_id not in devices_store:
            devices_store[d_id] = {{ 'id': d_id, 'name': data.get('name', d_id), 'ip': request.remote_addr, 'os': data.get('os', 'Unknown'), 'status': 'online', 'lastSeen': time.time(), 'stats': data.get('stats', {{}}), 'processes': data.get('processes', []), 'hardware': data.get('hardware', {{}}), 'history': {{ 'cpu': [], 'memory': [], 'network': [] }} }}
        else:
            dev = devices_store[d_id]
            dev['status'] = 'online'; dev['lastSeen'] = time.time(); dev['stats'] = data.get('stats'); dev['processes'] = data.get('processes'); dev['hardware'] = data.get('hardware')
            now = datetime.now().strftime('%H:%M:%S')
            dev['history']['cpu'].append({{ 'time': now, 'value': data['stats'].get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now, 'value': data['stats'].get('memoryUsage', 0) }})
            if len(dev['history']['cpu']) > MAX_HISTORY:
                 dev['history']['cpu'] = dev['history']['cpu'][-MAX_HISTORY:]
                 dev['history']['memory'] = dev['history']['memory'][-MAX_HISTORY:]

        return jsonify(resp)
    except Exception as e: return jsonify({{'error': str(e)}}), 500

@app.route('/api/update/check', methods=['GET'])
def check_update():
    global update_cache
    force = request.args.get('force') == 'true'
    now = time.time()
    if force or (now - update_cache['last_check'] > 60):
        update_cache['last_check'] = now
        repo, token = server_settings.get('repoUrl', ''), server_settings.get('githubToken', '')
        if repo and "github.com" in repo:
            try:
                parts = repo.rstrip('/').split('/')
                api_url = f"https://api.github.com/repos/{{parts[-2]}}/{{parts[-1].replace('.git','')}}/commits/main"
                r = requests.get(api_url, headers={{'Authorization': f'token {{token}}'}} if token else {{}}, timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    update_cache['remote_hash'] = data.get('sha')
                    update_cache['status'] = 'update-available' if data.get('sha') != server_settings.get('localHash') else 'up-to-date'
                    if update_cache['status'] == 'update-available':
                        f_r = requests.get(data.get('url'), headers={{'Authorization': f'token {{token}}'}} if token else {{}}, timeout=5)
                        if f_r.status_code == 200: update_cache['changed_files'] = [f['filename'] for f in f_r.json().get('files', [])]
            except Exception as e: update_cache['error'] = str(e)
    return jsonify(update_cache)

@app.route('/api/update/execute', methods=['POST'])
def execute_update():
    if not server_settings.get('repoUrl'): return jsonify({{"error": "No repo"}}), 400
    create_updater_scripts()
    threading.Thread(target=lambda: (time.sleep(1), subprocess.Popen([sys.executable, "update_script_A.py", server_settings.get('repoUrl'), server_settings.get('githubToken', ''), str(os.getpid())]))).start()
    return jsonify({{"status": "Update started"}})

@app.route('/api/system/power', methods=['POST'])
def power_ops():
    # Placeholder for server power ops
    return jsonify({{'status': 'Simulated Server Power Action'}})

@app.route('/')
def serve_index():
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')): return send_from_directory(DIST_DIR, 'index.html')
    return "PiMonitor Server Running. Build frontend.", 200

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(DIST_DIR, path)): return send_from_directory(DIST_DIR, path)
    return serve_index()

if __name__ == '__main__':
    ensure_data_dir()
    ips = ['127.0.0.1']
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); ips.append(s.getsockname()[0]); s.close()
    except: pass
    print(f"Server on {{PORT}} | IPs: {{', '.join(ips)}}")
    threading.Thread(target=monitor_local_system, daemon=True).start()
    app.run(host='0.0.0.0', port=PORT)
"""
    with open("pimonitor_server.py", "w", encoding="utf-8") as f: f.write(code)
    return "pimonitor_server.py"

if __name__ == "__main__":
    generate_server_script(3000)
    print("Done")
