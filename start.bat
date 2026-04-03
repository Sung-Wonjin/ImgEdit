@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title ImgEdit

:: ── 경로 설정 ────────────────────────────────────────────
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "VENV=%ROOT%.venv"
set "PYTHON=%VENV%\Scripts\python.exe"
set "PIP=%VENV%\Scripts\pip.exe"
set "PORT=8000"

echo.
echo  ██╗███╗   ███╗ ██████╗ ███████╗██████╗ ██╗████████╗
echo  ██║████╗ ████║██╔════╝ ██╔════╝██╔══██╗██║╚══██╔══╝
echo  ██║██╔████╔██║██║  ███╗█████╗  ██║  ██║██║   ██║
echo  ██║██║╚██╔╝██║██║   ██║██╔══╝  ██║  ██║██║   ██║
echo  ██║██║ ╚═╝ ██║╚██████╔╝███████╗██████╔╝██║   ██║
echo  ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═════╝ ╚═╝   ╚═╝
echo.
echo =========================================================

:: ── Python 확인 및 설치 ──────────────────────────────────
echo [1/4] Python 확인 중...

:: 먼저 시스템 python3 / python 확인
set "SYS_PYTHON="
where python >nul 2>&1 && set "SYS_PYTHON=python"
where python3 >nul 2>&1 && set "SYS_PYTHON=python3"

if defined SYS_PYTHON (
    for /f "tokens=2 delims= " %%v in ('!SYS_PYTHON! --version 2^>^&1') do set "PY_VER=%%v"
    echo     Python !PY_VER! 감지됨
) else (
    echo     Python이 설치되어 있지 않습니다. 자동 설치를 시작합니다...
    call :install_python
    if errorlevel 1 goto :error_python
)

:: ── 가상환경 생성 ────────────────────────────────────────
echo [2/4] 가상환경 확인 중...
if not exist "%PYTHON%" (
    echo     가상환경 생성 중...
    if defined SYS_PYTHON (
        !SYS_PYTHON! -m venv "%VENV%"
    ) else (
        python -m venv "%VENV%"
    )
    if errorlevel 1 goto :error_venv
    echo     가상환경 생성 완료
) else (
    echo     가상환경 이미 존재함
)

:: ── 패키지 설치 ─────────────────────────────────────────
echo [3/4] 패키지 확인 중...
"%PYTHON%" -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo     패키지 설치 중 (최초 1회)...
    "%PIP%" install --quiet -r "%BACKEND%\requirements.txt"
    if errorlevel 1 goto :error_pip
    echo     패키지 설치 완료
) else (
    echo     패키지 이미 설치됨
)

:: ── 포트 사용 여부 확인 ──────────────────────────────────
echo [4/4] 서버 시작 중...
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo     포트 %PORT% 이미 사용 중 - 기존 서버에 연결합니다.
    goto :open_browser
)

:: ── 서버 실행 ───────────────────────────────────────────
echo     http://localhost:%PORT% 에서 실행됩니다.
echo.
echo  브라우저가 자동으로 열립니다. 이 창을 닫으면 서버가 종료됩니다.
echo =========================================================

:: 3초 후 브라우저 오픈 (서버 기동 대기)
start "" cmd /c "timeout /t 2 >nul && start http://localhost:%PORT%"

:: 서버 실행 (포그라운드 - 창 닫으면 종료)
cd /d "%BACKEND%"
"%PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port %PORT%
goto :eof

:open_browser
start http://localhost:%PORT%
goto :eof

:: ── Python 자동 설치 ─────────────────────────────────────
:install_python
echo.
echo     winget으로 Python 설치를 시도합니다...
winget install --id Python.Python.3.11 --source winget --silent --accept-package-agreements --accept-source-agreements
if not errorlevel 1 (
    :: PATH 갱신
    for /f "tokens=*" %%i in ('where python 2^>nul') do set "SYS_PYTHON=python"
    if defined SYS_PYTHON (
        echo     Python 설치 완료
        exit /b 0
    )
)

:: winget 실패 시 공식 인스톨러 다운로드
echo     winget 실패 - 공식 인스톨러를 다운로드합니다...
set "PY_INSTALLER=%TEMP%\python_installer.exe"
curl -L -o "%PY_INSTALLER%" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
if errorlevel 1 (
    echo     다운로드 실패. 인터넷 연결을 확인하거나 수동으로 Python을 설치하세요.
    echo     https://www.python.org/downloads/
    exit /b 1
)
echo     설치 중... (잠시 기다려주세요)
"%PY_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
del "%PY_INSTALLER%"
:: 새 PATH 반영
for /f "tokens=*" %%i in ('where python 2^>nul') do set "SYS_PYTHON=python"
if not defined SYS_PYTHON (
    echo     설치 후 PATH 반영을 위해 터미널을 재시작하거나 PC를 재시작해주세요.
    exit /b 1
)
echo     Python 설치 완료
exit /b 0

:error_python
echo.
echo [오류] Python 설치에 실패했습니다.
echo        https://www.python.org/downloads/ 에서 수동으로 설치 후 다시 실행하세요.
pause
exit /b 1

:error_venv
echo.
echo [오류] 가상환경 생성에 실패했습니다.
pause
exit /b 1

:error_pip
echo.
echo [오류] 패키지 설치에 실패했습니다.
echo        인터넷 연결을 확인하고 다시 시도하세요.
pause
exit /b 1
