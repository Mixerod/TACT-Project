@echo off
TITLE TACT Automation - Initial Setup

echo ==========================================
echo    TACT Automation Setup - Starting...
echo ==========================================

:: 1. Check for Node.js
echo [1/3] Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is NOT installed!
    echo Vui long tai va cai dat Node.js tai: https://nodejs.org/ (Ban LTS)
    echo Sau khi cai xong, hay khoi dong lai may tinh va chay lai file nay.
    echo.
    pause
    exit /b
)
echo Node.js: OK

:: 2. Check for Python
echo [2/3] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python is NOT installed!
    echo Vui long tai va cai dat Python 3.11 tai: https://www.python.org/
    echo LUU Y: Khi cai dat nho tich vao o "Add Python to PATH".
    echo.
    pause
    exit /b
)
echo Python: OK

:: 3. Install Node dependencies
echo.
echo [3/3] Installing Node.js dependencies (npm install)...
echo Vui long cho trong giay lat...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install gap loi! Hay kiem tra ket noi mang.
    pause
    exit /b
)

:: 4. Python Backend Setup
echo.
echo [4/4] Setting up Python virtual environment...
if not exist "python-backend" (
    echo [ERROR] Khong tim thay thu muc python-backend!
    pause
    exit /b
)

cd python-backend
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating environment and installing Python libraries...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Cai dat thu vien Python gap loi!
    cd ..
    pause
    exit /b
)

cd ..

echo.
echo ==========================================
echo    CHUC MUNG! SETUP THANH CONG.
echo    Bay gio ban co the chay file 'run_dev.bat'.
echo ==========================================
pause
