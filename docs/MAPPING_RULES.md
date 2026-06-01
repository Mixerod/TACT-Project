# Mapping Rules

Chi tiết cách Python engine xử lý từng loại mapping. Agent đọc file này trước khi code `excel_writer.py`.

---

## Thứ tự thực thi

Khi process một file CSV, engine thực thi các mapping theo thứ tự sau:

```
1. Identity mapping  → điền mã đơn, mã màu vào ô cố định
2. Cell mapping      → điền các ô đơn lẻ (ngày, tên method...)
3. Column mapping    → điền data lặp theo từng mẫu
4. Range mapping     → paste block data
```

Thứ tự này quan trọng vì một số ô Excel có thể bị ghi đè nếu thứ tự sai.

---

## Loại 1 — Column Mapping

### Đầu vào

```json
{
  "type": "column",
  "csv_column": "Max Force (N)",
  "excel_column": "D",
  "excel_start_row": 10
}
```

### Thuật toán

```python
def apply_column_mapping(ws, df, mapping):
    col_letter = mapping['excel_column']        # "D"
    start_row  = mapping['excel_start_row']     # 10
    csv_col    = mapping['csv_column']          # "Max Force (N)"

    if csv_col not in df.columns:
        raise MappingError(f"Cột '{csv_col}' không tồn tại trong CSV")

    values = df[csv_col].tolist()               # [245.3, 251.7, 248.9, ...]

    for i, value in enumerate(values):
        cell_addr = f"{col_letter}{start_row + i}"  # D10, D11, D12...
        ws[cell_addr] = value
```

### Xử lý giá trị đặc biệt

| Giá trị CSV | Hành động |
|---|---|
| `NaN` / `None` | Ghi `None` vào ô Excel (ô trống) |
| String số `"245.3"` | Tự động convert sang float |
| String `"N/A"`, `"-"` | Giữ nguyên string |
| Quá nhiều decimal | Giữ nguyên, không round (Excel tự format) |

---

## Loại 2 — Cell Mapping

### Đầu vào

```json
{
  "type": "cell",
  "value_source": "system_date",
  "excel_cell": "C5"
}
```

### Resolve value_source

```python
def resolve_cell_value(value_source: str, context: ProcessContext) -> any:
    if value_source == "system_date":
        return datetime.now().strftime("%d/%m/%Y")

    if value_source == "csv_filename":
        return Path(context.csv_path).stem  # tên file không có extension

    if value_source.startswith("static:"):
        return value_source[7:]  # "static:ISO 13934-1" → "ISO 13934-1"

    # Còn lại: tên cột CSV → lấy giá trị row đầu tiên
    if value_source in context.df.columns:
        return context.df[value_source].iloc[0]

    raise MappingError(f"value_source không hợp lệ: '{value_source}'")
```

---

## Loại 3 — Range Mapping

### Đầu vào

```json
{
  "type": "range",
  "csv_columns": ["Sample ID", "Max Force (N)", "Elongation (%)"],
  "excel_start_cell": "B10"
}
```

### Thuật toán

```python
def apply_range_mapping(ws, df, mapping):
    start_cell = mapping['excel_start_cell']    # "B10"
    csv_columns = mapping['csv_columns']

    # Parse start cell
    col_letter, start_row = parse_cell(start_cell)  # ("B", 10)
    col_index = col_letter_to_index(col_letter)      # B=2

    for row_i, (_, row) in enumerate(df[csv_columns].iterrows()):
        for col_i, csv_col in enumerate(csv_columns):
            current_col = index_to_col_letter(col_index + col_i)
            cell_addr = f"{current_col}{start_row + row_i}"
            ws[cell_addr] = row[csv_col]
```

Ví dụ với `start_cell="B10"` và 3 cột, 15 mẫu:
- Cột 1 (Sample ID): B10 → B24
- Cột 2 (Max Force): C10 → C24
- Cột 3 (Elongation): D10 → D24

---

## Loại 4 — Identity Mapping

### Đầu vào (từ `profile.identity.output_cells`)

```json
[
  { "field": "order", "cell": "C3" },
  { "field": "color", "cell": "C4" }
]
```

### Thuật toán

```python
def apply_identity_mapping(ws, identity_result, output_cells):
    field_values = {
        "order": identity_result.order,
        "color": identity_result.color
    }
    for cell_config in output_cells:
        value = field_values.get(cell_config['field'])
        if value:
            ws[cell_config['cell']] = value
```

---

## Copy Template

**Quan trọng: Không bao giờ ghi đè file template gốc.**

```python
def prepare_output_file(profile: Profile, identity: IdentityResult) -> str:
    """
    Tìm hoặc tạo file output. Trả về đường dẫn file sẽ được ghi.
    """
    # Tìm file có sẵn
    existing = find_existing_report(
        profile.output.directory,
        identity.order,
        identity.color
    )
    if existing:
        return existing  # Ghi đè vào file có sẵn

    # Tạo file mới từ template
    output_filename = build_output_filename(
        profile.output.filename_pattern,
        identity.order,
        identity.color,
        profile.output.date_format
    )
    output_path = Path(profile.output.directory) / output_filename

    # Copy template → output (KHÔNG dùng move, KHÔNG xóa template)
    shutil.copy2(profile.template.path, output_path)

    return str(output_path)
```

---

## Atomic Write

Để tránh file report bị corrupt nếu process fail giữa chừng:

```python
def write_excel_safe(output_path: str, write_fn):
    """
    Ghi vào file tạm trước, sau đó replace file thật.
    Nếu lỗi → xóa file tạm, file thật không bị ảnh hưởng.
    """
    tmp_path = output_path + ".tmp"
    try:
        shutil.copy2(output_path, tmp_path)  # copy sang tmp
        wb = load_workbook(tmp_path)
        ws = wb[profile.template.sheet_name]
        write_fn(ws)                          # ghi vào tmp
        wb.save(tmp_path)
        os.replace(tmp_path, output_path)    # atomic replace
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)              # dọn tmp nếu lỗi
        raise e
```

---

## Validation trước khi ghi

Trước khi apply bất kỳ mapping nào, engine kiểm tra:

```python
def validate_before_write(profile, df, identity):
    errors = []

    # 1. Template tồn tại
    if not Path(profile.template.path).exists():
        errors.append("Template file không tìm thấy")

    # 2. Output directory tồn tại (tạo nếu chưa có)
    Path(profile.output.directory).mkdir(parents=True, exist_ok=True)

    # 3. Tất cả csv_column trong column/range mappings tồn tại trong df
    for m in profile.mappings:
        if m['type'] == 'column' and m['csv_column'] not in df.columns:
            errors.append(f"Cột '{m['csv_column']}' không tìm thấy trong CSV")

    # 4. Identity có order (bắt buộc)
    if not identity.order:
        errors.append("Không xác định được mã đơn hàng")

    if errors:
        raise ValidationError(errors)
```

---

## Logging

Mỗi mapping operation được log ở level DEBUG:

```
[INFO]  Processing: ORD001_RED_Tensile.csv
[DEBUG] Identity: order=ORD001, color=RED, confidence=high
[DEBUG] Column mapping: 'Max Force (N)' → D10:D24 (15 rows)
[DEBUG] Cell mapping: system_date → C5 = '15/01/2024'
[DEBUG] Identity mapping: order → C3 = 'ORD001'
[INFO]  Saved: Report_ORD001_RED_20240115.xlsx (0.82s)
```

Log file: `%APPDATA%/TACTAutomation/logs/tact_YYYYMMDD.log`
