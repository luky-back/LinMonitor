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
import time
import os
import json
import threading
import requests
import zipfile
import io
import shutil
import sys
import uuid
import socket
import psutil
import platform
import mimetypes
import subprocess
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from datetime import datetime

# Initialize mimetypes
mimetypes.init()

# Configuration
PORT = {port}
MAX_HISTORY = 50
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
INVITES_FILE = os.path.join(DATA_DIR, 'invites.json')
MAILS_FILE = os.path.join(DATA_DIR, 'mails.json')
NOTIFICATIONS_FILE = os.path.join(DATA_DIR, 'notifications.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app, resources={{r"/*": {{"origins": "*"}}}})

devices_store = {{}}
# Cache for update checking to prevent GitHub API rate limiting
update_cache = {{
    "last_check": 0,
    "status": "up-to-date",
    "remote_hash": None,
    "error": None
}}

# --- PERSISTENCE ---
def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def load_json(filepath, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return default
    return default

def save_json(filepath, data):
    ensure_data_dir()
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

server_settings = load_json(SETTINGS_FILE, {{
    "repoUrl": "github.com/user/pimonitor-repo",
    "localHash": "init",
    "githubToken": ""
}})

# --- UPDATER SYSTEM ---
def create_updater_scripts():
    # Script B: The Worker
    script_b = \"\"\"
import os
import sys
import time
import shutil
import subprocess

PID = int(sys.argv[1])
UPDATE_DIR = sys.argv[2]
TARGET_DIR = sys.argv[3]
RESTART_CMD = sys.argv[4:]

print(f"[B] Waiting for Server PID {{PID}} to exit...")
try:
    while True:
        try:
            os.kill(PID, 0)
            time.sleep(1)
        except OSError:
            break
except:
    pass
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
        print(f"Failed to copy {{item}}: {{e}}")

print("[B] Cleanup...")
try:
    shutil.rmtree(UPDATE_DIR)
except:
    pass

print(f"[B] Restarting server: {{RESTART_CMD}}")
subprocess.Popen(RESTART_CMD)
\"\"\"
    with open("update_script_B.py", "w", encoding="utf-8") as f:
        f.write(script_b)

    # Script A: The Launcher
    script_a = \"\"\"
import os
import sys
import subprocess
import zipfile
import requests
import io
import shutil

URL = sys.argv[1]
TOKEN = sys.argv[2] if len(sys.argv) > 2 else ""
TARGET_DIR = os.getcwd()
UPDATE_DIR = os.path.join(TARGET_DIR, "temp_update")

print(f"[A] Downloading update from {{URL}}...")
try:
    download_url = URL
    if "github.com" in URL and not URL.endswith(".zip"):
        download_url = URL.rstrip('/') + "/archive/refs/heads/main.zip"
    
    headers = {{}}
    if TOKEN and TOKEN.strip() != "":
        headers['Authorization'] = f"token {{TOKEN}}"

    r = requests.get(download_url, headers=headers)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    
    if os.path.exists(UPDATE_DIR): shutil.rmtree(UPDATE_DIR)
    os.makedirs(UPDATE_DIR)
    
    z.extractall(UPDATE_DIR)
    
    extracted = os.listdir(UPDATE_DIR)
    if len(extracted) == 1 and os.path.isdir(os.path.join(UPDATE_DIR, extracted[0])):
        root = os.path.join(UPDATE_DIR, extracted[0])
        for item in os.listdir(root):
            shutil.move(os.path.join(root, item), UPDATE_DIR)
        os.rmdir(root)
        
    cmd = [sys.executable, "update_script_B.py", str(os.getpid()), UPDATE_DIR, TARGET_DIR, sys.executable, "pimonitor_server.py"]
    
    if os.name == 'nt':
        subprocess.Popen(cmd, creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        subprocess.Popen(cmd, start_new_session=True)
        
    sys.exit(0)
    
except Exception as e:
    print(f"[A] Error: {{e}}")
    if os.path.exists(UPDATE_DIR): shutil.rmtree(UPDATE_DIR)
\"\"\"
    with open("update_script_A.py", "w", encoding="utf-8") as f:
        f.write(script_a)

# --- MONITORING ---
def format_uptime(start_ts):
    if not start_ts: return "0s"
    seconds = int(time.time() - (start_ts / 1000))
    if seconds < 60: return f"{{seconds}}s"
    if seconds < 3600: return f"{{seconds // 60}}m"
    if seconds < 86400: return f"{{seconds // 3600}}h"
    return f"{{seconds // 86400}}d"

def get_pm2_stats():
    try:
        if os.name == 'nt':
            cmd = ['pm2', 'jlist'] 
            result = subprocess.check_output(cmd, shell=True)
        else:
            result = subprocess.check_output(['pm2', 'jlist'])
        processes = json.loads(result)
        proc_list = []
        for p in processes:
            env = p.get('pm2_env', {{}})
            monit = p.get('monit', {{}})
            status = env.get('status')
            if status not in ['online', 'stopped', 'errored', 'launching']:
                status = 'stopped'
            proc_list.append({{
                "pid": p.get("pid", 0),
                "name": p.get("name", "unknown"),
                "pm_id": p.get("pm_id", 0),
                "status": status,
                "cpu": monit.get("cpu", 0),
                "memory": round(monit.get("memory", 0) / 1024 / 1024, 1),
                "uptime": format_uptime(env.get("pm_uptime", 0)),
                "restarts": env.get("restart_time", 0),
                "logs": [] 
            }})
        return proc_list
    except:
        return []

def get_system_stats():
    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    net1 = psutil.net_io_counters()
    time.sleep(1) 
    net2 = psutil.net_io_counters()
    net_in = (net2.bytes_recv - net1.bytes_recv) / 1024
    net_out = (net2.bytes_sent - net1.bytes_sent) / 1024
    disk = psutil.disk_usage('/')
    temp = 0
    if hasattr(psutil, "sensors_temperatures"):
        temps = psutil.sensors_temperatures()
        if temps:
            for name in ['cpu_thermal', 'coretemp', 'k10temp', 'package_id_0']:
                if name in temps:
                    temp = temps[name][0].current
                    break
    return {{
        "cpuUsage": cpu_pct,
        "memoryUsage": mem.percent,
        "memoryUsed": round((mem.total - mem.available) / (1024**3), 2),
        "memoryTotal": round(mem.total / (1024**3), 2),
        "temperature": temp,
        "networkIn": round(net_in, 1),
        "networkOut": round(net_out, 1),
        "diskUsage": disk.percent
    }}

def get_hardware_info():
    storage_info = []
    try:
        partitions = psutil.disk_partitions(all=False)
        for part in partitions:
            try:
                usage = psutil.disk_usage(part.mountpoint)
                model = "Generic Storage"
                if platform.system() == 'Linux':
                    try:
                        device_name = part.device.split('/')[-1]
                        block_device = ''.join([i for i in device_name if not i.isdigit()])
                        model_path = f"/sys/class/block/{{block_device}}/device/model"
                        if os.path.exists(model_path):
                            with open(model_path, 'r') as f:
                                model = f.read().strip()
                    except: pass
                storage_info.append({{
                    "name": part.device,
                    "model": model,
                    "size": f"{{round(usage.total / (1024**3), 1)}} GB",
                    "type": part.fstype,
                    "interface": part.mountpoint,
                    "usage": usage.percent
                }})
            except: continue
    except: pass
    try:
        mem = psutil.virtual_memory()
        cpu_freq = psutil.cpu_freq()
        return {{
            "cpu": {{
                "model": platform.processor() or "Unknown CPU",
                "cores": psutil.cpu_count(logical=False) or 0,
                "threads": psutil.cpu_count(logical=True) or 0,
                "architecture": platform.machine(),
                "baseSpeed": f"{{cpu_freq.max:.1f}}Mhz" if cpu_freq else "N/A"
            }},
            "memory": {{
                "total": f"{{round(mem.total / (1024**3), 1)}} GB",
                "type": "System RAM",
                "speed": "Unknown",
                "formFactor": "DIMM"
            }},
            "gpu": {{ "model": "Integrated/Unknown", "vram": "Shared", "driver": "N/A" }},
            "storage": storage_info
        }}
    except:
        return {{ "cpu": {{}}, "memory": {{}}, "gpu": {{}}, "storage": [] }}

def monitor_local_system():
    device_id = 'server-local'
    hardware_info = get_hardware_info()
    while True:
        try:
            stats = get_system_stats()
            pm2_procs = get_pm2_stats()
            now_str = datetime.now().strftime('%H:%M:%S')
            current_time = time.time()
            if device_id not in devices_store:
                devices_store[device_id] = {{
                    'id': device_id, 'name': 'Local Server', 'ip': '127.0.0.1',
                    'os': f"{{platform.system()}} {{platform.release()}}",
                    'status': 'online', 'lastSeen': current_time,
                    'stats': stats, 'processes': pm2_procs, 'hardware': hardware_info,
                    'history': {{ 'cpu': [], 'memory': [], 'network': [] }}
                }}
            else:
                dev = devices_store[device_id]
                dev['status'] = 'online'
                dev['lastSeen'] = current_time
                dev['stats'] = stats
                dev['processes'] = pm2_procs
            
            dev = devices_store[device_id]
            dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
            dev['history']['network'].append({{ 'time': now_str, 'value': stats.get('networkIn', 0) }})
            for key in ['cpu', 'memory', 'network']:
                if len(dev['history'][key]) > MAX_HISTORY: dev['history'][key] = dev['history'][key][-MAX_HISTORY:]
        except Exception as e: print(f"Monitor error: {{e}}")
        time.sleep(2)

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

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    code = data.get('code')
    invites = load_json(INVITES_FILE, [])
    invite = next((i for i in invites if i['code'] == code), None)
    if not invite: return jsonify({{'error': 'Invalid code'}}), 400
    users = load_json(USERS_FILE, [])
    if any(u['username'] == data['username'] for u in users): return jsonify({{'error': 'Username taken'}}), 400
    new_user = {{ 'id': str(uuid.uuid4()), 'username': data['username'], 'password': data['password'], 'role': invite['role'], 'joinedAt': datetime.now().isoformat() }}
    users.append(new_user)
    save_json(USERS_FILE, users)
    invites = [i for i in invites if i['code'] != code]
    save_json(INVITES_FILE, invites)
    return jsonify(new_user)

@app.route('/api/users', methods=['GET'])
def get_users():
    users = load_json(USERS_FILE, [])
    return jsonify([{{k:v for k,v in u.items() if k != 'password'}} for u in users])

@app.route('/api/invites', methods=['GET', 'POST'])
def handle_invites():
    invites = load_json(INVITES_FILE, [])
    if request.method == 'POST':
        data = request.json
        new_invite = {{ 'code': str(int(time.time()))[-6:], 'role': data.get('role', 'Guest'), 'createdBy': data.get('createdBy', 'system'), 'expiresAt': int((time.time() + 300) * 1000) }}
        invites.append(new_invite)
        save_json(INVITES_FILE, invites)
        return jsonify(new_invite)
    return jsonify(invites)

@app.route('/api/invites/<code>', methods=['DELETE'])
def delete_invite(code):
    invites = load_json(INVITES_FILE, [])
    invites = [i for i in invites if i['code'] != code]
    save_json(INVITES_FILE, invites)
    return jsonify({{'status': 'deleted'}})

@app.route('/api/mail/<user_id>', methods=['GET'])
def get_mails(user_id):
    all_mails = load_json(MAILS_FILE, [])
    return jsonify([m for m in all_mails if m['toId'] == user_id or m['fromId'] == user_id])

@app.route('/api/mail', methods=['POST'])
def send_mail():
    data = request.json
    all_mails = load_json(MAILS_FILE, [])
    new_mail = {{ 'id': f"m-{{int(time.time()*1000)}}", 'fromId': data['fromId'], 'toId': data['toId'], 'subject': data['subject'], 'body': data['body'], 'read': False, 'timestamp': datetime.now().isoformat() }}
    all_mails.append(new_mail)
    save_json(MAILS_FILE, all_mails)
    all_notifs = load_json(NOTIFICATIONS_FILE, [])
    all_notifs.append({{ 'id': f"n-{{int(time.time()*1000)}}", 'userId': data['toId'], 'type': 'info', 'message': f"New mail received", 'read': False, 'timestamp': datetime.now().isoformat() }})
    save_json(NOTIFICATIONS_FILE, all_notifs)
    return jsonify(new_mail)

@app.route('/api/mail/<mail_id>', methods=['DELETE'])
def delete_mail(mail_id):
    all_mails = load_json(MAILS_FILE, [])
    all_mails = [m for m in all_mails if m['id'] != mail_id]
    save_json(MAILS_FILE, all_mails)
    return jsonify({{'status': 'deleted'}})

@app.route('/api/mail/<user_id>/read-all', methods=['PUT'])
def mark_all_mails_read(user_id):
    all_mails = load_json(MAILS_FILE, [])
    for m in all_mails:
        if m['toId'] == user_id: m['read'] = True
    save_json(MAILS_FILE, all_mails)
    return jsonify({{'status': 'success'}})

@app.route('/api/notifications/<user_id>', methods=['GET'])
def get_notifications(user_id):
    all_notifs = load_json(NOTIFICATIONS_FILE, [])
    return jsonify([n for n in all_notifs if n['userId'] == user_id])

@app.route('/api/notifications/<notif_id>/read', methods=['PUT'])
def mark_notification_read(notif_id):
    all_notifs = load_json(NOTIFICATIONS_FILE, [])
    for n in all_notifs:
        if n['id'] == notif_id:
            n['read'] = True; break
    save_json(NOTIFICATIONS_FILE, all_notifs)
    return jsonify({{'status': 'success'}})

@app.route('/api/notifications/<user_id>/clear', methods=['DELETE'])
def clear_all_notifications(user_id):
    all_notifs = load_json(NOTIFICATIONS_FILE, [])
    all_notifs = [n for n in all_notifs if n['userId'] != user_id]
    save_json(NOTIFICATIONS_FILE, all_notifs)
    return jsonify({{'status': 'cleared'}})

@app.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    try:
        data = request.json
        device_id = data.get('id')
        if not device_id: return jsonify({{'error': 'Device ID required'}}), 400
        current_time = time.time()
        now_str = datetime.now().strftime('%H:%M:%S')
        if device_id not in devices_store:
            devices_store[device_id] = {{ 'id': device_id, 'name': data.get('name', device_id), 'ip': request.remote_addr, 'os': data.get('os', 'Unknown'), 'status': 'online', 'lastSeen': current_time, 'stats': data.get('stats', {{}}), 'processes': data.get('processes', []), 'hardware': data.get('hardware', {{}}), 'history': {{ 'cpu': [], 'memory': [], 'network': [] }} }}
        else:
            dev = devices_store[device_id]
            dev['status'] = 'online'; dev['lastSeen'] = current_time; dev['stats'] = data.get('stats', dev['stats']); dev['processes'] = data.get('processes', dev['processes']); dev['hardware'] = data.get('hardware', dev['hardware'])
        dev = devices_store[device_id]
        stats = dev['stats']
        if stats:
            dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
            dev['history']['network'].append({{ 'time': now_str, 'value': stats.get('networkIn', 0) }})
            for key in ['cpu', 'memory', 'network']:
                if len(dev['history'][key]) > MAX_HISTORY: dev['history'][key] = dev['history'][key][-MAX_HISTORY:]
        return jsonify({{'status': 'success'}})
    except Exception as e: return jsonify({{'error': str(e)}}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    results = []
    now = time.time()
    for d_id, dev in devices_store.items():
        if now - dev['lastSeen'] > 15: dev['status'] = 'offline'
        results.append(dev)
    return jsonify(results)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.json
    global server_settings
    server_settings.update(data)
    save_json(SETTINGS_FILE, server_settings)
    # Force a re-check on next update polling by expiring the cache
    update_cache['last_check'] = 0 
    return jsonify({{'status': 'success', 'settings': server_settings}})

@app.route('/api/update/check', methods=['GET'])
def check_update():
    global update_cache
    repo_url = server_settings.get('repoUrl', '')
    local_hash = server_settings.get('localHash', 'init')
    github_token = server_settings.get('githubToken', '')
    
    force = request.args.get('force') == 'true'
    now = time.time()
    
    # Check if we should fetch new data (cache expired or forced)
    # Cache duration: 1 second (High frequency check requested)
    if force or (now - update_cache['last_check'] > 1):
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
                    if github_token:
                        headers['Authorization'] = f"token {{github_token}}"
                    
                    # Add timeout to prevent hanging
                    r = requests.get(api_url, headers=headers, timeout=5)
                    
                    if r.status_code == 200:
                        data = r.json()
                        remote_hash = data.get('sha')
                        update_cache['remote_hash'] = remote_hash
                        if remote_hash and remote_hash != local_hash:
                            update_cache['status'] = "update-available"
                        else:
                            update_cache['status'] = "up-to-date"
                    elif r.status_code == 403 or r.status_code == 429:
                        update_cache['error'] = "GitHub Rate Limited (Add Token)"
                    else:
                         update_cache['error'] = f"GitHub Error {{r.status_code}}"
            else:
                update_cache['status'] = "up-to-date"
                update_cache['remote_hash'] = None
        except Exception as e:
            update_cache['error'] = str(e)
            
    return jsonify({{
        "status": update_cache['status'],
        "currentVersion": local_hash[:7],
        "availableVersion": update_cache['remote_hash'][:7] if update_cache['remote_hash'] else "Unknown",
        "lastChecked": datetime.fromtimestamp(update_cache['last_check']).strftime("%H:%M:%S"),
        "repoUrl": repo_url,
        "localHash": local_hash,
        "remoteHash": update_cache['remote_hash'],
        "error": update_cache['error'],
        "githubToken": github_token[:4] + "..." if github_token else ""
    }})

@app.route('/api/update/execute', methods=['POST'])
def execute_update():
    repo_url = server_settings.get('repoUrl')
    token = server_settings.get('githubToken', '')
    if not repo_url: return jsonify({{"error": "No repo URL"}}), 400
    create_updater_scripts()
    
    try:
        parts = repo_url.rstrip('/').split('/')
        owner, repo = parts[-2], parts[-1]
        if repo.endswith('.git'): repo = repo[:-4]
        headers = {{}}
        if token: headers['Authorization'] = f"token {{token}}"
        
        r = requests.get(f"https://api.github.com/repos/{{owner}}/{{repo}}/commits/main", headers=headers)
        if r.status_code == 200:
            new_hash = r.json().get('sha')
            server_settings['localHash'] = new_hash
            save_json(SETTINGS_FILE, server_settings)
    except: pass

    def trigger():
        time.sleep(2)
        subprocess.Popen([sys.executable, "update_script_A.py", repo_url, token])
    threading.Thread(target=trigger).start()
    return jsonify({{"status": "Update started"}})

@app.route('/api/system/power', methods=['POST'])
def power_ops():
    data = request.json
    action = data.get('action')
    if action == 'shutdown':
        def do_shutdown():
            time.sleep(1)
            if os.name == 'nt': os.system('shutdown /s /t 0')
            else: os.system('shutdown -h now')
        threading.Thread(target=do_shutdown).start()
        return jsonify({{'status': 'Shutting down...'}})
    elif action == 'restart':
        def do_restart():
            time.sleep(1)
            if os.name == 'nt': os.system('shutdown /r /t 0')
            else: os.system('reboot')
        threading.Thread(target=do_restart).start()
        return jsonify({{'status': 'Restarting...'}})
    return jsonify({{'error': 'Invalid action'}}), 400

# --- MAIN ---
@app.route('/')
def serve_index():
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')): return send_from_directory(DIST_DIR, 'index.html')
    return "Server Running. Build frontend to see dashboard.", 200

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(DIST_DIR, path)): return send_from_directory(DIST_DIR, path)
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')): return send_from_directory(DIST_DIR, 'index.html')
    return serve_index()

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try: s.connect(('10.255.255.255', 1)); IP = s.getsockname()[0]
    except: IP = '127.0.0.1'
    finally: s.close()
    return IP

if __name__ == '__main__':
    ensure_data_dir()
    ip = get_ip()
    print(f"PiMonitor Server | Local: http://127.0.0.1:{{PORT}} | Network: http://{{ip}}:{{PORT}}")
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
    script_name = generate_server_script(3000)
    print(f"Done: {script_name}")

if __name__ == "__main__":
    main()
