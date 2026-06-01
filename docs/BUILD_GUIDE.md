# Build Guide

Hướng dẫn setup môi trường dev và build file `.exe` production. Đọc từ đầu đến cuối trước khi bắt tay.

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản | Link |
|---|---|---|
| Windows | 10/11 64-bit | — |
| Node.js | 20 LTS | https://nodejs.org |
| Rust | stable (latest) | https://rustup.rs |
| Python | 3.11.x | https://python.org |
| Git | any | https://git-scm.com |

> **Python phải là 3.11.x** — PyInstaller và một số thư viện chưa stable trên 3.12+

---

## Lần đầu setup (chạy 1 lần)

### 1. Clone và cài dependencies

```powershell
git clone <repo-url> tact-automation
cd tact-automation

# Cài Node dependencies (React + Tauri CLI)
npm install

# Cài Tauri CLI
cargo install tauri-cli

# Setup Python virtualenv
cd python-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Kiểm tra Rust + Tauri prerequisites

```powershell
# Kiểm tra WebView2 (cần cho Tauri trên Windows)
# Nếu chưa có: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
winget install Microsoft.EdgeWebView2Runtime

# Kiểm tra Microsoft C++ Build Tools
# Nếu chưa có: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

### 3. Verify setup

```powershell
node --version      # v20.x.x
rustc --version     # rustc 1.7x.x
python --version    # Python 3.11.x
cargo tauri --version
```

---

## Chạy môi trường dev

### Option A — Script tự động (khuyên dùng)

```powershell
.\scripts\dev.ps1
```

Script này sẽ:
1. Activate Python venv
2. Start FastAPI sidecar ở background (`localhost:48921`)
3. Start Vite dev server
4. Start Tauri dev window

### Option B — Chạy thủ công (debug từng phần)

**Terminal 1 — Python backend:**
```powershell
cd python-backend
.venv\Scripts\activate
uvicorn main:app --port 48921 --reload
```

**Terminal 2 — Tauri + React:**
```powershell
# Từ root project
npm run tauri dev
```

### Hot reload

- **React:** tự động (Vite HMR)
- **Python:** tự động khi `--reload` flag
- **Rust:** cần restart `npm run tauri dev` khi sửa file `.rs`

---

## Cấu trúc `requirements.txt`

```
fastapi==0.110.0
uvicorn[standard]==0.27.1
pandas==2.2.0
openpyxl==3.1.2
pydantic==2.6.0
pyinstaller==6.4.0
```

---

## Build production `.exe`

### Bước 1 — Bundle Python sidecar

```powershell
cd python-backend
.venv\Scripts\activate

pyinstaller `
  --onefile `
  --name tact-backend `
  --distpath ../src-tauri/binaries/ `
  --hidden-import=uvicorn.logging `
  --hidden-import=uvicorn.loops `
  --hidden-import=uvicorn.loops.auto `
  --hidden-import=uvicorn.protocols `
  --hidden-import=uvicorn.protocols.http `
  --hidden-import=uvicorn.protocols.http.auto `
  --hidden-import=uvicorn.protocols.websockets `
  --hidden-import=uvicorn.protocols.websockets.auto `
  --hidden-import=uvicorn.lifespan `
  --hidden-import=uvicorn.lifespan.on `
  main.py

cd ..
```

Output: `src-tauri/binaries/tact-backend.exe`

> Sau khi PyInstaller xong, đổi tên file theo Tauri sidecar convention:
> `tact-backend.exe` → `tact-backend-x86_64-pc-windows-msvc.exe`

```powershell
Rename-Item `
  src-tauri\binaries\tact-backend.exe `
  tact-backend-x86_64-pc-windows-msvc.exe
```

### Bước 2 — Build Tauri app

```powershell
npm run tauri build
```

Output: `src-tauri/target/release/bundle/msi/TACTAutomation_1.0.0_x64_en-US.msi`

### Script build all-in-one

```powershell
# scripts\build.ps1
.\scripts\build.ps1
```

Chạy cả 2 bước trên tự động, báo lỗi nếu có bước nào fail.

---

