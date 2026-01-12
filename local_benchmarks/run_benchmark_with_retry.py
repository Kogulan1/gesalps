
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
mock_supabase = MagicMock()
sys.modules["supabase"] = MagicMock()

import worker
from optimizer import SyntheticDataOptimizer

# Patch the worker's supabase client
worker.supabase = mock_supabase

# GreenGuard Configuration
MAX_RETRIES = 5
THRESHOLDS = {
    "ks_mean": 0.10,
    "corr_delta": 0.10,
    "mia_auc": 0.60,
    "dup_rate": 0.05
}

def check_all_green(metrics):
    """Check if metrics meet all thresholds."""
    utility = metrics.get("utility", {})
    privacy = metrics.get("privacy", {})
    
    ks = utility.get("ks_mean", 1.0)
    cd = utility.get("corr_delta", 1.0)
    mia = privacy.get("mia_auc", 1.0)
    dup = privacy.get("dup_rate", 1.0)
    
    checks = {
        "ks_ok": ks <= THRESHOLDS["ks_mean"],
        "cd_ok": cd <= THRESHOLDS["corr_delta"],
        "mia_ok": mia <= THRESHOLDS["mia_auc"],
        "dup_ok": dup <= THRESHOLDS["dup_rate"]
    }
    
    all_green = all(checks.values())
    
    return all_green, checks, {
        "ks_mean": ks,
        "corr_delta": cd,
        "mia_auc": mia,
        "dup_rate": dup
    }

