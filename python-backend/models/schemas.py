from typing import List, Literal, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class SourceConfig(BaseModel):
    sheet_name: str = Field("Result", description="CSV or Excel sheet name containing data")
    header_row: int = Field(0, description="Row index of the headers (0-based)")

class TemplateConfig(BaseModel):
    path: str = Field(..., description="Absolute path to Excel template")
    sheet_name: str = Field(..., description="Excel sheet name to write into")

class OutputConfig(BaseModel):
    directory: str = Field(..., description="Absolute path to output directory")
    filename_pattern: str = Field(..., description="Filename pattern, e.g., Report_{order}_{color}_{date}.xlsx")
    date_format: str = Field("YYYYMMDD", description="Date format in filename")

class IdentityCell(BaseModel):
    field: Literal['order', 'color']
    cell: str

class IdentityConfig(BaseModel):
    order_source: Literal['filename', 'condition_sheet', 'both'] = Field("both")
    color_source: Literal['filename', 'condition_sheet', 'both'] = Field("both")
    filename_regex: str = Field("", description="Regex to extract order/color from filename")
    filename_order_group: int = Field(1, description="Regex group for order ID (1-based)")
    filename_color_group: int = Field(2, description="Regex group for color code (1-based)")
    condition_sheet: str = Field("Condition", description="Excel sheet name containing condition block")
    condition_keys: List[str] = Field(default_factory=list, description="Keys to look up in condition sheet")
    output_cells: List[IdentityCell] = Field(default_factory=list, description="Target Excel cells to write order/color")

class MappingModel(BaseModel):
    id: str
    type: Literal['column', 'cell', 'range']
    label: str
    # Column mapping fields
    csv_column: Optional[str] = None
    excel_column: Optional[str] = None
    excel_start_row: Optional[int] = None
    # Cell mapping fields
    value_source: Optional[str] = None
    excel_cell: Optional[str] = None
    # Range mapping fields
    csv_columns: Optional[List[str]] = None
    excel_start_cell: Optional[str] = None

class Profile(BaseModel):
    id: str
    name: str
    method_code: str
    created_at: str
    updated_at: str
    source: SourceConfig
    template: TemplateConfig
    output: OutputConfig
    identity: IdentityConfig
    mappings: List[MappingModel]

class IdentityResult(BaseModel):
    order: Optional[str] = None
    color: Optional[str] = None
    order_source: Optional[Literal['filename', 'condition_sheet']] = None
    color_source: Optional[Literal['filename', 'condition_sheet']] = None
    confidence: Literal['high', 'low']
    warnings: List[str] = Field(default_factory=list)

class CsvPreviewData(BaseModel):
    sheet_name: str
    headers: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    all_sheets: List[str]

class ExcelCellSchema(BaseModel):
    address: str
    value: Any
    row: int
    col: int
    col_letter: str
    is_empty: bool
    style_hint: Literal['header', 'data', 'formula', 'empty']

class ExcelPreviewData(BaseModel):
    sheet_name: str
    sheets: List[str]
    cells: List[List[ExcelCellSchema]]
    row_count: int
    col_count: int

class ProcessResult(BaseModel):
    status: Literal['success', 'error', 'skipped']
    input_file: str
    output_file: Optional[str] = None
    identity: IdentityResult
    rows_processed: int
    error_message: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)

class AppConfig(BaseModel):
    app_version: str = "1.0.0"
    profiles_directory: str
    last_used_profile_id: str
    python_port: int = 48921;
    theme: Literal['light', 'dark'] = "light"
    language: Literal['en', 'vi'] = "en"
