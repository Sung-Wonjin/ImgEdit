@echo off
chcp 65001 >nul
echo ImgEdit 서버를 종료합니다...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
    echo 서버가 종료되었습니다. (PID: %%p)
)
timeout /t 1 >nul
