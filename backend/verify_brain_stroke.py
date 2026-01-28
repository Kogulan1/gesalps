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

def verify_brain_stroke():
    logger.info("🚀 Starting Brain Stroke OMOP Verification...")

    # 1. Get a valid User ID from existing project
    try:
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/projects?select=id,owner_id&limit=1", headers=HEADERS)
        r.raise_for_status()
        projects = r.json()
        
        if not projects:
            logger.error("No existing projects found.")
            sys.exit(1)
            
        project_id = projects[0]['id']
        owner_id = projects[0]['owner_id']
        logger.info(f"✅ Using Project: {project_id}")

    except Exception as e:
        logger.error(f"Failed to fetch project context: {e}")
        sys.exit(1)

    # 2. Upload Brain Stroke Dataset
    dataset_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())
    filename = f"brain_stroke_verify_{int(time.time())}.csv"
    
    # Brain stroke subset (mocked with real columns for OMOP testing)
    # Columns: gender, age, hypertension, heart_disease, ever_married, work_type, Residence_type, avg_glucose_level, bmi, smoking_status, stroke
    csv_content = """gender,age,hypertension,heart_disease,ever_married,work_type,Residence_type,avg_glucose_level,bmi,smoking_status,stroke
Male,67.0,0,1,Yes,Private,Urban,228.69,36.6,formerly smoked,1
Female,61.0,0,0,Yes,Self-employed,Rural,202.21,N/A,never smoked,1
Male,80.0,0,1,Yes,Private,Rural,105.92,32.5,never smoked,1
Female,49.0,0,0,Yes,Private,Urban,171.23,34.4,smokes,1
Female,79.0,1,0,Yes,Self-employed,Rural,174.12,24.0,never smoked,1
Male,81.0,0,0,Yes,Private,Urban,186.21,29.0,formerly smoked,1
Male,74.0,1,1,Yes,Private,Rural,70.09,27.4,never smoked,1
Female,69.0,0,0,No,Private,Urban,94.39,22.8,never smoked,1
"""
    
    try:
        # Upload
        r = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/datasets/{project_id}/{filename}",
            headers={"Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "text/csv", "x-upsert": "true"},
            content=csv_content.encode('utf-8')
        )
        file_path = f"{project_id}/{filename}"
        
        # Create Record
        dataset_payload = {
            "id": dataset_id,
            "project_id": project_id,
            "name": f"Brain Stroke Verification {int(time.time())}",
            "file_url": file_path,
            "rows_count": 8,
            "cols_count": 11
        }
        r = httpx.post(f"{SUPABASE_URL}/rest/v1/datasets", headers=HEADERS, json=dataset_payload)
        r.raise_for_status()
        logger.info(f"✅ Uploaded Brain Stroke dataset: {filename}")

    except Exception as e:
        logger.error(f"Failed setup dataset: {e}")
        sys.exit(1)
        
    # 3. Create Run (Force OMOP Layer to Run)
    try:
        run_payload = {
            "id": run_id,
            "project_id": project_id,
            "dataset_id": dataset_id,
            "started_by": owner_id,
            "method": "gaussian_copula",
            "mode": "fast",
            "status": "queued",
            "config_json": {"omop_enabled": True} # Pass dict, httpx handles json serialization
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
    while time.time() - start_time < 300:
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/runs?id=eq.{run_id}&select=status", headers=HEADERS)
        status = r.json()[0]['status']
        if status in ['succeeded', 'failed', 'cancelled']:
            break
        print(f"Status: {status}...", end="\r")
        time.sleep(3)
        
    if status != 'succeeded':
        logger.error(f"Run ended with status: {status}")
        # Fetch failure reason
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/run_steps?run_id=eq.{run_id}&select=detail,title,status&order=created_at.desc&limit=1", headers=HEADERS)
        if r.json():
            logger.error(f"Last Step: {r.json()[0]}")
        sys.exit(1)

    logger.info("✅ Run Succeeded!")

    # 5. Fetch and PRINT OMOP Metrics
    try:
        r = httpx.get(f"{SUPABASE_URL}/rest/v1/metrics?run_id=eq.{run_id}&select=payload_json", headers=HEADERS)
        metrics = r.json()[0]['payload_json']
        
        compliance = metrics.get('compliance', {})
        omop = compliance.get('omop_mapping', {})
        
        print("\n\n" + "="*50)
        print("🔍 OMOP LAYER 0 RESULTS (Brain Stroke)")
        print("="*50)
        
        if omop:
            print(f"✅ OMOP Mapping Found for {len(omop)} columns:")
            for col, mapping in omop.items():
                print(f"  - {col:20} -> {mapping.get('concept_name', 'Unknown')[:30]:30} (ID: {mapping.get('concept_id')}) [Sim: {mapping.get('similarity'):.4f}]")
        else:
            print("❌ OMOP Mapping MISSING in metrics payload!")
            print("Full Compliance Keys:", compliance.keys())

        # Print detailed logs link
        print("\nLogs available via: docker logs gesalps_worker")
        print("="*50 + "\n")

    except Exception as e:
        logger.error(f"Failed metric fetch: {e}")

if __name__ == "__main__":
    verify_brain_stroke()
