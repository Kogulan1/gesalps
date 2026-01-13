# backend/api/main.py
import os
import io
import csv
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import pandas as pd
import httpx
from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile, Request, File
from fastapi.responses import JSONResponse, Response, StreamingResponse
import zipfile
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from jose import jwt
try:
    from postgrest import APIError  # supabase-py dependency
except Exception:
    class APIError(Exception):
        pass
from supabase import create_client, Client

# ---------- Env & Supabase ----------
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://ollama:11434")
if not SUPABASE_URL or not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
    raise RuntimeError("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)

REPORT_SERVICE_BASE = os.getenv("REPORT_SERVICE_BASE", "http://localhost:8010")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
APP_JWKS_CACHE: Dict[str, Any] = {}

# ---------- Plans / Entitlement ----------
def _truthy(v: Optional[str]) -> bool:
    if v is None:
        return False
    return str(v).strip().lower() in {"1","true","yes","on"}

ENTERPRISE_ALL = _truthy(os.getenv("ENTERPRISE_ALL"))
ENTERPRISE_USER_IDS = {x.strip() for x in (os.getenv("ENTERPRISE_USER_IDS") or "").split(",") if x.strip()}
ENTERPRISE_EMAILS = {x.strip().lower() for x in (os.getenv("ENTERPRISE_EMAILS") or "").split(",") if x.strip()}

def is_enterprise(user: Dict[str, Any]) -> bool:
    if ENTERPRISE_ALL:
        return True
    uid = str(user.get("id") or "").strip()
    email = str(user.get("email") or "").strip().lower()
    if uid and uid in ENTERPRISE_USER_IDS:
        return True
    if email and email in ENTERPRISE_EMAILS:
        return True
    return False

# ---------- Auth helpers ----------
def get_jwks() -> Dict[str, Any]:
    global APP_JWKS_CACHE
    if APP_JWKS_CACHE:
        return APP_JWKS_CACHE
    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    with httpx.Client(timeout=5.0) as client:
        r = client.get(jwks_url)
        r.raise_for_status()
        APP_JWKS_CACHE = r.json()
        return APP_JWKS_CACHE

def verify_token(token: str) -> Dict[str, Any]:
    # First try JWKS verification
    try:
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == unverified_header.get("kid")), None)
        if key:
            return jwt.decode(token, key, algorithms=[unverified_header.get("alg", "RS256")], audience=None, options={"verify_aud": False})
    except Exception as e:
        print(f"JWKS verification failed: {e}")
        pass
    
    # Fallback to unverified claims for Supabase tokens
    try:
        claims = jwt.get_unverified_claims(token)
        print(f"Unverified claims: {claims}")
        return claims
    except Exception as e:
        print(f"Unverified claims failed: {e}")
        # If all else fails, return a basic structure with a valid UUID
        return {"sub": "00000000-0000-0000-0000-000000000000", "email": "fallback@example.com"}

async def require_user(request: Request) -> Dict[str, Any]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth.split(" ", 1)[1]
    claims = verify_token(token)
    uid = claims.get("sub") or claims.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # For development, allow any valid token to access any resource
    # In production, you should verify ownership properly
    print(f"User authenticated: {uid}")
    return {"id": uid, "email": claims.get("email")}

# Development-only endpoint that bypasses authentication
async def require_user_dev(request: Request) -> Dict[str, Any]:
    # For development, return a mock user with valid UUID
    return {"id": "00000000-0000-0000-0000-000000000001", "email": "dev@example.com"}

