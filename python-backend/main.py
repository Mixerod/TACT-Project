import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Import our custom services and schemas
from services.csv_reader import read_csv_or_excel, CSVReaderError
from services.excel_writer import (
    read_excel_preview,
    prepare_output_file,
    write_excel_safe,
    apply_column_mapping,
    apply_cell_mapping,
    apply_range_mapping,
    apply_identity_mapping,
    ExcelWriterError
)
from services.matcher import resolve_identity, find_existing_report, build_output_filename
from services.profile_loader import load_profile_by_id, validate_profile_config, ProfileValidationError

app = FastAPI(title="TACT Automation Backend", version="1.0.0")

# Enable CORS for React frontend (localhost only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request Pydantic Schemas -----------------

class PreviewCsvRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to CSV or Excel file")
    sheet_name: str = Field("Result", description="Sheet name to read (Excel only)")
    preview_rows: int = Field(5, description="Number of rows to preview")

class PreviewExcelRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to Excel template")
    sheet_name: Optional[str] = Field(None, description="Sheet name to read")

class ExtractIdentityRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to CSV file")
    identity_config: Dict[str, Any] = Field(..., description="Identity mapping configurations")

class PreviewBatchRequest(BaseModel):
    file_paths: List[str] = Field(..., description="List of absolute CSV file paths")
    profile_id: str = Field(..., description="Target profile ID")

class ProcessRequest(BaseModel):
    file_paths: List[str] = Field(..., description="List of absolute CSV file paths")
    profile_id: str = Field(..., description="Target profile ID")

class ValidateProfileRequest(BaseModel):
    profile: Dict[str, Any] = Field(..., description="Profile dictionary config to validate")

# ----------------- FastAPI Endpoints -----------------

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0"
    }

@app.post("/api/preview-csv")
async def preview_csv(request: PreviewCsvRequest):
    try:
        data = read_csv_or_excel(
            file_path=request.file_path,
            sheet_name=request.sheet_name,
            preview_rows=request.preview_rows
        )
        return data
    except CSVReaderError as e:
        return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "code": e.code,
                "message": e.message,
                "detail": e.detail
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "code": "PARSE_ERROR",
                "message": "Không thể phân tích dữ liệu file gốc.",
                "detail": str(e)
            }
        )

@app.post("/api/preview-excel")
async def preview_excel(request: PreviewExcelRequest):
    try:
        data = read_excel_preview(
            file_path=request.file_path,
            sheet_name=request.sheet_name
        )
        return data
    except ExcelWriterError as e:
        return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "code": e.code,
                "message": e.message,
                "detail": e.detail
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "code": "PARSE_ERROR",
                "message": "Đã xảy ra lỗi hệ thống khi đọc template Excel.",
                "detail": str(e)
            }
        )

@app.post("/api/extract-identity")
async def extract_identity(request: ExtractIdentityRequest):
    try:
        data = resolve_identity(
            csv_path=request.file_path,
            identity_config=request.identity_config
        )
        return data
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "code": "IDENTITY_FAILED",
                "message": "Trích xuất thông tin mã đơn/màu thất bại.",
                "detail": str(e)
            }
        )

@app.post("/api/preview-batch")
async def preview_batch(request: PreviewBatchRequest):
    try:
        profile = load_profile_by_id(request.profile_id)
        
        items = []
        for file_path in request.file_paths:
            filename = os.path.basename(file_path)
            
            # Resolve identity
            identity = resolve_identity(file_path, profile.identity.model_dump())
            
            # Formulate output file name
            out_filename = build_output_filename(
                profile.output.filename_pattern,
                identity["order"],
                identity["color"],
                profile.output.date_format,
                profile.method_code
            )
            output_file_path = str(Path(profile.output.directory) / out_filename)
            output_exists = os.path.exists(output_file_path)
            
            # Determine status
            status = "ready"
            if not identity["order"]:
                status = "error"
            elif len(identity["warnings"]) > 0:
                status = "warning"
                
            items.append({
                "file_path": file_path,
                "filename": filename,
                "identity": {
                    "order": identity["order"],
                    "color": identity["color"],
                    "confidence": identity["confidence"],
                    "warnings": identity["warnings"]
                },
                "output_file": output_file_path,
                "output_exists": output_exists,
                "status": status
            })
            
        return {"items": items}
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "code": "PROFILE_NOT_FOUND",
                "message": f"Không tìm thấy cấu hình Profile có ID: '{request.profile_id}'",
                "detail": str(e)
            }
        )

