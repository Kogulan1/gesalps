
import os
import requests
import time
import json
from supabase import create_client

# Config
DATASET_ID = "d4d14e33-a8ab-4baf-8e39-402567c31434" # diabetes.csv
BACKEND_URL = "https://api.gesalpai.ch" # Or http://localhost:8000 if not reachable
SUPABASE_URL = "https://dcshmrmkfybpmixlfddj.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjcyNjE5NywiZXhwIjoyMDcyMzAyMTk3fQ.EtuAMwHYdGiHZf-j-kC2x-U0Y0rYupcJx6MqfYyzW8k"

client = create_client(SUPABASE_URL, SERVICE_KEY)

def start_run():
    print(f"🚀 Queueing verification run for dataset {DATASET_ID} via DB insert...")
    
    # 1. Prepare Run Payload
    # The worker logic reads 'config_json' or similar columns. 
    # Viewing schema or inferring from worker usage would be best, but based on typical usage:
    # It expects: id, dataset_id, status, config_json, etc.
    
    # Let's try to insert minimal required fields.
    payload = {
        "dataset_id": DATASET_ID,
        "name": "E2E Verification Run (Fast Probe)",
        "status": "queued",
        "method": "ddpm",
        "mode": "balanced",
        "config_json": {
             "epochs": 1,
             "batch_size": 32,
             "plan": { # Some timeline consumers need a plan
                 "steps": ["Initialized via Direct DB Insert"],
                 "choice": { "method": "ddpm" }
             }
        }
    }
    
    try:
        # Client initialized with Service Role Key, so RLS bypassed.
        res = client.table("runs").insert(payload).execute()
        
        if not res.data:
            print(f"❌ Failed to insert run: {res}")
            return None
            
        run_id = res.data[0]['id']
        print(f"✅ Run queued! ID: {run_id}")
        return run_id
    except Exception as e:
        print(f"❌ Exception starting run: {e}")
        return None

def monitor_run(run_id):
    print(f"👀 Monitoring run {run_id}...")
    
    while True:
        # Check DB status directly
        res = client.table("runs").select("status").eq("id", run_id).single().execute()
        status = res.data['status']
        
        print(f"Status: {status}")
        
        if status in ['succeeded', 'failed', 'cancelled']:
            return status
            
        # Get logs
        logs = client.table("run_logs").select("*").eq("run_id", run_id).order("created_at", desc=True).limit(1).execute()
        if logs.data:
            print(f"   Latest Log: {logs.data[0].get('message', '')}")
            
        time.sleep(5)

def verify_results(run_id):
    print("🔍 Verifying results...")
    
    # 1. Metrics
    metrics = client.table("run_metrics").select("*").eq("run_id", run_id).single().execute()
    if metrics.data:
        print("✅ Metrics found!")
        print(f"   Privacy Audit Passed: {metrics.data.get('privacy_audit_passed')}")
    else:
        print("❌ Metrics MISSING!")
        
    # 2. Artifacts
    artifacts = client.table("run_artifacts").select("*").eq("run_id", run_id).execute()
    found = [a['kind'] for a in artifacts.data]
    print(f"✅ Artifacts found: {found}")
    
    if 'synthetic_csv' in found and 'report' in found: # report is report.pdf (kind might differ)
         print("✅ Critical artifacts present.")
    else:
         print("⚠️ Some artifacts might be missing.")

if __name__ == "__main__":
    rid = start_run()
    if rid:
        final_status = monitor_run(rid)
        print(f"🏁 Run finished with status: {final_status}")
        if final_status == 'succeeded':
            verify_results(rid)
