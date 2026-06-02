# TACT Report Automation

> Ứng dụng desktop cho Windows giúp phòng QC dệt may **tự động chuyển dữ liệu từ file CSV của phần mềm TACT vào file Excel report** — thay thế hoàn toàn việc nhập tay lặp đi lặp lại.

<p align="center">
  <a href="https://github.com/Mixerod/TACT-Project/actions/workflows/ci.yml"><img src="https://github.com/Mixerod/TACT-Project/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Mixerod/TACT-Project/releases/latest"><img src="https://img.shields.io/github/v/release/Mixerod/TACT-Project?label=download" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/platform-Windows%2010%2F11-blue" alt="Platform">
</p>

---

## Ứng dụng làm gì?

Mỗi ngày phòng QC nhận nhiều file CSV thô do máy đo (qua phần mềm TACT) xuất ra, rồi phải **gõ tay** từng giá trị vào các ô đúng vị trí trong file Excel report theo mẫu. Việc này lặp lại, dễ sai, tốn thời gian.

App này tự động hoá toàn bộ:

1. **Thiết lập 1 lần** cho mỗi loại test (test method): chọn file CSV mẫu + file Excel template, rồi **click để nối** cột CSV ↔ ô Excel. Cấu hình lưu thành một "Profile".
2. **Dùng hàng ngày:** chọn Profile → chọn file CSV → app tự nhận diện **mã đơn + màu**, xem trước kết quả → bấm **Process** → app copy template, điền dữ liệu và lưu ra file report hoàn chỉnh.

Toàn bộ chạy **offline, trên máy cục bộ** — không gửi dữ liệu đi đâu.

### Tính năng chính

- 🗂️ **Profile Manager** — tạo/sửa/xoá cấu hình cho từng loại test.
- 🔗 **Mapping Editor** — nối cột CSV và ô Excel bằng cách click trực quan.
- 🤖 **Tự nhận diện mã đơn / màu** từ tên file hoặc nội dung.
- 👁️ **Xem trước (preview)** kết quả matching trước khi ghi.
- 📊 **Xử lý hàng loạt** nhiều file CSV cùng lúc.
- 🛟 **Ghi an toàn (atomic write)** — không bao giờ ghi đè file template gốc.
- 🌐 **Đa ngôn ngữ** — Tiếng Anh (mặc định) và Tiếng Việt.

---

## 📥 Cài đặt (dành cho người dùng cuối)

> Không cần cài Python, Node hay bất cứ thứ gì khác. Chỉ cần Windows 10/11 64-bit.

1. Vào trang **[Releases](https://github.com/Mixerod/TACT-Project/releases/latest)**.
2. Tải file cài đặt trong mục **Assets**:
   - **`TACT.Report.Automation_x.y.z_x64-setup.exe`** — *khuyên dùng*. Bộ cài NSIS, **nhấn 1 phát là cài xong**, không cần quyền admin.
   - hoặc **`TACT.Report.Automation_x.y.z_x64_en-US.msi`** — bản MSI (phù hợp triển khai qua Group Policy).
3. Chạy file vừa tải → cài đặt → mở app từ Start Menu.

App tự khởi động backend khi mở. Cấu hình/Profile được lưu tại `%APPDATA%\TACTAutomation` và **không bị mất khi cài đè bản mới**.

> 💡 Nếu Windows SmartScreen cảnh báo "Unknown publisher" (do installer chưa ký số), chọn **More info → Run anyway**.

---

## 🚀 Tạo bản phát hành (dành cho maintainer)

Installer được build **tự động trên GitHub Actions** (Windows runner) và đăng lên trang Releases. Không cần build trên máy cá nhân:

```bash
# Đặt version trong src-tauri/tauri.conf.json (vd "1.0.0"), commit, rồi:
git tag v1.0.0
git push origin v1.0.0
```

Workflow [`release.yml`](.github/workflows/release.yml) sẽ:
build sidecar Python (PyInstaller) → build app Tauri → tạo file `.exe`/`.msi` → đính kèm vào một GitHub Release mới ứng với tag.

Cũng có thể chạy thủ công từ tab **Actions → Release → Run workflow**.

---

## 🛠️ Tech stack

| Layer | Công nghệ |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| UI | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand |
| Backend xử lý file | Python 3.11 + FastAPI (chạy như sidecar process) |
| Excel / CSV | pandas + openpyxl |
| Đóng gói | PyInstaller (Python → exe) + Tauri bundler (installer) |

Kiến trúc: React UI ⇄ Tauri (Rust) commands ⇄ Python FastAPI sidecar (`localhost:48921`). Mọi thao tác đọc/ghi CSV và Excel đều do Python xử lý. Chi tiết trong [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 💻 Phát triển (dành cho developer)

### Yêu cầu

| Công cụ | Phiên bản |
|---|---|
| Node.js | 20 LTS |
| Rust | stable (https://rustup.rs) |
| Python | 3.11.x |
| WebView2 Runtime | `winget install Microsoft.EdgeWebView2Runtime` |

### Cài đặt lần đầu

```powershell
git clone https://github.com/Mixerod/TACT-Project.git
cd TACT-Project

npm install                       # dependencies frontend + Tauri CLI

cd python-backend                 # virtualenv cho backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
cd ..
```

### Chạy dev

```powershell
npm run tauri dev
```

Ở chế độ dev, Rust shell tự chạy backend Python từ `.venv` (không cần build sidecar). Chi tiết: [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md).

### Build installer cục bộ (tùy chọn)

```powershell
.\scripts\build.ps1
```

Script này build sidecar Python rồi build app Tauri. Output: `src-tauri/target/release/bundle/`.

### Kiểm thử

```powershell
npm test                          # frontend (Vitest)

cd python-backend
.venv\Scripts\activate
pytest                            # backend (pytest)
```

---

## 📁 Cấu trúc thư mục

```
TACT-Project/
├── docs/              Tài liệu (kiến trúc, data models, mapping rules, build guide)
├── src/               React + TypeScript (ProfileManager, MappingEditor, RunMode)
├── src-tauri/         Rust / Tauri shell (commands, sidecar, config)
├── python-backend/    FastAPI sidecar (csv_reader, excel_writer, matcher)
├── scripts/           dev.ps1, build.ps1
└── .github/workflows/ ci.yml (test), release.yml (build installer)
```

---

## 📚 Tài liệu

| Chủ đề | File |
|---|---|
| Kiến trúc tổng thể | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Cấu trúc dữ liệu (Profile, Mapping) | [`docs/DATA_MODELS.md`](docs/DATA_MODELS.md) |
| Engine mapping CSV → Excel | [`docs/MAPPING_RULES.md`](docs/MAPPING_RULES.md) |
| API React ↔ Tauri ↔ Python | [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md) |
| Setup môi trường & build exe | [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md) |
| Checklist kiểm thử | [`docs/TEST_CHECKLIST.md`](docs/TEST_CHECKLIST.md) |