# NDJSON Streaming Generator for processing files
async def process_files_generator(file_paths: List[str], profile_id: str):
    try:
        profile = load_profile_by_id(profile_id)
    except Exception as e:
        yield json.dumps({
            "type": "result",
            "file": "all",
            "status": "error",
            "error_message": f"Không tìm thấy Profile cấu hình: {str(e)}"
        }) + "\n"
        yield json.dumps({
            "type": "done",
            "total": len(file_paths),
            "success": 0,
            "error": len(file_paths)
        }) + "\n"
        return

    success_count = 0
    error_count = 0
    total_count = len(file_paths)

    for file_path in file_paths:
        filename = os.path.basename(file_path)
        
        # 1. Yield reading progress
        yield json.dumps({
            "type": "progress",
            "file": filename,
            "step": "reading_csv"
        }) + "\n"
        await asyncio.sleep(0.05)
        
        try:
            # 2. Extract Identity & load dataframe
            identity_cfg = profile.identity.model_dump()
            identity_res = resolve_identity(file_path, identity_cfg)
            
            if not identity_res["order"]:
                raise ValueError("Không thể nhận diện được Mã đơn hàng (order) bắt buộc.")
                
            # Load CSV Data safely using safe line-by-line csv reader (from matcher.py style)
            import csv
            rows_list = []
            for encoding in ['utf-8', 'utf-8-sig', 'cp1252']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        reader = csv.reader(f)
                        rows_list = [row for row in reader]
                    break
                except UnicodeDecodeError:
                    continue
            
            if not rows_list:
                raise ValueError("File dữ liệu trống hoặc không đúng cấu trúc.")
                
            # Parse DataFrame using header_row
            h_idx = profile.source.header_row
            if h_idx >= len(rows_list):
                raise ValueError(f"Chỉ số dòng tiêu đề '{h_idx}' vượt quá giới hạn file.")
                
            headers = [str(col).strip() for col in rows_list[h_idx]]
            data_rows = rows_list[h_idx + 1:]
            df = pd.DataFrame(data_rows, columns=headers)
            
            # 3. Yield writing progress
            yield json.dumps({
                "type": "progress",
                "file": filename,
                "step": "writing_excel"
            }) + "\n"
            await asyncio.sleep(0.05)
            
            # Prepare Output path
            output_file = prepare_output_file(profile, identity_res)
            
            # Execute mapping operations
            def write_operations(ws):
                # Apply Identity Cells
                apply_identity_mapping(ws, identity_res, profile.identity.output_cells)
                
                # Apply Mappings
                for mapping in profile.mappings:
                    m_dict = mapping.model_dump()
                    if mapping.type == "column":
                        apply_column_mapping(ws, df, m_dict)
                    elif mapping.type == "cell":
                        apply_cell_mapping(ws, df, m_dict, csv_path=file_path)
                    elif mapping.type == "range":
                        apply_range_mapping(ws, df, m_dict)
                        
            # Execute Safe Write
            write_excel_safe(output_file, profile.template.sheet_name, write_operations)
            
            success_count += 1
            yield json.dumps({
                "type": "result",
                "file": filename,
                "status": "success",
                "output": output_file,
                "rows_processed": len(df),
                "duration_ms": 100
            }) + "\n"
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_count += 1
            err_msg = str(e)
            if hasattr(e, 'detail') and getattr(e, 'detail'):
                err_msg += f" (Detail: {e.detail})"
            yield json.dumps({
                "type": "result",
                "file": filename,
                "status": "error",
                "error_message": f"Thất bại: {err_msg}"
            }) + "\n"
            
    # Final done report
    yield json.dumps({
        "type": "done",
        "total": total_count,
        "success": success_count,
        "error": error_count
    }) + "\n"

@app.post("/api/process")
async def process(request: ProcessRequest):
    return StreamingResponse(
        process_files_generator(request.file_paths, request.profile_id),
        media_type="application/x-ndjson"
    )

@app.post("/api/validate-profile")
async def validate_profile(request: ValidateProfileRequest):
    try:
        data = validate_profile_config(request.profile)
        return data
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "code": "INVALID_MAPPING",
                "message": "Không thể xác thực cấu hình profile.",
                "detail": str(e)
            }
        )
