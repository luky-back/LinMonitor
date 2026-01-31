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

# Configuration
API_ENDPOINT = "{endpoint}"
DEVICE_NAME = socket.gethostname()
# Generate a pseudo-unique ID based on hostname + machine type
DEVICE_ID = f"{{socket.gethostname()}}-{{platform.machine()}}"

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
    # Basic hardware info
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
            "storage": [
                {{
                    "name": part.device,
                    "model": "Generic Storage",
                    "size": f"{{round(psutil.disk_usage(part.mountpoint).total / (1024**3), 1)}} GB",
                    "type": part.fstype,
                    "interface": "N/A"
                }} for part in psutil.disk_partitions(all=False)
            ]
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
            
            requests.post(API_ENDPOINT, json=payload, timeout=5)
            
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
    
    server_ip = input("Enter Server IP/URL (e.g. 192.168.1.10:3000): ").strip()
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