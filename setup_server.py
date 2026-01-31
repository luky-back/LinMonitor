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
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Configuration
PORT = {port}
MAX_HISTORY = 50
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
INVITES_FILE = os.path.join(DATA_DIR, 'invites.json')

app = Flask(__name__, static_folder='dist', static_url_path='')
# Enable CORS for all routes
CORS(app, resources={{r"/*": {{"origins": "*"}}}})

# In-memory stores
devices_store = {{}}
update_manager = None # Initialized later

# --- PERSISTENCE HELPERS ---
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

# --- MONITORING LOGIC (Self-Monitoring) ---

def get_system_stats():
    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    
    # Network IO
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
            "gpu": {{
                "model": "Integrated/Unknown",
                "vram": "Shared",
                "driver": "N/A"
            }},
            "storage": [
                {{
                    "name": part.device,
                    "model": "Generic Storage",
                    "size": f"{{round(psutil.disk_usage(part.mountpoint).total / (1024**3), 1)}} GB",
                    "type": part.fstype,
                    "interface": part.mountpoint
                }} for part in psutil.disk_partitions(all=False)
            ]
        }}
    except Exception as e:
        print(f"Hardware info error: {{e}}")
        return {{
             "cpu": {{ "model": "Unknown", "cores": 0, "threads": 0, "architecture": "Unknown", "baseSpeed": "0" }},
             "memory": {{ "total": "0 GB", "type": "Unknown", "speed": "0", "formFactor": "Unknown" }},
             "gpu": {{ "model": "Unknown", "vram": "0", "driver": "Unknown" }},
             "storage": []
        }}

def monitor_local_system():
    device_id = 'server-local'
    print(f" ▸ Self-monitoring enabled for ID: {{device_id}}")
    
    hardware_info = get_hardware_info()
    
    while True:
        try:
            stats = get_system_stats()
            
            # Update store directly
            now_str = datetime.now().strftime('%H:%M:%S')
            current_time = time.time()
            
            if device_id not in devices_store:
                devices_store[device_id] = {{
                    'id': device_id,
                    'name': 'Local Server',
                    'ip': '127.0.0.1',
                    'os': f"{{platform.system()}} {{platform.release()}}",
                    'status': 'online',
                    'lastSeen': current_time,
                    'stats': stats,
                    'processes': [], # PM2 logic omitted for simplicity in self-monitor, can add later
                    'hardware': hardware_info,
                    'history': {{ 'cpu': [], 'memory': [], 'network': [] }}
                }}
            else:
                dev = devices_store[device_id]
                dev['status'] = 'online'
                dev['lastSeen'] = current_time
                dev['stats'] = stats
            
            # Update history
            dev = devices_store[device_id]
            dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
            dev['history']['network'].append({{ 'time': now_str, 'value': stats.get('networkIn', 0) }})
            
            for key in ['cpu', 'memory', 'network']:
                if len(dev['history'][key]) > MAX_HISTORY:
                    dev['history'][key] = dev['history'][key][-MAX_HISTORY:]
                    
        except Exception as e:
            print(f"Monitor error: {{e}}")
            
        time.sleep(2)

# --- AUTH ENDPOINTS ---

@app.route('/api/auth/check', methods=['GET'])
def check_setup():
    users = load_json(USERS_FILE, [])
    return jsonify({{'setupRequired': len(users) == 0}})

