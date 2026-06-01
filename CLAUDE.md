# CLAUDE.md — TACT Report Automation

Agent đọc file này **trước tiên**, sau đó đọc thêm các file trong `docs/` tùy theo task.

---

## Dự án là gì

Desktop app (Windows `.exe`) giúp phòng QC dệt may tự động chuyển dữ liệu từ file CSV raw của phần mềm TACT vào file Excel report. Thay thế hoàn toàn thao tác nhập tay lặp đi lặp lại.

Chi tiết nghiệp vụ: **`docs/PROJECT_CONTEXT.md`** — đọc file này để hiểu tại sao làm gì.

---

## Tech Stack

```
UI:        React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
Desktop:   Tauri 2 (Rust)
Backend:   Python 3.11 + FastAPI (chạy như sidecar process)
Excel/CSV: pandas + openpyxl
Build:     PyInstaller (Python → exe) + Tauri build (final installer)
State:     Zustand
Icons:     lucide-react
```

---

## Documentation Index

Đọc đúng file trước khi code:

| Task | Đọc file |
|---|---|
| Hiểu nghiệp vụ, bối cảnh | `docs/PROJECT_CONTEXT.md` |
| Kiến trúc tổng thể, cấu trúc thư mục | `docs/ARCHITECTURE.md` |
| Cấu trúc dữ liệu (Profile, Mapping...) | `docs/DATA_MODELS.md` |
| Logic nhận diện mã đơn / màu | `docs/MATCHING_LOGIC.md` |
| Luồng người dùng từng màn hình | `docs/UI_FLOWS.md` |
| Chi tiết từng màn hình (wireframe) | `docs/WIREFRAMES.md` |
| API giữa React ↔ Tauri ↔ Python | `docs/API_CONTRACTS.md` |
| Engine xử lý mapping CSV → Excel | `docs/MAPPING_RULES.md` |
| Colors, components, icons | `docs/DESIGN_SYSTEM.md` |
| Setup môi trường, build exe | `docs/BUILD_GUIDE.md` |

---

## Nguyên tắc code (bắt buộc)

### 1. Không tự thêm field vào Data Models

Mọi struct/interface/Pydantic model phải khớp với `docs/DATA_MODELS.md`. Nếu cần thêm field mới → cập nhật `DATA_MODELS.md` trước, sau đó mới code.

### 2. Không tự bịa API endpoint

Mọi endpoint và Tauri command phải có trong `docs/API_CONTRACTS.md`. Nếu cần endpoint mới → cập nhật `API_CONTRACTS.md` trước.

### 3. Python xử lý tất cả file logic

React và Rust không đọc/ghi CSV hay Excel trực tiếp. Mọi thứ liên quan đến file đều qua Python FastAPI.

### 4. Atomic write cho Excel

Không ghi thẳng vào file output. Luôn dùng pattern copy → ghi vào tmp → replace. Chi tiết trong `docs/MAPPING_RULES.md`.

### 5. Không bao giờ ghi đè file template

`profile.template.path` là readonly. Chỉ copy từ đây, không bao giờ save ngược lại.

### 6. i18n — Đa ngôn ngữ

App hỗ trợ **Tiếng Anh (mặc định)** và **Tiếng Việt**. Mọi string người dùng thấy phải đi qua hook `useTranslation` — không hardcode text trực tiếp vào JSX.

```tsx
// ✅ Đúng
const { t } = useTranslation()
<Button>{t('run.process')}</Button>

// ❌ Sai
<Button>Xác nhận Process</Button>
```

File translation: `src/i18n/en.ts` (mặc định) và `src/i18n/vi.ts`. Khi thêm string mới phải thêm vào **cả hai file**. Ngôn ngữ hiện tại lưu trong `AppConfig.language`, mặc định là `"en"`. Code comments và variable names bằng tiếng Anh.

### 7. Fail loud

Lỗi phải hiển thị rõ ràng cho user. Không âm thầm bỏ qua exception. Không return `null` khi lỗi — throw với message rõ ràng.

---

## Cấu trúc thư mục (tóm tắt)

```
tact-automation/
├── CLAUDE.md                  ← file này
├── CHANGELOG.md
├── docs/                      ← toàn bộ documentation
├── src-tauri/                 ← Rust / Tauri shell
│   └── src/
│       ├── main.rs
│       ├── commands/          ← file_dialog.rs, config.rs
│       └── sidecar.rs
├── src/                       ← React + TypeScript
│   ├── components/
│   │   ├── ProfileManager/
│   │   ├── MappingEditor/
│   │   └── RunMode/
│   ├── stores/                ← Zustand stores
│   ├── hooks/                 ← usePythonApi, useTauriCommands
│   └── types/index.ts
├── python-backend/            ← FastAPI sidecar
│   ├── main.py
│   ├── services/
│   │   ├── csv_reader.py
│   │   ├── excel_writer.py
│   │   ├── matcher.py
│   │   └── profile_loader.py
│   └── models/schemas.py
├── profiles/                  ← runtime data (gitignore)
└── scripts/
    ├── dev.ps1
    └── build.ps1
```

---

## Luồng chính (tóm tắt)

### Setup (làm 1 lần per test method)

```
Profile Manager → điền thông tin → Mapping Editor
→ chọn file CSV mẫu + Excel template
→ click link cột/ô → lưu profile JSON
```

### Run (hàng ngày)

```
Run Mode → chọn profile → chọn file(s) CSV
→ preview matching (mã đơn + màu)
→ confirm → Process
→ Python copy template → fill data → lưu report
```

---

## Python sidecar

- Port: `48921` (hardcode, localhost only)
- Start: Tauri spawn khi app mở
- Health check: `GET /api/health` — Tauri poll mỗi 5 giây
- Nếu sidecar chết: hiển thị status đỏ, nút restart

---

## Các lỗi thường gặp khi dev

**Sidecar không start:** Port bị chiếm hoặc PyInstaller thiếu hidden import → xem `docs/BUILD_GUIDE.md`

**Excel ghi sai ô:** Nhớ Excel dùng 1-based index, pandas dùng 0-based. Convert cẩn thận.

**Regex mã đơn/màu không match:** Test regex trong `docs/MATCHING_LOGIC.md` section "Bước 1"

**Profile không load:** Kiểm tra JSON hợp lệ và đúng schema trong `docs/DATA_MODELS.md`

---

## Chưa implement (backlog)

- [ ] Auto-detect test method từ tên file (nice-to-have, không phải MVP)
- [ ] Export profile để share giữa máy
- [ ] Dark mode
- [ ] Multi-language (hiện tại chỉ tiếng Việt)
- [ ] Multi-language (English by default, Vietnamese option)
