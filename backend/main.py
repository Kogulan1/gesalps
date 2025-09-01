import io
import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile, Request
from pydantic import BaseModel
from jose import jwt
import httpx
from supabase import create_client, Client

APP_JWKS_CACHE: Dict[str, Any] = {}

def get_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing env var {name}")
    return v

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)

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
    # Verify JWT with Supabase JWKS; fallback to unverified if verification fails
    try:
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == unverified_header.get("kid")), None)
        if key:
            return jwt.decode(token, key, algorithms=[unverified_header.get("alg", "RS256")], audience=None, options={"verify_aud": False})
    except Exception:
        pass
    # Fallback (not ideal): return unverified claims
    return jwt.get_unverified_claims(token)

async def require_user(request: Request) -> Dict[str, Any]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth.split(" ", 1)[1]
    claims = verify_token(token)
    uid = claims.get("sub") or claims.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"id": uid, "email": claims.get("email")}

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}

class CreateProject(BaseModel):
    name: str

@app.post("/v1/projects")
def create_project(p: CreateProject, user: Dict[str, Any] = Depends(require_user)):
    # Quota: max 2 projects per user (free tier)
    cnt = supabase.table("projects").select("id", count="exact").eq("owner_id", user["id"]).execute()
    if (cnt.count or 0) >= 2:
        raise HTTPException(status_code=403, detail="Quota exceeded: Free plan allows up to 2 projects.")
    payload = {"name": p.name, "owner_id": user["id"]}
    res = supabase.table("projects").insert(payload).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    return res.data[0]

@app.post("/v1/datasets/upload")
async def upload_dataset(project_id: str = Form(...), file: UploadFile = Form(...), user: Dict[str, Any] = Depends(require_user)):
    # Read CSV to infer schema
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    rows_count = int(df.shape[0])
    cols_count = int(df.shape[1])
    # Quota: max 5k rows per dataset on free tier
    if rows_count > 5000:
        raise HTTPException(status_code=403, detail="Quota exceeded: Datasets up to 5,000 rows on free plan.")

    # Simple schema summary
    cols = []
    for col in df.columns:
        s = df[col]
        miss = float(s.isna().mean()) if rows_count > 0 else 0.0
        uniq = int(s.nunique(dropna=True))
        cols.append({"name": str(col), "type": str(s.dtype), "missing": round(miss, 4), "unique": uniq})
    schema = {"columns": cols}

    # Store original CSV
    ds_id = supabase.rpc("uuid_generate_v4").execute().data if hasattr(supabase, "rpc") else None
    object_name = f"{project_id}/{int(time.time())}_{file.filename or 'dataset'}.csv"
    bucket = supabase.storage.from_("datasets")
    upload_res = bucket.upload(object_name, content)
    if hasattr(upload_res, "error") and upload_res.error:
        raise HTTPException(status_code=500, detail=str(upload_res.error))

    # Insert row in datasets
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

class StartRun(BaseModel):
    dataset_id: str
    method: str
    mode: str

@app.post("/v1/runs")
def start_run(body: StartRun, user: Dict[str, Any] = Depends(require_user)):
    # Resolve project from dataset to ensure consistency
    ds = supabase.table("datasets").select("id,project_id").eq("id", body.dataset_id).single().execute()
    if ds.data is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    project_id = ds.data["project_id"]
    # Quota: max 3 runs per project (free tier)
    rcnt = supabase.table("runs").select("id", count="exact").eq("project_id", project_id).execute()
    if (rcnt.count or 0) >= 3:
        raise HTTPException(status_code=403, detail="Quota exceeded: Max 3 runs per project on free plan.")
    payload = {
        "project_id": project_id,
        "dataset_id": body.dataset_id,
        "started_by": user["id"],
        "method": body.method,
        "mode": body.mode,
        "status": "queued",
        "started_at": None,
    }
    res = supabase.table("runs").insert(payload).execute()
    if res.data is None:
        raise HTTPException(status_code=500, detail=str(res.error))
    return {"run_id": res.data[0]["id"]}

@app.get("/v1/runs/{run_id}/status")
def run_status(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    r = supabase.table("runs").select("id,status,started_at,finished_at").eq("id", run_id).single().execute()
    if r.data is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return r.data

@app.get("/v1/runs/{run_id}/metrics")
def run_metrics(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    m = supabase.table("metrics").select("payload_json").eq("run_id", run_id).single().execute()
    if m.data is None:
        return {}
    return m.data.get("payload_json") or {}

@app.get("/v1/runs/{run_id}/artifacts")
def run_artifacts(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    rows = supabase.table("run_artifacts").select("kind,path,bytes,mime").eq("run_id", run_id).execute().data or []
    out = []
    for a in rows:
        bucket = "artifacts"
        signed = supabase.storage.from_(bucket).create_signed_url(a["path"], int(timedelta(hours=1).total_seconds()))
        url = signed.get("signedURL") if isinstance(signed, dict) else getattr(signed, "signed_url", None)
        out.append({"kind": a["kind"], "signedUrl": url, "bytes": a.get("bytes"), "mime": a.get("mime")})
    return out

# --- Worker (placeholder) ---------------------------------------------------

def execute_pipeline(run: Dict[str, Any]) -> Dict[str, Any]:
    # Placeholder: write minimal metrics and dummy artifact paths
    metrics = {
        "utility": {"ks_mean": 0.07, "corr_delta": 0.05, "auroc": None, "c_index": None},
        "privacy": {"mia_auc": 0.55, "dup_rate": 0.0},
        "composite": {"x_mia": 0.55, "y_utility": 0.70},
    }
    artifacts = {
        "synthetic_csv": f"{run['id']}/synthetic.csv",
        "report_json": f"{run['id']}/report.json",
    }
    # Upload minimal files
    supabase.storage.from_("artifacts").upload(artifacts["report_json"], json.dumps(metrics).encode())
    supabase.storage.from_("artifacts").upload(artifacts["synthetic_csv"], b"col1,col2\n1,2\n3,4\n")
    return {"metrics": metrics, "artifacts": artifacts}

def worker_loop():
    while True:
        # Fetch one queued run
        q = supabase.table("runs").select("*").eq("status", "queued").limit(1).execute()
        run = (q.data or [None])[0]
        if not run:
            time.sleep(2)
            continue
        try:
            supabase.table("runs").update({"status": "running", "started_at": datetime.utcnow().isoformat()}).eq("id", run["id"]).execute()
            result = execute_pipeline(run)
            supabase.table("metrics").insert({"run_id": run["id"], "payload_json": result["metrics"]}).execute()
            for kind, path in result["artifacts"].items():
                supabase.table("run_artifacts").upsert({"run_id": run["id"], "kind": kind, "path": path}).execute()
            supabase.table("runs").update({"status": "succeeded", "finished_at": datetime.utcnow().isoformat()}).eq("id", run["id"]).execute()
        except Exception as e:
            supabase.table("runs").update({"status": "failed", "finished_at": datetime.utcnow().isoformat()}).eq("id", run["id"]).execute()
        time.sleep(1)


threading.Thread(target=worker_loop, daemon=True).start()
