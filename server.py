import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print("==================================================================")
        print(" 화성시 청년정책협의체 동탄구 교육, 참여, 권리 분과 플랫폼 서버")
        print("==================================================================")
        print(f" * 로컬 서버 실행 중: {url}")
        print(" * 웹 브라우저가 자동으로 열립니다. 종료하려면 Ctrl+C를 누르세요.")
        print("==================================================================")
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버가 종료되었습니다.")
            sys.exit(0)

if __name__ == "__main__":
    run()
