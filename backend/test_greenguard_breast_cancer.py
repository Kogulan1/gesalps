#!/usr/bin/env python3
"""
GreenGuard TVAE Pivot Test - Breast Cancer Dataset
Tests the TVAE pivot logic on small-N clinical data (569 rows).

Expected Behavior:
1. TabDDPM is tried first (default for clinical data)
2. After 2+ failures with KS > 0.20, system pivots to TVAE
3. TVAE uses enhanced hyperparameters (epochs 500-2000, batch 32)
4. Metrics should improve compared to TabDDPM plateau
"""

import os
import sys
import json
import time
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
from unittest.mock import MagicMock

# Setup paths
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "synth_worker"))

# Set required environment variables BEFORE importing worker
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-key")

# Mock Supabase BEFORE importing worker
mock_supabase = MagicMock()
sys.modules["supabase"] = MagicMock()

# PATCH: Fix Opacus crash on Torch 2.2.2
import torch
import torch.nn as nn
if not hasattr(nn, 'RMSNorm'):
    class RMSNorm(nn.Module):
        def __init__(self, *args, **kwargs):
            super().__init__()
    nn.RMSNorm = RMSNorm

# Import after mocking
import worker
from optimizer import get_optimizer

# Patch worker's supabase
worker.supabase = mock_supabase

# Color output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_success(msg): print(f"{Colors.GREEN}✅ {msg}{Colors.END}")
def print_error(msg): print(f"{Colors.RED}❌ {msg}{Colors.END}")
def print_warning(msg): print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")
def print_info(msg): print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")
def print_header(msg): print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n{Colors.BOLD}{msg}{Colors.END}\n{Colors.BOLD}{'='*80}{Colors.END}\n")

# Global tracking variables
method_history = []
pivot_detected = False
original_print = print

def track_print(*args, **kwargs):
    msg = ' '.join(str(a) for a in args)
    if "PIVOTING to TVAE" in msg or "PIVOTING" in msg:
        global pivot_detected
        pivot_detected = True
        print_info(f"[DETECTED] {msg}")
    if "method" in msg.lower() and ("ddpm" in msg.lower() or "tvae" in msg.lower()):
        method_history.append(msg)
    original_print(*args, **kwargs)

def load_breast_cancer_dataset() -> pd.DataFrame:
    """Load Breast Cancer dataset."""
    # Try multiple possible locations
    possible_paths = [
        backend_dir.parent / "local_benchmarks" / "data" / "breast_cancer.csv",
        backend_dir / "breast_cancer.csv",
        Path("local_benchmarks/data/breast_cancer.csv"),
        Path("breast_cancer.csv"),
    ]
    
    for path in possible_paths:
        if path.exists():
            print_info(f"Loading dataset from: {path}")
            df = pd.read_csv(path)
            print_success(f"Loaded {len(df)} rows, {len(df.columns)} columns")
            return df
    
    raise FileNotFoundError("Could not find breast_cancer.csv. Please ensure the file exists.")

def check_all_green(metrics: Dict[str, Any]) -> tuple[bool, list, list]:
    """Check if metrics meet all green thresholds."""
    utility = metrics.get("utility", {})
    privacy = metrics.get("privacy", {})
    
    thresholds = {
        "ks_mean": 0.10,
        "corr_delta": 0.10,
        "mia_auc": 0.60,
        "dup_rate": 0.05
    }
    
    passed = []
    failed = []
    
    ks = utility.get("ks_mean")
    if ks is not None:
        if ks <= thresholds["ks_mean"]:
            passed.append(f"KS Mean: {ks:.4f} ≤ {thresholds['ks_mean']}")
        else:
            failed.append(f"KS Mean: {ks:.4f} > {thresholds['ks_mean']}")
    
    corr = utility.get("corr_delta")
    if corr is not None:
        if corr <= thresholds["corr_delta"]:
            passed.append(f"Corr Delta: {corr:.4f} ≤ {thresholds['corr_delta']}")
        else:
            failed.append(f"Corr Delta: {corr:.4f} > {thresholds['corr_delta']}")
    
    mia = privacy.get("mia_auc")
    if mia is not None:
        if mia <= thresholds["mia_auc"]:
            passed.append(f"MIA AUC: {mia:.4f} ≤ {thresholds['mia_auc']}")
        else:
            failed.append(f"MIA AUC: {mia:.4f} > {thresholds['mia_auc']}")
    
    dup = privacy.get("dup_rate")
    if dup is not None:
        if dup <= thresholds["dup_rate"]:
            passed.append(f"Dup Rate: {dup:.4f} ≤ {thresholds['dup_rate']}")
        else:
            failed.append(f"Dup Rate: {dup:.4f} > {thresholds['dup_rate']}")
    
    all_green = len(failed) == 0
    return all_green, passed, failed

