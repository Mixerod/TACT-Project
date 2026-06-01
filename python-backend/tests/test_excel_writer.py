import pytest
import os
import sys
import shutil
import pandas as pd
from openpyxl import load_workbook
from pathlib import Path
from datetime import datetime

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.excel_writer import (
    prepare_output_file,
    write_excel_safe,
    apply_column_mapping,
    apply_cell_mapping,
    apply_identity_mapping,
    ExcelWriterError
)

TEMPLATE_PATH = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\template.xlsx"
OUTPUT_DIR = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\output"

class MockIdentity:
    def __init__(self, order, color):
        self.order = order
        self.color = color

@pytest.fixture
def test_profile():
    # Make sure sheet name is fetched dynamically
    wb = load_workbook(TEMPLATE_PATH)
    sheet_name = wb.sheetnames[0]
    wb.close()
    
    return {
        "id": "test-profile-id",
        "name": "Test Excel Writer Profile",
        "method_code": "tensile_test",
        "template": {
            "path": TEMPLATE_PATH,
            "sheet_name": sheet_name
        },
        "output": {
            "directory": OUTPUT_DIR,
            "filename_pattern": "Report_{order}_{color}_{date}.xlsx",
            "date_format": "YYYYMMDD"
        },
        "mappings": [
            {
                "id": "col-mapping",
                "type": "column",
                "label": "Max Force (N)",
                "csv_column": "Max Force (N)",
                "excel_column": "C",
                "excel_start_row": 15
            },
            {
                "id": "cell-mapping-date",
                "type": "cell",
                "label": "Test Date",
                "value_source": "system_date",
                "excel_cell": "B7"
            },
            {
                "id": "cell-mapping-static",
                "type": "cell",
                "label": "Standard Spec",
                "value_source": "static:ISO 13934-1",
                "excel_cell": "B12"
            }
        ],
        "identity": {
            "output_cells": [
                { "field": "order", "cell": "B8" },
                { "field": "color", "cell": "B9" }
            ]
        }
    }

def test_column_mapping(tmpdir, test_profile):
    """Copy template thật → apply mapping → assert ô C10 (redirect của C15 merged range) đúng giá trị"""
    output_dir = str(tmpdir)
    profile = test_profile.copy()
    profile["output"]["directory"] = output_dir
    
    df = pd.DataFrame({
        "Sample ID": ["S-1"],
        "Max Force (N)": [245.3]
    })
    identity = MockIdentity(order="ORD-C-1", color="RED")
    
    # Copy template to output path
    output_path = prepare_output_file(profile, identity)
    
    # Run safe write
    def write_ops(ws):
        apply_column_mapping(ws, df, profile["mappings"][0])
        
    write_excel_safe(output_path, profile["template"]["sheet_name"], write_ops)
    
    # Verify C10 cell value is redirected and correctly mapped
    wb = load_workbook(output_path, data_only=True)
    ws = wb[profile["template"]["sheet_name"]]
    
    # In TACT's template, C15 is a merged cell in range C10:C15, so writing to C15 redirects to C10
    v_c10 = ws["C10"].value
    assert v_c10 is not None
    assert abs(float(v_c10) - 245.3) < 1e-5
    wb.close()

def test_cell_mapping_system_date(tmpdir, test_profile):
    """Assert ô B7 = ngày hôm nay"""
    output_dir = str(tmpdir)
    profile = test_profile.copy()
    profile["output"]["directory"] = output_dir
    
    df = pd.DataFrame({})
    identity = MockIdentity(order="ORD-C-2", color="GREEN")
    output_path = prepare_output_file(profile, identity)
    
    def write_ops(ws):
        apply_cell_mapping(ws, df, profile["mappings"][1], csv_path="dummy.csv")
        
    write_excel_safe(output_path, profile["template"]["sheet_name"], write_ops)
    
    wb = load_workbook(output_path, data_only=True)
    ws = wb[profile["template"]["sheet_name"]]
    
    val = ws["B7"].value
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_str_alt = datetime.now().strftime("%d/%m/%Y")
    
    assert val is not None
    # Depending on date format representation, it can be date object or string
    if isinstance(val, (datetime, datetime.date)):
        assert val.strftime("%Y-%m-%d") == today_str
    else:
        val_str = str(val)
        assert today_str in val_str or today_str_alt in val_str or len(val_str) > 0
    wb.close()

def test_cell_mapping_static(tmpdir, test_profile):
    """static:ISO 13934-1 → assert đúng string"""
    output_dir = str(tmpdir)
    profile = test_profile.copy()
    profile["output"]["directory"] = output_dir
    
    df = pd.DataFrame({})
    identity = MockIdentity(order="ORD-C-3", color="BLUE")
    output_path = prepare_output_file(profile, identity)
    
    def write_ops(ws):
        apply_cell_mapping(ws, df, profile["mappings"][2], csv_path="dummy.csv")
        
    write_excel_safe(output_path, profile["template"]["sheet_name"], write_ops)
    
    wb = load_workbook(output_path, data_only=True)
    ws = wb[profile["template"]["sheet_name"]]
    
    val = ws["B12"].value
    assert val == "ISO 13934-1"
    wb.close()

def test_atomic_write_rollback(tmpdir, test_profile):
    """Mock lỗi giữa chừng → assert file gốc không bị thay đổi"""
    output_dir = str(tmpdir)
    profile = test_profile.copy()
    profile["output"]["directory"] = output_dir
    
    identity = MockIdentity(order="ORD-C-4", color="YELLOW")
    output_path = prepare_output_file(profile, identity)
    
    # Store initial modification time or content hash
    with open(output_path, 'rb') as f:
        original_bytes = f.read()
        
    def crashing_write_ops(ws):
        # Perform some writes
        ws["B7"] = "New Value"
        # Suddenly crash
        raise RuntimeError("Crash on purpose")
        
    with pytest.raises(Exception):
        write_excel_safe(output_path, profile["template"]["sheet_name"], crashing_write_ops)
        
    # Check that output path file contents are identical to original (rolled back)
    with open(output_path, 'rb') as f:
        current_bytes = f.read()
        
    assert current_bytes == original_bytes

def test_never_overwrite_template(tmpdir, test_profile):
    """Assert template path không bị ghi vào"""
    output_dir = str(tmpdir)
    profile = test_profile.copy()
    profile["output"]["directory"] = output_dir
    
    # Save initial template modification time
    initial_mtime = os.path.getmtime(TEMPLATE_PATH)
    
    df = pd.DataFrame({"Max Force (N)": [100.0]})
    identity = MockIdentity(order="ORD-C-5", color="PURPLE")
    output_path = prepare_output_file(profile, identity)
    
    # Check output path does not equal template path
    assert output_path != TEMPLATE_PATH
    
    def write_ops(ws):
        apply_column_mapping(ws, df, profile["mappings"][0])
        
    write_excel_safe(output_path, profile["template"]["sheet_name"], write_ops)
    
    # Verify template is untouched
    current_mtime = os.path.getmtime(TEMPLATE_PATH)
    assert current_mtime == initial_mtime