@app.route('/api/auth/setup', methods=['POST'])
def setup_owner():
    users = load_json(USERS_FILE, [])
    if len(users) > 0:
        return jsonify({{'error': 'Setup already completed'}}), 400
    
    data = request.json
    new_user = {{
        'id': str(uuid.uuid4()),
        'username': data['username'],
        'password': data['password'],
        'role': 'Owner',
        'joinedAt': datetime.now().isoformat()
    }}
    users.append(new_user)
    save_json(USERS_FILE, users)
    return jsonify(new_user)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    users = load_json(USERS_FILE, [])
    user = next((u for u in users if u['username'] == data.get('username') and u['password'] == data.get('password')), None)
    if user:
        return jsonify(user)
    return jsonify({{'error': 'Invalid credentials'}}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    code = data.get('code')
    invites = load_json(INVITES_FILE, [])
    invite = next((i for i in invites if i['code'] == code), None)
    if not invite: return jsonify({{'error': 'Invalid code'}}), 400
        
    users = load_json(USERS_FILE, [])
    if any(u['username'] == data['username'] for u in users):
        return jsonify({{'error': 'Username taken'}}), 400
        
    new_user = {{
        'id': str(uuid.uuid4()),
        'username': data['username'],
        'password': data['password'],
        'role': invite['role'],
        'joinedAt': datetime.now().isoformat()
    }}
    users.append(new_user)
    save_json(USERS_FILE, users)
    
    invites = [i for i in invites if i['code'] != code]
    save_json(INVITES_FILE, invites)
    return jsonify(new_user)

# --- DATA ENDPOINTS ---

@app.route('/api/users', methods=['GET'])
def get_users():
    users = load_json(USERS_FILE, [])
    return jsonify([{{k:v for k,v in u.items() if k != 'password'}} for u in users])

@app.route('/api/invites', methods=['GET', 'POST'])
def handle_invites():
    invites = load_json(INVITES_FILE, [])
    if request.method == 'POST':
        data = request.json
        new_invite = {{
            'code': str(int(time.time()))[-6:],
            'role': data.get('role', 'Guest'),
            'createdBy': data.get('createdBy', 'system'),
            'expiresAt': int((time.time() + 300) * 1000)
        }}
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

@app.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    try:
        data = request.json
        device_id = data.get('id')
        if not device_id: return jsonify({{'error': 'Device ID required'}}), 400
            
        current_time = time.time()
        now_str = datetime.now().strftime('%H:%M:%S')
        
        if device_id not in devices_store:
            devices_store[device_id] = {{
                'id': device_id,
                'name': data.get('name', device_id),
                'ip': request.remote_addr,
                'os': data.get('os', 'Unknown'),
                'status': 'online',
                'lastSeen': current_time,
                'stats': data.get('stats', {{}}),
                'processes': data.get('processes', []),
                'hardware': data.get('hardware', {{}}),
                'history': {{ 'cpu': [], 'memory': [], 'network': [] }}
            }}
        else:
            dev = devices_store[device_id]
            dev['status'] = 'online'
            dev['lastSeen'] = current_time
            dev['stats'] = data.get('stats', dev['stats'])
            dev['processes'] = data.get('processes', dev['processes'])
            dev['hardware'] = data.get('hardware', dev['hardware'])

        dev = devices_store[device_id]
        stats = dev['stats']
        if stats:
            dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
            dev['history']['network'].append({{ 'time': now_str, 'value': stats.get('networkIn', 0) }})
            
            for key in ['cpu', 'memory', 'network']:
                if len(dev['history'][key]) > MAX_HISTORY:
                    dev['history'][key] = dev['history'][key][-MAX_HISTORY:]
                    
        return jsonify({{'status': 'success'}})
    except Exception as e:
        return jsonify({{'error': str(e)}}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    results = []
    now = time.time()
    for d_id, dev in devices_store.items():
        if now - dev['lastSeen'] > 15:
            dev['status'] = 'offline'
        results.append(dev)
    return jsonify(results)

@app.route('/api/update/check', methods=['GET'])
def check_update():
    return jsonify({{ "status": "up-to-date", "currentVersion": "v1.0.0", "lastChecked": datetime.now().strftime("%H:%M:%S"), "repoUrl": "github.com/user/repo" }})

@app.route('/api/update/execute', methods=['POST'])
def execute_update():
    return jsonify({{"status": "Update started"}})

# --- MAIN ---

@app.route('/')
def serve_index():
    if os.path.exists('dist/index.html'):
        return send_from_directory('dist', 'index.html')
    return "PiMonitor Server Running. Build the React app to /dist to see the UI.", 200

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(f'dist/{{path}}'):
        return send_from_directory('dist', path)
    return serve_index()

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    ensure_data_dir()
    ip = get_ip()
    print("=" * 40)
    print(f" PiMonitor Server v1.1.0")
    print("=" * 40)
    print(f" ▸ Local:   http://127.0.0.1:{{PORT}}")
    print(f" ▸ Network: http://{{ip}}:{{PORT}}")
    print("=" * 40)
    print(" ▸ Self-monitoring: ENABLED")
    print(" ▸ Persistence:     ENABLED")
    print("=" * 40)
    
    # Start self-monitoring thread
    monitor_thread = threading.Thread(target=monitor_local_system, daemon=True)
    monitor_thread.start()
    
    app.run(host='0.0.0.0', port=PORT)
"""
    
    filename = "pimonitor_server.py"
    with open(filename, "w") as f:
        f.write(code)
    return filename

def main():
    clear_screen()
    print("========================================")
    print("      PiMonitor Server Setup            ")
    print("========================================")
    
    port_input = input("Enter Port to listen on (default 3000): ").strip()
    port = port_input if port_input else "3000"
    
    install_dependencies()
    
    script_name = generate_server_script(port)
    
    print("\n✓ Server script generated successfully!")
    print(f"  Filename: {script_name}")
    print("\nTo start the server:")
    print(f"  python {script_name}")
    print("\nNote: This server now includes built-in monitoring for this machine.")
    print("You do not need to run a separate agent script for localhost.")

if __name__ == "__main__":
    main()