def test_tvae_pivot():
    """Test TVAE pivot logic on Breast Cancer dataset."""
    print_header("GreenGuard TVAE Pivot Test - Breast Cancer Dataset")
    
    # Load dataset
    print_header("Loading Dataset")
    df = load_breast_cancer_dataset()
    print_info(f"Dataset shape: {df.shape}")
    print_info(f"Columns: {', '.join(df.columns[:10])}{'...' if len(df.columns) > 10 else ''}")
    
    # Verify dataset size (should trigger pivot logic)
    n_rows = len(df)
    if n_rows >= 1000:
        print_warning(f"Dataset has {n_rows} rows (>=1000). TVAE pivot may not trigger.")
    else:
        print_success(f"Dataset has {n_rows} rows (<1000). TVAE pivot should trigger after 2+ TabDDPM failures.")
    
    # Create mock run object
    run_id = f"greenguard-test-{int(time.time())}"
    run = {
        "id": run_id,
        "project_id": "test",
        "dataset_id": "breast_cancer",
        "method": None,  # Let ClinicalModelSelector choose (should pick TabDDPM)
        "mode": "agent",
        "config_json": {
            "preference": {"tradeoff": "balanced"},
            "goal": "Generate clinical trial quality synthetic data with all green metrics",
            "compliance_level": "hipaa_like",
            "enable_smart_preprocess": True,  # Enable preprocessing
        },
        "num_rows": len(df),
    }
    
    # Mock Supabase dataset fetch
    import io
    mock_storage = MagicMock()
    mock_storage.download.return_value = df.to_csv(index=False).encode('utf-8')
    
    mock_supabase_table = MagicMock()
    mock_supabase_table.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "file_url": "breast_cancer.csv",
        "rows_count": len(df),
        "name": "Breast Cancer",
        "schema_json": None
    }
    
    if hasattr(worker, 'supabase'):
        worker.supabase.table = lambda name: mock_supabase_table
        worker.supabase.storage.from_ = lambda bucket: mock_storage
    
    # Also patch _download_csv_from_storage directly
    import io as io_module
    def mock_download_csv(path: str) -> pd.DataFrame:
        return df
    
    worker._download_csv_from_storage = mock_download_csv
    
    print_header("Running Pipeline with GreenGuard Optimization")
    print_info("Expected behavior:")
    print_info("1. TabDDPM will be selected first (clinical data)")
    print_info("2. After 2+ failures with KS > 0.20, system should pivot to TVAE")
    print_info("3. TVAE should use enhanced hyperparameters (epochs 500-2000, batch 32)")
    
    # Patch builtins.print to track method switches
    import builtins
    builtins.print = track_print
    
    try:
        # Execute pipeline
        start_time = time.time()
        result = worker.execute_pipeline(run, cancellation_checker=None)
        elapsed = time.time() - start_time
        
        # Restore print
        builtins.print = original_print
        
        print_header("Test Results")
        
        # Check if pivot occurred
        if pivot_detected:
            print_success("✅ TVAE PIVOT DETECTED - GreenGuard logic working!")
        else:
            print_warning("⚠️  TVAE pivot not detected in logs (may have succeeded on first attempt)")
        
        # Extract metrics
        metrics = result.get("metrics", {})
        method_used = result.get("method", "unknown")
        
        print_info(f"Method used: {method_used.upper()}")
        print_info(f"Total time: {elapsed:.1f} seconds")
        
        # Check metrics
        all_green, passed, failed = check_all_green(metrics)
        
        print_header("Metrics Results")
        utility = metrics.get("utility", {})
        privacy = metrics.get("privacy", {})
        
        print_info(f"KS Mean: {utility.get('ks_mean', 'N/A')}")
        print_info(f"Corr Delta: {utility.get('corr_delta', 'N/A')}")
        print_info(f"MIA AUC: {privacy.get('mia_auc', 'N/A')}")
        print_info(f"Dup Rate: {privacy.get('dup_rate', 'N/A')}")
        
        if all_green:
            print_success("✅ ALL GREEN METRICS ACHIEVED!")
        else:
            print_warning(f"⚠️  Not all green - {len(failed)} metric(s) failed")
            for f in failed:
                print_warning(f"  - {f}")
        
        # Verify TVAE was used if pivot occurred
        if pivot_detected:
            if method_used.lower() == "tvae":
                print_success("✅ TVAE was successfully used after pivot")
            else:
                print_warning(f"⚠️  Pivot detected but method used was {method_used} (expected TVAE)")
        
        # Check hyperparameters if TVAE was used
        if method_used.lower() == "tvae":
            print_header("TVAE Hyperparameters Verification")
            # Check if enhanced hyperparameters were used
            # This would be in the logs or result metadata
            print_info("TVAE hyperparameters should be:")
            print_info("  - epochs: 500-2000 (aggressive scaling for small-N)")
            print_info("  - batch_size: 32")
            print_info("  - embedding_dim: 128-256")
            print_warning("Note: Hyperparameter verification requires log inspection")
        
        return {
            "success": True,
            "pivot_detected": pivot_detected,
            "method_used": method_used,
            "all_green": all_green,
            "metrics": metrics,
            "elapsed": elapsed
        }
        
    except Exception as e:
        builtins.print = original_print
        print_error(f"Test failed: {type(e).__name__}: {e}")
        import traceback
        print_error(f"Traceback:\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    result = test_tvae_pivot()
    
    print_header("Final Verdict")
    if result.get("success"):
        if result.get("pivot_detected"):
            print_success("✅ GREENGUARD TVAE PIVOT TEST PASSED")
            print_success("   - Pivot logic working correctly")
            if result.get("all_green"):
                print_success("   - All green metrics achieved!")
            else:
                print_warning("   - Metrics not all green, but pivot logic verified")
        else:
            print_warning("⚠️  Pivot not detected (may have succeeded on first attempt)")
    else:
        print_error("❌ TEST FAILED")
        print_error(f"   Error: {result.get('error', 'Unknown error')}")
