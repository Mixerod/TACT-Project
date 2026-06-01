import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.matcher import resolve_identity

def safe_print(msg: str):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'backslashreplace').decode('ascii'))

def run_test():
    csv_path = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\ORD001_RED_Tensile.csv"
    
    identity_config = {
        "order_source": "both",
        "color_source": "both",
        "filename_regex": r"^([A-Z0-9]+)_([A-Z]+)_",
        "filename_order_group": 1,
        "filename_color_group": 2,
        "condition_sheet": "Condition",
        "condition_keys": ["Sample name", "Submission"]
    }
    
    safe_print(f"Resolving identity for file: {os.path.basename(csv_path)}")
    result = resolve_identity(csv_path, identity_config)
    
    safe_print("Extraction Result:")
    for k, v in result.items():
        safe_print(f"  {k}: {v}")
        
    # Assertions
    assert result["order"] == "ORD001", f"Expected order ORD001, got {result['order']}"
    assert result["color"] == "RED", f"Expected color RED, got {result['color']}"
    assert result["confidence"] == "high", f"Expected confidence high, got {result['confidence']}"
    assert len(result["warnings"]) == 0, f"Expected 0 warnings, got {len(result['warnings'])}: {result['warnings']}"
    
    safe_print("MATCHER UNIT TEST STATUS: SUCCESS! All assertions passed!")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        import traceback
        safe_print("MATCHER UNIT TEST STATUS: FAILED")
        traceback.print_exc()
