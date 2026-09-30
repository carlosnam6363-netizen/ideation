@echo off
chcp 65001 > nul
echo ====================================================================
echo  화성시 청년정책협의체 동탄구 플랫폼 -> GitHub 자동 업로드
echo ====================================================================
echo.
echo 1. 원격 GitHub 저장소(carlosnam6363-netizen/ideation) 연결 중...
git remote remove origin 2>nul
git remote add origin https://github.com/carlosnam6363-netizen/ideation.git
git branch -M main

echo 2. GitHub에 파일 업로드(Push)를 시작합니다...
echo (※ GitHub 로그인 창이 뜨면 브라우저를 통해 'Sign in with your browser'를 눌러 로그인해주세요)
echo.

git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo ====================================================================
    echo [성공] GitHub 저장소에 모든 파일이 정상적으로 업로드되었습니다!
    echo.
    echo 이제 GitHub Pages 설정 페이지만 켜주시면 1분 후 웹사이트가 열립니다.
    echo GitHub Pages 설정 페이지로 이동합니다...
    echo ====================================================================
    timeout /t 3 > nul
    start https://github.com/carlosnam6363-netizen/ideation/settings/pages
) else (
    echo.
    echo ====================================================================
    echo [안내] 업로드 중 로그인이 필요하거나 권한 오류가 발생했습니다.
    echo 팝업창에서 GitHub 로그인을 진행해주시거나 안내 가이드를 확인해주세요.
    echo ====================================================================
)

pause
