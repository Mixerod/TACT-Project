@echo off
TITLE TACT Automation Launcher

echo Checking for Python virtual environment...
if not exist "python-backend\.venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found in python-backend\.venv
    echo Please run setup instructions first.
    pause
    exit /b
)

echo Starting Python Backend in background...
start /min "TACT Backend" cmd /c "cd python-backend && .venv\Scripts\activate.bat && uvicorn main:app --port 48921"

echo Waiting for backend to initialize (3s)...
timeout /t 3 /nobreak > nul

echo Starting Tauri Frontend...
npm run tauri dev

echo.
echo Closing backend...
taskkill /FI "WINDOWTITLE eq TACT Backend*" /T /F > nul 2>&1
echo Done.
pause
