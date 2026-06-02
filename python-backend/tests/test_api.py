"""
End-to-end API tests using FastAPI's in-process TestClient.

No live sidecar/server is required. Endpoints that need a Profile are served a
synthetic profile by monkeypatching ``main.load_profile_by_id``, so these tests
never touch %APPDATA% or the repo's profiles/ directory.
"""
import json
import os

import pytest
from fastapi.testclient import TestClient

import main
from models.schemas import Profile
from conftest import STANDARD_IDENTITY_CONFIG


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def injected_profile(monkeypatch, template_path, template_sheet, tmp_path):
    """Patch load_profile_by_id to return a profile wired to real template + tmp output."""
    profile = Profile.model_validate({
        "id": "api-test-profile",
        "name": "API Test Profile",
        "method_code": "tensile",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
        "source": {"sheet_name": "Result", "header_row": 2},
        "template": {"path": template_path, "sheet_name": template_sheet},
        "output": {
            "directory": str(tmp_path),
            "filename_pattern": "Report_{order}_{color}_{date}.xlsx",
            "date_format": "YYYYMMDD",
        },
        "identity": {
            **STANDARD_IDENTITY_CONFIG,
            "output_cells": [
                {"field": "order", "cell": "B8"},
                {"field": "color", "cell": "B9"},
            ],
        },
        "mappings": [
            {
                "id": "col-force", "type": "column", "label": "Max Force",
                "csv_column": "Max Force (N)", "excel_column": "C", "excel_start_row": 15,
            },
            {
                "id": "cell-static", "type": "cell", "label": "Spec",
                "value_source": "static:ISO 13934-1", "excel_cell": "B12",
            },
        ],
    })
    monkeypatch.setattr(main, "load_profile_by_id", lambda profile_id: profile)
    return profile


# ----------------------------- health -----------------------------

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body


# --------------------------- preview-csv ---------------------------

def test_preview_csv_valid(client, sample_csv):
    resp = client.post("/api/preview-csv", json={"file_path": sample_csv})
    assert resp.status_code == 200
    body = resp.json()
    assert "Sample ID" in body["headers"]
    assert body["total_rows"] == 10


def test_preview_csv_missing_file(client, scratch_dir):
    fake = str(scratch_dir / "nope_missing.csv")
    resp = client.post("/api/preview-csv", json={"file_path": fake})
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"] is True
    assert body["code"] == "FILE_NOT_FOUND"
    assert "message" in body and "detail" in body


# ------------------------- extract-identity ------------------------

def test_extract_identity_high_confidence(client, ord001_csv):
    resp = client.post("/api/extract-identity", json={
        "file_path": ord001_csv,
        "identity_config": STANDARD_IDENTITY_CONFIG,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["order"] == "ORD001"
    assert body["color"] == "RED"
    assert body["confidence"] == "high"
    assert body["warnings"] == []


def test_extract_identity_conflict(client, ord001_csv, tmp_path):
    import shutil
    conflict = tmp_path / "ORD002_BLUE_Tensile.csv"
    shutil.copy(ord001_csv, conflict)

    resp = client.post("/api/extract-identity", json={
        "file_path": str(conflict),
        "identity_config": STANDARD_IDENTITY_CONFIG,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["order"] == "ORD001"        # condition sheet wins over filename
    assert body["confidence"] == "low"
    assert len(body["warnings"]) > 0


# ----------------------------- process -----------------------------

def _parse_ndjson(text):
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def test_process_creates_output_file(client, injected_profile, ord001_csv):
    resp = client.post("/api/process", json={
        "file_paths": [ord001_csv],
        "profile_id": "api-test-profile",
    })
    assert resp.status_code == 200
    events = _parse_ndjson(resp.text)

    results = [e for e in events if e["type"] == "result"]
    assert len(results) == 1
    assert results[0]["status"] == "success"
    assert os.path.exists(results[0]["output"])

    done = [e for e in events if e["type"] == "done"][0]
    assert done["success"] == 1
    assert done["error"] == 0


def test_process_streaming_format(client, injected_profile, ord001_csv):
    """Every streamed line is valid JSON with a known 'type', ending in 'done'."""
    resp = client.post("/api/process", json={
        "file_paths": [ord001_csv],
        "profile_id": "api-test-profile",
    })
    events = _parse_ndjson(resp.text)

    assert len(events) >= 2
    for ev in events:
        assert ev["type"] in {"progress", "result", "done"}
    # The stream must terminate with exactly one 'done' summary as the last line.
    assert events[-1]["type"] == "done"
    assert sum(1 for e in events if e["type"] == "done") == 1
    # Progress steps use the documented step names.
    steps = {e["step"] for e in events if e["type"] == "progress"}
    assert steps <= {"reading_csv", "writing_excel"}
