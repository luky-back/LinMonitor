import os
import sys
import platform
import subprocess
import shutil
import time

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def install_dependencies():
    print("Installing Device Agent dependencies (requests, psutil)...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "psutil"])
        print("✓ Dependencies installed.")
    except Exception as e:
        print(f"X Error installing dependencies: {e}")
        print("Please run this script with sudo/admin rights.")
        sys.exit(1)

def generate_agent_script(server_url):
    # Ensure URL has scheme
    if not server_url.startswith("http"):
        server_url = "http://" + server_url
    
    # Remove trailing slash for consistency
    server_url = server_url.rstrip("/")
    endpoint = f"{server_url}/api/telemetry"

    script_content = f"""import requests
import psutil
import time
import json
import platform
import socket
import subprocess
import threading
import os
import sys
import zipfile
import io
import shutil
import re

# Configuration
API_ENDPOINT = "{endpoint}"
DEVICE_NAME = socket.gethostname()
# Generate a pseudo-unique ID based on hostname + machine type
DEVICE_ID = f"{{socket.gethostname()}}-{{platform.machine()}}"

# --- UPDATE MECHANISM ---
def create_agent_updater(repo_url, token, target_file, pid):
    updater_code = \"\"\"
import os
import sys
import time
import requests
import zipfile
import io
import shutil
import subprocess
import re
import importlib.util

REPO_URL = "{{repo_url}}"
TOKEN = "{{token}}"
TARGET_FILE = "{{target_file}}"
PID = {{pid}}

print(f"Agent Updater: Waiting for agent PID {{PID}} to exit...")
try:
    while True:
        try:
            os.kill(PID, 0)
            time.sleep(1)
        except OSError:
            break
except:
    pass

print("Agent Updater: Downloading update...")
try:
    download_url = REPO_URL
    if "github.com" in REPO_URL and not REPO_URL.endswith(".zip"):
        download_url = REPO_URL.rstrip('/') + "/archive/refs/heads/main.zip"
    
    headers = {{}}
    if TOKEN:
        headers['Authorization'] = f"token {{TOKEN}}"

    r = requests.get(download_url, headers=headers)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    
    extract_path = "temp_agent_update"
    if os.path.exists(extract_path): shutil.rmtree(extract_path)
    os.makedirs(extract_path)
    z.extractall(extract_path)
    
    # Find setup_device.py in the extracted folder to regenerate the agent
    root_folder = os.listdir(extract_path)[0]
    full_path = os.path.join(extract_path, root_folder)
    setup_script_path = os.path.join(full_path, "setup_device.py")
    
    if os.path.exists(setup_script_path):
        print("Found setup script. Regenerating agent code...")
        
        # Read old API endpoint from the target file to preserve config
        old_url = ""
        if os.path.exists(TARGET_FILE):
            with open(TARGET_FILE, 'r') as f:
                content = f.read()
                match = re.search(r'API_ENDPOINT = "(.*?)"', content)
                if match:
                    old_url = match.group(1)
        
        if old_url:
            # Import the new setup script dynamically
            spec = importlib.util.spec_from_file_location("new_setup_module", setup_script_path)
            new_setup = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(new_setup)
            
            # Extract base URL from endpoint (remove /api/telemetry)
            base_url = old_url.replace("/api/telemetry", "")
            
            # The generate_agent_script function writes to a file in CWD.
            # We temporarily change CWD to temp dir to let it write there, then read it.
            cwd = os.getcwd()
            os.chdir(full_path)
            try:
                # Generate new agent file
                new_file_path = new_setup.generate_agent_script(base_url)
                
                # Read generated content
                with open(new_file_path, 'r') as f:
                    new_code = f.read()
                
                # Restore CWD
                os.chdir(cwd)
                
                # Overwrite running agent file
                with open(TARGET_FILE, 'w') as f:
                    f.write(new_code)
                    
                print("Agent updated successfully.")
            except Exception as e:
                print(f"Failed during regeneration: {{e}}")
                os.chdir(cwd)
        else:
            print("Could not find old API URL. Aborting update.")
    else:
        print("setup_device.py not found in update. Cannot update agent.")
    
    print("Restarting agent...")
    
    # Cleanup
    try:
        shutil.rmtree(extract_path)
    except:
        pass

    # Restart the agent
    if os.name == 'nt':
        subprocess.Popen([sys.executable, TARGET_FILE], creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        subprocess.Popen([sys.executable, TARGET_FILE], start_new_session=True)
    
    # Self-delete updater
    try:
        os.remove(sys.argv[0])
    except:
        pass

except Exception as e:
    print(f"Update failed: {{e}}")
    # Try to restart anyway
    subprocess.Popen([sys.executable, TARGET_FILE])
\"\"\"
    
    updater_filename = "agent_updater.py"
    with open(updater_filename, "w") as f:
        f.write(updater_code.replace("{{repo_url}}", repo_url).replace("{{token}}", token).replace("{{target_file}}", target_file).replace("{{pid}}", str(pid)))
    
    return updater_filename

def get_pm2_stats():
    # Requires PM2 to be installed and accessible in path
    try:
        # Use 'pm2 jlist' to get JSON output
        if os.name == 'nt':
            cmd = ['pm2', 'jlist'] # Windows might need shell=True depending on env
            result = subprocess.check_output(cmd, shell=True)
        else:
            result = subprocess.check_output(['pm2', 'jlist'])
            
        processes = json.loads(result)
        
        proc_list = []
        for p in processes:
            env = p.get('pm2_env', {{}})
            monit = p.get('monit', {{}})
            
            status = env.get('status')
            # Normalize status to match frontend types
            if status not in ['online', 'stopped', 'errored', 'launching']:
                status = 'stopped'
                
            proc_list.append({{
                "pid": p.get("pid", 0),
                "name": p.get("name", "unknown"),
                "pm_id": p.get("pm_id", 0),
                "status": status,
                "cpu": monit.get("cpu", 0),
                "memory": round(monit.get("memory", 0) / 1024 / 1024, 1), # Bytes -> MB
                "uptime": format_uptime(env.get("pm_uptime", 0)),
                "restarts": env.get("restart_time", 0)
            }})
        return proc_list
    except Exception:
        return []

def format_uptime(start_ts):
    if not start_ts: return "0s"
    # pm_uptime is epoch ms
    seconds = int(time.time() - (start_ts / 1000))
    if seconds < 60: return f"{{seconds}}s"
    if seconds < 3600: return f"{{seconds // 60}}m"
    if seconds < 86400: return f"{{seconds // 3600}}h"
    return f"{{seconds // 86400}}d"

def get_hardware_info():
    storage_info = []
    try:
        partitions = psutil.disk_partitions(all=False)
        for part in partitions:
            try:
                # Get Usage per partition
                usage = psutil.disk_usage(part.mountpoint)
                
                # Try to get model on Linux
                model = "Generic Storage"
                if platform.system() == 'Linux':
                    try:
                        # Map partition to block device (e.g., /dev/sda1 -> sda)
                        device_name = part.device.split('/')[-1]
                        # Remove digits for partition (sda1 -> sda), roughly
                        block_device = ''.join([i for i in device_name if not i.isdigit()])
                        
                        model_path = f"/sys/class/block/{{block_device}}/device/model"
                        if os.path.exists(model_path):
                            with open(model_path, 'r') as f:
                                model = f.read().strip()
                    except:
                        pass

                storage_info.append({{
                    "name": part.device,
                    "model": model,
                    "size": f"{{round(usage.total / (1024**3), 1)}} GB",
                    "type": part.fstype,
                    "interface": part.mountpoint,
                    "usage": usage.percent
                }})
            except:
                continue
    except:
        pass

    try:
        mem = psutil.virtual_memory()
        return {{
            "cpu": {{
                "model": platform.processor(),
                "cores": psutil.cpu_count(logical=False),
                "threads": psutil.cpu_count(logical=True),
                "architecture": platform.machine(),
                "baseSpeed": f"{{psutil.cpu_freq().max:.1f}}Mhz" if psutil.cpu_freq() else "N/A"
            }},
            "memory": {{
                "total": f"{{round(mem.total / (1024**3), 1)}} GB",
                "type": "Unknown",
                "speed": "Unknown",
                "formFactor": "Unknown"
            }},
            "gpu": {{
                "model": "Integrated/Unknown",
                "vram": "Shared",
                "driver": "N/A"
            }},
            "storage": storage_info
        }}
    except:
        return {{}}

def get_system_stats():
    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    
    # Network IO (rate calculation)
    net1 = psutil.net_io_counters()
    time.sleep(1) # Wait 1s to calc rate
    net2 = psutil.net_io_counters()
    
    # Bytes per second -> KB/s
    net_in = (net2.bytes_recv - net1.bytes_recv) / 1024
    net_out = (net2.bytes_sent - net1.bytes_sent) / 1024
    
    disk = psutil.disk_usage('/')
    
    temp = 0
    # Try to get temp on Linux
    if hasattr(psutil, "sensors_temperatures"):
        temps = psutil.sensors_temperatures()
        if temps:
            # Try common names
            for name in ['cpu_thermal', 'coretemp', 'k10temp']:
                if name in temps:
                    temp = temps[name][0].current
                    break
            # Fallback to first available
            if temp == 0 and temps:
                first_key = next(iter(temps))
                if temps[first_key]:
                    temp = temps[first_key][0].current

    return {{
        "cpuUsage": cpu_pct,
        "memoryUsage": mem.percent,
        "memoryUsed": round((mem.total - mem.available) / (1024**3), 2), # GB
        "memoryTotal": round(mem.total / (1024**3), 2), # GB
        "temperature": temp,
        "networkIn": round(net_in, 1),
        "networkOut": round(net_out, 1),
        "diskUsage": disk.percent
    }}

def main():
    print(f"Starting PiMonitor Device Agent")
    print(f"ID: {{DEVICE_ID}}")
    print(f"Target: {{API_ENDPOINT}}")
    
    hardware_cache = get_hardware_info()
    
    while True:
        try:
            stats = get_system_stats() # Takes 1s due to net calc
            processes = get_pm2_stats()
            
            payload = {{
                "id": DEVICE_ID,
                "name": DEVICE_NAME,
                "os": f"{{platform.system()}} {{platform.release()}}",
                "stats": stats,
                "processes": processes,
                "hardware": hardware_cache
            }}
            
            r = requests.post(API_ENDPOINT, json=payload, timeout=5)
            
            # Check for server commands
            if r.status_code == 200:
                resp = r.json()
                if resp.get('command') == 'update':
                    print("Received update command...")
                    repo_url = resp.get('repoUrl')
                    token = resp.get('token')
                    
                    if repo_url:
                        updater_script = create_agent_updater(repo_url, token, sys.argv[0], os.getpid())
                        print(f"Launching updater: {{updater_script}}")
                        
                        # Launch updater detached
                        if os.name == 'nt':
                            subprocess.Popen([sys.executable, updater_script], creationflags=subprocess.CREATE_NEW_CONSOLE)
                        else:
                            subprocess.Popen([sys.executable, updater_script], start_new_session=True)
                            
                        sys.exit(0)
            else:
                print(f"Server returned status: {{r.status_code}}")
            
        except requests.exceptions.ConnectionError:
            print("Server unreachable...")
        except Exception as e:
            print(f"Error: {{e}}")
            
        # Total loop time is ~1s (stats) + sleep
        time.sleep(1) 

if __name__ == "__main__":
    main()
"""
    
    filename = "pimonitor_device.py"
    with open(filename, "w") as f:
        f.write(script_content)
    
    return os.path.abspath(filename)

def setup_linux_service(script_path):
    print("\nSetting up Systemd Service...")
    service_name = "pimonitor-device.service"
    service_content = f"""[Unit]
Description=PiMonitor Device Agent
After=network.target

[Service]
ExecStart={sys.executable} {script_path}
Restart=always
User={os.getlogin()}
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
"""
    try:
        with open(service_name, "w") as f:
            f.write(service_content)
            
        print("Installing service (sudo required)...")
        subprocess.run(["sudo", "mv", service_name, f"/etc/systemd/system/{service_name}"], check=True)
        subprocess.run(["sudo", "systemctl", "daemon-reload"], check=True)
        subprocess.run(["sudo", "systemctl", "enable", "--now", "pimonitor-device"], check=True)
        print("✓ Service installed and started!")
    except Exception as e:
        print(f"X Failed to setup service: {e}")
        print("You can run the script manually: python3 pimonitor_device.py")

def main():
    clear_screen()
    print("========================================")
    print("      PiMonitor Device Setup            ")
    print("========================================")
    print("This script sets up the monitoring agent.")
    print("")
    
    server_ip = input("Enter Server IP/URL (e.g. 192.168.203.128:3000): ").strip()
    if not server_ip:
        print("Error: Server IP is required.")
        return

    install_dependencies()
    
    print("\nGenerating agent script...")
    script_path = generate_agent_script(server_ip)
    print(f"✓ Agent script created at: {script_path}")
    
    if platform.system() == "Linux":
        if input("\nInstall as system service? (y/n): ").lower() == 'y':
            setup_linux_service(script_path)
        else:
            print(f"\nSkipping service setup. Run manually with:\npython3 {script_path}")
    elif platform.system() == "Windows":
        print(f"\nWindows detected. Run manually with:\npython {script_path}")

if __name__ == "__main__":
    main()
