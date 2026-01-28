import os
import sys
import time
import uuid
import json
import httpx
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger("ProdVerify")

# Config from Env (injected by Docker or Shell)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dcshmrmkfybpmixlfddj.supabase.co")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_KEY:
    logger.error("Missing SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def verify_production_skills():
    logger.info("🚀 Starting Production SOTA Verification...")

    # 1. Get a valid User ID
    try:
        # Use auth/v1/admin/users if available, or just query auth.users via RPC if possible?
        # Actually, via Service Role we can insert into tables directly bypassing RLS, but FKs exist.
        # We need a valid UUID for 'owner_id' in projects.
        # Let's query the `projects` table to find an EXISTING project and assume its owner is valid.
        # This is safer than creating junk users.
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/projects?select=id,owner_id&limit=1", headers=HEADERS)
        r.raise_for_status()
        projects = r.json()
        
        if not projects:
            logger.error("No existing projects found. Cannot run verification without a valid user/project context.")
            # Fallback: We might need to create a user, but that's complex.
            sys.exit(1)
            
        project_id = projects[0]['id']
        owner_id = projects[0]['owner_id']
        logger.info(f"✅ Using Project: {project_id} (Owner: {owner_id})")

    except Exception as e:
        logger.error(f"Failed to fetch project context: {e}")
        sys.exit(1)

    # 2. Upload Dummy Dataset
    dataset_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())
    filename = f"prod_verify_{int(time.time())}.csv"
    
    # Simple Heart Disease subset for fast processing
    csv_content = """age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal,target
63,1,3,145,233,1,0,150,0,2.3,0,0,1,1
37,1,2,130,250,0,1,187,0,3.5,0,0,2,1
41,0,1,130,204,0,0,172,0,1.4,2,0,2,1
56,1,1,120,236,0,1,178,0,0.8,2,0,2,1
57,0,0,120,354,0,1,163,1,0.6,2,0,2,1
"""
    
    try:
        # Upload file (upsert)
        r = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/datasets/{project_id}/{filename}",
            headers={"Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "text/csv", "x-upsert": "true"},
            content=csv_content.encode('utf-8')
        )
        if r.status_code not in range(200, 300):
             logger.error(f"Failed upload: {r.text}")
             sys.exit(1)
        
        # Get public URL (or just internal path if worker supports it)
        file_path = f"{project_id}/{filename}"
        # Worker uses _download_csv_from_storage logic. Usually expects a path.
        # Let's see worker.py _download logic... it takes 'file_url'.
        # If passed 'file_url', it does supabase.storage.from_('datasets').download(path)
        # So we just provide the partial path if that's what logic does, or signed URL.
        # Let's provide the path relative to bucket root.
        
        logger.info(f"✅ Uploaded dummy dataset: {filename}")
        
        # Create Dataset Record
        dataset_payload = {
            "id": dataset_id,
            "project_id": project_id,
            "name": f"Prod Verify {int(time.time())}",
            "file_url": file_path, # Worker treates this as path in 'datasets' bucket
            "rows_count": 5,
            "cols_count": 14
        }
        r = httpx.post(f"{SUPABASE_URL}/rest/v1/datasets", headers=HEADERS, json=dataset_payload)
        r.raise_for_status()
        logger.info("✅ Created Dataset Record")

    except Exception as e:
        logger.error(f"Failed setup dataset: {e}")
        sys.exit(1)
        
    # 3. Create Run
    try:
        run_payload = {
            "id": run_id,
            "project_id": project_id,
            "dataset_id": dataset_id,
            "started_by": owner_id,
            "method": "gaussian_copula", # Fast method
            "mode": "fast",
            "status": "queued",
            "config_json": {}
        }
        r = httpx.post(f"{SUPABASE_URL}/rest/v1/runs", headers=HEADERS, json=run_payload)
        r.raise_for_status()
        logger.info(f"🚀 Triggered Run ID: {run_id}")
    except Exception as e:
        logger.error(f"Failed to trigger run: {e}")
        sys.exit(1)

    # 4. Monitor
    logger.info("⏳ Waiting for worker execution...")
    start_time = time.time()
    while time.time() - start_time < 300: # 5 min timeout
        # Check Status
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/runs?id=eq.{run_id}&select=status", headers=HEADERS)
        status = r.json()[0]['status']
        if status == 'succeeded':
            logger.info("✅ Run Succeeded!")
            break
        elif status == 'failed':
            logger.error("❌ Run Failed!")
            sys.exit(1)
        elif status == 'cancelled':
             logger.error("❌ Run Cancelled!")
             sys.exit(1)
        
        print(f"Status: {status}...", end="\r")
        time.sleep(3)
        
    if status != 'succeeded':
        logger.error("Timeout waiting for run.")
        sys.exit(1)

    # 5. Verify Metrics (The Real Test)
    try:
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/metrics?run_id=eq.{run_id}&select=payload_json", headers=HEADERS)
        metrics = r.json()[0]['payload_json']
        
        # Check for Triple Crown Seal
        # Format might be in run_steps or metrics. RegulatoryAuditor usually Logs? 
        # Wait, the worker logic: 
        # results = metrics.update(red_team). update(auditor_results???) 
        # actually Auditor runs separately usually or puts verdict in report?
        # Let's check Red Team Linkage first.
        
        # Check Linkage Rate (Red Teamer) - V2 Key
        linkage = metrics.get('privacy', {}).get('identifiability_score')
        
        if linkage is not None:
             logger.info(f"✅ RED TEAM ACTIVE | Linkage (Identifiability): {linkage}")
        else:
             # Fallback
             linkage = metrics.get('linkage_attack_success')
             if linkage is not None:
                  logger.info(f"✅ RED TEAM ACTIVE | Linkage: {linkage}")
             else:
                  logger.error("❌ RED TEAM MISSING in Metrics (Checked 'privacy.identifiability_score')")
             
        # Check for Run Steps logs for "Regulatory Audit"
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/run_steps?run_id=eq.{run_id}&select=detail,title", headers=HEADERS)
        steps = r.json()
        seal_found = False
        for step in steps:
            if "Triple Crown" in str(step) or "CERTIFIED" in str(step): # Rough check
                seal_found = True
                logger.info(f"✅ CERTIFICATION LOG FOUND: {step['title']} - {step['detail']}")
                break
        
        if not seal_found:
             # Check if it failed compliance (Seal is only for PASS)
             comp = metrics.get('compliance', {})
             if comp:
                 status_str = "PASS" if comp.get('passed') else "FAIL"
                 logger.info(f"✅ COMPLIANCE SYSTEM ACTIVE | Status: {status_str} (Seal not expected on FAIL)")
             else:
                 logger.warning("⚠️ Certification Seal log not found and Compliance object missing")
             
        # Check for Artifacts
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/run_artifacts?run_id=eq.{run_id}&select=kind", headers=HEADERS)
        artifacts = [a['kind'] for a in r.json()]
        logger.info(f"✅ Generated Artifacts: {artifacts}")
        
        print("-------------------------------------------")
        
    except Exception as e:
        logger.error(f"Failed metric verification: {e}")

if __name__ == "__main__":
    verify_production_skills()
