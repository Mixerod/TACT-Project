"""
Tests for services.matcher (identity extraction + output filename resolution).

Assertions reflect the *actual* resolution behavior verified against the real
``ORD001_RED_Tensile.csv`` sample, not an idealized spec.
"""
import csv
import os
import shutil
from datetime import datetime

import pandas as pd
import pytest

from services.matcher import (
    extract_from_filename,
    extract_from_condition_sheet,
    resolve_identity,
    find_existing_report,
    build_output_filename,
)
from conftest import STANDARD_IDENTITY_CONFIG


# ----------------------- filename extraction -----------------------

def test_extract_filename_standard():
    """'ORD001_RED_Tensile.csv' -> order=ORD001, color=RED."""
    regex = r"^([A-Z0-9]+)_([A-Z]+)_"
    order, color = extract_from_filename("ORD001_RED_Tensile.csv", regex, 1, 2)
    assert order == "ORD001"
    assert color == "RED"


def test_extract_filename_no_color():
    """
    'ORD001_Tensile.csv' with an order-only regex -> order=ORD001, color=None.

    The color group index (2) exceeds the captured groups, so the resolver
    returns None for color without error.
    """
    regex = r"^([A-Z0-9]+)_"
    order, color = extract_from_filename("ORD001_Tensile.csv", regex, 1, 2)
    assert order == "ORD001"
    assert color is None


def test_extract_filename_no_match():
    """A filename that doesn't match the regex -> (None, None)."""
    regex = r"^([A-Z0-9]+)_([A-Z]+)_"
    order, color = extract_from_filename("random_file.csv", regex, 1, 2)
    assert order is None
    assert color is None


# ----------------------- condition sheet extraction -----------------------

def test_extract_condition_sheet(ord001_csv):
    """The real Condition block yields order from 'Submission' and color from 'Sample name'."""
    with open(ord001_csv, "r", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    df = pd.DataFrame(rows)

    assert extract_from_condition_sheet(df, ["Submission"]) == "ORD001"
    assert extract_from_condition_sheet(df, ["Sample name"]) == "RED"


# ----------------------- full identity resolution -----------------------

def test_resolve_high_confidence(ord001_csv):
    """Filename and condition agree on the order -> high confidence, no warnings."""
    result = resolve_identity(ord001_csv, STANDARD_IDENTITY_CONFIG)
    assert result["order"] == "ORD001"
    assert result["color"] == "RED"
    assert result["order_source"] == "condition_sheet"
    assert result["confidence"] == "high"
    assert result["warnings"] == []


def test_resolve_conflict(ord001_csv, tmp_path):
    """
    When the filename (ORD002/BLUE) disagrees with the Condition block (ORD001/RED),
    the order comes from the Condition sheet, confidence drops to low, and a
    mismatch warning is emitted.

    Note: the color has no Condition-sheet value, so it falls back to the
    filename group (BLUE) per the resolver's 'both' policy.
    """
    conflict_path = tmp_path / "ORD002_BLUE_Tensile.csv"
    shutil.copy(ord001_csv, conflict_path)

    result = resolve_identity(str(conflict_path), STANDARD_IDENTITY_CONFIG)

    assert result["order"] == "ORD001"            # Condition sheet wins
    assert result["order_source"] == "condition_sheet"
    assert result["color"] == "BLUE"              # filename fallback
    assert result["confidence"] == "low"
    assert any("Mã đơn" in w for w in result["warnings"])


def test_resolve_both_missing(tmp_path):
    """
    When neither filename nor Condition yields an order, the resolver returns
    order=None with low confidence and a warning (it does not raise). The API
    layer is responsible for failing loud on an empty order.
    """
    csv_path = tmp_path / "random_file.csv"
    csv_path.write_text("a,b\n1,2\n", encoding="utf-8")

    config = {
        "order_source": "filename",
        "color_source": "filename",
        "filename_regex": r"^([A-Z0-9]+)_([A-Z]+)_",
        "filename_order_group": 1,
        "filename_color_group": 2,
        "condition_sheet": "Condition",
        "condition_keys": [],
    }
    result = resolve_identity(str(csv_path), config)

    assert result["order"] is None
    assert result["color"] is None
    assert result["confidence"] == "low"
    assert len(result["warnings"]) > 0


# ----------------------- output file helpers -----------------------

def test_find_existing_report(tmp_path):
    """A pre-existing report containing the order/color is located by name match."""
    order, color = "ORD999", "YELLOW"
    report = tmp_path / f"Report_{order}_{color}_20260601.xlsx"
    report.write_text("", encoding="utf-8")
    # A decoy for a different order must be ignored.
    (tmp_path / "Report_ORD000_BLUE_20260601.xlsx").write_text("", encoding="utf-8")

    found = find_existing_report(str(tmp_path), order, color)
    assert found == str(report)


def test_find_existing_report_ignores_tmp(tmp_path):
    """In-flight '.tmp.xlsx' files are never returned as an existing report."""
    (tmp_path / "Report_ORD777_RED_20260601.tmp.xlsx").write_text("", encoding="utf-8")
    assert find_existing_report(str(tmp_path), "ORD777", "RED") is None


def test_build_output_filename():
    """The pattern renders order/color/date and ends with .xlsx."""
    filename = build_output_filename(
        "Report_{order}_{color}_{date}.xlsx", "ORD001", "RED", "YYYYMMDD", "tensile"
    )
    today = datetime.now().strftime("%Y%m%d")
    assert filename == f"Report_ORD001_RED_{today}.xlsx"


def test_build_output_filename_empty_color():
    """An empty color collapses the doubled separator and still yields a valid name."""
    filename = build_output_filename(
        "Report_{order}_{color}_{date}.xlsx", "ORD001", "", "YYYYMMDD"
    )
    today = datetime.now().strftime("%Y%m%d")
    assert filename == f"Report_ORD001_{today}.xlsx"
    assert filename.endswith(".xlsx")
