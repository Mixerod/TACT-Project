# API Contracts

Toàn bộ interface giữa các layer. Agent phải tuân thủ đúng contracts này — không tự thêm/đổi field mà không cập nhật file này.

---

## A. Tauri Commands (React → Rust)

Gọi bằng `invoke()` từ `@tauri-apps/api/core`.

### `open_file_dialog`

Mở file picker native Windows.

```typescript
invoke<string | null>('open_file_dialog', {
  title: string,          // Tiêu đề dialog
  filters: Array<{        // Filter loại file
    name: string,
    extensions: string[]
  }>,
  multiple: boolean       // Cho phép chọn nhiều file không
})
// Returns: đường dẫn file (string) hoặc null nếu user cancel
// Nếu multiple=true: trả về string[] thay vì string
```

### `open_folder_dialog`

```typescript
invoke<string | null>('open_folder_dialog', {
  title: string
})
// Returns: đường dẫn folder hoặc null
```

### `load_profiles`

```typescript
invoke<Profile[]>('load_profiles')
// Returns: mảng tất cả profiles từ thư mục profiles/
// Empty array nếu chưa có profile nào
```

### `save_profile`

```typescript
invoke<void>('save_profile', {
  profile: Profile        // Xem DATA_MODELS.md
})
// Tự tạo id nếu profile.id rỗng (profile mới)
// Tự set updated_at = now()
// Throws nếu write file thất bại
```

### `delete_profile`

```typescript
invoke<void>('delete_profile', {
  profileId: string
})
// Throws nếu profile không tồn tại
```

### `get_app_config`

```typescript
invoke<AppConfig>('get_app_config')
```

### `save_app_config`

```typescript
invoke<void>('save_app_config', {
  config: AppConfig
})
```

### `open_folder_in_explorer`

```typescript
invoke<void>('open_folder_in_explorer', {
  path: string
})
// Mở Windows Explorer tại đường dẫn đó
```

### `restart_python_sidecar`

```typescript
invoke<void>('restart_python_sidecar')
// Kill process cũ nếu còn sống, spawn lại
```

### `get_sidecar_status`

```typescript
invoke<'running' | 'starting' | 'dead'>('get_sidecar_status')
```

---

## B. Python FastAPI Endpoints (React → Python)

Base URL: `http://localhost:48921/api`

