import subprocess
import time
import re
import sys
import os

URL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "LIVE_URL.txt")

def log(msg):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)

def run_tunnel():
    log("Starting persistent tunnel loop (IPv4 127.0.0.1:8080)...")
    while True:
        try:
            log("Connecting to localhost.run tunnel...")
            proc = subprocess.Popen(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30", "-R", "80:127.0.0.1:8080", "nokey@localhost.run"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            current_url = None
            for line in proc.stdout:
                line_str = line.strip()
                match = re.search(r"https://[a-zA-Z0-9\.\-]+\.lhr\.life", line_str)
                if match:
                    current_url = match.group(0)
                    log(f"*** PUBLIC HTTPS URL: {current_url} ***")
                    with open(URL_FILE, "w", encoding="utf-8") as f:
                        f.write(f"{current_url}/index.html\n")
                        f.write(f"Updated At: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

            proc.wait()
            log(f"Tunnel process exited with code {proc.returncode}. Reconnecting in 3 seconds...")
        except Exception as e:
            log(f"Error occurred: {e}. Reconnecting in 5 seconds...")
            time.sleep(5)
        time.sleep(3)

if __name__ == "__main__":
    run_tunnel()
