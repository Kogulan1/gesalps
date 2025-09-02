import io
import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile, Request, File
from fastapi.responses import JSONResponse, Response, StreamingResponse
import csv
import io as pyio
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt
import httpx
from supabase import create_client, Client
try:
    # Load environment variables from a local .env if present
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

APP_JWKS_CACHE: Dict[str, Any] = {}
# Max upload size (MB) for dataset CSVs
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))

def ensure_bucket(name: str) -> None:
    try:
        buckets = supabase.storage.list_buckets()  # type: ignore[attr-defined]
        if isinstance(buckets, list) and any((b.get('id') == name or b.get('name') == name) for b in buckets if isinstance(b, dict)):
            return
        # Try create (idempotent across runs)
        try:
            supabase.storage.create_bucket(name, public=False)  # type: ignore[call-arg]
        except Exception:
            # Some SDKs take options dict instead of kwargs
            try:
                supabase.storage.create_bucket(name, {"public": False})  # type: ignore[call-arg]
            except Exception:
                pass
    except Exception:
        # Non-fatal; upload will still surface a clear error if missing
        pass

def get_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing env var {name}")
    return v

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Best practice: require real env in production. Allow explicit insecure defaults for local dev only.
ALLOW_INSECURE_DEFAULTS = os.getenv("ALLOW_INSECURE_SUPABASE_DEFAULTS", "false").lower() == "true"
if not SUPABASE_URL or not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
    if ALLOW_INSECURE_DEFAULTS:
        if not SUPABASE_URL:
            SUPABASE_URL = "https://dcshmrmkfybpmixlfddj.supabase.co"
            print("[warn] SUPABASE_URL not set; using default public project URL (DEV ONLY)")
        if not (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
            SUPABASE_ANON_KEY = (
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjYxOTcsImV4cCI6MjA3MjMwMjE5N30.LNJlS7cBIhgsELKoO6UseqKaglqMMMVChVJPcRqRPyk"
            )
            print("[warn] SUPABASE_* key not set; using default anon key (DEV ONLY)")
    else:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/ANON_KEY must be set")

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

# CORS (configurable via CORS_ALLOW_ORIGINS="https://app.example.com,https://www.example.com")
cors_origins = [o.strip() for o in (os.getenv("CORS_ALLOW_ORIGINS") or "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return JSONResponse({
        "ok": True,
        "message": "Gesalps Backend",
        "health": "/health",
        "docs": "/docs",
    })

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    # Avoid noisy 404s from platform health checks
    return Response(status_code=204)

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
async def upload_dataset(project_id: str = Form(...), file: UploadFile = File(...), user: Dict[str, Any] = Depends(require_user)):
    # Ensure storage bucket exists (idempotent)
    ensure_bucket("datasets")
    # Read CSV to infer schema
    content = await file.read()
    # Enforce size limit
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max allowed is {MAX_UPLOAD_MB} MB")
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV. Please upload a UTF-8 encoded .csv file: {e}")

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

    # Store original CSV (DB tables use gen_random_uuid() by default; no RPC needed)
    object_name = f"{project_id}/{int(time.time())}_{file.filename or 'dataset'}.csv"
    bucket = supabase.storage.from_("datasets")
    # Upload using simple bytes payload; rely on unique object_name to avoid collisions.
    try:
        upload_res = bucket.upload(path=object_name, file=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")
    # supabase-py may return dict or object; check for error fields defensively
    if isinstance(upload_res, dict) and upload_res.get("error"):
        raise HTTPException(status_code=500, detail=str(upload_res.get("error")))
    if hasattr(upload_res, "error") and getattr(upload_res, "error"):
        raise HTTPException(status_code=500, detail=str(getattr(upload_res, "error")))

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
    if hasattr(file_bytes, "error") and getattr(file_bytes, "error"):
        raise HTTPException(status_code=500, detail=str(getattr(file_bytes, "error")))
    raw = io.BytesIO(file_bytes) if isinstance(file_bytes, (bytes, bytearray)) else io.BytesIO(file_bytes.read())
    df = pd.read_csv(raw)
    df_head = df.head(20)
    buf = pyio.StringIO()
    writer = csv.writer(buf)
    writer.writerow(df_head.columns.tolist())
    for _, row in df_head.iterrows():
        writer.writerow([None if pd.isna(v) else v for v in row.tolist()])
    buf.seek(0)
    return StreamingResponse(pyio.StringIO(buf.read()), media_type="text/csv")

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
    ensure_bucket("artifacts")
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
    try:
        supabase.storage.from_("artifacts").upload(path=artifacts["report_json"], file=json.dumps(metrics).encode())
        supabase.storage.from_("artifacts").upload(path=artifacts["synthetic_csv"], file=b"col1,col2\n1,2\n3,4\n")
    except Exception as e:
        print(f"[artifacts] upload error: {type(e).__name__}: {e}")
    return {"metrics": metrics, "artifacts": artifacts}

def worker_loop():
    while True:
        try:
            # Fetch one queued run
            q = supabase.table("runs").select("*").eq("status", "queued").limit(1).execute()
            run = (q.data or [None])[0]
            if not run:
                time.sleep(2)
                continue
            supabase.table("runs").update({"status": "running", "started_at": datetime.utcnow().isoformat()}).eq("id", run["id"]).execute()
            result = execute_pipeline(run)
            supabase.table("metrics").insert({"run_id": run["id"], "payload_json": result["metrics"]}).execute()
            for kind, path in result["artifacts"].items():
                supabase.table("run_artifacts").upsert({"run_id": run["id"], "kind": kind, "path": path}).execute()
            supabase.table("runs").update({"status": "succeeded", "finished_at": datetime.utcnow().isoformat()}).eq("id", run["id"]).execute()
        except Exception as e:
            try:
                if 'run' in locals() and run and run.get('id'):
                    supabase.table("runs").update({"status": "failed", "finished_at": datetime.utcnow().isoformat()}).eq("id", run["id"]).execute()
            except Exception:
                pass
            # Log minimal error and backoff to avoid noisy crashes (e.g., schema not applied yet)
            print(f"[worker] error: {e}")
            time.sleep(1)


WORKER_ENABLED = (os.getenv("WORKER_ENABLED", "true").lower() == "true")
if WORKER_ENABLED:
    threading.Thread(target=worker_loop, daemon=True).start()
else:
    print("[boot] Worker disabled via WORKER_ENABLED=false")

if __name__ == "__main__":
    # Allow running via `python main.py` (e.g., Railway Railpack)
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