# ---------- FastAPI app & CORS ----------
app = FastAPI(
    title="GESALP AI API",
    description="Clinical-grade synthetic data generation API",
    version="1.0.0"
)
cors_origins = [o.strip() for o in (os.getenv("CORS_ALLOW_ORIGINS") or "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# ---------- Utils ----------
def ensure_bucket(name: str) -> None:
    try:
        buckets = supabase.storage.list_buckets()  # type: ignore[attr-defined]
        if isinstance(buckets, list) and any((b.get('id') == name or b.get('name') == name) for b in buckets if isinstance(b, dict)):
            return
        try:
            supabase.storage.create_bucket(name, public=False)  # type: ignore[call-arg]
        except Exception:
            try:
                supabase.storage.create_bucket(name, {"public": False})  # type: ignore[call-arg]
            except Exception:
                pass
    except Exception:
        pass

# ---------- Health ----------
@app.get("/")
def root():
    return JSONResponse({"ok": True, "message": "Gesalps API", "health": "/health", "docs": "/docs"})

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/health")
def health():
    return {"ok": True}

# ---------- Capabilities (public) ----------
@app.get("/v1/capabilities")
def capabilities():
    """Minimal capabilities for the UI.

    We currently support GC/CTGAN/TVAE and no DP on this deployment.
    Shape intentionally simple so the frontend can toggle UI affordances.
    """
    dp_enabled = False  # hardcode: no DP trainer available on this stack
    return {
        "models": {"gc": True, "ctgan": True, "tvae": True},
        "dp": bool(dp_enabled),
    }

# ---------- Projects ----------
class CreateProject(BaseModel):
    name: str

class RenameBody(BaseModel):
    name: str

@app.options("/v1/projects")
async def options_projects_list():
    """Handle CORS preflight requests for projects list endpoint."""
    return Response(status_code=200)

@app.options("/v1/projects/{project_id}")
async def options_projects_detail(project_id: str):
    """Handle CORS preflight requests for project detail endpoint."""
    return Response(status_code=200)

@app.get("/v1/projects")
def list_projects(user: Dict[str, Any] = Depends(require_user)):
    """List all projects for the authenticated user."""
    res = supabase.table("projects").select("id, name, owner_id, created_at").eq("owner_id", user["id"]).order("created_at", desc=True).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    
    # Add additional computed fields for the frontend
    projects_with_metadata = []
    for project in res.data:
        # Get datasets count for this project
        datasets_res = supabase.table("datasets").select("id", count="exact").eq("project_id", project["id"]).execute()
        datasets_count = datasets_res.count or 0
        
        # Get runs count for this project
        runs_res = supabase.table("runs").select("id", count="exact").eq("project_id", project["id"]).execute()
        runs_count = runs_res.count or 0
        
        # Get last activity (most recent run)
        last_run_res = supabase.table("runs").select("started_at").eq("project_id", project["id"]).order("started_at", desc=True).limit(1).execute()
        last_activity = "No activity yet"
        if last_run_res.data and last_run_res.data[0].get("started_at"):
            from datetime import datetime, timezone
            last_run_time = datetime.fromisoformat(last_run_res.data[0]["started_at"].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            diff = now - last_run_time
            if diff.days > 0:
                last_activity = f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                last_activity = f"{hours} hour{'s' if hours > 1 else ''} ago"
            elif diff.seconds > 60:
                minutes = diff.seconds // 60
                last_activity = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                last_activity = "Just now"
        
        projects_with_metadata.append({
            **project,
            "datasets_count": datasets_count,
            "runs_count": runs_count,
            "last_activity": last_activity,
            "status": "Active" if runs_count > 0 else "Ready"
        })
    
    return projects_with_metadata

@app.get("/v1/projects/{project_id}")
def get_project(project_id: str, user: Dict[str, Any] = Depends(require_user)):
    """Get a single project by ID with all metadata, datasets, and runs."""
    # Verify the project belongs to the user
    res = supabase.table("projects").select("id, name, owner_id, created_at").eq("id", project_id).eq("owner_id", user["id"]).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = res.data
    
    # Get datasets for this project
    datasets_res = supabase.table("datasets").select("id, name, project_id, file_url, rows_count, cols_count, created_at").eq("project_id", project["id"]).order("created_at", desc=True).execute()
    datasets_data = datasets_res.data or []
    
    # Get runs for this project (via datasets)
    dataset_ids = [d["id"] for d in datasets_data]
    runs_data = []
    if dataset_ids:
        runs_res = supabase.table("runs").select("id, name, dataset_id, status, started_at, finished_at, config_json").in_("dataset_id", dataset_ids).order("started_at", desc=True).execute()
        runs_data = runs_res.data or []
    
    # Get datasets count
    datasets_count = len(datasets_data)
    
    # Get runs count
    runs_count = len(runs_data)
    
    # Get last activity (most recent run)
    last_activity = "No activity yet"
    if runs_data and runs_data[0].get("started_at"):
        from datetime import datetime, timezone
        last_run_time = datetime.fromisoformat(runs_data[0]["started_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        diff = now - last_run_time
        if diff.days > 0:
            last_activity = f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            last_activity = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            last_activity = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            last_activity = "Just now"
    
    # Format datasets for response
    datasets_formatted = []
    for dataset in datasets_data:
        # Get runs count for this dataset
        dataset_runs_res = supabase.table("runs").select("id", count="exact").eq("dataset_id", dataset["id"]).execute()
        runs_count_for_dataset = dataset_runs_res.count or 0
        
        datasets_formatted.append({
            **dataset,
            "file_name": dataset.get("file_url", "").split("/")[-1] if dataset.get("file_url") else "",
            "file_size": 0,  # Not stored in database
            "rows": dataset.get("rows_count", 0),
            "columns": dataset.get("cols_count", 0),
            "runs_count": runs_count_for_dataset,
            "status": "Ready"
        })
    
    # Format runs for response
    runs_formatted = []
    dataset_names = {d["id"]: d["name"] for d in datasets_data}
    for run in runs_data:
        runs_formatted.append({
            **run,
            "dataset_name": dataset_names.get(run.get("dataset_id"), "Unknown Dataset"),
            "completed_at": run.get("finished_at")
        })
    
    return {
        **project,
        "updated_at": project.get("created_at"),  # Use created_at as fallback if updated_at doesn't exist
        "description": None,  # Description field not in database schema
        "datasets_count": datasets_count,
        "runs_count": runs_count,
        "last_activity": last_activity,
        "status": "Active" if runs_count > 0 else "Ready",
        "datasets": datasets_formatted,
        "runs": runs_formatted
    }

@app.post("/v1/projects")
def create_project(p: CreateProject, user: Dict[str, Any] = Depends(require_user)):
    if not is_enterprise(user):
        cnt = supabase.table("projects").select("id", count="exact").eq("owner_id", user["id"]).execute()
        if (cnt.count or 0) >= 2:
            raise HTTPException(status_code=403, detail="Quota exceeded: Free plan allows up to 2 projects.")
    payload = {"name": p.name, "owner_id": user["id"]}
    res = supabase.table("projects").insert(payload).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data[0]

@app.put("/v1/projects/{project_id}/rename")
def rename_project(project_id: str, body: RenameBody, user: Dict[str, Any] = Depends(require_user)):
    """Rename a project."""
    # Verify the project belongs to the user
    project_res = supabase.table("projects").select("id").eq("id", project_id).eq("owner_id", user["id"]).execute()
    if not project_res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    
    res = supabase.table("projects").update({"name": body.name}).eq("id", project_id).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    return {"message": "Project renamed successfully"}

# ---------- Datasets ----------
@app.get("/v1/datasets")
def list_datasets(user: Dict[str, Any] = Depends(require_user)):
    """List all datasets for the authenticated user."""
    # First get all projects owned by the user
    projects_res = supabase.table("projects").select("id, name").eq("owner_id", user["id"]).execute()
    if projects_res.data is None:
        raise HTTPException(status_code=500, detail=str(projects_res.error))
    
    project_ids = [p["id"] for p in projects_res.data]
    project_names = {p["id"]: p["name"] for p in projects_res.data}
    
    if not project_ids:
        return []
    
    # Get all datasets for these projects
    datasets_res = supabase.table("datasets").select("id, name, project_id, file_url, rows_count, cols_count, created_at").in_("project_id", project_ids).order("created_at", desc=True).execute()
    if datasets_res.data is None:
        raise HTTPException(status_code=500, detail=str(datasets_res.error))
    
    # Add project names and compute additional fields
    datasets_with_metadata = []
    for dataset in datasets_res.data:
        # Get runs count for this dataset
        runs_res = supabase.table("runs").select("id", count="exact").eq("dataset_id", dataset["id"]).execute()
        runs_count = runs_res.count or 0
        
        # Get last run for this dataset
        last_run_res = supabase.table("runs").select("started_at").eq("dataset_id", dataset["id"]).order("started_at", desc=True).limit(1).execute()
        last_run = None
        if last_run_res.data and last_run_res.data[0].get("started_at"):
            from datetime import datetime, timezone
            last_run_time = datetime.fromisoformat(last_run_res.data[0]["started_at"].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            diff = now - last_run_time
            if diff.days > 0:
                last_run = f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                last_run = f"{hours} hour{'s' if hours > 1 else ''} ago"
            elif diff.seconds > 60:
                minutes = diff.seconds // 60
                last_run = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                last_run = "Just now"
        
        datasets_with_metadata.append({
            **dataset,
            "project_name": project_names.get(dataset["project_id"], "Unknown Project"),
            "file_name": dataset["file_url"].split("/")[-1] if dataset["file_url"] else "unknown.csv",  # Extract filename from URL
            "file_size": 0,  # Not available in current schema
            "rows": dataset["rows_count"] or 0,
            "columns": dataset["cols_count"] or 0,
            "status": "Ready",  # Default status since not in schema
            "runs_count": runs_count,
            "last_run": last_run,
            "last_modified": dataset["created_at"]  # Using created_at as last_modified for now
        })
    
    return datasets_with_metadata
@app.post("/v1/datasets/upload")
async def upload_dataset(project_id: str = Form(...), file: UploadFile = File(...), user: Dict[str, Any] = Depends(require_user)):
    ensure_bucket("datasets")
    content = await file.read()
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max allowed is {MAX_UPLOAD_MB} MB")
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV. Please upload a UTF-8 encoded .csv file: {e}")

    rows_count = int(df.shape[0])
    cols_count = int(df.shape[1])
    if not is_enterprise(user):
        if rows_count > 5000:
            raise HTTPException(status_code=403, detail="Quota exceeded: Datasets up to 5,000 rows on free plan.")

    cols = []
    for col in df.columns:
        s = df[col]
        miss = float(s.isna().mean()) if rows_count > 0 else 0.0
        uniq = int(s.nunique(dropna=True))
        cols.append({"name": str(col), "type": str(s.dtype), "missing": round(miss, 4), "unique": uniq})
    schema = {"columns": cols}

    object_name = f"{project_id}/{int(time.time())}_{file.filename or 'dataset'}.csv"
    try:
        supabase.storage.from_("datasets").upload(path=object_name, file=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    dataset_row = {
        "project_id": project_id,
        "name": file.filename or "dataset.csv",
        "file_url": object_name,
        "rows_count": rows_count,
        "cols_count": cols_count,
        "schema_json": schema,
    }
    ins = supabase.table("datasets").insert(dataset_row).execute()
    if ins.data is None:
        raise HTTPException(status_code=500, detail=str(ins.error))
    return {"dataset_id": ins.data[0]["id"], "schema": schema}

@app.get("/v1/datasets/{dataset_id}/preview")
def dataset_preview(dataset_id: str, user: Dict[str, Any] = Depends(require_user)):
    ds = supabase.table("datasets").select("id,project_id,file_url").eq("id", dataset_id).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    proj = supabase.table("projects").select("owner_id").eq("id", ds.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    obj_path = ds.data["file_url"]
    file_bytes = supabase.storage.from_("datasets").download(obj_path)
    raw = io.BytesIO(file_bytes) if isinstance(file_bytes, (bytes, bytearray)) else io.BytesIO(file_bytes.read())
    df = pd.read_csv(raw)
    df_head = df.head(20)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(df_head.columns.tolist())
    for _, row in df_head.iterrows():
        writer.writerow([None if pd.isna(v) else v for v in row.tolist()])
    buf.seek(0)
    return StreamingResponse(io.StringIO(buf.read()), media_type="text/csv")

@app.delete("/v1/datasets/{dataset_id}")
def dataset_delete(dataset_id: str, user: Dict[str, Any] = Depends(require_user)):
    ds = supabase.table("datasets").select("id,project_id,file_url").eq("id", dataset_id).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    proj = supabase.table("projects").select("owner_id").eq("id", ds.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    runs = supabase.table("runs").select("id").eq("dataset_id", dataset_id).execute().data or []
    run_ids = [r["id"] for r in runs]
    if run_ids:
        supabase.table("metrics").delete().in_("run_id", run_ids).execute()
        supabase.table("run_artifacts").delete().in_("run_id", run_ids).execute()
        supabase.table("runs").delete().in_("id", run_ids).execute()

    try:
        supabase.storage.from_("datasets").remove([ds.data["file_url"]])
    except Exception:
        pass

    supabase.table("datasets").delete().eq("id", dataset_id).execute()
    return {"ok": True}

@app.put("/v1/datasets/{dataset_id}/rename")
def rename_dataset(dataset_id: str, body: RenameBody, user: Dict[str, Any] = Depends(require_user)):
    """Rename a dataset."""
    # Verify the dataset belongs to the user
    ds = supabase.table("datasets").select("id,project_id").eq("id", dataset_id).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    proj = supabase.table("projects").select("owner_id").eq("id", ds.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    res = supabase.table("datasets").update({"name": body.name}).eq("id", dataset_id).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    return {"message": "Dataset renamed successfully"}

# ---------- Runs ----------
@app.get("/v1/runs")
def list_runs(user: Dict[str, Any] = Depends(require_user)):
    """List all runs for the authenticated user."""
    # First get all projects owned by the user
    projects_res = supabase.table("projects").select("id, name").eq("owner_id", user["id"]).execute()
    if projects_res.data is None:
        raise HTTPException(status_code=500, detail=str(projects_res.error))
    
    project_ids = [p["id"] for p in projects_res.data]
    project_names = {p["id"]: p["name"] for p in projects_res.data}
    
    if not project_ids:
        return []
    
    # Get all datasets for these projects
    datasets_res = supabase.table("datasets").select("id, name, project_id").in_("project_id", project_ids).execute()
    if datasets_res.data is None:
        raise HTTPException(status_code=500, detail=str(datasets_res.error))
    
    dataset_ids = [d["id"] for d in datasets_res.data]
    dataset_names = {d["id"]: d["name"] for d in datasets_res.data}
    dataset_projects = {d["id"]: d["project_id"] for d in datasets_res.data}
    
    if not dataset_ids:
        return []
    
    # Get all runs for these datasets
    runs_res = supabase.table("runs").select("id, name, dataset_id, status, started_at, finished_at, config_json").in_("dataset_id", dataset_ids).order("started_at", desc=True).execute()
    if runs_res.data is None:
        raise HTTPException(status_code=500, detail=str(runs_res.error))
    
    # Add project and dataset names and compute additional fields
    runs_with_metadata = []
    for run in runs_res.data:
        dataset_id = run["dataset_id"]
        project_id = dataset_projects.get(dataset_id)
        
        # Calculate duration
        duration = None
        if run.get("started_at") and run.get("finished_at"):
            from datetime import datetime, timezone
            start_time = datetime.fromisoformat(run["started_at"].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(run["finished_at"].replace('Z', '+00:00'))
            duration = int((end_time - start_time).total_seconds() / 60)  # in minutes
        elif run.get("started_at") and not run.get("finished_at"):
            # Running run - calculate current duration
            from datetime import datetime, timezone
            start_time = datetime.fromisoformat(run["started_at"].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            duration = int((now - start_time).total_seconds() / 60)  # in minutes
        
        # Get scores from config_json if available
        scores = {
            "auroc": 0.0,
            "c_index": 0.0,
            "mia_auc": 0.0,
            "dp_epsilon": 0.0,
            "privacy_score": 0.0,
            "utility_score": 0.0
        }
        
        if run.get("config_json") and isinstance(run["config_json"], dict):
            config = run["config_json"]
            scores.update({
                "auroc": config.get("auroc", 0.0),
                "c_index": config.get("c_index", 0.0),
                "mia_auc": config.get("mia_auc", 0.0),
                "dp_epsilon": config.get("dp_epsilon", 0.0),
                "privacy_score": config.get("privacy_score", 0.0),
                "utility_score": config.get("utility_score", 0.0)
            })
        
        # Mock metrics for now - in a real implementation, these would come from the database
        metrics = {
            "rows_generated": 0,
            "columns_generated": 0,
            "privacy_audit_passed": False,
            "utility_audit_passed": False
        }
        
        if run["status"] == "succeeded":
            # Mock some realistic data for completed runs
            metrics.update({
                "rows_generated": 1500,
                "columns_generated": 25,
                "privacy_audit_passed": scores["privacy_score"] > 0.7,
                "utility_audit_passed": scores["utility_score"] > 0.7
            })
        
        runs_with_metadata.append({
            **run,
            "project_id": project_id,
            "project_name": project_names.get(project_id, "Unknown Project"),
            "dataset_name": dataset_names.get(dataset_id, "Unknown Dataset"),
            "duration": duration,
            "scores": scores,
            "metrics": metrics,
            "created_at": run["started_at"]  # Use started_at as created_at since runs table doesn't have created_at
        })
    
    return runs_with_metadata

class StartRun(BaseModel):
    dataset_id: str
    method: str
    mode: str
    config_json: Dict[str, Any] | None = None  # Can include "enable_smart_preprocess": true/false (default: true)
    name: str | None = None

@app.post("/v1/runs")
def start_run(body: StartRun, user: Dict[str, Any] = Depends(require_user)):
    # Resolve project from dataset to ensure consistency
    try:
        res = supabase.table("datasets") \
            .select("id,project_id") \
            .eq("id", body.dataset_id) \
            .limit(1) \
            .execute()
    except APIError as e:
        # Defensive: treat as not found if PostgREST error indicates 0 rows
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Dataset not found")

    project_id = rows[0]["project_id"]

    # Quota: max 3 runs per project (free tier)
    if not is_enterprise(user):
        rcnt = supabase.table("runs").select("id", count="exact").eq("project_id", project_id).execute()
        if (rcnt.count or 0) >= 3:
            raise HTTPException(status_code=403, detail="Quota exceeded: Max 3 runs per project on free plan.")

    # Normalize/sanitize DP proposal from agent/user
    cfg = dict(body.config_json or {})
    method_l = (body.method or "").strip().lower()

    # Determine mode (default agent)
    mode_in = (body.mode or "agent").strip().lower() or "agent"

    # If agent mode, compute a plan and attach to config_json.plan
    try:
        if mode_in == "agent":
            pref = cfg.get("preference") if isinstance(cfg.get("preference"), dict) else {"tradeoff": cfg.get("mode") or cfg.get("tradeoff") or "balanced"}
            plan = _agent_plan_internal(body.dataset_id, pref, cfg.get("goal"), cfg.get("prompt"))
            cfg["plan"] = plan
        elif mode_in == "custom":
            hp = {
                "sample_multiplier": float(cfg.get("sample_multiplier") or (cfg.get("hyperparams") or {}).get("sample_multiplier") or 1.0),
                "max_synth_rows": int(cfg.get("max_synth_rows") or (cfg.get("hyperparams") or {}).get("max_synth_rows") or 2000),
            }
            plan = {
                "choice": {"method": method_l or "gc"},
                "hyperparams": hp,
                "dp": {"enabled": False},
                "backup": [
                    {"method": "ctgan" if (method_l!="ctgan") else "gc", "hyperparams": hp},
                    {"method": "tvae" if (method_l!="tvae") else "gc", "hyperparams": hp},
                ],
                "rationale": "user customized",
            }
            cfg["plan"] = plan
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent planning failed: {e}")
    dp_raw = cfg.get("dp")
    def _normalize_dp(dp_val):
        if dp_val is True:
            return {"dp": True}
        if isinstance(dp_val, dict):
            # accept either 'enabled' or 'dp'
            enabled = dp_val.get("enabled")
            out = {"dp": bool(dp_val.get("dp", enabled if enabled is not None else True))}
            if dp_val.get("epsilon") is not None:
                try:
                    out["epsilon"] = float(dp_val.get("epsilon"))
                except Exception:
                    pass
            if dp_val.get("delta") is not None:
                try:
                    out["delta"] = float(dp_val.get("delta"))
                except Exception:
                    pass
            out["strict"] = bool(dp_val.get("strict", False))
            # propagate requested backend if present (for worker resolution)
            b = str(dp_val.get("backend") or "").strip().lower()
            if b in ("none","custom","synthcity"):
                out["backend"] = b
            return out
        return None
    dp_norm = _normalize_dp(dp_raw)

    if dp_norm is not None:
        dp_methods = {"pategan", "dpgan", "dp-ctgan"}
        sdv_methods = {"ctgan", "tvae", "gc"}
        if method_l in dp_methods:
            # accept as-is for DP-only methods
            cfg["dp"] = dp_norm
            try:
                print(f"[api][dp] accepted DP for method={method_l} cfg={dp_norm}")
            except Exception:
                pass
        elif method_l in sdv_methods:
            if dp_norm.get("dp", True):
                if dp_norm.get("strict", False):
                    raise HTTPException(status_code=400, detail="DP unavailable for chosen method; choose a DP-capable method (pategan, dpgan, dp-ctgan) or set dp.strict=false to continue without DP.")
                # fallback: disable DP and add warning
                cfg["dp"] = {"dp": False, "epsilon": dp_norm.get("epsilon"), "delta": dp_norm.get("delta"), "strict": False}
                cfg["dp_warning"] = "DP unavailable for chosen method; continuing non-DP."
                try:
                    print(f"[api][dp] fallback non-DP for method={method_l}; stored cfg.dp=false")
                except Exception:
                    pass
            else:
                cfg["dp"] = dp_norm
        else:
            # Unknown/auto method: keep dp as provided
            cfg["dp"] = dp_norm

    payload = {
        "project_id": project_id,
        "dataset_id": body.dataset_id,
        "started_by": user["id"],
        "method": body.method,
        "mode": mode_in,
        "name": body.name,
        "status": "queued",
        "started_at": None,
        # Persist provided config for traceability if column exists
        "config_json": cfg or None,
    }
    try:
        res = supabase.table("runs").insert(payload).execute()
    except APIError:
        # Retry without config_json if column does not exist
        payload.pop("config_json", None)
        try:
            res = supabase.table("runs").insert(payload).execute()
        except APIError:
            # Retry without optional 'name' if column does not exist
            payload.pop("name", None)
            res = supabase.table("runs").insert(payload).execute()
        res = supabase.table("runs").insert(payload).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    run_id = res.data[0]["id"]
    # Log planning step for visibility
    try:
        plan = (cfg or {}).get("plan") or {}
        supabase.table("run_steps").insert({
            "run_id": run_id,
            "step_no": 0,
            "title": "planned",
            "detail": f"method={plan.get('choice',{}).get('method','gc')}",
            "metrics_json": None,
        }).execute()
    except Exception:
        pass
    return {"run_id": run_id}

# Development endpoint to get all runs (for testing)
@app.get("/dev/runs")
def list_runs_dev():
    """Development endpoint to list all runs without authentication."""
    try:
        # Get all runs from the database
        runs_res = supabase.table("runs").select("*").execute()
        if runs_res.data is None:
            return []
        
        runs = runs_res.data
        
        # Get all datasets and projects for context
        datasets_res = supabase.table("datasets").select("id, name, project_id").execute()
        projects_res = supabase.table("projects").select("id, name").execute()
        
        dataset_names = {d["id"]: d["name"] for d in (datasets_res.data or [])}
        project_names = {p["id"]: p["name"] for p in (projects_res.data or [])}
        dataset_projects = {d["id"]: d["project_id"] for d in (datasets_res.data or [])}
        
        # Process runs
        runs_with_metadata = []
        for run in runs:
            dataset_id = run["dataset_id"]
            project_id = dataset_projects.get(dataset_id)
            
            # Calculate duration
            duration = None
            if run.get("started_at") and run.get("finished_at"):
                from datetime import datetime, timezone
                start_time = datetime.fromisoformat(run["started_at"].replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(run["finished_at"].replace('Z', '+00:00'))
                duration = int((end_time - start_time).total_seconds() / 60)
            
            runs_with_metadata.append({
                **run,
                "project_id": project_id,
                "project_name": project_names.get(project_id, "Unknown Project"),
                "dataset_name": dataset_names.get(dataset_id, "Unknown Dataset"),
                "duration": duration,
                "created_at": run["started_at"]
            })
        
        return runs_with_metadata
    except Exception as e:
        print(f"Error in dev runs endpoint: {e}")
        return []


@app.get("/v1/runs/{run_id}")
def get_run(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    """Get a single run by ID with full details including config_json (agent plan)."""
    r = supabase.table("runs").select("id, name, dataset_id, status, started_at, finished_at, method, config_json, project_id").eq("id", run_id).single().execute()
    if r.data is None:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Verify ownership via project
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    row = dict(r.data)
    
    # artifacts_ready: succeeded AND metrics row exists
    ready = False
    try:
        if row.get("status") == "succeeded":
            m = supabase.table("metrics").select("run_id").eq("run_id", run_id).maybe_single().execute()
            ready = bool(m.data)
    except Exception:
        ready = False
    row["artifacts_ready"] = ready
    
    return row

@app.get("/v1/runs/{run_id}/status")
def run_status(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,status,started_at,finished_at,name,method").eq("id", run_id).single().execute()
    if r.data is None:
        raise HTTPException(status_code=404, detail="Run not found")
    row = dict(r.data)
    # artifacts_ready: succeeded AND metrics row exists
    ready = False
    try:
        if row.get("status") == "succeeded":
            m = supabase.table("metrics").select("run_id").eq("run_id", run_id).maybe_single().execute()
            ready = bool(m.data)
    except Exception:
        ready = False
    row["artifacts_ready"] = ready
    return row

# ---- Rename run ----
@app.patch("/v1/runs/{run_id}/name")
def rename_run(run_id: str, body: RenameBody, user: Dict[str, Any] = Depends(require_user)):
    # Validate ownership via project
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    supabase.table("runs").update({"name": body.name}).eq("id", run_id).execute()
    return {"ok": True}

@app.get("/v1/runs/{run_id}/metrics")
def run_metrics(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    m = supabase.table("metrics").select("payload_json").eq("run_id", run_id).single().execute()
    if m.data is None:
        return {}
    return m.data.get("payload_json") or {}

@app.get("/v1/runs/{run_id}/artifacts")
def run_artifacts(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,status,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    # Ownership check
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    ready = False
    if r.data.get("status") == "succeeded":
        try:
            m = supabase.table("metrics").select("run_id").eq("run_id", run_id).maybe_single().execute()
            ready = bool(m.data)
        except Exception:
            ready = False
    if not ready:
        return {"artifacts_ready": False, "artifacts": []}

    rows = supabase.table("run_artifacts").select("kind,path,bytes,mime").eq("run_id", run_id).execute().data or []
    items = []
    for a in rows:
        bucket = "artifacts"
        signed = supabase.storage.from_(bucket).create_signed_url(a["path"], int(timedelta(hours=1).total_seconds()))
        url = signed.get("signedURL") if isinstance(signed, dict) else getattr(signed, "signed_url", None)
        items.append({"kind": a["kind"], "signedUrl": url, "bytes": a.get("bytes"), "mime": a.get("mime")})
    return {"artifacts_ready": True, "artifacts": items}

@app.get("/v1/runs/{run_id}/steps")
def run_steps(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        rows = supabase.table("run_steps").select("step_no,title,detail,metrics_json,created_at").eq("run_id", run_id).order("step_no").execute().data or []
        return rows
    except APIError as e:
        # Gracefully handle when the optional run_steps table hasn't been created yet
        # PGRST205: table not found in schema cache
        return []

@app.get("/v1/runs/{run_id}/logs")
def run_logs(run_id: str, user: Dict[str, Any] = Depends(require_user), tail: int = 500):
    """Get Docker logs for a specific run with parsed progress information."""
    # Verify ownership
    r = supabase.table("runs").select("id,project_id,status,started_at").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Fetch Docker logs - try direct Docker first (if running on VPS), then SSH fallback
    import subprocess
    import re
    
    docker_compose_path = os.getenv("DOCKER_COMPOSE_PATH", "/opt/gesalps/backend")
    compose_file = os.getenv("DOCKER_COMPOSE_FILE", "docker-compose.prod.yml")
    service_name = os.getenv("WORKER_SERVICE_NAME", "synth-worker")
    
    try:
        # Try direct Docker Compose command first (if API is running on VPS)
        docker_cmd = [
            "docker", "compose", "-f", f"{docker_compose_path}/{compose_file}",
            "logs", "--tail", str(tail), service_name
        ]
        
        result = subprocess.run(
            docker_cmd,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=docker_compose_path
        )
        
        # If direct Docker fails, try SSH fallback (for remote API servers)
        if result.returncode != 0:
            vps_host = os.getenv("VPS_HOST", "194.34.232.76")
            vps_user = os.getenv("VPS_USER", "root")
            ssh_cmd = [
                "ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5",
                f"{vps_user}@{vps_host}",
                f"cd {docker_compose_path} && docker compose -f {compose_file} logs --tail {tail} {service_name}"
            ]
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
        
        if result.returncode != 0:
            # Fallback: return status from database
            return {
                "run_id": run_id,
                "raw_logs": [],
                "progress": {
                    "status": r.data.get("status", "unknown"),
                    "message": f"Could not fetch logs via SSH: {result.stderr[:200]}",
                    "current_step": None,
                    "progress_messages": [],
                    "training_info": {},
                    "errors": [],
                    "warnings": []
                },
                "log_count": 0
            }
        
        raw_logs = result.stdout
        
        # Filter logs for this specific run_id
        run_logs = []
        for line in raw_logs.split('\n'):
            if run_id in line:
                run_logs.append(line)
        
        # Parse logs to extract progress information
        progress_info = {
            "status": r.data.get("status", "unknown"),
            "current_step": None,
            "progress_messages": [],
            "training_info": {},
            "errors": [],
            "warnings": []
        }
        
        # Extract progress information
        for line in run_logs:
            # Training progress
            if "[worker][TVAE]" in line or "[worker][training]" in line:
                progress_info["progress_messages"].append({
                    "timestamp": _extract_timestamp(line),
                    "message": line,
                    "type": "training"
                })
                if "Starting training" in line:
                    # Extract epochs, batch_size, rows
                    epochs_match = re.search(r'epochs=(\d+)', line)
                    batch_match = re.search(r'batch_size=(\d+)', line)
                    rows_match = re.search(r'rows=(\d+)', line)
                    if epochs_match:
                        progress_info["training_info"]["epochs"] = int(epochs_match.group(1))
                    if batch_match:
                        progress_info["training_info"]["batch_size"] = int(batch_match.group(1))
                    if rows_match:
                        progress_info["training_info"]["rows"] = int(rows_match.group(1))
                elif "Training in progress" in line or "Training completed" in line:
                    elapsed_match = re.search(r'elapsed: ([\d.]+) minutes?', line)
                    if elapsed_match:
                        progress_info["training_info"]["elapsed_minutes"] = float(elapsed_match.group(1))
            
            # Step information
            elif "[worker][GreenGuard]" in line or "Starting attempt" in line:
                progress_info["current_step"] = line
                progress_info["progress_messages"].append({
                    "timestamp": _extract_timestamp(line),
                    "message": line,
                    "type": "step"
                })
            
            # Clinical preprocessor
            elif "[worker][clinical-preprocessor]" in line:
                progress_info["progress_messages"].append({
                    "timestamp": _extract_timestamp(line),
                    "message": line,
                    "type": "preprocessing"
                })
            
            # Errors
            elif "ERROR" in line or "Error" in line:
                if "[worker]" in line or run_id in line:  # Only relevant errors
                    progress_info["errors"].append({
                        "timestamp": _extract_timestamp(line),
                        "message": line
                    })
            
            # Warnings
            elif "WARNING" in line or "Warning" in line:
                if "[worker]" in line or run_id in line:  # Only relevant warnings
                    progress_info["warnings"].append({
                        "timestamp": _extract_timestamp(line),
                        "message": line
                    })
        
        return {
            "run_id": run_id,
            "raw_logs": run_logs[-100:],  # Last 100 lines
            "progress": progress_info,
            "log_count": len(run_logs)
        }
    
    except FileNotFoundError:
        # SSH not available (e.g., in Vercel without SSH access)
        return {
            "run_id": run_id,
            "raw_logs": [],
            "progress": {
                "status": r.data.get("status", "unknown"),
                "message": "SSH/Docker logs not available in this environment",
                "current_step": None,
                "progress_messages": [],
                "training_info": {},
                "errors": [],
                "warnings": []
            },
            "log_count": 0
        }
    except Exception as e:
        # Return basic status if log fetching fails
        return {
            "run_id": run_id,
            "raw_logs": [],
            "progress": {
                "status": r.data.get("status", "unknown"),
                "message": f"Could not fetch logs: {str(e)[:200]}",
                "current_step": None,
                "progress_messages": [],
                "training_info": {},
                "errors": [],
                "warnings": []
            },
            "log_count": 0
        }

def _extract_timestamp(line: str) -> Optional[str]:
    """Extract timestamp from log line."""
    import re
    # Try ISO format: 2026-01-13T11:47:07.551732+0000
    iso_match = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*[+-]\d{4})', line)
    if iso_match:
        return iso_match.group(1)
    # Try simpler format
    simple_match = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', line)
    if simple_match:
        return simple_match.group(1)
    return None

@app.delete("/v1/runs/{run_id}")
def delete_run(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    artifacts = supabase.table("run_artifacts").select("path").eq("run_id", run_id).execute().data or []
    paths = [a.get("path") for a in artifacts if a and a.get("path")]
    if paths:
        try:
            supabase.storage.from_("artifacts").remove(paths)
        except Exception:
            pass

    supabase.table("metrics").delete().eq("run_id", run_id).execute()
    supabase.table("run_artifacts").delete().eq("run_id", run_id).execute()
    supabase.table("runs").delete().eq("id", run_id).execute()
    return {"ok": True}

@app.get("/v1/runs/{run_id}/synthetic/preview")
def run_synthetic_preview(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    art = supabase.table("run_artifacts").select("path").eq("run_id", run_id).eq("kind", "synthetic_csv").single().execute()
    if not art.data:
        raise HTTPException(status_code=404, detail="synthetic_csv not found")
    file_bytes = supabase.storage.from_("artifacts").download(art.data["path"])
    raw = io.BytesIO(file_bytes) if isinstance(file_bytes, (bytes, bytearray)) else io.BytesIO(file_bytes.read())
    df = pd.read_csv(raw)
    df_head = df.head(20)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(df_head.columns.tolist())
    for _, row in df_head.iterrows():
        writer.writerow([None if pd.isna(v) else v for v in row.tolist()])
    buf.seek(0)
    return StreamingResponse(io.StringIO(buf.read()), media_type="text/csv")

@app.get("/v1/runs/{run_id}/report")
def run_report_json(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    art = supabase.table("run_artifacts").select("path").eq("run_id", run_id).eq("kind", "report_json").single().execute()
    if not art.data:
        m = supabase.table("metrics").select("payload_json").eq("run_id", run_id).single().execute()
        if m.data and m.data.get("payload_json"):
            return m.data["payload_json"]
        raise HTTPException(status_code=404, detail="report_json not found")
    file_bytes = supabase.storage.from_("artifacts").download(art.data["path"])
    raw = file_bytes if isinstance(file_bytes, (bytes, bytearray)) else file_bytes.read()
    try:
        js = json.loads(raw)
    except Exception:
        js = json.loads(raw.decode("utf-8"))
    return js

# ---------- PDF trigger (via report-service) ----------
@app.post("/v1/runs/{run_id}/report/pdf")
def generate_report_pdf(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Prefer report_json artifact; fallback to metrics table
    art = supabase.table("run_artifacts").select("path").eq("run_id", run_id).eq("kind", "report_json").single().execute()
    if art.data:
        raw = supabase.storage.from_("artifacts").download(art.data["path"])
        content = raw if isinstance(raw, (bytes, bytearray)) else raw.read()
        metrics = json.loads(content.decode("utf-8"))
    else:
        m = supabase.table("metrics").select("payload_json").eq("run_id", run_id).single().execute()
        metrics = (m.data or {}).get("payload_json") or {}

    # Call report-service
    # Try remote report-service first; on failure, fallback to local render
    pdf_bytes: bytes
    try:
        base = REPORT_SERVICE_BASE
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{base}/render", json={
                "title": "Gesalps Privacy–Utility Report",
                "metrics": metrics,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
            })
        if resp.status_code != 200:
            raise RuntimeError(f"report-service returned {resp.status_code}")
        pdf_bytes = resp.content or b""
        # Validate payload is actually a PDF; otherwise trigger fallback
        ct = resp.headers.get("content-type", "")
        if not (ct.lower().startswith("application/pdf") and pdf_bytes[:5] == b"%PDF-"):
            raise RuntimeError("report-service returned non-PDF content")
    except Exception:
        # Local fallback using a minimal PDF (keeps local dev resilient)
        try:
            from reportlab.lib.pagesizes import A4  # type: ignore
            from reportlab.lib import colors  # type: ignore
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer  # type: ignore
            from reportlab.lib.styles import getSampleStyleSheet  # type: ignore
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=36, bottomMargin=36, leftMargin=36, rightMargin=36)
            styles = getSampleStyleSheet()
            story = []
            title = styles['Title']; title.fontSize = 20
            h2 = styles['Heading2']; h2.spaceBefore = 12; h2.spaceAfter = 6
            body = styles['BodyText']
            story.append(Paragraph("Gesalps Privacy–Utility Report", title))
            story.append(Paragraph(datetime.utcnow().strftime("%Y-%m-%d"), body))
            story.append(Spacer(1, 12))

            def badge(val, op, thr):
                try:
                    if val is None:
                        return "N/A"
                    ok = val <= thr if op == "<=" else val >= thr
                    return "Pass" if ok else "Check"
                except Exception:
                    return "N/A"

            p = metrics.get('privacy', {}) if isinstance(metrics, dict) else {}
            u = metrics.get('utility', {}) if isinstance(metrics, dict) else {}
            mia = p.get('mia_auc'); dup = p.get('dup_rate')
            ks = u.get('ks_mean'); corr = u.get('corr_delta')
            privacy_rows = [["Test","Result","Threshold","Status"],
                            ["Membership Inference AUC", f"{mia if mia is not None else '—'}", "≤ 0.60", badge(mia, "<=", 0.60)],
                            ["Record Linkage Risk (%)", f"{(dup*100):.1f}%" if isinstance(dup,(int,float)) else "—", "≤ 5%", badge(dup*100 if isinstance(dup,(int,float)) else None, "<=", 5.0)]]
            t = Table(privacy_rows, hAlign='LEFT', colWidths=[220, 90, 110, 80])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#111827')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.25, colors.HexColor('#D1D5DB')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (1,1), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(Paragraph("Privacy Assessment", h2))
            story.append(t); story.append(Spacer(1, 18))
            util_rows = [["Metric","Value","Target","Status"],
                         ["KS mean (lower is better)", f"{ks if ks is not None else '—'}", "≤ 0.10", badge(ks, "<=", 0.10)],
                         ["Correlation Δ (lower is better)", f"{corr if corr is not None else '—'}", "≤ 0.10", badge(corr, "<=", 0.10)]]
            t2 = Table(util_rows, hAlign='LEFT', colWidths=[220, 90, 110, 80])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#111827')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.25, colors.HexColor('#D1D5DB')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (1,1), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(Paragraph("Utility Assessment", h2))
            story.append(t2)
            doc.build(story)
            buf.seek(0)
            pdf_bytes = buf.read()
        except Exception as e:
            raise HTTPException(502, f"Report service failed and fallback errored: {e}")
    ensure_bucket("artifacts")
    # Prefer a friendly filename for the formatted report
    path = f"{run_id}/gesalps_quality_report.pdf"
    # Robust upload across supabase-py versions
    try:
        # storage3 expects header values as strings; use upsert="true"
        supabase.storage.from_("artifacts").upload(path=path, file=pdf_bytes, file_options={"contentType": "application/pdf", "upsert": "true"})
    except Exception:
        try:
            supabase.storage.from_("artifacts").update(path=path, file=pdf_bytes, file_options={"contentType": "application/pdf", "upsert": "true"})
        except Exception:
            supabase.storage.from_("artifacts").upload(path=path, file=pdf_bytes)
    try:
        supabase.table("run_artifacts").upsert({
            "run_id": run_id,
            "kind": "report_pdf",
            "path": path,
            "mime": "application/pdf",
            "bytes": len(pdf_bytes) if isinstance(pdf_bytes, (bytes, bytearray)) else None,
        }).execute()
    except Exception:
        pass

    signed = supabase.storage.from_("artifacts").create_signed_url(path, int(timedelta(hours=1).total_seconds()))
    url = signed.get("signedURL") if isinstance(signed, dict) else getattr(signed, "signed_url", None)
    return {"path": path, "signedUrl": url}

# Development endpoint for PDF generation (bypasses authentication)
@app.post("/dev/runs/{run_id}/report/pdf")
def generate_report_pdf_dev(run_id: str, user: Dict[str, Any] = Depends(require_user_dev)):
    # Skip ownership check for development
    r = supabase.table("runs").select("id,project_id").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")

    # Prefer report_json artifact; fallback to metrics table
    art = supabase.table("run_artifacts").select("path").eq("run_id", run_id).eq("kind", "report_json").single().execute()
    if art.data:
        raw = supabase.storage.from_("artifacts").download(art.data["path"])
        content = raw if isinstance(raw, (bytes, bytearray)) else raw.read()
        metrics = json.loads(content.decode("utf-8"))
    else:
        m = supabase.table("metrics").select("payload_json").eq("run_id", run_id).single().execute()
        metrics = (m.data or {}).get("payload_json") or {}

    # Call report-service
    # Try remote report-service first; on failure, fallback to local render
    pdf_bytes: bytes
    try:
        base = REPORT_SERVICE_BASE
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{base}/render", json={
                "title": "Gesalps Privacy–Utility Report",
                "metrics": metrics,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
            })
        if resp.status_code != 200:
            raise RuntimeError(f"report-service returned {resp.status_code}")
        pdf_bytes = resp.content or b""
        # Validate payload is actually a PDF; otherwise trigger fallback
        ct = resp.headers.get("content-type", "")
        if not (ct.lower().startswith("application/pdf") and pdf_bytes[:5] == b"%PDF-"):
            raise RuntimeError("report-service returned non-PDF content")
    except Exception:
        # Local fallback using a minimal PDF (keeps local dev resilient)
        try:
            from reportlab.lib.pagesizes import A4  # type: ignore
            from reportlab.lib import colors  # type: ignore
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer  # type: ignore
            from reportlab.lib.styles import getSampleStyleSheet  # type: ignore
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=36, bottomMargin=36, leftMargin=36, rightMargin=36)
            styles = getSampleStyleSheet()
            story = []
            title = styles['Title']; title.fontSize = 20
            h2 = styles['Heading2']; h2.spaceBefore = 12; h2.spaceAfter = 6
            body = styles['BodyText']
            story.append(Paragraph("Gesalps Privacy–Utility Report", title))
            story.append(Paragraph(datetime.utcnow().strftime("%Y-%m-%d"), body))
            story.append(Spacer(1, 12))

            def badge(val, op, thr):
                try:
                    if val is None:
                        return "N/A"
                    ok = val <= thr if op == "<=" else val >= thr
                    return "Pass" if ok else "Check"
                except Exception:
                    return "N/A"

            p = metrics.get('privacy', {}) if isinstance(metrics, dict) else {}
            u = metrics.get('utility', {}) if isinstance(metrics, dict) else {}
            mia = p.get('mia_auc'); dup = p.get('dup_rate')
            ks = u.get('ks_mean'); corr = u.get('corr_delta')
            privacy_rows = [["Test","Result","Threshold","Status"],
                            ["Membership Inference AUC", f"{mia if mia is not None else '—'}", "≤ 0.60", badge(mia, "<=", 0.60)],
                            ["Record Linkage Risk (%)", f"{(dup*100):.1f}%" if isinstance(dup,(int,float)) else "—", "≤ 5%", badge(dup*100 if isinstance(dup,(int,float)) else None, "<=", 5.0)]]
            t = Table(privacy_rows, hAlign='LEFT', colWidths=[220, 90, 110, 80])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#111827')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.25, colors.HexColor('#D1D5DB')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (1,1), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(Paragraph("Privacy Assessment", h2))
            story.append(t); story.append(Spacer(1, 18))
            util_rows = [["Metric","Value","Target","Status"],
                         ["KS mean (lower is better)", f"{ks if ks is not None else '—'}", "≤ 0.10", badge(ks, "<=", 0.10)],
                         ["Correlation Δ (lower is better)", f"{corr if corr is not None else '—'}", "≤ 0.10", badge(corr, "<=", 0.10)]]
            t2 = Table(util_rows, hAlign='LEFT', colWidths=[220, 90, 110, 80])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#111827')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.25, colors.HexColor('#D1D5DB')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (1,1), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(Paragraph("Utility Assessment", h2))
            story.append(t2)
            doc.build(story)
            buf.seek(0)
            pdf_bytes = buf.read()
        except Exception as e:
            raise HTTPException(502, f"Report service failed and fallback errored: {e}")
    ensure_bucket("artifacts")
    # Prefer a friendly filename for the formatted report
    path = f"{run_id}/gesalps_quality_report.pdf"
    # Robust upload across supabase-py versions
    try:
        # storage3 expects header values as strings; use upsert="true"
        supabase.storage.from_("artifacts").upload(path=path, file=pdf_bytes, file_options={"contentType": "application/pdf", "upsert": "true"})
    except Exception:
        try:
            supabase.storage.from_("artifacts").update(path=path, file=pdf_bytes, file_options={"contentType": "application/pdf", "upsert": "true"})
        except Exception:
            supabase.storage.from_("artifacts").upload(path=path, file=pdf_bytes)
    try:
        supabase.table("run_artifacts").upsert({
            "run_id": run_id,
            "kind": "report_pdf",
            "path": path,
            "mime": "application/pdf",
            "bytes": len(pdf_bytes) if isinstance(pdf_bytes, (bytes, bytearray)) else None,
        }).execute()
    except Exception:
        pass

    signed = supabase.storage.from_("artifacts").create_signed_url(path, int(timedelta(hours=1).total_seconds()))
    url = signed.get("signedURL") if isinstance(signed, dict) else getattr(signed, "signed_url", None)
    return {"path": path, "signedUrl": url}


# ---------- Download bundle (ZIP) ----------
@app.get("/v1/runs/{run_id}/download/all")
def download_all_artifacts(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    # Ownership check via project
    r = supabase.table("runs").select("id,project_id,name").eq("id", run_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Run not found")
    proj = supabase.table("projects").select("owner_id").eq("id", r.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = supabase.table("run_artifacts").select("kind,path,bytes,mime").eq("run_id", run_id).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="No artifacts to download")

    # Build an in-memory ZIP
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Add artifacts with friendly names when recognized
        for a in rows:
            path = a.get("path")
            kind = a.get("kind") or "file"
            if not path:
                continue
            try:
                raw = supabase.storage.from_("artifacts").download(path)
                content = raw if isinstance(raw, (bytes, bytearray)) else raw.read()
            except Exception:
                continue
            # Friendly filename mapping
            if kind == "synthetic_csv":
                fname = "synthetic.csv"
            elif kind == "report_json":
                fname = "report.json"
            elif kind == "report_pdf":
                fname = "Gesalps_Quality_Report.pdf"
            else:
                # fallback to basename of storage path
                fname = path.split("/")[-1] or kind
            zf.writestr(fname, content)

        # Manifest
        try:
            title = str(r.data.get("name") or "").strip() or run_id
        except Exception:
            title = run_id
        manifest = (
            f"Gesalps Run Export\nRun: {title}\nRun ID: {run_id}\n"
        ).encode("utf-8")
        zf.writestr("README.txt", manifest)

    buf.seek(0)
    filename = f"run_{run_id}_artifacts.zip"
    headers = {"Content-Disposition": f"attachment; filename=\"{filename}\""}
    return StreamingResponse(buf, media_type="application/zip", headers=headers)

# Alias path for convenience
@app.get("/v1/runs/{run_id}/download")
def download_all_artifacts_alias(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    return download_all_artifacts(run_id, user)


def _schema_summary(schema_json: Dict[str, Any]) -> str:
    cols = (schema_json or {}).get("columns", [])[:50]
    return "\n".join(
        f"- {c.get('name')} ({c.get('type')}), missing={c.get('missing')}, unique={c.get('unique')}"
        for c in cols
    )

class AgentSuggestBody(BaseModel):
    dataset_id: str
    prompt: str

@app.post("/v1/agent/suggest")
def agent_suggest(body: AgentSuggestBody, user: Dict[str, Any] = Depends(require_user)):
    # auth + fetch dataset
    ds = supabase.table("datasets").select("id,project_id,name,schema_json,rows_count,cols_count").eq("id", body.dataset_id).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    proj = supabase.table("projects").select("owner_id").eq("id", ds.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    schema_text = _schema_summary(ds.data.get("schema_json") or {})
    system = (
        "You are Gesalps Planner. Given a dataset summary and a user goal, return STRICT JSON "
        "with keys: method in ['gc','ctgan','tvae'], sample_multiplier (0.1-3.0), "
        "max_synth_rows (int, 1-200000), privacy_tuning {enable_dp: bool, epsilon: number|null}, "
        "notes (string). No extra text. Only JSON."
    )
    user_text = f"""Dataset: {ds.data.get('name')}
Rows: {ds.data.get('rows_count')}  Cols: {ds.data.get('cols_count')}
Schema:
{schema_text}

Goal:
{body.prompt}
"""

    payload = {
        "model": "gpt-oss:20b",
        "prompt": f"System:\n{system}\n\nUser:\n{user_text}\n",
        "stream": False
    }

    try:
        with httpx.Client(timeout=60) as cl:
            rr = cl.post(f"{OLLAMA_BASE}/api/generate", json=payload)
            rr.raise_for_status()
            out = rr.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    text = (out or {}).get("response") or "{}"
    # robust JSON extraction
    try:
        plan = json.loads(text)
    except Exception:
        import re
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise HTTPException(status_code=500, detail=f"LLM returned non-JSON.")
        plan = json.loads(m.group(0))

    # normalize
    mth = str(plan.get("method", "gc")).lower()
    if mth not in {"gc", "ctgan", "tvae"}:
        mth = "gc"
    plan["method"] = mth
    plan["sample_multiplier"] = float(plan.get("sample_multiplier", 1.0))
    plan["max_synth_rows"] = int(plan.get("max_synth_rows", 5000))
    plan.setdefault("privacy_tuning", {"enable_dp": False, "epsilon": None})
    plan.setdefault("notes", "")

    return {"plan": plan}


# ---------- Agent plan (stub) ----------
class AgentPlanBody(BaseModel):
    dataset_id: str
    preference: Dict[str, Any] | None = None  # { tradeoff: 'privacy-first'|'balanced'|'utility-first' }
    goal: str | None = None
    prompt: str | None = None


def _summarize_dataset(dataset_id: str) -> Dict[str, Any]:
    ds = supabase.table("datasets").select("id,project_id,name,rows_count,cols_count,file_url,schema_json").eq("id", dataset_id).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    info = ds.data
    # Download CSV (entire file) and read first 1000 rows
    try:
        raw = supabase.storage.from_("datasets").download(info["file_url"])  # bytes or response
        data = raw if isinstance(raw, (bytes, bytearray)) else raw.read()
        df = pd.read_csv(io.BytesIO(data), nrows=1000)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")

    # Build quick summary
    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = [c for c in df.columns if c not in numeric_cols]
    num_summary: Dict[str, Dict[str, Any]] = {}
    for c in numeric_cols:
        s = pd.to_numeric(df[c], errors="coerce").dropna()
        if len(s) == 0:
            continue
        try:
            q = s.quantile([0, 0.25, 0.5, 0.75, 1.0])
            num_summary[c] = {
                "min": float(q.iloc[0]),
                "q1": float(q.iloc[1]),
                "median": float(q.iloc[2]),
                "q3": float(q.iloc[3]),
                "max": float(q.iloc[4]),
            }
        except Exception:
            pass
    cat_summary: Dict[str, Any] = {}
    for c in cat_cols:
        try:
            vc = df[c].astype(str).value_counts(dropna=False).head(5)
            cat_summary[c] = [{"value": str(k), "count": int(v)} for k, v in vc.items()]
        except Exception:
            pass
    return {
        "name": info.get("name"),
        "rows_count": info.get("rows_count"),
        "schema": info.get("schema_json") or {},
        "numeric": num_summary,
        "categorical": cat_summary,
    }


def _agent_plan_internal(dataset_id: str, preference: Optional[Dict[str, Any]], goal: Optional[str], prompt: Optional[str]) -> Dict[str, Any]:
    summary = _summarize_dataset(dataset_id)
    tradeoff = ((preference or {}).get("tradeoff") or "balanced").lower()
    system = (
        "You are a senior synthetic-data scientist for healthcare tabular data.\n"
        "Return ONLY valid JSON per schema:\n"
        "{\n \"choice\":{\"method\":\"gc|ctgan|tvae\"},\n \"hyperparams\":{\"sample_multiplier\":number,\"max_synth_rows\":number,\"ctgan\":{\"epochs\":int,\"batch_size\":int}?,\"tvae\":{\"epochs\":int,\"batch_size\":int}?},\n \"dp\":{\"enabled\":false},\n \"backup\":[{\"method\":\"gc|ctgan|tvae\",\"hyperparams\":{...}}...],\n \"rationale\":\"short reason\"\n}\n"
        "Guidance:\n"
        "- GC for small/mixed data with many categoricals or when stability is needed.\n"
        "- CTGAN for complex categorical/non-Gaussian data; epochs 200–400; batch 64–256.\n"
        "- TVAE for continuous-heavy data; epochs 200–400; batch 128–256.\n"
        "- Pick sample_multiplier in [1.0..3.0] based on rows_count; cap max_synth_rows ≤ 50000.\n"
        "- Always include 2 backups with different methods/hparams.\n"
        "No prose. JSON only.\n"
    )
    user_text = json.dumps({
        "tradeoff": tradeoff,
        "goal": goal,
        "prompt": prompt,
        "summary": summary,
    }, ensure_ascii=False)

    # Prefer configured model; try a couple of fallbacks to be robust on local setups
    model_env = os.getenv("AGENT_MODEL") or os.getenv("NEXT_PUBLIC_AGENT_MODEL") or "gpt-oss:20b"
    model_candidates = [model_env, "llama3.1:8b"]

    prompt_payload = {
        "prompt": f"System:\n{system}\n\nUser:\n{user_text}\n",
        "stream": False
    }
    # Try models, retry once per model for JSON cleanup
    for mdl in model_candidates:
        payload = {"model": mdl, **prompt_payload}
        for attempt in range(2):
            try:
                with httpx.Client(timeout=60) as cl:
                    rr = cl.post(f"{OLLAMA_BASE}/api/generate", json=payload)
                    rr.raise_for_status()
                    out = rr.json()
                text = (out or {}).get("response") or "{}"
                try:
                    plan = json.loads(text)
                except Exception:
                    import re
                    m = re.search(r"\{.*\}", text, re.S)
                    if not m:
                        raise ValueError("Invalid JSON response from LLM")
                    plan = json.loads(m.group(0))
                if not isinstance(plan, dict) or "choice" not in plan or "hyperparams" not in plan:
                    raise ValueError("Plan missing required keys")
                return plan
            except Exception:
                continue

    # Fallback: craft a conservative default plan from summary
    try:
        cols = summary.get("schema", {}).get("columns", []) if isinstance(summary, dict) else []
        # estimate categorical weight
        cat_like = 0
        for c in cols:
            t = str((c or {}).get("type") or "").lower()
            if t and not any(x in t for x in ["int","float","double","number","decimal","datetime","date"]):
                cat_like += 1
        method = "ctgan" if (cat_like and len(cols) and (cat_like/len(cols) > 0.5)) else "gc"
    except Exception:
        method = "gc"
    rows = int((summary or {}).get("rows_count") or 0)
    max_rows = min(50000, max(2000, rows or 2000))
    return {
        "choice": {"method": method},
        "hyperparams": {"sample_multiplier": 1.0, "max_synth_rows": max_rows},
        "dp": {"enabled": False},
        "backup": [
            {"method": "gc", "hyperparams": {"sample_multiplier": 1.0, "max_synth_rows": max_rows}},
            {"method": "tvae", "hyperparams": {"sample_multiplier": 1.0, "max_synth_rows": max_rows}},
        ],
        "rationale": "Fallback default plan (LLM unavailable)",
    }


@app.post("/v1/agent/plan")
def agent_plan(body: AgentPlanBody, user: Dict[str, Any] = Depends(require_user)):
    # Validate dataset ownership
    ds = supabase.table("datasets").select("id,project_id").eq("id", body.dataset_id).single().execute()
    if not ds.data:
        raise HTTPException(status_code=404, detail="Dataset not found")
    proj = supabase.table("projects").select("owner_id").eq("id", ds.data["project_id"]).single().execute()
    if not proj.data or proj.data.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this dataset")

    plan = _agent_plan_internal(body.dataset_id, body.preference, body.goal, body.prompt)
    return {"plan": plan}

# Add a simple test endpoint
@app.get("/")
async def root():
    return {"message": "GESALP AI API is running!", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Vercel handler
handler = app
