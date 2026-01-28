
import os
import sys
import pandas as pd
import numpy as np
import time
import json
from unittest.mock import MagicMock
from typing import Any, Dict

# 1. Environment & Path Setup
os.environ['SUPABASE_URL'] = 'https://dummy.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'dummy-key'
os.environ['KS_MAX'] = '0.10'
os.environ['CORR_MAX'] = '0.10'
os.environ['MIA_MAX'] = '0.60'

sys.path.append(os.path.abspath('backend/synth_worker'))

# 2. Mock Supabase before importing worker
import worker
worker.supabase = MagicMock()
# Prevent real DB interactions
worker.supabase.table().insert().execute.return_value = MagicMock()
worker.supabase.table().update().execute.return_value = MagicMock()
worker.supabase.table().select().execute.return_value = MagicMock()

# 3. Core Engine Imports
from worker import (
    _clean_clinical_data, 
    _attempt_train, 
    _run_red_team_attack, 
    _merge_red_team,
    SingleTableMetadata
)

# Robust threshold status (re-implemented if local in worker.py)
def get_threshold_status(met):
    # This matches the logic injected into worker.py
    KS_MAX = 0.10
    CORR_MAX = 0.10
    MIA_MAX = 0.60
    u = met.get("utility", {})
    p = met.get("privacy", {})
    ks = u.get("ks_mean")
    cd = u.get("corr_delta")
    mia = p.get("mia_auc")
    dup = p.get("dup_rate")
    ident = p.get("identifiability_score")
    
    ok = True
    reasons = []
    
    if ks is not None:
        if ks > KS_MAX: ok = False; reasons.append(f"KS {ks:.3f} > {KS_MAX} (FAIL)")
        else: reasons.append(f"KS {ks:.3f} (OK)")
    if cd is not None:
        if cd > CORR_MAX: ok = False; reasons.append(f"Corr Δ {cd:.3f} > {CORR_MAX} (FAIL)")
        else: reasons.append(f"Corr Δ {cd:.3f} (OK)")
    if ident is not None:
        if ident > 0.05: ok = False; reasons.append(f"Red Team Linkage {ident:.1%} > 5% (FAIL)")
        else: reasons.append(f"Red Team Linkage {ident:.1%} (OK)")
        
    return ok, reasons

def run_production_suite(file_path, name):
    print(f"\n{'#'*60}")
    print(f"🌍 VALIDATING: {name}")
    print(f"{'#'*60}")
    
    df = pd.read_csv(file_path)
    report = {"name": name, "steps": []}
    
    # PHASE 1: CLEANER
    print(f"[Step 1] Executing 'The Cleaner' (Clinical Preprocessing)...")
    start = time.time()
    cleaned_df = _clean_clinical_data(df)
    elapsed = time.time() - start
    report["steps"].append({"step": "Cleaner", "elapsed": elapsed, "status": "COMPLETE"})
    print(f" -> Cleaned in {elapsed:.2f}s. Rows: {len(df)} -> {len(cleaned_df)}")
    
    # PHASE 2: ARCHITECT (Metadata & Model Selection)
    print(f"[Step 2] Clinical Architect (Metadata Projection)...")
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(cleaned_df)
    report["steps"].append({"step": "Architect", "status": "COMPLETE"})
    
    # PHASE 3: GENERATOR (Full Training Run)
    # We use TVAE as the clinical standard for validation
    print(f"[Step 3] Generator (Training TVAE Clinical Standard - 200 epochs)...")
    start = time.time()
    try:
        train_item = {"method": "tvae", "hyperparams": {"num_epochs": 200, "batch_size": 32}}
        out = _attempt_train(train_item, cleaned_df, metadata, 1.0, 5000, None)
        synth = out["synth"]
        elapsed = time.time() - start
        report["steps"].append({"step": "Generator", "elapsed": elapsed, "status": "COMPLETE", "method": "tvae"})
        print(f" -> Generated in {elapsed:.2f}s")
    except Exception as e:
        print(f" -> Generator Failed: {e}")
        report["steps"].append({"step": "Generator", "status": "FAILED", "error": str(e)})
        return report

    # PHASE 4: RED TEAMER (Adversarial Attack)
    print(f"[Step 4] The Red Teamer (Linkage Attack Simulation)...")
    start = time.time()
    privacy_metrics = _run_red_team_attack(cleaned_df, synth)
    elapsed = time.time() - start
    report["steps"].append({"step": "Red Teamer", "elapsed": elapsed, "status": "COMPLETE", "risk": privacy_metrics["identifiability_score"]})
    print(f" -> Red Team Attack Success Rate: {privacy_metrics['identifiability_score']:.2%}")
    
    # PHASE 5: COMPLIANCE GATE
    print(f"[Step 5] Compliance Gate (All Green Thresholds)...")
    # Mocking utility metrics for this high-level loop (real training was done above)
    # In a real worker run, the worker calculates these via _utility_metrics
    from worker import _utility_metrics
    util_met = _utility_metrics(cleaned_df, synth)
    
    final_metrics = {
        "utility": util_met,
        "privacy": privacy_metrics
    }
    
    ok, reasons = get_threshold_status(final_metrics)
    report["final_metrics"] = final_metrics
    report["verdict"] = "PASS" if ok else "FAIL"
    report["reasons"] = reasons
    
    print(f" -> Status: {report['verdict']}")
    for r in reasons:
        print(f"    - {r}")
        
    return report

if __name__ == "__main__":
    datasets = [
        ('backend/heart.csv', 'Heart Disease'),
        ('local_benchmarks/data/diabetes.csv', 'Pima Diabetes'),
        ('local_benchmarks/data/breast_cancer.csv', 'Breast Cancer'),
        ('local_benchmarks/data/hcv_data.csv', 'Hepatitis C (HCV)'),
        ('local_benchmarks/data/kidney_disease.csv', 'Chronic Kidney Disease'),
        ('local_benchmarks/data/hepatitis.csv', 'Hepatitis')
    ]
    
    global_results = []
    for path, name in datasets:
        if os.path.exists(path):
            res = run_production_suite(path, name)
            global_results.append(res)
        else:
            print(f"\n!!! SKIPPING {name}: Missing file {path}")
            
    # Save results for report scribe
    with open('validation_results.json', 'w') as f:
        json.dump(global_results, f, indent=2)
        
    print(f"\n{'='*60}")
    print(f"🚀 VALIDATION SUITE COMPLETE. Results saved to validation_results.json")
    print(f"{'='*60}")
