import re
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Union
import pandas as pd

def extract_from_filename(filename: str, regex: str, order_group: int, color_group: int) -> Tuple[Union[str, None], Union[str, None]]:
    """
    Extracts order ID and color from the filename using a regular expression.
    """
    if not filename or not regex:
        return None, None
        
    try:
        match = re.search(regex, filename)
        if match:
            order = match.group(order_group).strip() if order_group <= len(match.groups()) else None
            color = match.group(color_group).strip() if color_group <= len(match.groups()) else None
            return order, color
    except Exception as e:
        # Regex error, ignore and return None
        pass
    return None, None

def extract_from_condition_sheet(df: pd.DataFrame, keys: List[str]) -> Union[str, None]:
    """
    Searches for a cell matching one of the keys in df.
    If found, returns the value of the cell directly to its right.
    """
    if df is None or df.empty:
        return None
        
    keys_lower = [str(k).strip().lower() for k in keys]
    
    # Iterate through every row and col of the dataframe
    num_rows, num_cols = df.shape
    for r in range(num_rows):
        for c in range(num_cols - 1): # Check up to col_count - 1 so c+1 is always valid
            cell_val = df.iloc[r, c]
            if pd.isna(cell_val):
                continue
                
            cell_str = str(cell_val).strip().lower()
            if cell_str in keys_lower:
                right_val = df.iloc[r, c + 1]
                if not pd.isna(right_val):
                    val_str = str(right_val).strip()
                    if val_str:
                        return val_str
    return None

