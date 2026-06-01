import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.csv_reader import read_csv_or_excel
import json

try:
    csv_path = r"C:\Users\TACT-USER\Downloads\tact-automation\scratch\sample_tact.csv"
    data = read_csv_or_excel(csv_path)
    print("SUCCESS")
    # Avoid unicode encode errors on Windows console by encoding to utf-8 print
    print(json.dumps(data, indent=2))
except Exception as e:
    # Print repr to avoid console encoding issues
    print("FAILED:", repr(e))
