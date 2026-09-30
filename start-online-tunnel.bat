@echo off
chcp 65001 > nul
echo ====================================================================
echo  화성시 청년정책협의체 동탄구 분과 온라인 웹사이트 실행기
echo ====================================================================
echo 1. 로컬 백그라운드 웹 서버 구동 확인...
start /B python -m http.server 8080 > nul 2>&1
timeout /t 2 > nul

echo 2. 인터넷 공개 전 세계 접속 HTTPS 주소 연결 중 (serveo.net)...
echo.
echo * 아래에 나타나는 https://xxxx.serveousercontent.com 주소를 복사하여
echo   스마트폰이나 다른 기기 브라우저에서 접속하시면 됩니다.
echo ====================================================================
echo.

ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 serveo.net
pause
