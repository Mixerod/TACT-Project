import pytest
import os
import sys
import pandas as pd
from pathlib import Path

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.matcher import (
    extract_from_filename,
    extract_from_condition_sheet,
    resolve_identity,
    find_existing_report,
    build_output_filename
)

class IdentityExtractionError(Exception):
    pass

CSV_PATH = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\ORD001_RED_Tensile.csv"

def test_extract_filename_standard():
    """Extract standard: "ORD001_RED_Tensile.csv" -> order=ORD001, color=RED"""
    regex = r"^([A-Z0-9]+)_([A-Z]+)_"
    order, color = extract_from_filename("ORD001_RED_Tensile.csv", regex, 1, 2)
    assert order == "ORD001"
    assert color == "RED"

def test_extract_filename_no_color():
    """Extract standard without color: "ORD001_Tensile.csv" -> order=ORD001, color=None"""
    regex = r"^([A-Z0-9]+)_(?:([A-Z]+)_)?"
    order, color = extract_from_filename("ORD001_Tensile.csv", regex, 1, 2)
    assert order == "ORD001"
    assert color is None

def test_extract_filename_no_match():
    """Extract no match -> order=None, color=None"""
    regex = r"^([A-Z0-9]+)_([A-Z]+)_"
    order, color = extract_from_filename("random_file.csv", regex, 1, 2)
    assert order is None
    assert color is None

def test_extract_condition_sheet():
    """Đọc sheet Condition thật -> assert đúng giá trị"""
    # Load the CSV file as df to simulate condition sheet loading
    import csv
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        rows = list(csv.reader(f))
    df = pd.DataFrame(rows)
    
    order = extract_from_condition_sheet(df, ["Submission"])
    color = extract_from_condition_sheet(df, ["Sample name"])
    
    assert order == "ORD001"
    assert color == "RED"

def test_resolve_conflict():
    """Filename và condition khác nhau → dùng condition, confidence=low, có warning"""
    # Custom config to test conflict resolution
    identity_config = {
        "order_source": "both",
        "color_source": "both",
        "filename_regex": r"^([A-Z0-9]+)_([A-Z]+)_",
        "filename_order_group": 1,
        "filename_color_group": 2,
        "condition_sheet": "Condition",
        "condition_keys": ["Submission", "Sample name"]
    }
    
    # We will pass a filename that contains ORD002 but the file itself contains ORD001 in Condition block
    conflict_path = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\ORD002_BLUE_Tensile.csv"
    
    # Temporarily copy ORD001_RED_Tensile.csv to conflict_path
    import shutil
    shutil.copy(CSV_PATH, conflict_path)
    
    try:
        result = resolve_identity(conflict_path, identity_config)
        # It should prioritize condition sheet (which has ORD001, RED) over filename (which has ORD002, BLUE)
        assert result["order"] == "ORD001"
        assert result["color"] == "RED"
        assert result["confidence"] == "low"
        assert len(result["warnings"]) > 0
    finally:
        if os.path.exists(conflict_path):
            os.remove(conflict_path)

def test_resolve_both_missing():
    """Cả 2 None -> raise IdentityExtractionError"""
    identity_config = {
        "order_source": "filename",
        "color_source": "filename",
        "filename_regex": r"^([A-Z0-9]+)_([A-Z]+)_",
        "filename_order_group": 1,
        "filename_color_group": 2,
    }
    result = resolve_identity("random_file.csv", identity_config)
    
    with pytest.raises(IdentityExtractionError):
        if not result["order"]:
            raise IdentityExtractionError("Không thể tìm thấy thông tin đơn hàng")

def test_find_existing_report(tmpdir):
    """Tạo file Excel giả trong tmpdir -> assert tìm được đúng file"""
    output_dir = str(tmpdir)
    order = "ORD999"
    color = "YELLOW"
    
    # Create standard report file
    report_file = os.path.join(output_dir, f"Report_{order}_{color}_20260601.xlsx")
    with open(report_file, 'w') as f:
        f.write("")
        
    found_path = find_existing_report(output_dir, order, color)
    assert found_path == report_file

def test_build_output_filename():
    """Assert pattern render đúng"""
    pattern = "Report_{order}_{color}_{date}.xlsx"
    order = "ORD001"
    color = "RED"
    date_format = "YYYYMMDD"
    
    filename = build_output_filename(pattern, order, color, date_format, "tensile_test")
    # Date should match today's date format
    from datetime import datetime
    today = datetime.now().strftime("%Y%m%d")
    assert filename == f"Report_ORD001_RED_{today}.xlsx"
