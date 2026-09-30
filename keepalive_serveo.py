import subprocess
import time
import re
import os

URL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "LIVE_URL.txt")

def log(msg):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)

def run_serveo_loop():
    log("Starting permanent Serveo tunnel daemon...")
    while True:
        try:
            log("Connecting to serveo.net on port 8080...")
            proc = subprocess.Popen(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30", "-R", "80:localhost:8080", "serveo.net"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            current_url = None
            for line in proc.stdout:
                line_str = line.strip()
                log(f"[serveo] {line_str}")
                match = re.search(r"https://[a-zA-Z0-9\.\-]+\.serveousercontent\.com", line_str)
                if match:
                    current_url = match.group(0)
                    log(f"*** ACTIVE PUBLIC URL: {current_url} ***")
                    with open(URL_FILE, "w", encoding="utf-8") as f:
                        f.write(f"{current_url}/index.html\n")
                        f.write(f"상태: 상시 자동 유지 중 (24시간 Keep-Alive)\n")
                        f.write(f"최종 갱신: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

            proc.wait()
            log(f"Serveo closed with returncode {proc.returncode}. Auto-reconnecting in 2 seconds...")
        except Exception as e:
            log(f"Error: {e}. Retrying in 5 seconds...")
            time.sleep(5)
        time.sleep(2)

if __name__ == "__main__":
    run_serveo_loop()
