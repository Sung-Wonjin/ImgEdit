@echo off
if "%1"=="run" goto :run

:: Re-launch inside a persistent cmd window
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

echo.
echo  ImgEdit - Starting...
echo  =========================================

echo [1/4] Checking Python...
set "SYS_PYTHON="

where python >/dev/null 2>&1
if not errorlevel 1 set "SYS_PYTHON=python"

if not defined SYS_PYTHON (
    where python3 >/dev/null 2>&1
    if not errorlevel 1 set "SYS_PYTHON=python3"
)

if defined SYS_PYTHON (
    echo  Python found: !SYS_PYTHON!
    goto :setup_venv
)

echo  Python not found. Installing via winget...
winget install --id Python.Python.3.11 --source winget --silent --accept-package-agreements --accept-source-agreements

where python >/dev/null 2>&1
if not errorlevel 1 (
    set "SYS_PYTHON=python"
    goto :setup_venv
)

echo  winget failed. Downloading installer...
set "INSTALLER=%TEMP%\python_installer.exe"
curl -L -o "%INSTALLER%" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
if errorlevel 1 (
    echo  [ERROR] Download failed. Please install Python manually.
    echo  https://www.python.org/downloads/
    goto :end
)
echo  Installing Python...
"%INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
del "%INSTALLER%"

where python >/dev/null 2>&1
if errorlevel 1 (
    echo  [ERROR] Python install failed. Please restart and try again.
    goto :end
)
set "SYS_PYTHON=python"

:setup_venv
echo [2/4] Setting up virtual environment...
if not exist "%PYTHON%" (
    echo  Creating venv...
    !SYS_PYTHON! -m venv "%VENV%"
    if errorlevel 1 (
        echo  [ERROR] Failed to create venv.
        goto :end
    )
    echo  Venv created.
) else (
    echo  Venv already exists.
)

echo [3/4] Installing packages...
"%PYTHON%" -c "import fastapi" >/dev/null 2>&1
if errorlevel 1 (
    echo  Installing packages (first time only)...
    "%PIP%" install --quiet -r "%BACKEND%\requirements.txt"
    if errorlevel 1 (
        echo  [ERROR] pip install failed.
        goto :end
    )
    echo  Packages installed.
) else (
    echo  Packages already installed.
)

echo [4/4] Starting server...

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
"%PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port %PORT%
echo.
echo  Server stopped.

:end
echo.
echo Press any key to close...
pause >/dev/null