Tất cả request/response đều là JSON. Lỗi trả về:

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Mô tả lỗi tiếng Việt cho user",
  "detail": "Technical detail for logging"
}
```

---

### `POST /api/preview-csv`

Đọc file CSV và trả về dữ liệu preview.

**Request:**
```json
{
  "file_path": "C:/Lab/Data/ORD001_RED_Tensile.csv",
  "sheet_name": "Result",    // optional, default "Result"
  "preview_rows": 5          // optional, default 5
}
```

**Response:**
```json
{
  "sheet_name": "Result",
  "headers": ["Sample ID", "Max Force (N)", "Elongation (%)"],
  "rows": [
    { "Sample ID": "S-1", "Max Force (N)": 245.3, "Elongation (%)": 32.1 },
    { "Sample ID": "S-2", "Max Force (N)": 251.7, "Elongation (%)": 31.8 }
  ],
  "total_rows": 15,
  "all_sheets": ["Condition", "Result", "Summary"]
}
```

---

### `POST /api/preview-excel`

Đọc Excel template và trả về dữ liệu grid.

**Request:**
```json
{
  "file_path": "C:/Lab/Templates/tensile_template.xlsx",
  "sheet_name": "Results"
}
```

**Response:**
```json
{
  "sheet_name": "Results",
  "sheets": ["Results", "Summary"],
  "cells": [
    [
      { "address": "A1", "value": "Order", "row": 1, "col": 1,
        "col_letter": "A", "is_empty": false, "style_hint": "header" },
      { "address": "B1", "value": null, "row": 1, "col": 2,
        "col_letter": "B", "is_empty": true, "style_hint": "empty" }
    ]
  ],
  "row_count": 30,
  "col_count": 10
}
```

---

### `POST /api/extract-identity`

Extract mã đơn + màu từ file CSV theo config identity.

**Request:**
```json
{
  "file_path": "C:/Lab/Data/ORD001_RED_Tensile.csv",
  "identity_config": {
    "order_source": "both",
    "color_source": "both",
    "filename_regex": "^([A-Z0-9\\-]+)_([A-Z]+)_",
    "filename_order_group": 1,
    "filename_color_group": 2,
    "condition_sheet": "Condition",
    "condition_keys": ["Sample name", "Submission"]
  }
}
```

**Response:**
```json
{
  "order": "ORD001",
  "color": "RED",
  "order_source": "condition_sheet",
  "color_source": "condition_sheet",
  "confidence": "high",
  "warnings": []
}
```

---

### `POST /api/preview-batch`

Preview matching cho nhiều file CSV cùng lúc (trước khi process).

**Request:**
```json
{
  "file_paths": [
    "C:/Lab/Data/ORD001_RED_Tensile.csv",
    "C:/Lab/Data/ORD001_BLUE_Tensile.csv"
  ],
  "profile_id": "uuid-v4"
}
```

**Response:**
```json
{
  "items": [
    {
      "file_path": "C:/Lab/Data/ORD001_RED_Tensile.csv",
      "filename": "ORD001_RED_Tensile.csv",
      "identity": {
        "order": "ORD001",
        "color": "RED",
        "confidence": "high",
        "warnings": []
      },
      "output_file": "C:/Lab/Reports/Tensile/Report_ORD001_RED_20240115.xlsx",
      "output_exists": false,
      "status": "ready"
    }
  ]
}
```

`status` values: `"ready"` | `"warning"` | `"error"`

---

### `POST /api/process`

Thực thi process: đọc CSV → điền Excel → lưu.

**Request:**
```json
{
  "file_paths": ["C:/Lab/Data/ORD001_RED_Tensile.csv"],
  "profile_id": "uuid-v4"
}
```

**Response** (streaming JSON lines, mỗi dòng là 1 update):

```jsonl
{"type": "progress", "file": "ORD001_RED_Tensile.csv", "step": "reading_csv"}
{"type": "progress", "file": "ORD001_RED_Tensile.csv", "step": "writing_excel"}
{"type": "result", "file": "ORD001_RED_Tensile.csv", "status": "success", "output": "...", "rows_processed": 15, "duration_ms": 820}
{"type": "result", "file": "ORD001_BLUE_Tensile.csv", "status": "error", "error_message": "Template not found"}
{"type": "done", "total": 2, "success": 1, "error": 1}
```

React consume bằng `ReadableStream` / `EventSource`.

---

### `POST /api/validate-profile`

Validate profile trước khi lưu.

**Request:**
```json
{
  "profile": { ... }   // Profile object đầy đủ
}
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    { "field": "template.path", "message": "File không tồn tại tại đường dẫn này" }
  ],
  "warnings": [
    { "field": "output.directory", "message": "Thư mục chưa tồn tại, sẽ được tạo khi process" }
  ]
}
```

---

### `GET /api/health`

Kiểm tra sidecar còn sống không.

**Response:**
```json
{ "status": "ok", "version": "1.0.0" }
```

Tauri poll endpoint này mỗi 5 giây để cập nhật status indicator.

---

## C. Error Codes

| Code | Nghĩa |
|---|---|
| `FILE_NOT_FOUND` | File không tồn tại tại đường dẫn |
| `SHEET_NOT_FOUND` | Sheet không tồn tại trong file |
| `IDENTITY_FAILED` | Không extract được mã đơn |
| `TEMPLATE_NOT_FOUND` | File template không tồn tại |
| `WRITE_ERROR` | Không ghi được file output |
| `INVALID_MAPPING` | Mapping config không hợp lệ |
| `PROFILE_NOT_FOUND` | Profile id không tồn tại |
| `PARSE_ERROR` | Không đọc được file CSV/Excel |

---

## D. Lưu ý kỹ thuật

1. **Port** `48921` — hardcode, không configurable (tránh conflict với port thông dụng)
2. **Python sidecar khởi động mất ~2-3 giây** — React phải poll `/api/health` trước khi gọi bất kỳ endpoint nào
3. **Process endpoint dùng streaming** — không dùng response thông thường vì batch có thể chạy lâu
4. **Tất cả đường dẫn** gửi lên Python phải là absolute path (Tauri đã resolve trước khi gửi)
5. **React không cache** response từ preview-csv/preview-excel — luôn gọi lại khi user chọn file mới
