"""
Shared helpers for the manual debug scripts in this folder.

These scripts are run by hand, standalone, without FastAPI:

    python debug/inspect_csv.py "C:/path/to/file.csv"

Importing this module wires the backend root onto sys.path so the scripts can
import ``services.*`` regardless of the current working directory.
"""
import json
import os
import sys
from pathlib import Path

# --- Make services.* / models.* importable when run as a loose script. ---
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)


def safe_print(*parts):
    """print() that never dies on consoles with a non-UTF-8 code page."""
    msg = " ".join(str(p) for p in parts)
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "backslashreplace").decode("ascii"))


def section(title):
    safe_print("")
    safe_print("=" * 60)
    safe_print(title)
    safe_print("=" * 60)


def die(message, code=2):
    safe_print(f"ERROR: {message}")
    sys.exit(code)


def require_file(path, label="file"):
    if not path or not Path(path).exists():
        die(f"{label} not found: {path}")
    return path


def load_profile_dict(path):
    """Load a profile JSON as a plain dict (no schema validation, for debugging)."""
    require_file(path, "profile JSON")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001 - surface any parse problem to the operator
        die(f"could not parse profile JSON: {e}")


def read_csv_rows(path):
    """Read a CSV into a list-of-lists, trying the encodings the backend uses."""
    import csv

    for encoding in ("utf-8", "utf-8-sig", "cp1252"):
        try:
            with open(path, "r", encoding=encoding) as f:
                return [row for row in csv.reader(f)], encoding
        except UnicodeDecodeError:
            continue
    die(f"could not decode CSV with utf-8/utf-8-sig/cp1252: {path}")


def build_dataframe(csv_path, header_row):
    """
    Build the DataFrame the same way main.py's process pipeline does:
    raw line-by-line read, then split at ``header_row``.
    """
    import pandas as pd

    rows, _ = read_csv_rows(csv_path)
    if header_row >= len(rows):
        die(f"header_row={header_row} is beyond the file ({len(rows)} rows)")
    headers = [str(c).strip() for c in rows[header_row]]
    data_rows = rows[header_row + 1:]
    return pd.DataFrame(data_rows, columns=headers)
