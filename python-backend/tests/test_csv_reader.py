"""Tests for services.csv_reader against real TACT sample files."""
import pytest

from services.csv_reader import read_csv_or_excel, CSVReaderError


def test_read_valid_file(sample_csv):
    """Read a real TACT CSV and assert the headers are parsed correctly."""
    data = read_csv_or_excel(sample_csv)

    assert data["sheet_name"] == "Result"
    assert "Sample ID" in data["headers"]
    assert "Max Force (N)" in data["headers"]
    assert "Elongation (%)" in data["headers"]
    # sample_tact.csv has 10 data rows.
    assert data["total_rows"] == 10
    assert len(data["rows"]) == 5  # default preview_rows
    assert data["rows"][0]["Sample ID"] == "S-1"


def test_sheet_not_found(template_path):
    """A non-existent sheet name on a real Excel file raises SHEET_NOT_FOUND."""
    with pytest.raises(CSVReaderError) as exc_info:
        read_csv_or_excel(template_path, sheet_name="NoSuchSheet")
    assert exc_info.value.code == "SHEET_NOT_FOUND"


def test_file_not_found(scratch_dir):
    """A bogus path raises FILE_NOT_FOUND."""
    fake_path = str(scratch_dir / "definitely_not_here.csv")
    with pytest.raises(CSVReaderError) as exc_info:
        read_csv_or_excel(fake_path)
    assert exc_info.value.code == "FILE_NOT_FOUND"


def test_all_sheets_returned(template_path):
    """all_sheets reflects the real sheet list of the template workbook."""
    data = read_csv_or_excel(template_path)
    assert isinstance(data["all_sheets"], list)
    assert len(data["all_sheets"]) >= 1
    # The default 'Result' sheet is absent, so the reader falls back to sheet 0
    # and reports it as the active sheet.
    assert data["sheet_name"] == data["all_sheets"][0]


def test_csv_reports_single_result_sheet(sample_csv):
    """A flat .csv input always advertises exactly one logical 'Result' sheet."""
    data = read_csv_or_excel(sample_csv)
    assert data["all_sheets"] == ["Result"]
    assert data["sheet_name"] == "Result"


def test_condition_block_csv_is_not_rectangular(ord001_csv):
    """
    A CSV with a leading Condition block (2-column rows above the 3-column data
    table) is not a rectangular CSV; read_csv_or_excel surfaces PARSE_ERROR.
    Such files are read elsewhere via the matcher's line-by-line reader, not here.
    """
    with pytest.raises(CSVReaderError) as exc_info:
        read_csv_or_excel(ord001_csv)
    assert exc_info.value.code == "PARSE_ERROR"
