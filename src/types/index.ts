// src/types/index.ts

export type MappingType = 'column' | 'cell' | 'range';
export type ValueSource = 'system_date' | 'csv_filename' | `static:${string}` | string;
export type IdentitySource = 'filename' | 'condition_sheet' | 'both';

export interface ColumnMapping {
  id: string;
  type: 'column';
  label: string;
  csv_column: string;
  excel_column: string;
  excel_start_row: number;
}

export interface CellMapping {
  id: string;
  type: 'cell';
  label: string;
  value_source: ValueSource;
  excel_cell: string;
}

export interface RangeMapping {
  id: string;
  type: 'range';
  label: string;
  csv_columns: string[];
  excel_start_cell: string;
}

export type Mapping = ColumnMapping | CellMapping | RangeMapping;

export interface Profile {
  id: string;
  name: string;
  method_code: string;
  created_at: string;
  updated_at: string;
  source: {
    sheet_name: string;
    header_row: number;
  };
  template: {
    path: string;
    sheet_name: string;
  };
  output: {
    directory: string;
    filename_pattern: string;
    date_format: string;
  };
  identity: {
    order_source: IdentitySource;
    color_source: IdentitySource;
    filename_regex: string;
    filename_order_group: number;
    filename_color_group: number;
    condition_sheet: string;
    condition_keys: string[];
    output_cells: Array<{
      field: 'order' | 'color';
      cell: string;
    }>;
  };
  mappings: Mapping[];
}

export interface IdentityResult {
  order: string | null;        // "ORD2024001"
  color: string | null;        // "RED"
  order_source: 'filename' | 'condition_sheet' | null;
  color_source: 'filename' | 'condition_sheet' | null;
  confidence: 'high' | 'low';  // high = cả 2 nguồn khớp nhau
  warnings: string[];          // ví dụ: ["filename và condition_sheet không khớp"]
}

export interface CsvPreviewData {
  sheet_name: string;
  headers: string[];           // ["Sample ID", "Max Force (N)", ...]
  rows: Record<string, any>[]; // 5 dòng đầu để preview
  total_rows: number;
  all_sheets: string[];        // tất cả sheet trong file
}

export interface ExcelCell {
  address: string;             // "B10"
  value: any;
  row: number;                 // 1-based (Excel convention)
  col: number;                 // 1-based
  col_letter: string;          // "B"
  is_empty: boolean;
  style_hint: 'header' | 'data' | 'formula' | 'empty';
}

export interface ExcelPreviewData {
  sheet_name: string;
  sheets: string[];
  cells: ExcelCell[][];        // 2D array, [row][col]
  row_count: number;
  col_count: number;
}

export interface ProcessResult {
  status: 'success' | 'error' | 'skipped';
  input_file: string;
  output_file: string | null;
  identity: IdentityResult;
  rows_processed: number;
  error_message: string | null;
  warnings: string[];
}

export interface AppConfig {
  app_version: string;
  profiles_directory: string;
  last_used_profile_id: string;
  python_port: number;
  theme: 'light' | 'dark';
  language: 'en' | 'vi';
}
