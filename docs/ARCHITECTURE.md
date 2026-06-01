# Architecture

## Tech Stack

| Layer | Technology | Lý do chọn |
|---|---|---|
| Desktop shell | **Tauri 2 (Rust)** | Exe nhỏ (~5MB), native Windows performance, file system access |
| UI | **React 18 + TypeScript + Vite** | Component-based, dễ build Mapping Editor phức tạp |
| State management | **Zustand** | Nhẹ, đơn giản, đủ cho app này |
| Styling | **Tailwind CSS + shadcn/ui** | Nhất quán, nhanh, không cần custom CSS nhiều |
| Data processing | **Python 3.11 + FastAPI** | pandas + openpyxl mạnh nhất cho Excel/CSV |
| Python bundling | **PyInstaller** | Bundle Python runtime vào exe, user không cần cài Python |

---

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────┐
│                  Tauri Shell (Rust)                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │           React UI (TypeScript)             │   │
│  │                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │   │
│  │  │ Profile  │ │ Mapping  │ │    Run    │  │   │
│  │  │ Manager  │ │ Editor   │ │   Mode    │  │   │
│  │  └──────────┘ └──────────┘ └───────────┘  │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │ Tauri IPC commands            │
│  ┌──────────────────▼──────────────────────────┐   │
│  │           Rust Commands Layer               │   │
│  │  file_dialog │ config_rw │ spawn_sidecar    │   │
│  └──────────────────┬──────────────────────────┘   │
│                     │ HTTP localhost                │
│  ┌──────────────────▼──────────────────────────┐   │
│  │        Python Sidecar (FastAPI)             │   │
│  │  csv_reader │ excel_writer │ matcher        │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Giao tiếp giữa các layer

### React ↔ Tauri (IPC)

React gọi Tauri commands thông qua `@tauri-apps/api/core`:

```typescript
import { invoke } from '@tauri-apps/api/core'

// Mở file dialog native Windows
const filePath = await invoke<string>('open_file_dialog', {
  filters: [{ name: 'CSV', extensions: ['csv'] }]
})

// Đọc/ghi profile config
const profiles = await invoke<Profile[]>('load_profiles')
await invoke('save_profile', { profile })
```

### Tauri ↔ Python (HTTP)

Tauri spawn Python sidecar khi app khởi động. React gọi thẳng Python FastAPI qua HTTP localhost:

```typescript
// React gọi Python API trực tiếp
const response = await fetch('http://localhost:48921/api/preview-csv', {
  method: 'POST',
  body: JSON.stringify({ filePath })
})
```

Port `48921` cố định, chỉ bind localhost — không expose ra ngoài.

### Rust quản lý Python sidecar

```rust
// main.rs — spawn Python khi app start
fn start_python_sidecar() -> tauri::Result<()> {
    let sidecar = tauri::api::process::Command::new_sidecar("tact-backend")?;
    sidecar.spawn()?;
    Ok(())
}
```

---

## Cấu trúc thư mục dự án

```
tact-automation/
│
├── CLAUDE.md                        ← Agent đọc đầu tiên
├── CHANGELOG.md
│
├── docs/                            ← Toàn bộ tài liệu
│   ├── PROJECT_CONTEXT.md
│   ├── ARCHITECTURE.md              ← file này
│   ├── DATA_MODELS.md
│   ├── MATCHING_LOGIC.md
│   ├── UI_FLOWS.md
│   ├── WIREFRAMES.md
│   ├── API_CONTRACTS.md
│   ├── MAPPING_RULES.md
│   ├── DESIGN_SYSTEM.md
│   └── BUILD_GUIDE.md
│
├── src-tauri/                       ← Rust / Tauri
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs                  ← App entry, sidecar spawn
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── file_dialog.rs       ← Native file/folder picker
│       │   └── config.rs            ← Profile CRUD (đọc/ghi JSON)
│       └── sidecar.rs               ← Python process management
│
├── src/                             ← React + TypeScript
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ProfileManager/
│   │   │   ├── ProfileList.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   └── index.tsx
│   │   ├── MappingEditor/
│   │   │   ├── CsvPreviewTable.tsx
│   │   │   ├── ExcelPreviewTable.tsx
│   │   │   ├── MappingLinkLayer.tsx  ← SVG lines connecting links
│   │   │   ├── IdentityMappingPanel.tsx
│   │   │   └── index.tsx
│   │   └── RunMode/
│   │       ├── FileSelector.tsx
│   │       ├── ProcessButton.tsx
│   │       ├── ResultLog.tsx
│   │       └── index.tsx
│   ├── stores/
│   │   ├── profileStore.ts          ← Zustand: danh sách profiles
│   │   ├── mappingStore.ts          ← Zustand: mapping editor state
│   │   └── runStore.ts              ← Zustand: run mode state
│   ├── hooks/
│   │   ├── usePythonApi.ts          ← Fetch wrapper cho Python API
│   │   └── useTauriCommands.ts      ← Invoke wrapper cho Tauri
│   └── types/
│       └── index.ts                 ← Shared TypeScript types
│
├── python-backend/                  ← Python FastAPI sidecar
│   ├── main.py                      ← FastAPI app, routes
│   ├── requirements.txt
│   ├── services/
│   │   ├── csv_reader.py            ← Đọc CSV TACT, extract data
│   │   ├── excel_writer.py          ← Ghi vào Excel template
│   │   ├── matcher.py               ← Order/color matching logic
│   │   └── profile_loader.py        ← Load profile JSON
│   └── models/
│       └── schemas.py               ← Pydantic models
│
├── profiles/                        ← User data (runtime)
│   ├── tensile_iso13934.json
│   └── elastic_recovery.json
│
└── scripts/
    ├── dev.ps1                      ← Start dev environment
    └── build.ps1                    ← Build production .exe
```

---

## Luồng dữ liệu chính

### Setup flow (làm 1 lần)

```
Labtech mở Mapping Editor
  → Chọn file CSV mẫu + Excel template
  → Python API đọc cả 2 file, trả về preview data
  → React render 2 bảng song song
  → Labtech click link các cột/ô
  → Tauri lưu mapping thành profile JSON
```

### Run flow (dùng hàng ngày)

```
Labtech chọn profile + file(s) CSV mới
  → Python đọc CSV → extract mã đơn + màu
  → Python tìm file report tương ứng trong output_dir
      ├─ Có → mở file đó
      └─ Không có → copy template → đặt tên theo pattern
  → Python apply mapping → ghi data vào đúng ô
  → Lưu file → báo kết quả cho React UI
```

---

## Nguyên tắc thiết kế

1. **Python xử lý tất cả file logic** — Rust/React không đọc/ghi CSV hay Excel trực tiếp
2. **Profile JSON là source of truth** — mọi thứ về một test method đều nằm trong profile
3. **Không hardcode path** — tất cả đường dẫn đều từ profile hoặc do user chọn
4. **Fail loud** — lỗi phải hiển thị rõ ràng cho user, không âm thầm bỏ qua
5. **Idempotent processing** — chạy lại cùng file CSV không tạo ra file report trùng lặp

---

## Phiên bản và môi trường

| Thành phần | Phiên bản |
|---|---|
| Tauri | 2.x |
| Rust | stable (latest) |
| Node.js | 20 LTS |
| React | 18.x |
| TypeScript | 5.x |
| Python | 3.11 |
| FastAPI | 0.110+ |
| pandas | 2.x |
| openpyxl | 3.x |
| Target OS | Windows 10/11 (64-bit) |
