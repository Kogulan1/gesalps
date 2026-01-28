#!/usr/bin/env python3
"""
Test Backend Metrics via API with Bearer Token
Tests the backend API to verify metrics and ensure "all green" configuration is working.
"""
import os
import sys
import json
import requests
from datetime import datetime
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dcshmrmkfybpmixlfddj.supabase.co")
API_BASE = os.getenv("API_BASE", "https://api.gesalpai.ch")  # Production API

# Try to load anon key from frontend/.env.local if not in environment
def load_anon_key():
    """Load anon key from environment or frontend/.env.local"""
    anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not anon_key:
        # Try reading from frontend/.env.local
        env_local = os.path.join(os.path.dirname(__file__), "frontend", ".env.local")
        if os.path.exists(env_local):
            with open(env_local, "r") as f:
                for line in f:
                    if line.startswith("NEXT_PUBLIC_SUPABASE_ANON_KEY="):
                        anon_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    return anon_key

# User credentials (from user's request)
USER_EMAIL = "kogulan1@gmail.com"
USER_PASSWORD = "123456789"

def get_bearer_token() -> str:
    """Get bearer token by logging in with user credentials."""
    print(f"🔐 Authenticating as {USER_EMAIL}...")
    
    # Get anon key from environment or frontend/.env.local
    anon_key = load_anon_key()
    if not anon_key:
        print("❌ SUPABASE_ANON_KEY not found in environment or frontend/.env.local")
        print("   Please set: export SUPABASE_ANON_KEY=your_anon_key")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, anon_key)
    
    try:
        # Sign in
        response = supabase.auth.sign_in_with_password({
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        
        if response.user and response.session:
            token = response.session.access_token
            print(f"✅ Authentication successful!")
            print(f"   User ID: {response.user.id}")
            return token
        else:
            print("❌ Authentication failed: No session returned")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        sys.exit(1)

def get_datasets(token: str):
    """Get available datasets."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/v1/datasets", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    print(f"❌ Failed to get datasets: {response.status_code}")
    print(response.text)
    return []

def get_runs(token: str, limit: int = 10):
    """Get recent runs."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/v1/runs?limit={limit}", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    print(f"❌ Failed to get runs: {response.status_code}")
    print(response.text)
    return []

def get_run_details(token: str, run_id: str):
    """Get full run details."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/v1/runs/{run_id}", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    print(f"❌ Failed to get run details: {response.status_code}")
    print(response.text)
    return None

def get_run_metrics(token: str, run_id: str):
    """Get run metrics."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/v1/runs/{run_id}/metrics", headers=headers, timeout=10)
    if response.status_code == 200:
        return response.json()
    print(f"⚠️  No metrics available (status: {response.status_code})")
    return None

def check_all_green(metrics: dict) -> bool:
    """Check if metrics achieve 'all green' status."""
    if not metrics:
        return False
    
    utility = metrics.get("utility", {})
    privacy = metrics.get("privacy", {})
    fairness = metrics.get("fairness", {})
    
    ks_mean = utility.get("ks_mean", 1.0)
    corr_delta = utility.get("corr_delta", 1.0)
    mia_auc = privacy.get("mia_auc", 1.0)
    dup_rate = privacy.get("dup_rate", 1.0)
    
    # All green thresholds
    all_green = (
        ks_mean <= 0.10 and
        corr_delta <= 0.10 and
        mia_auc <= 0.60 and
        dup_rate <= 0.05
    )
    
    return all_green, {
        "ks_mean": ks_mean,
        "corr_delta": corr_delta,
        "mia_auc": mia_auc,
        "dup_rate": dup_rate
    }

def start_run_allgreen(token: str, dataset_id: str, name: str = None):
    """Start a run with 'allgreen' mode."""
    if not name:
        name = f"AllGreen_Test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    payload = {
        "dataset_id": dataset_id,
        "method": "tvae",  # Will be overridden by allgreen mode
        "mode": "allgreen",  # Use All Green Service
        "name": name,
        "config_json": {
            "sample_multiplier": 1.0,
            "max_synth_rows": 2000,
            "auto_retry": False,  # All Green is a single proven attempt
            "clinical_preprocessing": True,
            "privacy_level": "medium"
        }
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"\n🚀 Starting All Green run: {name}")
    print(f"   Dataset: {dataset_id}")
    print(f"   Mode: allgreen")
    
    response = requests.post(f"{API_BASE}/v1/runs", json=payload, headers=headers, timeout=30)
    if response.status_code == 200:
        result = response.json()
        run_id = result.get("run_id")
        print(f"✅ Run started: {run_id}")
        return run_id
    else:
        print(f"❌ Failed to start run: {response.status_code}")
        print(response.text)
        return None

