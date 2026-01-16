# backend/api/generation.py
"""FastAPI router for one‑click synthetic data generation.
It accepts a CSV upload, runs the GreenGuard pipeline (ClinicalPreprocessor + TVAE @ 2 000 epochs),
computes utility & privacy metrics, builds a PDF report and (if all‑green) returns a download link for the synthetic CSV.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import os
import uuid

from synth_worker.generation_service import generate_synthetic

router = APIRouter()

# Temporary folder for PDFs and synthetic CSVs (served as static files)
TMP_DIR = Path(__file__).parents[2] / "tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/generate")
async def generate(file: UploadFile = File(...)):
    # Validate CSV mime type
    if file.content_type not in ("text/csv", "application/vnd.ms-excel"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    content = await file.read()
    try:
        result = generate_synthetic(content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Build URLs for the static files
    pdf_url = f"/tmp/{Path(result['pdf_path']).name}"
    synthetic_url = None
    if result.get("all_green"):
        synthetic_url = f"/tmp/{Path(result['synthetic_path']).name}"

    return {
        "status": "ok",
        "metrics": result["metrics"],
        "privacy": result["privacy"],
        "pdf_url": pdf_url,
        "synthetic_url": synthetic_url,
    }