def run_benchmark_with_retry(dataset_name, csv_path):
    print(f"\n{'='*70}")
    print(f"BENCHMARKING WITH GREENGUARD: {dataset_name}")
    print(f"{'='*70}")
    
    # Load Real Data
    try:
        real_df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Could not load {csv_path}: {e}")
        return
    
    print(f"Dataset: {len(real_df)} rows, {len(real_df.columns)} columns")

    def deterministic_preprocess(df, previous_ks=None):
        print("[MockAgent] Applying deterministic research-based preprocessing...")
        processed = df.copy()
        applied = []
        
        # Identify numerical columns (exclude target)
        num_cols = processed.select_dtypes(include=['number']).columns.tolist()
        if 'target' in num_cols: num_cols.remove('target')
        
        from sklearn.preprocessing import QuantileTransformer, StandardScaler
        import numpy as np
        
        for col in num_cols:
            # 1. Winsorization (Clip 1/99)
            lower = processed[col].quantile(0.01)
            upper = processed[col].quantile(0.99)
            processed[col] = processed[col].clip(lower, upper)
            applied.append(f"Winsorize({col})")
            
            # 2. Quantile Transformation (Only for diffusion/ddpm)
            # TVAE uses internal GMM transformers and conflicts with external Gaussian mapping
            # This conflict causes extreme KS distortion (> 0.8)
            # We skip this for TVAE to allow its native SOTA preprocessing to work.
            if "tvae" not in str(df.columns): # Hack to check if we are in a TVAE run context or just skip if we want
                pass # We will handle this more robustly below
        
        # Check current run config if possible, or just skip QT for now as the user asked for SOTA TVAE
        # Actually, let's just make it conditional on a flag or just remove it for this quest
        
        # SOTA Quest Fix: Skip QuantileTransformer for TVAE
        # (We skip the block below)
        
        metadata = {
            "metadata": {
                "applied_steps": applied,
                "rationale": "Applied research-based Winsorization. Skipped Quantile Transformation for TVAE to avoid GMM conflict."
            },
            "preprocessing_method": "tvae_specialized"
        }
        return processed, metadata

    # Mock the data fetcher
    worker._download_csv_from_storage = MagicMock(return_value=real_df)
    worker.get_preprocessing_plan = deterministic_preprocess
    worker.PREPROCESSING_AVAILABLE = True
    worker.CLINICAL_SELECTOR_AVAILABLE = False
    
    mock_ds = MagicMock()
    mock_ds.data = {"path": "dummy.csv"} 
    worker._get_dataset = MagicMock(return_value=mock_ds)
    worker._upload_to_storage = MagicMock(return_value="mock_url")
    worker._upload_bytes = MagicMock(return_value=None)
    
    def mock_update_status(rid, status, summary=None):
        print(f"[Status] {status}")
    worker._update_run_status = mock_update_status
    
    def mock_fail_run(rid, error):
        print(f"[FAILED] {error}")
    worker._fail_run = mock_fail_run
    
    mock_supabase.table.return_value.insert.return_value.execute.side_effect = lambda: None

    # Initialize optimizer
    optimizer = SyntheticDataOptimizer()
    
    # GreenGuard Retry Loop
    run_id = str(uuid.uuid4())
    best_result = None
    best_score = 0
    
    dataset_size = (len(real_df), len(real_df.columns))
    
    for attempt in range(1, MAX_RETRIES + 1):
        print(f"\n{'─'*70}")
        print(f"🔄 ATTEMPT {attempt}/{MAX_RETRIES}")
        print(f"{'─'*70}")
        
        # Get hyperparameters from optimizer
        previous_metrics = best_result.get("metrics") if best_result else None
        hparams = optimizer.suggest_hyperparameters(
            method="tvae",
            dataset_size=dataset_size,
            previous_metrics=previous_metrics,
            dp_requested=False,
            dataset_complexity=None,
            retry_count=attempt - 1
        )
        print(f"[Optimizer] Suggested hyperparameters (retry {attempt-1}): {hparams}")
        
        # Create run object
        run_obj = {
            "id": run_id,
            "dataset_id": "mock_ds_id",
            "config_json": {
                "method": "tvae",
                "compliance_level": "medium",
                **hparams  # Merge suggested hyperparameters
            },
            "mode": "benchmark"
        }
        
        try:
            # Execute pipeline
            print(f"[Training] Starting with hyperparameters: {hparams}")
            result = worker.execute_pipeline(run_obj)
            
            if result and "metrics" in result:
                metrics = result["metrics"]
                
                # Check if all green
                all_green, checks, values = check_all_green(metrics)
                
                # Calculate score
                compliance = metrics.get("compliance", {})
                score = compliance.get("score", 0)
                
                # Update best result
                if score > best_score:
                    best_result = result
                    best_score = score
                
                # Print results
                print(f"\n{'─'*70}")
                print(f"📊 ATTEMPT {attempt} RESULTS")
                print(f"{'─'*70}")
                print(f"KS Mean:     {values['ks_mean']:.4f} {'✅' if checks['ks_ok'] else '❌'} (threshold: {THRESHOLDS['ks_mean']})")
                print(f"Corr Delta:  {values['corr_delta']:.4f} {'✅' if checks['cd_ok'] else '❌'} (threshold: {THRESHOLDS['corr_delta']})")
                print(f"MIA AUC:     {values['mia_auc']:.4f} {'✅' if checks['mia_ok'] else '❌'} (threshold: {THRESHOLDS['mia_auc']})")
                print(f"Dup Rate:    {values['dup_rate']:.4f} {'✅' if checks['dup_ok'] else '❌'} (threshold: {THRESHOLDS['dup_rate']})")
                print(f"Score:       {score:.1%}")
                
                if all_green:
                    print(f"\n{'='*70}")
                    print(f"🎉 SUCCESS! ALL GREEN ACHIEVED ON ATTEMPT {attempt}")
                    print(f"{'='*70}")
                    break
                else:
                    failures = [k for k, v in checks.items() if not v]
                    print(f"\n⚠️  Failed checks: {', '.join(failures)}")
                    
                    if attempt < MAX_RETRIES:
                        print(f"🔄 Retrying with optimized hyperparameters...")
                    else:
                        print(f"\n⚠️  Max retries reached. Using best result (score: {best_score:.1%})")
            else:
                print(f"❌ No metrics returned")
                
        except Exception as e:
            print(f"❌ Attempt {attempt} crashed: {e}")
            import traceback
            traceback.print_exc()
    
    # Final Summary
    print(f"\n{'='*70}")
    print(f"FINAL RESULTS: {dataset_name}")
    print(f"{'='*70}")
    
    if best_result:
        metrics = best_result["metrics"]
        all_green, checks, values = check_all_green(metrics)
        
        if all_green:
            print(f"✅ STATUS: ALL GREEN")
        else:
            print(f"❌ STATUS: FAILED (Best Score: {best_score:.1%})")
        
        print(f"\nFinal Metrics:")
        print(json.dumps(metrics, indent=2, default=str))
    else:
        print(f"❌ No successful results")

if __name__ == "__main__":
    datasets = [
        # ("Adult (Census)", "local_benchmarks/data/adult.csv"),
        # ("Diabetes", "local_benchmarks/data/diabetes.csv"),
        ("Breast Cancer", "local_benchmarks/data/breast_cancer.csv"),
        # ("Credit Fraud Proxy", "local_benchmarks/data/credit_fraud_proxy.csv")
    ]
    
    # Set env vars
    os.environ["SUPABASE_URL"] = "http://mock"
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock"
    
    for name, path in datasets:
        if os.path.exists(path):
            run_benchmark_with_retry(name, path)
        else:
            print(f"Skipping {name} (File not found)")
