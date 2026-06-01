# Data Models

Đây là **source of truth** cho tất cả cấu trúc dữ liệu trong dự án. Rust types, TypeScript types, và Python Pydantic models đều phải khớp với định nghĩa tại đây.

---

## 1. Profile

Profile là đơn vị cấu hình trung tâm — mô tả đầy đủ một phương pháp test.

### JSON Schema

```json
{
  "id": "uuid-v4",
  "name": "Tensile ISO 13934-1",
  "method_code": "tensile_iso13934_1",
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T09:30:00Z",

  "source": {
    "sheet_name": "Result",
    "header_row": 0
  },

  "template": {
    "path": "C:/Lab/Templates/tensile_iso13934_template.xlsx",
    "sheet_name": "Results"
  },

  "output": {
    "directory": "C:/Lab/Reports/Tensile_ISO13934/",
    "filename_pattern": "Report_{order}_{color}_{date}.xlsx",
    "date_format": "YYYYMMDD"
  },

  "identity": {
    "order_source": "both",
    "color_source": "both",
    "filename_regex": "^([A-Z0-9]+)_([A-Z]+)_",
    "filename_order_group": 1,
    "filename_color_group": 2,
    "condition_sheet": "Condition",
    "condition_keys": ["Sample name", "Submission"],
    "output_cells": [
      { "field": "order", "cell": "C3" },
      { "field": "color", "cell": "C4" }
    ]
  },

  "mappings": [
    {
      "id": "uuid-v4",
      "type": "column",
      "label": "Max Force",
      "csv_column": "Max Force (N)",
      "excel_column": "D",
      "excel_start_row": 10
    },
    {
      "id": "uuid-v4",
      "type": "cell",
      "label": "Test Date",
      "value_source": "system_date",
      "excel_cell": "C5"
    }
  ]
}
```

### Field definitions

**`source`**
- `sheet_name` — tên sheet trong CSV chứa kết quả (thường là `"Result"`)
- `header_row` — index dòng header (0-based), thường là `0`

**`template`**
- `path` — đường dẫn tuyệt đối đến file Excel template gốc (không bao giờ ghi đè file này)
- `sheet_name` — tên sheet trong Excel template để điền data

**`output`**
- `directory` — thư mục lưu file report đã điền
- `filename_pattern` — pattern đặt tên file output. Biến hợp lệ: `{order}`, `{color}`, `{date}`, `{method}`
- `date_format` — format ngày trong tên file

**`identity`**
- `order_source` — nguồn lấy mã đơn: `"filename"` | `"condition_sheet"` | `"both"` (both = ưu tiên condition_sheet, fallback sang filename)
- `color_source` — nguồn lấy mã màu: tương tự
- `filename_regex` — regex extract từ tên file
- `condition_keys` — danh sách giá trị ô để tìm trong sheet Condition (tìm ô kế bên phải)
- `output_cells` — danh sách ô trong Excel template để điền mã đơn/màu

---

## 2. Mapping Types

Ba loại mapping, xác định bởi field `type`:

### 2a. Column Mapping — lặp theo số mẫu

Dùng khi một cột CSV → một cột Excel, lặp theo từng hàng mẫu.

```json
{
  "id": "uuid-v4",
  "type": "column",
  "label": "Max Force",
  "csv_column": "Max Force (N)",
  "excel_column": "D",
  "excel_start_row": 10
}
```

Kết quả: mẫu 1 → D10, mẫu 2 → D11, mẫu 3 → D12, ...

### 2b. Cell Mapping — điền một ô cố định

Dùng cho thông tin không lặp: ngày test, tên phương pháp, operator...

```json
{
  "id": "uuid-v4",
  "type": "cell",
  "label": "Test Date",
  "value_source": "system_date",
  "excel_cell": "C5"
}
```

`value_source` hợp lệ:
- `"system_date"` — ngày chạy process
- `"csv_filename"` — tên file CSV (không có extension)
- `"static:<value>"` — giá trị cố định, ví dụ `"static:ISO 13934-1"`
- `"<csv_column_name>"` — lấy giá trị từ cột CSV (lấy row đầu tiên)

### 2c. Range Mapping — paste cả vùng

Dùng khi cần copy nguyên một block data từ CSV vào một vùng Excel.

