# scripts\build.ps1
# All-in-one production build: bundles the Python sidecar with PyInstaller, then
# builds the Tauri app (.msi). Mirrors the documented steps in docs/BUILD_GUIDE.md.
#
# Prerequisites (see docs/BUILD_GUIDE.md):
#   - Python 3.11.x venv at python-backend\.venv  (PyInstaller installed)
#   - Rust stable toolchain + `cargo tauri` CLI    (required for Step 2)
#   - WebView2 runtime + MSVC C++ Build Tools
# The script aborts with a non-zero exit code if either step fails.

Write-Host "Building TACT Automation..." -ForegroundColor Cyan

# --- Preflight: fail early with a clear message if the toolchain is missing ---
if (-not (Test-Path "python-backend\.venv\Scripts\Activate.ps1")) {
  Write-Host "Python venv not found at python-backend\.venv - see docs/BUILD_GUIDE.md (Lan dau setup)." -ForegroundColor Red
  exit 1
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  Write-Host "Rust 'cargo' not found on PATH. Step 2 (Tauri build) needs the Rust toolchain." -ForegroundColor Red
  Write-Host "Install from https://rustup.rs then: cargo install tauri-cli" -ForegroundColor Red
  exit 1
}

# Step 1: Bundle Python
Write-Host "Step 1/2: Building Python sidecar..." -ForegroundColor Yellow
Push-Location python-backend
& ".venv\Scripts\Activate.ps1"

$pyArgs = @(
  "--onefile"
  "--name"; "tact-backend"
  "--distpath"; "../src-tauri/binaries/"
  "--clean"
  "--noconfirm"
  "--hidden-import=uvicorn.logging"
  "--hidden-import=uvicorn.loops.auto"
  "--hidden-import=uvicorn.protocols.http.auto"
  "--hidden-import=uvicorn.protocols.websockets.auto"
  "--hidden-import=uvicorn.lifespan.on"
  # Trim heavy libs that pandas/openpyxl can pull in lazily but our code never
  # uses. Shrinks the sidecar (~smaller installer, faster cold start on clean
  # machines where antivirus scans the unpacked exe each launch).
  "--exclude-module=matplotlib"
  "--exclude-module=tkinter"
  "--exclude-module=scipy"
  "--exclude-module=pytest"
  "--exclude-module=IPython"
  "--exclude-module=notebook"
  "main.py"
)
pyinstaller @pyArgs

if ($LASTEXITCODE -ne 0) {
  Write-Host "PyInstaller failed!" -ForegroundColor Red
  Pop-Location
  exit 1
}

Rename-Item -Path "..\src-tauri\binaries\tact-backend.exe" -NewName "tact-backend-x86_64-pc-windows-msvc.exe" -Force
Pop-Location

# Step 2: Build Tauri
Write-Host "Step 2/2: Building Tauri app..." -ForegroundColor Yellow
npm run tauri build

if ($LASTEXITCODE -ne 0) {
  Write-Host "Tauri build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
Write-Host "Installer in: src-tauri\target\release\bundle\msi" -ForegroundColor Green
