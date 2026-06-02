"""
test_matching.py -- trace identity extraction step by step.

Use when order/color come out wrong: see exactly what each stage produced.

Usage:
    python debug/test_matching.py "C:/path/to/file.csv" "C:/path/to/profile.json"

Prints, in order:
    - filename extraction (regex groups)
    - condition-sheet extraction (per key)
    - the final resolved identity (order, color, sources, confidence, warnings)
"""
import json
import sys
from pathlib import Path

from _common import safe_print, section, die, require_file, load_profile_dict


def main(argv):
    if len(argv) < 3:
        die("usage: python debug/test_matching.py <csv> <profile.json>")

    csv_path = require_file(argv[1], "data file")
    profile = load_profile_dict(argv[2])
    identity_cfg = profile.get("identity", {})

    from services.matcher import (
        extract_from_filename,
        extract_from_condition_sheet,
        resolve_identity,
    )

    filename = Path(csv_path).name
    safe_print(f"File     : {csv_path}")
    safe_print(f"Filename : {filename}")

    # --- Step 1: filename ---
    section("STEP 1 - filename extraction")
    regex = identity_cfg.get("filename_regex", "")
    o_grp = identity_cfg.get("filename_order_group", 1)
    c_grp = identity_cfg.get("filename_color_group", 2)
    safe_print(f"  regex        : {regex!r}")
    safe_print(f"  order group  : {o_grp}")
    safe_print(f"  color group  : {c_grp}")
    fn_order, fn_color = extract_from_filename(filename, regex, o_grp, c_grp)
    safe_print(f"  -> order = {fn_order!r}")
    safe_print(f"  -> color = {fn_color!r}")

    # --- Step 2: condition sheet ---
    section("STEP 2 - condition extraction")
    keys = identity_cfg.get("condition_keys", [])
    safe_print(f"  condition_sheet : {identity_cfg.get('condition_sheet', 'Condition')!r}")
    safe_print(f"  condition_keys  : {keys}")

    df_cond = _load_condition_frame(csv_path, identity_cfg)
    if df_cond is None:
        safe_print("  (could not load a condition frame from this file)")
    else:
        for key in keys:
            safe_print(f"  {key!r} -> {extract_from_condition_sheet(df_cond, [key])!r}")

    # --- Step 3: resolved ---
    section("STEP 3 - resolved identity")
    result = resolve_identity(csv_path, identity_cfg)
    safe_print(json.dumps(result, ensure_ascii=False, indent=2))

    if not result.get("order"):
        safe_print("")
        safe_print("NOTE: order is empty -> the /api/process pipeline would FAIL LOUD here.")


def _load_condition_frame(csv_path, identity_cfg):
    """Replicate the frame the matcher builds for condition lookup."""
    import pandas as pd
    from _common import read_csv_rows

    ext = Path(csv_path).suffix.lower()
    if ext in (".xlsx", ".xls"):
        sheet = identity_cfg.get("condition_sheet", "Condition")
        xl = pd.ExcelFile(csv_path)
        if sheet in xl.sheet_names:
            return pd.read_excel(csv_path, sheet_name=sheet)
        return None
    rows, _ = read_csv_rows(csv_path)
    return pd.DataFrame(rows) if rows else None


if __name__ == "__main__":
    main(sys.argv)
