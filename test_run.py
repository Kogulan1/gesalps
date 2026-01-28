#!/usr/bin/env python3
"""Test script to start a run and monitor its progress."""
import os
import sys
import time
import json
import requests
from datetime import datetime

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dcshmrmkfybpmixlfddj.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
API_BASE = os.getenv("API_BASE", "http://localhost:8000")

def get_datasets():
    """Get available datasets."""
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    res = supabase.table("datasets").select("id,name,rows_count,cols_count,project_id").limit(10).execute()
    return res.data or []

def start_run(dataset_id, name=None):
    """Start a test run."""
    if not name:
        name = f"Test_Run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    payload = {
        "dataset_id": dataset_id,
        "method": "tvae",  # Use TVAE for all-green configuration
        "mode": "agent",
        "name": name,
        "config_json": {
            "sample_multiplier": 1.0,
            "max_synth_rows": 2000,
            "auto_retry": True,
            "clinical_preprocessing": True,
            "privacy_level": "medium"
        }
    }
    
    # Use service role key for authentication
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{API_BASE}/v1/runs", json=payload, headers=headers, timeout=30)
    if response.status_code != 200:
        print(f"Error starting run: {response.status_code}")
        print(response.text)
        return None
    
    result = response.json()
    return result.get("run_id")

def get_run_status(run_id):
    """Get run status."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    response = requests.get(f"{API_BASE}/v1/runs/{run_id}/status", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    return None

def get_run_steps(run_id):
    """Get run steps."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    response = requests.get(f"{API_BASE}/v1/runs/{run_id}/steps", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    return []

def get_run_metrics(run_id):
    """Get run metrics."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    response = requests.get(f"{API_BASE}/v1/runs/{run_id}/metrics", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    return None

def monitor_run(run_id, max_wait_minutes=60):
    """Monitor a run until completion."""
    print(f"\n{'='*60}")
    print(f"Monitoring Run: {run_id}")
    print(f"{'='*60}\n")
    
    start_time = time.time()
    last_step_count = 0
    
    while True:
        elapsed_minutes = (time.time() - start_time) / 60
        
        if elapsed_minutes > max_wait_minutes:
            print(f"\n⚠️  Timeout: Run exceeded {max_wait_minutes} minutes")
            break
        
        # Get status
        status = get_run_status(run_id)
        if not status:
            print("❌ Could not fetch run status")
            time.sleep(5)
            continue
        
        current_status = status.get("status", "unknown")
        print(f"[{elapsed_minutes:.1f}m] Status: {current_status}")
        
        # Get steps
        steps = get_run_steps(run_id)
        if len(steps) > last_step_count:
            print(f"  📊 Steps: {len(steps)} (new: {len(steps) - last_step_count})")
            for step in steps[last_step_count:]:
                print(f"    - Step {step.get('step_no', '?')}: {step.get('title', 'unknown')} - {step.get('detail', '')[:80]}")
            last_step_count = len(steps)
        
        # Check if completed
        if current_status == "succeeded":
            print(f"\n✅ Run completed successfully!")
            
            # Get metrics
            metrics = get_run_metrics(run_id)
            if metrics:
                print(f"\n📈 Metrics:")
                utility = metrics.get("utility", {})
                privacy = metrics.get("privacy", {})
                
                print(f"  Utility:")
                print(f"    KS Mean: {utility.get('ks_mean', 'N/A')}")
                print(f"    Corr Delta: {utility.get('corr_delta', 'N/A')}")
                
                print(f"  Privacy:")
                print(f"    MIA AUC: {privacy.get('mia_auc', 'N/A')}")
                print(f"    Dup Rate: {privacy.get('dup_rate', 'N/A')}")
                
                # Check all-green
                ks_mean = utility.get('ks_mean', 1.0)
                corr_delta = utility.get('corr_delta', 1.0)
                mia_auc = privacy.get('mia_auc', 1.0)
                dup_rate = privacy.get('dup_rate', 1.0)
                
                all_green = (
                    ks_mean <= 0.10 and
                    corr_delta <= 0.10 and
                    mia_auc <= 0.60 and
                    dup_rate <= 0.05
                )
                
                if all_green:
                    print(f"\n🎉 ALL GREEN ACHIEVED! ✅")
                else:
                    print(f"\n⚠️  Not all green:")
                    if ks_mean > 0.10:
                        print(f"    KS Mean: {ks_mean:.4f} > 0.10")
                    if corr_delta > 0.10:
                        print(f"    Corr Delta: {corr_delta:.4f} > 0.10")
                    if mia_auc > 0.60:
                        print(f"    MIA AUC: {mia_auc:.4f} > 0.60")
                    if dup_rate > 0.05:
                        print(f"    Dup Rate: {dup_rate:.4f} > 0.05")
            
            break
        elif current_status == "failed" or current_status == "cancelled":
            print(f"\n❌ Run {current_status}")
            break
        
        # Wait before next check
        time.sleep(10)
    
    total_time = (time.time() - start_time) / 60
    print(f"\n⏱️  Total monitoring time: {total_time:.1f} minutes")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_run.py <dataset_id> [run_name]")
        print("\nAvailable datasets:")
        datasets = get_datasets()
        for ds in datasets:
            print(f"  - {ds['name']}: {ds['id']} ({ds.get('rows_count', 0)} rows)")
        sys.exit(1)
    
    dataset_id = sys.argv[1]
    run_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"Starting test run for dataset: {dataset_id}")
    run_id = start_run(dataset_id, run_name)
    
    if run_id:
        print(f"✅ Run started: {run_id}")
        monitor_run(run_id)
    else:
        print("❌ Failed to start run")
        sys.exit(1)