def print_metrics_summary(metrics: dict):
    """Print a formatted metrics summary."""
    if not metrics:
        print("   No metrics available")
        return
    
    utility = metrics.get("utility", {})
    privacy = metrics.get("privacy", {})
    fairness = metrics.get("fairness", {})
    
    print(f"\n📊 Metrics Summary:")
    print(f"   Utility:")
    print(f"     KS Mean: {utility.get('ks_mean', 'N/A'):.4f if isinstance(utility.get('ks_mean'), (int, float)) else 'N/A'}")
    print(f"     Corr Delta: {utility.get('corr_delta', 'N/A'):.4f if isinstance(utility.get('corr_delta'), (int, float)) else 'N/A'}")
    
    print(f"   Privacy:")
    print(f"     MIA AUC: {privacy.get('mia_auc', 'N/A'):.4f if isinstance(privacy.get('mia_auc'), (int, float)) else 'N/A'}")
    print(f"     Dup Rate: {privacy.get('dup_rate', 'N/A'):.4f if isinstance(privacy.get('dup_rate'), (int, float)) else 'N/A'}")
    
    if fairness:
        print(f"   Fairness:")
        for key, value in fairness.items():
            print(f"     {key}: {value:.4f if isinstance(value, (int, float)) else value}")

def main():
    print("="*70)
    print("Backend Metrics Test - All Green Configuration")
    print("="*70)
    
    # Get bearer token
    token = get_bearer_token()
    
    # Test API connectivity
    print(f"\n🌐 Testing API connectivity: {API_BASE}")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        health = requests.get(f"{API_BASE}/health", timeout=5)
        if health.status_code == 200:
            print(f"✅ API is reachable")
        else:
            print(f"⚠️  API health check returned: {health.status_code}")
    except Exception as e:
        print(f"❌ API connectivity failed: {e}")
        sys.exit(1)
    
    # Get datasets
    print(f"\n📁 Fetching datasets...")
    datasets = get_datasets(token)
    if not datasets:
        print("❌ No datasets found")
        sys.exit(1)
    
    print(f"✅ Found {len(datasets)} dataset(s):")
    for ds in datasets[:5]:  # Show first 5
        print(f"   - {ds.get('name', 'Unknown')}: {ds.get('id')} ({ds.get('rows_count', 0)} rows)")
    
    # Get recent runs
    print(f"\n📋 Fetching recent runs...")
    runs = get_runs(token, limit=10)
    if runs:
        print(f"✅ Found {len(runs)} run(s):")
        for run in runs[:5]:  # Show first 5
            status = run.get("status", "unknown")
            name = run.get("name", "Unknown")
            run_id = run.get("id", "unknown")
            print(f"   - {name} ({run_id[:8]}...): {status}")
            
            # Check metrics for completed runs
            if status == "succeeded":
                metrics = get_run_metrics(token, run_id)
                if metrics:
                    all_green, values = check_all_green(metrics)
                    print(f"     Metrics: KS={values['ks_mean']:.4f}, Corr={values['corr_delta']:.4f}, MIA={values['mia_auc']:.4f}, Dup={values['dup_rate']:.4f}")
                    if all_green:
                        print(f"     🎉 ALL GREEN ✅")
                    else:
                        print(f"     ⚠️  Not all green")
    else:
        print("   No runs found")
    
    # Option to start a new run
    if len(sys.argv) > 1:
        dataset_id = sys.argv[1]
        run_id = start_run_allgreen(token, dataset_id)
        if run_id:
            print(f"\n✅ Run started successfully!")
            print(f"   Run ID: {run_id}")
            print(f"   Monitor at: {API_BASE}/v1/runs/{run_id}")
    else:
        print(f"\n💡 To start a new All Green run:")
        print(f"   python {sys.argv[0]} <dataset_id>")
        if datasets:
            print(f"\n   Example:")
            print(f"   python {sys.argv[0]} {datasets[0].get('id')}")

if __name__ == "__main__":
    main()
