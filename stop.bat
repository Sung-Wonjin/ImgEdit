@echo off
echo Stopping ImgEdit server...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
    echo Server stopped. (PID: %%p)
)
timeout /t 1 >nul
