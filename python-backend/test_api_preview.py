import urllib.request
import json

url = "http://localhost:48921/api/preview-csv"
data = {
    "file_path": r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\sample_tact.csv",
    "sheet_name": "Result",
    "preview_rows": 5
}

req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        res_data = response.read().decode('utf-8')
        print("API SUCCESS")
        print(json.dumps(json.loads(res_data), indent=2))
except Exception as e:
    print("API FAILED:", str(e))
