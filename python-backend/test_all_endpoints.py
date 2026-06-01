import urllib.request
import json
import time
import subprocess
import sys
import os

def safe_print(msg: str):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'backslashreplace').decode('ascii'))

def make_post_request(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def test_endpoints():
    base_url = "http://localhost:48921/api"
    
    # 1. Test /api/health
    safe_print("\n--- Testing GET /api/health ---")
    with urllib.request.urlopen(f"{base_url}/health") as response:
        health_res = json.loads(response.read().decode('utf-8'))
        safe_print(f"Health: {health_res}")
        assert health_res["status"] == "ok"
        
    # 2. Test /api/preview-excel
    safe_print("\n--- Testing POST /api/preview-excel ---")
    excel_path = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\template.xlsx"
    preview_excel_body = {
        "file_path": excel_path
    }
    excel_res = make_post_request(f"{base_url}/preview-excel", preview_excel_body)
    safe_print(f"Excel Sheet: {excel_res['sheet_name']}")
    safe_print(f"Excel Total Sheets: {excel_res['sheets']}")
    safe_print(f"Excel Grid Row Count: {excel_res['row_count']}, Col Count: {excel_res['col_count']}")
    assert len(excel_res["cells"]) > 0
    assert len(excel_res["sheets"]) > 0
    
    # 3. Test /api/extract-identity
    safe_print("\n--- Testing POST /api/extract-identity ---")
    csv_path = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\ORD001_RED_Tensile.csv"
    identity_body = {
        "file_path": csv_path,
        "identity_config": {
            "order_source": "both",
            "color_source": "both",
            "filename_regex": r"^([A-Z0-9]+)_([A-Z]+)_",
            "filename_order_group": 1,
            "filename_color_group": 2,
            "condition_sheet": "Condition",
            "condition_keys": ["Sample name", "Submission"]
        }
    }
    id_res = make_post_request(f"{base_url}/extract-identity", identity_body)
    safe_print(f"Identity: {id_res}")
    assert id_res["order"] == "ORD001"
    assert id_res["color"] == "RED"
    
    # 4. Test /api/preview-batch
    safe_print("\n--- Testing POST /api/preview-batch ---")
    batch_body = {
        "file_paths": [csv_path],
        "profile_id": "test-profile-id"
    }
    batch_res = make_post_request(f"{base_url}/preview-batch", batch_body)
    safe_print(f"Batch Preview Items Count: {len(batch_res['items'])}")
    item = batch_res["items"][0]
    safe_print(f"  Item status: {item['status']}, output: {item['output_file']}")
    assert len(batch_res["items"]) == 1
    assert item["status"] in ["ready", "warning"]
    
    # 5. Test /api/validate-profile
    safe_print("\n--- Testing POST /api/validate-profile ---")
    # Load the actual mock profile dictionary
    with open(r"C:\Users\TACT-USER\Downloads\tact-automation\profiles\test-profile-id.json", "r", encoding="utf-8") as f:
        profile_dict = json.load(f)
        
    validate_body = {
        "profile": profile_dict
    }
    val_res = make_post_request(f"{base_url}/validate-profile", validate_body)
    safe_print(f"Validation: {val_res}")
    assert "valid" in val_res
    
    # 6. Test /api/process (Streaming NDJSON)
    safe_print("\n--- Testing POST /api/process (Streaming NDJSON) ---")
    process_body = {
        "file_paths": [csv_path],
        "profile_id": "test-profile-id"
    }
    req = urllib.request.Request(
        f"{base_url}/process",
        data=json.dumps(process_body).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as stream_response:
        for line in stream_response:
            line_str = line.decode('utf-8').strip()
            if line_str:
                line_data = json.loads(line_str)
                safe_print(f"Stream line: {line_data}")
                if line_data.get("type") == "done":
                    assert line_data["success"] == 1
                    
    safe_print("\nALL FASTAPI ENDPOINTS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_endpoints()
