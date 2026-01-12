"""
Preprocessing Service - FastAPI Microservice
Independent preprocessing service for Gesalp AI synthetic data generation pipeline.

This service:
- Accepts datasets (CSV upload or JSON payload)
- Analyzes datasets for common issues (numeric column names, skewness, outliers)
- Uses OpenRouter LLM to generate intelligent preprocessing plans
- Applies preprocessing transformations
- Returns preprocessed data and the applied plan
"""

import os
import io
import json
import logging
import sys
from typing import Dict, Any, Optional, List
from datetime import datetime

import pandas as pd
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(dotenv_path="../.env")  # Docker looks in parent dir

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format='[%(asctime)s] [%(levelname)s] [PreprocessingService] %(message)s'
)
logger = logging.getLogger(__name__)

# Import service modules
from analyzer import analyze_dataset_for_preprocessing
from llm_client import call_openrouter_for_preprocessing
from executor import apply_preprocessing_plan

# Environment configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or os.getenv("AGENT_MODEL") or "mistralai/mistral-small-24b-instruct:free"
USE_OPENROUTER = bool(OPENROUTER_API_KEY)

# FastAPI app
app = FastAPI(
    title="Gesalp AI Preprocessing Service",
    description="Independent preprocessing microservice for synthetic data generation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class PreprocessingRequest(BaseModel):
    """Request model for JSON payload preprocessing."""
    data: List[Dict[str, Any]]  # List of rows as dictionaries
    previous_ks: Optional[float] = None  # Previous KS Mean if retrying
    return_format: str = "json"  # "json" or "csv"

class PreprocessingResponse(BaseModel):
    """Response model for preprocessing results."""
    success: bool
    preprocessed_data: Optional[List[Dict[str, Any]]] = None
    preprocessing_plan: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "preprocessing-service",
        "openrouter_available": USE_OPENROUTER,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/v1/preprocess/csv", response_class=Response)
async def preprocess_csv(
    file: UploadFile = File(...),
    previous_ks: Optional[float] = Form(None),
    return_format: str = Form("csv")
):
    """
    Preprocess dataset from CSV file upload.
    
    Args:
        file: CSV file upload
        previous_ks: Previous KS Mean value (if retrying)
        return_format: "csv" or "json"
    
    Returns:
        Preprocessed dataset as CSV or JSON, plus preprocessing plan
    """
    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        logger.info(f"Loaded CSV: {df.shape[0]} rows, {df.shape[1]} columns")
        
        # Analyze dataset
        analysis = analyze_dataset_for_preprocessing(df)
        logger.info(f"Dataset analysis complete: {len(analysis.get('issues', []))} issues detected")
        
        # Generate preprocessing plan via OpenRouter
        if not USE_OPENROUTER:
            raise HTTPException(
                status_code=503,
                detail="OpenRouter API key not configured. Preprocessing service requires OPENROUTER_API_KEY."
            )
        
        plan = call_openrouter_for_preprocessing(analysis, previous_ks)
        if not plan:
            raise HTTPException(
                status_code=502,
                detail="Failed to generate preprocessing plan from OpenRouter"
            )
        
        logger.info(f"Preprocessing plan generated: {len(plan.get('column_renames', {}))} renames, "
                   f"{len(plan.get('transformations', {}))} transformations")
        
        # Apply preprocessing plan
        preprocessed_df, metadata = apply_preprocessing_plan(df, plan)
        logger.info(f"Preprocessing applied: {df.shape} -> {preprocessed_df.shape}")
        
        # Prepare response
        if return_format == "json":
            # Return JSON with both data and plan
            return JSONResponse(content={
                "success": True,
                "preprocessed_data": preprocessed_df.to_dict(orient="records"),
                "preprocessing_plan": plan,
                "metadata": {
                    **metadata,
                    "original_shape": list(df.shape),
                    "preprocessed_shape": list(preprocessed_df.shape),
                }
            })
        else:
            # Return CSV file
            output = io.StringIO()
            preprocessed_df.to_csv(output, index=False)
            csv_content = output.getvalue()
            
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=preprocessed_{file.filename}"
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preprocessing failed: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Preprocessing failed: {str(e)}"
        )


@app.post("/v1/preprocess/json", response_model=PreprocessingResponse)
async def preprocess_json(request: PreprocessingRequest):
    """
    Preprocess dataset from JSON payload.
    
    Args:
        request: PreprocessingRequest with data, previous_ks, return_format
    
    Returns:
        PreprocessingResponse with preprocessed data and plan
    """
    try:
        # Convert JSON to DataFrame
        df = pd.DataFrame(request.data)
        logger.info(f"Loaded JSON: {df.shape[0]} rows, {df.shape[1]} columns")
        
        # Analyze dataset
        analysis = analyze_dataset_for_preprocessing(df)
        logger.info(f"Dataset analysis complete: {len(analysis.get('issues', []))} issues detected")
        
        # Generate preprocessing plan via OpenRouter
        if not USE_OPENROUTER:
            return PreprocessingResponse(
                success=False,
                error="OpenRouter API key not configured. Preprocessing service requires OPENROUTER_API_KEY."
            )
        
        plan = call_openrouter_for_preprocessing(analysis, request.previous_ks)
        if not plan:
            return PreprocessingResponse(
                success=False,
                error="Failed to generate preprocessing plan from OpenRouter"
            )
        
        logger.info(f"Preprocessing plan generated: {len(plan.get('column_renames', {}))} renames, "
                   f"{len(plan.get('transformations', {}))} transformations")
        
        # Apply preprocessing plan
        preprocessed_df, metadata = apply_preprocessing_plan(df, plan)
        logger.info(f"Preprocessing applied: {df.shape} -> {preprocessed_df.shape}")
        
        return PreprocessingResponse(
            success=True,
            preprocessed_data=preprocessed_df.to_dict(orient="records"),
            preprocessing_plan=plan,
            metadata={
                **metadata,
                "original_shape": list(df.shape),
                "preprocessed_shape": list(preprocessed_df.shape),
            }
        )
    
    except Exception as e:
        logger.error(f"Preprocessing failed: {type(e).__name__}: {e}", exc_info=True)
        return PreprocessingResponse(
            success=False,
            error=f"Preprocessing failed: {str(e)}"
        )


@app.post("/v1/preprocess/analyze")
async def analyze_dataset(
    file: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None)
):
    """
    Analyze dataset without applying preprocessing.
    Useful for debugging and understanding dataset characteristics.
    
    Args:
        file: Optional CSV file upload
        data: Optional JSON string (list of rows)
    
    Returns:
        Dataset analysis (statistics, issues, column info)
    """
    try:
        if file:
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents))
        elif data:
            data_dict = json.loads(data)
            df = pd.DataFrame(data_dict)
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'data' must be provided")
        
        analysis = analyze_dataset_for_preprocessing(df)
        return JSONResponse(content=analysis)
    
    except Exception as e:
        logger.error(f"Analysis failed: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