```json
{
  "id": "uuid-v4",
  "type": "range",
  "label": "Full Results Block",
  "csv_columns": ["Sample ID", "Max Force (N)", "Elongation (%)"],
  "excel_start_cell": "B10"
}
```

Kết quả: paste 3 cột bắt đầu từ B10, C10, D10 và xuống theo số mẫu.

---

## 3. Identity Extraction Result

Kết quả sau khi Python extract mã đơn + màu từ file CSV.

```typescript
interface IdentityResult {
  order: string | null        // "ORD2024001"
  color: string | null        // "RED"
  order_source: 'filename' | 'condition_sheet' | null
  color_source: 'filename' | 'condition_sheet' | null
  confidence: 'high' | 'low'  // high = cả 2 nguồn khớp nhau
  warnings: string[]          // ví dụ: ["filename và condition_sheet không khớp"]
}
```

---

## 4. CSV Preview Data

Dữ liệu Python trả về khi React cần hiển thị preview bảng CSV.

```typescript
interface CsvPreviewData {
  sheet_name: string
  headers: string[]           // ["Sample ID", "Max Force (N)", ...]
  rows: Record<string, any>[] // 5 dòng đầu để preview
  total_rows: number
  all_sheets: string[]        // tất cả sheet trong file
}
```

---

## 5. Excel Preview Data

Dữ liệu Python trả về khi React cần hiển thị preview file Excel template.

```typescript
interface ExcelPreviewData {
  sheet_name: string
  sheets: string[]
  cells: ExcelCell[][]        // 2D array, [row][col]
  row_count: number
  col_count: number
}

interface ExcelCell {
  address: string             // "B10"
  value: any
  row: number                 // 1-based (Excel convention)
  col: number                 // 1-based
  col_letter: string          // "B"
  is_empty: boolean
  style_hint: 'header' | 'data' | 'formula' | 'empty'
}
```

---

## 6. Process Result

Kết quả sau khi chạy process một file CSV.

```typescript
interface ProcessResult {
  status: 'success' | 'error' | 'skipped'
  input_file: string
  output_file: string | null
  identity: IdentityResult
  rows_processed: number
  error_message: string | null
  warnings: string[]
}
```

---

## 7. App Config

Cấu hình toàn cục của app (không phải profile). Lưu tại `%APPDATA%/TACTAutomation/config.json`.

```json
{
  "app_version": "1.0.0",
  "profiles_directory": "C:/Lab/TACTAutomation/profiles/",
  "last_used_profile_id": "uuid-v4",
  "python_port": 48921,
  "theme": "light",
  "language": "en"
}
```

---

## 8. TypeScript Types tổng hợp

```typescript
// src/types/index.ts

export type MappingType = 'column' | 'cell' | 'range'
export type ValueSource = 'system_date' | 'csv_filename' | `static:${string}` | string
export type IdentitySource = 'filename' | 'condition_sheet' | 'both'

export interface ColumnMapping {
  id: string
  type: 'column'
  label: string
  csv_column: string
  excel_column: string
  excel_start_row: number
}

export interface CellMapping {
  id: string
  type: 'cell'
  label: string
  value_source: ValueSource
  excel_cell: string
}

export interface RangeMapping {
  id: string
  type: 'range'
  label: string
  csv_columns: string[]
  excel_start_cell: string
}

export type Mapping = ColumnMapping | CellMapping | RangeMapping

export interface Profile {
  id: string
  name: string
  method_code: string
  created_at: string
  updated_at: string
  source: { sheet_name: string; header_row: number }
  template: { path: string; sheet_name: string }
  output: { directory: string; filename_pattern: string; date_format: string }
  identity: {
    order_source: IdentitySource
    color_source: IdentitySource
    filename_regex: string
    filename_order_group: number
    filename_color_group: number
    condition_sheet: string
    condition_keys: string[]
    output_cells: Array<{ field: 'order' | 'color'; cell: string }>
  }
  mappings: Mapping[]
}
```

---

## Quy ước

- Tất cả `id` dùng UUID v4
- Tất all timestamp dùng ISO 8601 UTC
- Excel cell address dùng A1 notation (`"B10"`, không phải `{row: 10, col: 2}`)
- Excel column letter dùng chữ hoa (`"D"`, không phải `"d"`)
- Đường dẫn file dùng absolute path, separator là `/` (Python/JS) hoặc `\\` (Rust Windows)
