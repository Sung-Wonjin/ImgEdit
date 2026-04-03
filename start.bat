@echo off
if "%1"=="run" goto :run

cmd /k ""%~f0" run"
exit /b

:run
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "VENV=%ROOT%.venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "PIP=%VENV%\Scripts\pip.exe"
set "PORT=8000"
set "LOG=%ROOT%start_log.txt"

echo ImgEdit Start Log > "%LOG%"
echo ROOT=%ROOT% >> "%LOG%"
echo BACKEND=%BACKEND% >> "%LOG%"
echo VENV=%VENV% >> "%LOG%"
echo PYTHON=%PYTHON% >> "%LOG%"
echo. >> "%LOG%"

echo.
echo  ImgEdit - Starting...
echo  =========================================

echo [1/4] Checking Python...
echo [1/4] Checking Python >> "%LOG%"
set "SYS_PYTHON="

where python >/dev/null 2>&1
if not errorlevel 1 set "SYS_PYTHON=python"

if not defined SYS_PYTHON (
    where python3 >/dev/null 2>&1
    if not errorlevel 1 set "SYS_PYTHON=python3"
)

if defined SYS_PYTHON (
    echo  Python found: !SYS_PYTHON!
    echo Python found: !SYS_PYTHON! >> "%LOG%"
    goto :setup_venv
)

echo  Python not found. Installing via winget...
echo Python not found - installing >> "%LOG%"
winget install --id Python.Python.3.11 --source winget --silent --accept-package-agreements --accept-source-agreements >> "%LOG%" 2>&1

where python >/dev/null 2>&1
if not errorlevel 1 (
    set "SYS_PYTHON=python"
    goto :setup_venv
)

echo  winget failed. Downloading installer...
set "INSTALLER=%TEMP%\python_installer.exe"
curl -L -o "%INSTALLER%" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
if errorlevel 1 (
    echo  [ERROR] Download failed.
    echo [ERROR] curl download failed >> "%LOG%"
    goto :end
)
"%INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
del "%INSTALLER%"

where python >/dev/null 2>&1
if errorlevel 1 (
    echo  [ERROR] Python install failed.
    echo [ERROR] Python install failed >> "%LOG%"
    goto :end
)
set "SYS_PYTHON=python"

:setup_venv
echo [2/4] Setting up virtual environment...
echo [2/4] venv setup >> "%LOG%"
if not exist "%PYTHON%" (
    echo  Creating venv...
    echo Creating venv with: !SYS_PYTHON! >> "%LOG%"
    !SYS_PYTHON! -m venv "%VENV%" >> "%LOG%" 2>&1
    echo venv exit code: %ERRORLEVEL% >> "%LOG%"
    if errorlevel 1 (
        echo  [ERROR] Failed to create venv.
        goto :end
    )
    echo  Venv created.
) else (
    echo  Venv already exists.
    echo Venv already exists >> "%LOG%"
)

echo [3/4] Installing packages...
echo [3/4] Installing packages >> "%LOG%"
echo Checking if fastapi exists... >> "%LOG%"

"%PYTHON%" -c "import fastapi" >/dev/null 2>&1
set "FASTAPI_CHECK=%ERRORLEVEL%"
echo fastapi check errorlevel: %FASTAPI_CHECK% >> "%LOG%"

if %FASTAPI_CHECK%==0 (
    echo  Packages already installed.
    echo Packages already installed >> "%LOG%"
    goto :start_server
)

echo  Installing packages (first time only)...
echo Running pip install >> "%LOG%"
echo Command: "%PYTHON%" -m pip install -r "%BACKEND%\requirements.txt" >> "%LOG%"

"%PYTHON%" -m pip install -r "%BACKEND%\requirements.txt" >> "%LOG%" 2>&1
set "PIP_CODE=%ERRORLEVEL%"
echo pip exit code: %PIP_CODE% >> "%LOG%"

if %PIP_CODE% neq 0 (
    echo  [ERROR] pip install failed. Check start_log.txt
    goto :end
)
echo  Packages installed.

:start_server
echo [4/4] Starting server...
echo [4/4] Starting server >> "%LOG%"

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >/dev/null 2>&1
if not errorlevel 1 (
    echo  Port %PORT% already in use. Opening browser...
    start http://localhost:%PORT%
    goto :end
)

echo  Server: http://localhost:%PORT%
echo  Close this window to stop the server.
echo  =========================================
echo.

start "" cmd /c "timeout /t 2 >/dev/null && start http://localhost:%PORT%"

cd /d "%BACKEND%"
echo Starting uvicorn >> "%LOG%"
"%PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port %PORT%
echo uvicorn exit code: %ERRORLEVEL% >> "%LOG%"
echo.
echo  Server stopped.

:end
echo.
echo Log saved to: %LOG%
echo Press any key to close...
pause >/dev/null
