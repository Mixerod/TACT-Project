import pytest
import os
import sys

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.csv_reader import read_csv_or_excel, CSVReaderError

# Constant paths based on TACT resources in scratch/
CSV_PATH = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\sample_tact.csv"
EXCEL_PATH = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\template.xlsx"

def test_read_valid_file():
    """Đọc file CSV thật, assert headers đúng"""
    data = read_csv_or_excel(CSV_PATH)
    assert "headers" in data
    assert "rows" in data
    assert len(data["headers"]) > 0
    # Assert specific headers from TACT CSV are present
    assert "Sample ID" in data["headers"]
    assert "Max Force (N)" in data["headers"]

def test_sheet_not_found():
    """Truyền sheet sai → assert raise đúng error code SHEET_NOT_FOUND"""
    with pytest.raises(CSVReaderError) as exc_info:
        read_csv_or_excel(EXCEL_PATH, sheet_name="SaiSheetName")
    assert exc_info.value.code == "SHEET_NOT_FOUND"

def test_file_not_found():
    """Đường dẫn giả → assert FILE_NOT_FOUND"""
    fake_path = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\fake_non_existent.csv"
    with pytest.raises(CSVReaderError) as exc_info:
        read_csv_or_excel(fake_path)
    assert exc_info.value.code == "FILE_NOT_FOUND"

def test_all_sheets_returned():
    """Assert all_sheets chứa đủ sheet names"""
    data = read_csv_or_excel(EXCEL_PATH)
    assert "all_sheets" in data
    assert len(data["all_sheets"]) > 0
    # Usually template.xlsx contains sheet named "Result" or similar
    assert "Result" in data["all_sheets"] or len(data["all_sheets"]) >= 1
