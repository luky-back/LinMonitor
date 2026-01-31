import os
import sys
import subprocess
import time

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def install_dependencies():
    print("Installing Server dependencies (flask, flask-cors, requests)...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "flask-cors", "requests"])
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
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Configuration
PORT = {port}
MAX_HISTORY = 50
DATA_DIR = 'data'
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
INVITES_FILE = os.path.join(DATA_DIR, 'invites.json')

app = Flask(__name__, static_folder='dist', static_url_path='')
# Enable CORS for all routes, allowing all origins (for development)
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

# --- AUTH ENDPOINTS ---

@app.route('/api/auth/check', methods=['GET'])
def check_setup():
    users = load_json(USERS_FILE, [])
    # Setup is required if no users exist
    return jsonify({{'setupRequired': len(users) == 0}})

@app.route('/api/auth/setup', methods=['POST'])
def setup_owner():
    users = load_json(USERS_FILE, [])
    if len(users) > 0:
        return jsonify({{'error': 'Setup already completed'}}), 400
    
    data = request.json
    if not data.get('username') or not data.get('password'):
        return jsonify({{'error': 'Missing fields'}}), 400
        
    new_user = {{
        'id': str(uuid.uuid4()),
        'username': data['username'],
        'password': data['password'], # In prod, hash this!
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
    if not invite:
        return jsonify({{'error': 'Invalid code'}}), 400
        
    # Check expiration (mock timestamp logic or real if passed)
    if invite.get('expiresAt', 0) < (time.time() * 1000):
        return jsonify({{'error': 'Code expired'}}), 400
        
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
    
    # Consume invite
    invites = [i for i in invites if i['code'] != code]
    save_json(INVITES_FILE, invites)
    
    return jsonify(new_user)

# --- USER & INVITE MANAGEMENT ---

@app.route('/api/users', methods=['GET'])
def get_users():
    users = load_json(USERS_FILE, [])
    # Return users without passwords
    safe_users = [{{k:v for k,v in u.items() if k != 'password'}} for u in users]
    return jsonify(safe_users)

@app.route('/api/invites', methods=['GET', 'POST'])
def handle_invites():
    invites = load_json(INVITES_FILE, [])
    
    if request.method == 'POST':
        data = request.json
        new_invite = {{
            'code': str(int(time.time()))[-6:], # Simple random code
            'role': data.get('role', 'Guest'),
            'createdBy': data.get('createdBy', 'system'),
            'expiresAt': int((time.time() + 300) * 1000) # 5 mins
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

# --- DEVICE TELEMETRY ---

@app.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    try:
        data = request.json
        device_id = data.get('id')
        
        if not device_id:
            return jsonify({{'error': 'Device ID required'}}), 400
            
        now_str = datetime.now().strftime('%H:%M:%S')
        current_time = time.time()
        
        if device_id not in devices_store:
            devices_store[device_id] = {{
                'id': device_id,
                'name': data.get('name', device_id),
                'ip': request.remote_addr,
                'os': data.get('os', 'Linux'),
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
            if 'name' in data: dev['name'] = data['name']
            if 'hardware' in data: dev['hardware'] = data['hardware']

        dev = devices_store[device_id]
        stats = dev['stats']
        # Append history
        if stats:
            dev['history']['cpu'].append({{ 'time': now_str, 'value': stats.get('cpuUsage', 0) }})
            dev['history']['memory'].append({{ 'time': now_str, 'value': stats.get('memoryUsage', 0) }})
            dev['history']['network'].append({{ 'time': now_str, 'value': stats.get('networkIn', 0) }})
        
        for key in ['cpu', 'memory', 'network']:
            if len(dev['history'][key]) > MAX_HISTORY:
                dev['history'][key] = dev['history'][key][-MAX_HISTORY:]
                
        return jsonify({{'status': 'success'}})
        
    except Exception as e:
        print(f"Error processing telemetry: {{e}}")
        return jsonify({{'error': str(e)}}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    results = []
    now = time.time()
    for d_id, dev in devices_store.items():
        # Check offline status (15s timeout)
        if now - dev['lastSeen'] > 15:
            dev['status'] = 'offline'
        results.append(dev)
    return jsonify(results)

# --- UPDATE LOGIC ---

class UpdateManager:
    def __init__(self):
        self.status = 'up-to-date'
        self.repo_url = "github.com/user/repo"
        self.last_checked = "Never"
    
    def check_for_updates(self):
        self.last_checked = datetime.now().strftime("%H:%M:%S")
        return False # Real implementation requires git checking

update_manager = UpdateManager()

@app.route('/api/update/check', methods=['GET'])
def check_update():
    return jsonify({{
        "status": update_manager.status, 
        "currentVersion": "v1.0.0",
        "lastChecked": update_manager.last_checked,
        "repoUrl": update_manager.repo_url
    }})

@app.route('/api/update/execute', methods=['POST'])
def execute_update():
    update_manager.status = 'updating'
    
    def fake_update():
        time.sleep(10)
        update_manager.status = 'up-to-date'
        
    thread = threading.Thread(target=fake_update)
    thread.start()
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
        # doesn't even have to be reachable
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
    print(f" PiMonitor Server Running")
    print("=" * 40)
    print(f" ▸ Local:   http://127.0.0.1:{{PORT}}")
    print(f" ▸ Network: http://{{ip}}:{{PORT}}")
    print("=" * 40)
    print(f"Data directory: {{os.path.abspath(DATA_DIR)}}")
    print("\\nPress CTRL+C to stop.")
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
    print("\nTo start the server, run:")
    print(f"  python {script_name}")
    print("\nIMPORTANT: Rerun this command to apply the latest updates to your server script.")

if __name__ == "__main__":
    main()
