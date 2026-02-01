import os
import sys
import platform
import subprocess
import shutil
import time
import socket
import re

def clear_screen(): os.system('cls' if os.name == 'nt' else 'clear')

def install_dependencies():
    print("Installing dependencies...")
    try: subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "psutil"])
    except: sys.exit(1)

def validate_url(url):
    if not url.startswith("http"): url = "http://" + url
    return url.rstrip("/")

def test_connection(url):
    print(f"Testing {url}...")
    try:
        import requests
        return requests.get(f"{url}/api/telemetry", timeout=5).status_code == 200
    except: return False

def generate_agent_script(server_url):
    endpoint = f"{server_url}/api/telemetry"
    term_endpoint = f"{server_url}/api/terminal/sync"
    script = f"""import requests, psutil, time, json, platform, socket, subprocess, threading, os, sys, select

API_ENDPOINT = "{endpoint}"
TERM_ENDPOINT = "{term_endpoint}"
DEVICE_NAME = socket.gethostname()
DEVICE_ID = f"{{socket.gethostname()}}-{{platform.machine()}}"

# Terminal State
term_active = False
term_fd = None
term_proc = None
term_output_buffer = []
term_lock = threading.Lock()

try:
    import pty
    HAS_PTY = True
except ImportError:
    HAS_PTY = False

def terminal_worker():
    global term_active, term_fd, term_proc
    while True:
        try:
            # Sync with server
            out_chunk = ''
            with term_lock:
                if term_output_buffer:
                    out_chunk = ''.join(term_output_buffer)
                    term_output_buffer.clear()
            
            # If we have data to send OR just need to poll for input
            if out_chunk or term_active:
                try:
                    r = requests.post(TERM_ENDPOINT, json={{'id': DEVICE_ID, 'output': out_chunk}}, timeout=1)
                    if r.status_code == 200:
                        data = r.json()
                        input_data = data.get('input', '')
                        
                        # Start shell if input received and not active
                        if input_data and not term_active:
                             if HAS_PTY:
                                 master, slave = pty.openpty()
                                 shell = os.environ.get('SHELL', 'bash')
                                 term_proc = subprocess.Popen([shell], stdin=slave, stdout=slave, stderr=slave, preexec_fn=os.setsid)
                                 term_fd = master
                                 term_active = True
                                 os.write(term_fd, input_data.encode('utf-8'))
                             else:
                                 pass # Windows fallback unimplemented for brevity, effectively read-only or unsupported
                        elif input_data and term_active:
                             if term_fd: os.write(term_fd, input_data.encode('utf-8'))
                except: pass
            
            # Read from local PTY
            if term_active and term_fd:
                r, _, _ = select.select([term_fd], [], [], 0.05)
                if term_fd in r:
                    try:
                        data = os.read(term_fd, 1024)
                        if data:
                            with term_lock:
                                term_output_buffer.append(data.decode('utf-8', errors='replace'))
                        else:
                            # EOF
                            term_active = False
                    except: term_active = False

        except Exception as e: print(e)
        time.sleep(0.1)

def execute_power_command(cmd):
    try:
        if platform.system() == 'Windows': os.system(f"shutdown /{{'r' if cmd=='reboot' else 's'}} /t 0")
        else: os.system(f"sudo {{'reboot' if cmd=='reboot' else 'shutdown -h now'}}")
    except: pass

def get_hardware_info():
    hw = {{
        "cpu": {{ "model": platform.processor(), "cores": psutil.cpu_count(), "threads": psutil.cpu_count(logical=True), "baseSpeed": "N/A", "architecture": platform.machine() }},
        "memory": {{ "total": f"{{round(psutil.virtual_memory().total / (1024**3), 1)}} GB", "type": "RAM", "speed": "N/A", "formFactor": "N/A" }},
        "gpu": {{ "model": "N/A", "vram": "N/A", "driver": "N/A" }},
        "storage": []
    }}
    try:
        for p in psutil.disk_partitions(all=False):
            try:
                u = psutil.disk_usage(p.mountpoint)
                hw['storage'].append({{ "name": p.device, "model": "Generic", "size": f"{{round(u.total/(1024**3), 1)}} GB", "type": p.fstype, "interface": p.mountpoint, "usage": u.percent }})
            except: pass
    except: pass
    return hw

def get_pm2_stats():
    try:
        cmd = ['pm2', 'jlist']
        res = subprocess.check_output(cmd, shell=True) if os.name == 'nt' else subprocess.check_output(cmd)
        return [{{
            "pid": p.get("pid"), "name": p.get("name"), "pm_id": p.get("pm_id"),
            "status": p.get('pm2_env', {{}}).get('status', 'stopped'),
            "cpu": p.get('monit', {{}}).get('cpu', 0),
            "memory": round(p.get('monit', {{}}).get('memory', 0)/1024/1024, 1),
            "uptime": "0s", "restarts": p.get('pm2_env', {{}}).get('restart_time', 0)
        }} for p in json.loads(res)]
    except: return []

def main():
    hw = get_hardware_info()
    threading.Thread(target=terminal_worker, daemon=True).start()
    while True:
        try:
            mem = psutil.virtual_memory()
            net1 = psutil.net_io_counters(); time.sleep(1); net2 = psutil.net_io_counters()
            stats = {{
                "cpuUsage": psutil.cpu_percent(), "memoryUsage": mem.percent, "memoryUsed": round((mem.total-mem.available)/(1024**3), 2), "memoryTotal": round(mem.total/(1024**3), 2),
                "temperature": 0, "networkIn": round((net2.bytes_recv-net1.bytes_recv)/1024, 1), "networkOut": round((net2.bytes_sent-net1.bytes_sent)/1024, 1), "diskUsage": psutil.disk_usage('/').percent
            }}
            r = requests.post(API_ENDPOINT, json={{
                "id": DEVICE_ID, "name": DEVICE_NAME, "os": f"{{platform.system()}} {{platform.release()}}",
                "stats": stats, "processes": get_pm2_stats(), "hardware": hw
            }}, timeout=5)
            if r.status_code == 200:
                cmd = r.json().get('command')
                if cmd in ['reboot', 'shutdown']: execute_power_command(cmd)
        except: pass
        time.sleep(1)

if __name__ == "__main__": main()
"""
    with open("pimonitor_device.py", "w") as f: f.write(script)
    return "pimonitor_device.py"

def main():
    install_dependencies()
    while True:
        url = input("Server IP: ")
        if url and test_connection(validate_url(url)): break
    print(f"Done: {generate_agent_script(validate_url(url))}")

if __name__ == "__main__": main()