def resolve_identity(csv_path: str, identity_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts order ID and color from a file using filename matching and/or condition sheet search.
    Resolves the final identity based on the sources configuration and outputs confidence.
    """
    filename = Path(csv_path).name
    
    order_source = identity_config.get("order_source", "both")
    color_source = identity_config.get("color_source", "both")
    
    # 1. Extract from filename
    filename_regex = identity_config.get("filename_regex", "")
    order_group = identity_config.get("filename_order_group", 1)
    color_group = identity_config.get("filename_color_group", 2)
    
    fn_order, fn_color = extract_from_filename(filename, filename_regex, order_group, color_group)
    
    # 2. Extract from condition sheet
    cond_order = None
    cond_color = None
    searched_val = None
    
    condition_sheet_name = identity_config.get("condition_sheet", "Condition")
    condition_keys = identity_config.get("condition_keys", [])
    
    # Attempt to load condition sheet
    df_cond = None
    try:
        ext = Path(csv_path).suffix.lower()
        if ext in ['.xlsx', '.xls']:
            excel_file = pd.ExcelFile(csv_path)
            if condition_sheet_name in excel_file.sheet_names:
                df_cond = pd.read_excel(csv_path, sheet_name=condition_sheet_name)
        elif ext == '.csv':
            # Some CSV files might contain the condition block at the top, try loading the CSV
            # Use safe line-by-line csv reader to avoid varying columns errors
            import csv
            rows_list = []
            for encoding in ['utf-8', 'utf-8-sig', 'cp1252']:
                try:
                    with open(csv_path, 'r', encoding=encoding) as f:
                        reader = csv.reader(f)
                        rows_list = [row for row in reader]
                    break
                except UnicodeDecodeError:
                    continue
            if rows_list:
                df_cond = pd.DataFrame(rows_list)
    except Exception:
        # Ignore loading errors
        pass
        
    if df_cond is not None and len(condition_keys) > 0:
        # Clean headers if present in df_cond to match keys as well
        # In case the key is a column header:
        for key in condition_keys:
            key_clean = str(key).strip().lower()
            # Check column names
            for col_idx, col in enumerate(df_cond.columns):
                if str(col).strip().lower() == key_clean:
                    # Get first non-null row value in that column or the next column?
                    # The rule is "find cell, look to its right".
                    # If it's a column header, it's effectively a cell, so look to its right (col_idx + 1)
                    if col_idx + 1 < len(df_cond.columns) and len(df_cond) > 0:
                        right_val = df_cond.iloc[0, col_idx + 1]
                        if not pd.isna(right_val):
                            cond_val = str(right_val).strip()
                            if cond_val:
                                if not cond_order:
                                    cond_order = cond_val
                                else:
                                    cond_color = cond_val
                                    
        # Standard search through cells:
        searched_val = extract_from_condition_sheet(df_cond, condition_keys)
        if searched_val:
            # How to differentiate order vs color?
            # Typically, condition_keys contains multiple keys.
            # Let's search each key individually to classify order vs color.
            for key in condition_keys:
                single_val = extract_from_condition_sheet(df_cond, [key])
                if single_val:
                    # Classify: if order matches first group, or if key contains 'order'/'submission'/'name'
                    key_lower = str(key).lower()
                    if any(x in key_lower for x in ['name', 'order', 'mã', 'don', 'đơn', 'yêu cầu', 'submission']):
                        cond_order = single_val
                    else:
                        cond_color = single_val

    # fallback classification if not classified
    if not cond_order and searched_val:
        cond_order = searched_val
    elif cond_order and searched_val and searched_val != cond_order and not cond_color:
        cond_color = searched_val

    # 3. Resolve final values
    order = None
    color = None
    order_source_used = None
    color_source_used = None
    
    # Resolve Order
    if order_source == "filename":
        order = fn_order
        order_source_used = "filename" if fn_order else None
    elif order_source == "condition_sheet":
        order = cond_order
        order_source_used = "condition_sheet" if cond_order else None
    else: # "both"
        if cond_order:
            order = cond_order
            order_source_used = "condition_sheet"
        else:
            order = fn_order
            order_source_used = "filename" if fn_order else None
            
    # Resolve Color
    if color_source == "filename":
        color = fn_color
        color_source_used = "filename" if fn_color else None
    elif color_source == "condition_sheet":
        color = cond_color
        color_source_used = "condition_sheet" if cond_color else None
    else: # "both"
        if cond_color:
            color = cond_color
            color_source_used = "condition_sheet"
        else:
            color = fn_color
            color_source_used = "filename" if fn_color else None

    # 4. Determine confidence and warnings
    confidence = "high"
    warnings = []
    
    # Warning if filename and condition sheet values don't match
    if fn_order and cond_order:
        if fn_order.lower().replace(" ", "") != cond_order.lower().replace(" ", ""):
            confidence = "low"
            warnings.append("Mã đơn hàng từ tên file và sheet Condition không khớp nhau.")
            
    if fn_color and cond_color:
        if fn_color.lower().replace(" ", "") != cond_color.lower().replace(" ", ""):
            confidence = "low"
            warnings.append("Mã màu từ tên file và sheet Condition không khớp nhau.")
            
    if not order:
        confidence = "low"
        warnings.append("Không thể xác định được mã đơn hàng.")
        
    return {
        "order": order,
        "color": color,
        "order_source": order_source_used,
        "color_source": color_source_used,
        "confidence": confidence,
        "warnings": warnings
    }

def find_existing_report(output_dir: str, order: str, color: str) -> Union[str, None]:
    """
    Searches for an existing report file in output_dir that matches the order and color.
    """
    path = Path(output_dir)
    if not path.exists() or not path.is_dir():
        return None
        
    if not order:
        return None
        
    order_clean = str(order).strip().lower()
    color_clean = str(color).strip().lower() if color else ""
    
    for f in path.iterdir():
        if f.is_file() and f.suffix.lower() == '.xlsx':
            if f.name.lower().endswith('.tmp.xlsx'):
                continue
            name_lower = f.name.lower()
            if order_clean in name_lower:
                if not color_clean or color_clean in name_lower:
                    return str(f)
                    
    return None

def format_date(date_format: str) -> str:
    """
    Converts JS/C# style date formats (e.g. YYYYMMDD) to Python strftime formats
    and returns the formatted system date.
    """
    fmt = date_format.upper()
    fmt = fmt.replace("YYYY", "%Y").replace("MM", "%m").replace("DD", "%d")
    return datetime.now().strftime(fmt)

def build_output_filename(pattern: str, order: str, color: str, date_format: str, method_code: str = "") -> str:
    """
    Builds the output filename using the pattern and parameters.
    """
    date_str = format_date(date_format)
    
    # Replace pattern placeholders
    filename = pattern
    filename = filename.replace("{order}", order or "UNKNOWN")
    filename = filename.replace("{color}", color or "")
    filename = filename.replace("{date}", date_str)
    filename = filename.replace("{method}", method_code or "")
    
    # Clean up double underscores or hyphens in case color is empty
    filename = filename.replace("__", "_").replace("--", "-")
    
    # Ensure it ends with .xlsx
    if not filename.endswith('.xlsx'):
        filename += '.xlsx'
        
    return filename
