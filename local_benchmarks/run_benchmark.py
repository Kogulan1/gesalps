
import sys
import os
import pandas as pd
import json
import uuid
from unittest.mock import MagicMock

# Setup paths
sys.path.append(os.path.abspath("backend/synth_worker"))
sys.path.append(os.path.abspath("backend"))

# PATCH: Fix Opacus crash on Torch 2.2.2 (missing RMSNorm)
import torch
import torch.nn as nn
if not hasattr(nn, 'RMSNorm'):
    class RMSNorm(nn.Module):
        def __init__(self, *args, **kwargs):
            super().__init__()
    nn.RMSNorm = RMSNorm


# Mock Supabase BEFORE importing worker
# NOTE: On macOS (Apple Silicon), you must run `brew install libomp` for XGBoost/TabDDPM to work.
# NOTE: On macOS (Apple Silicon), you must run `brew install libomp` for XGBoost/TabDDPM to work.
mock_supabase = MagicMock()
sys.modules["supabase"] = MagicMock() # This mocks the module import
# But worker.py imports `supabase` library and expects a client instance usually?
# Let's inspect worker.py imports. It likely does `from supabase import create_client`.
# The worker.py file instantiates `supabase = create_client(...)`.
# We need to patch `worker.supabase` AFTER import.

import worker

# Patch the worker's supabase client
worker.supabase = mock_supabase

# Mock `_get_dataset_df` to load from local file
# Mock `_get_dataset_df` to load from local file - REMOVED


def run_benchmark(dataset_name, csv_path):
    print(f"\n{'='*50}")
    print(f"BENCHMARKING: {dataset_name}")
    print(f"{'='*50}")
    
    # Load Real Data
    try:
        real_df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Could not load {csv_path}: {e}")
        return

    # Mock the data fetcher
    # Use _download_csv_from_storage to return the DataFrame directly
    worker._download_csv_from_storage = MagicMock(return_value=real_df)

    # Mock preprocessing to return None (skip) logic
    worker.get_preprocessing_plan = MagicMock(return_value=(None, {}))
    worker.PREPROCESSING_AVAILABLE = True
    
    # Disable Clinical Selector (LLM) to prevent hangs
    worker.CLINICAL_SELECTOR_AVAILABLE = False
    
    # Mock _get_dataset to return a dummy object with empty data/schema
    # process_run calls _get_dataset(run["dataset_id"])
    mock_ds = MagicMock()
    mock_ds.data = {"path": "dummy.csv"} 
    worker._get_dataset = MagicMock(return_value=mock_ds)
    
    # Mock storage download/upload (for other calls)
    worker._upload_to_storage = MagicMock(return_value="mock_url")
    worker._upload_bytes = MagicMock(return_value=None)
    
    # Create a Mock Run Object
    run_id = str(uuid.uuid4())
    run_obj = {
        "id": run_id,
        "dataset_id": "mock_ds_id",
        "config_json": {
            "method": "ddpm", # Default to DDPM to test optimization
            "compliance_level": "medium"
        },
        "mode": "benchmark"
    }
    
    # Mock `_update_run_status` to print to stdout
    def mock_update_status(rid, status, summary=None):
        print(f"[Run Status] {status} | {summary if summary else ''}")
    worker._update_run_status = mock_update_status
    
    # Mock `_fail_run`
    def mock_fail_run(rid, error):
        print(f"[Run FAILED] {error}")
    worker._fail_run = mock_fail_run
    
    # Mock `supabase.table().insert().execute()` to just print logs
    def mock_insert(data):
        if "title" in data:
            print(f"[Log Step] {data['title']}: {data['detail']}")
        return MagicMock()
    
    mock_supabase.table.return_value.insert.return_value.execute.side_effect = lambda: None
    # We can try to monkeypatch logging inside `worker` more deeply if needed, 
    # but the print statements in `worker.py` (which I added) will show up in stdout.

    try:
        # EXECUTE WORKER
        # We call `process_run` directly
        # Note: process_run expects `run` object
        
        # worker.process_run is NOT exposed? It acts as main entry point usually.
        # Looking at worker.py structure (I recall it has a `process_run` or similar).
        # Let's check `worker` attributes in a moment.
        # Assuming `worker.process_run` exists (or equivalent `main` logic function).
        # Typically it's `process_run(run)`.
        
        result = worker.execute_pipeline(run_obj)
        
        print("\n--- Benchmark Result ---")
        if result:
            metrics = result.get("metrics", {})
            print(json.dumps(metrics, indent=2, default=str))
            
            # Check Green status
            u = metrics.get("utility", {})
            p = metrics.get("privacy", {})
            ks = u.get("ks_mean", 1.0)
            mia = p.get("mia_auc", 1.0)
            
            if ks <= 0.10 and mia <= 0.60:
                print(f"✅ {dataset_name} PASSED (All Green)")
            else:
                print(f"❌ {dataset_name} FAILED (KS={ks}, MIA={mia})")
                
    except Exception as e:
        print(f"Benchmark Crushed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    datasets = [
        ("Adult (Census)", "local_benchmarks/data/adult.csv"),
        ("Diabetes", "local_benchmarks/data/diabetes.csv"),
        ("Breast Cancer", "local_benchmarks/data/breast_cancer.csv"),
        ("Credit Fraud Proxy", "local_benchmarks/data/credit_fraud_proxy.csv")
    ]
    
    # Ensure env vars for worker (fake ones)
    os.environ["SUPABASE_URL"] = "http://mock"
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock"
    
    for name, path in datasets:
        if os.path.exists(path):
            run_benchmark(name, path)
        else:
            print(f"Skipping {name} (File not found)")