## Cấu hình `tauri.conf.json` quan trọng

```json
{
  "bundle": {
    "active": true,
    "targets": ["msi"],
    "identifier": "com.lab.tact-automation",
    "externalBin": ["binaries/tact-backend"]
  },
  "app": {
    "windows": [{
      "title": "TACT Report Automation",
      "width": 1200,
      "height": 700,
      "minWidth": 1100,
      "minHeight": 650,
      "resizable": true
    }]
  }
}
```

---

## Deploy cho người dùng

1. Copy file `.msi` vào máy target
2. Double-click cài đặt — không cần cài Python, Node, hay Rust
3. App tự khởi động Python sidecar khi mở
4. File profiles lưu tại `%APPDATA%\TACTAutomation\profiles\`
5. Log lưu tại `%APPDATA%\TACTAutomation\logs\`

### Cập nhật phiên bản

Build file `.msi` mới → copy đè lên máy → cài đè (profiles không bị xóa vì nằm ở `%APPDATA%`).

---

## Troubleshooting thường gặp

### Python sidecar không start

```
Triệu chứng: Status dot đỏ, mọi API call fail
Nguyên nhân thường gặp:
  1. Port 48921 bị chiếm → kiểm tra: netstat -ano | findstr 48921
  2. PyInstaller thiếu hidden import → rebuild với đầy đủ flag
  3. Antivirus chặn exe → thêm exception cho TACTAutomation

Fix nhanh: Click status dot → "Restart sidecar"
```

### `cargo tauri build` báo lỗi WebView2

```
Cài WebView2 runtime:
winget install Microsoft.EdgeWebView2Runtime
```

### PyInstaller build xong nhưng sidecar crash ngay

```powershell
# Test sidecar độc lập
src-tauri\binaries\tact-backend-x86_64-pc-windows-msvc.exe

# Xem log output để tìm missing module
# Thường fix bằng thêm --hidden-import vào lệnh PyInstaller
```

### `openpyxl` không đọc được file Excel cũ (`.xls`)

```
openpyxl chỉ đọc .xlsx — file .xls phải convert sang .xlsx trước
Thông báo lỗi rõ ràng cho user nếu gặp file .xls
```

### React không connect được Python API trong dev

```
Kiểm tra:
1. Python terminal có báo lỗi không
2. curl http://localhost:48921/api/health
3. Firewall Windows có chặn port 48921 không
```

---

## Scripts PowerShell

### `scripts\dev.ps1`

```powershell
Write-Host "Starting TACT Automation dev environment..." -ForegroundColor Cyan

# Start Python sidecar
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd python-backend; .venv\Scripts\activate; uvicorn main:app --port 48921 --reload"

# Wait for sidecar ready
Start-Sleep -Seconds 3

# Start Tauri dev
npm run tauri dev
```

### `scripts\build.ps1`

```powershell
Write-Host "Building TACT Automation..." -ForegroundColor Cyan

# Step 1: Bundle Python
Write-Host "Step 1/2: Building Python sidecar..." -ForegroundColor Yellow
cd python-backend
.venv\Scripts\activate

pyinstaller --onefile --name tact-backend `
  --distpath ../src-tauri/binaries/ `
  --hidden-import=uvicorn.logging `
  --hidden-import=uvicorn.loops.auto `
  --hidden-import=uvicorn.protocols.http.auto `
  --hidden-import=uvicorn.protocols.websockets.auto `
  --hidden-import=uvicorn.lifespan.on `
  main.py

if ($LASTEXITCODE -ne 0) {
  Write-Host "PyInstaller failed!" -ForegroundColor Red
  exit 1
}

Rename-Item `
  ..\src-tauri\binaries\tact-backend.exe `
  tact-backend-x86_64-pc-windows-msvc.exe `
  -Force

cd ..

# Step 2: Build Tauri
Write-Host "Step 2/2: Building Tauri app..." -ForegroundColor Yellow
npm run tauri build

if ($LASTEXITCODE -ne 0) {
  Write-Host "Tauri build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
Write-Host "Installer: src-tauri\target\release\bundle\msi\" -ForegroundColor Green
```
