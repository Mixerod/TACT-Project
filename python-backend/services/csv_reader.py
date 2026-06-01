import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple

class CSVReaderError(Exception):
    def __init__(self, code: str, message: str, detail: str = ""):
        super().__init__(message)
        self.code = code
        self.message = message
        self.detail = detail

def read_csv_or_excel(file_path: str, sheet_name: str = "Result", preview_rows: int = 5) -> Dict[str, Any]:
    """
    Reads a CSV or Excel file and returns preview data.
    - If file_path ends with .csv: reads CSV, sheet_name is ignored/set to 'Result'.
    - If file_path ends with .xlsx or .xls: reads Excel sheet, list of sheets is returned.
    """
    path = Path(file_path)
    
    # 1. Edge Case: File does not exist
    if not path.exists():
        raise CSVReaderError(
            code="FILE_NOT_FOUND",
            message=f"File không tồn tại tại đường dẫn: {file_path}",
            detail=f"Path not found: {file_path}"
        )
        
    ext = path.suffix.lower()
    
    try:
        if ext in ['.xlsx', '.xls']:
            try:
                excel_file = pd.ExcelFile(path)
            except Exception as e:
                raise CSVReaderError(
                    code="PARSE_ERROR",
                    message="Không thể đọc cấu trúc file Excel. Có thể file bị lỗi hoặc không đúng định dạng.",
                    detail=str(e)
                )
            
            all_sheets = excel_file.sheet_names
            
            # If sheet_name is not in sheets, check if we fallback or raise error
            if sheet_name not in all_sheets:
                # If they asked for the default 'Result' but it doesn't exist, fallback to the first sheet
                if sheet_name == "Result" and all_sheets:
                    sheet_name = all_sheets[0]
                else:
                    raise CSVReaderError(
                        code="SHEET_NOT_FOUND",
                        message=f"Sheet '{sheet_name}' không tồn tại trong file Excel.",
                        detail=f"Sheets available: {all_sheets}"
                    )
            
            try:
                # Read entire sheet or just head to save memory? 
                # We need total rows, so we read the sheet.
                df = pd.read_excel(path, sheet_name=sheet_name)
            except Exception as e:
                raise CSVReaderError(
                    code="PARSE_ERROR",
                    message=f"Không thể phân tích dữ liệu sheet '{sheet_name}'.",
                    detail=str(e)
                )
                
        elif ext == '.csv':
            all_sheets = ["Result"]
            sheet_name = "Result"
            try:
                # Some CSVs may have different encodings, try utf-8 then fallback to cp1252 or utf-8-sig
                try:
                    df = pd.read_csv(path, encoding='utf-8')
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(path, encoding='utf-8-sig')
                    except UnicodeDecodeError:
                        df = pd.read_csv(path, encoding='cp1252')
            except Exception as e:
                raise CSVReaderError(
                    code="PARSE_ERROR",
                    message="Không thể phân tích file CSV. Có thể file bị lỗi hoặc không đúng định dạng.",
                    detail=str(e)
                )
        else:
            raise CSVReaderError(
                code="PARSE_ERROR",
                message=f"Định dạng file '{ext}' không được hỗ trợ. Chỉ hỗ trợ .csv, .xlsx, .xls",
                detail=f"Unsupported extension: {ext}"
            )
            
        # Clean headers: convert all headers to string, strip whitespaces
        df.columns = [str(col).strip() for col in df.columns]
        headers = list(df.columns)
        
        # Prepare rows (handle NaN -> None for JSON serialization)
        preview_df = df.head(preview_rows)
        rows = []
        for _, row in preview_df.iterrows():
            row_dict = {}
            for col in headers:
                val = row[col]
                # Check for NaN/Null
                if pd.isna(val):
                    row_dict[col] = None
                elif isinstance(val, (int, float)):
                    # Check for inf/nan
                    if np.isinf(val) or np.isnan(val):
                        row_dict[col] = None
                    else:
                        row_dict[col] = val
                else:
                    row_dict[col] = val
            rows.append(row_dict)
            
        total_rows = len(df)
        
        return {
            "sheet_name": sheet_name,
            "headers": headers,
            "rows": rows,
            "total_rows": total_rows,
            "all_sheets": all_sheets
        }
        
    except CSVReaderError as cre:
        raise cre
    except Exception as e:
        raise CSVReaderError(
            code="PARSE_ERROR",
            message="Đã xảy ra lỗi không xác định khi đọc file.",
            detail=str(e)
        )
