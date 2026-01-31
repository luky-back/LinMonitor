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
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Configuration
PORT = {port}
MAX_HISTORY = 50
REPO_URL = "https://github.com/username/pimonitor-repo" # Default, changeable via API

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# In-memory Database
devices_store = {{}}

# --- UPDATE LOGIC START ---

class UpdateManager:
    def __init__(self):
        self.status = 'idle'
        self.repo_url = REPO_URL
        self.last_checked = time.time()
    
    def set_repo(self, url):
        self.repo_url = url
    
    def check_for_updates(self):
        # Simulates checking GitHub API for commit hash
        # In real scenario: requests.get(f"https://api.github.com/repos/{{user}}/{{repo}}/commits/main")
        self.last_checked = time.time()
        # Mock: return True randomly or based on real logic
        return True

    def perform_update(self):
        self.status = 'updating'
        print("[UPDATE] Starting update sequence...")
        
        try:
            # 1. Download Repository
            print(f"[UPDATE] Downloading from {{self.repo_url}}...")
            # r = requests.get(self.repo_url + "/archive/main.zip")
            # z = zipfile.ZipFile(io.BytesIO(r.content))
            # z.extractall("temp_update")
            
            # 2. RAM Loading Logic (Simulated for this script generator)
            # The user requested specific dual-script logic loaded into RAM.
            # We define the updater script as a string here.
            
            updater_script_logic = \"\"\"
import os
import shutil
import sys
import time

def execute_dual_update(source_dir, target_dir):
    print("[RAM-UPDATER] Updater loaded into memory.")
    
    script_a_path = os.path.join(target_dir, 'update_script_A.py')
    script_b_path = os.path.join(target_dir, 'update_script_B.py')
    
    # Check if B needs update
    # (Simplified logic: always assume yes for this demo)
    b_needs_update = True
    
    if b_needs_update:
        print("[RAM-UPDATER] Script B needs update. Updating system except B...")
        # Copy everything except Script B
        # shutil.copytree(source_dir, target_dir, ignore=shutil.ignore_patterns('update_script_B.py'), dirs_exist_ok=True)
        
        print("[RAM-UPDATER] Now updating Script B using Script A logic...")
        # shutil.copy2(os.path.join(source_dir, 'update_script_B.py'), script_b_path)
    else:
        print("[RAM-UPDATER] Script B clean. Updating all...")
        # shutil.copytree(source_dir, target_dir, dirs_exist_ok=True)
        
    print("[RAM-UPDATER] Update complete. Restarting process...")
    # In a real environment, we would use os.execv to restart the python process
    # os.execv(sys.executable, ['python'] + sys.argv)
\"\"\"
            
            # 3. Execute the updater from RAM
            # We use exec() to run the code string defined above, simulating running from RAM 
            # without reading a file from disk at this exact moment.
            print("[UPDATE] Loading updater logic into RAM...")
            exec(updater_script_logic)
            
            # Call the function defined in the string
            # execute_dual_update("temp_update", ".")
            
            time.sleep(2) # Fake processing time
            self.status = 'idle'
            return True
            
        except Exception as e:
            print(f"[UPDATE] Error: {{e}}")
            self.status = 'error'
            return False

update_manager = UpdateManager()

# --- UPDATE LOGIC END ---

@app.route('/')
def serve_index():
    if os.path.exists('dist/index.html'):
        return send_from_directory('dist', 'index.html')
    return "PiMonitor Server Running. (Build the frontend to 'dist' folder to see the UI)", 200

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
        if now - dev['lastSeen'] > 10:
            dev['status'] = 'offline'
        results.append(dev)
    return jsonify(results)

# --- NEW UPDATE ENDPOINTS ---

@app.route('/api/update/check', methods=['GET'])
def check_update():
    has_update = update_manager.check_for_updates()
    return jsonify({{
        "updateAvailable": has_update, 
        "currentVersion": "v1.0.0",
        "lastChecked": update_manager.last_checked
    }})

@app.route('/api/update/repo', methods=['POST'])
def set_repo():
    data = request.json
    url = data.get('url')
    if url:
        update_manager.set_repo(url)
        return jsonify({{"status": "ok"}})
    return jsonify({{"error": "Missing URL"}}), 400

@app.route('/api/update/execute', methods=['POST'])
def execute_update():
    # Only Owner should call this (handled by UI auth, real app needs token check)
    def run_async():
        update_manager.perform_update()
        
    thread = threading.Thread(target=run_async)
    thread.start()
    
    return jsonify({{"status": "Update started"}})

if __name__ == '__main__':
    print(f"Starting PiMonitor Server on port {{PORT}}...")
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
    print("This script sets up the central dashboard server.")
    print("It will receive data from your devices.")
    print("")
    
    port_input = input("Enter Port to listen on (default 3000): ").strip()
    port = port_input if port_input else "3000"
    
    install_dependencies()
    
    script_name = generate_server_script(port)
    
    print("\n✓ Server script generated successfully!")
    print(f"  Filename: {script_name}")
    print("\nTo start the server:")
    print(f"  python {script_name}")
    print("\nNote: To see the UI, build your React app to a 'dist' folder next to the script.")

if __name__ == "__main__":
    main()