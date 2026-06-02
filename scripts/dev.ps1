Write-Host "Starting TACT Automation dev environment..." -ForegroundColor Cyan

# Start Python sidecar
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd python-backend; .venv\Scripts\activate; uvicorn main:app --host 127.0.0.1 --port 48921 --reload"

# Wait for sidecar ready
Start-Sleep -Seconds 3

# Start Tauri dev
npm run tauri dev
