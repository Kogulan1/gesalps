
import os
import sys
import pandas as pd
import numpy as np
import time
import json
from unittest.mock import MagicMock
from typing import Any, Dict, List

# 1. Environment & Path Setup
os.environ['SUPABASE_URL'] = 'https://dummy.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'dummy-key'

sys.path.append(os.path.abspath('backend/synth_worker'))

# 2. Mock Supabase before importing worker
import worker
worker.supabase = MagicMock()
worker.supabase.table().insert().execute.return_value = MagicMock()
worker.supabase.table().update().execute.return_value = MagicMock()

from worker import (
    _clean_clinical_data, 
    _attempt_train, 
    _run_red_team_attack, 
    _utility_metrics,
    SingleTableMetadata
)
from optimizer import SyntheticDataOptimizer, FailureType

def run_iterative_benchmark(file_path, name, max_tries=5):
    print(f"\n{'='*80}")
    print(f"🔥 ITERATIVE OPTIMIZATION PROOF: {name}")
    print(f"{'='*80}")
    
    df = pd.read_csv(file_path)
    cleaned_df = _clean_clinical_data(df)
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(cleaned_df)
    
    optimizer = SyntheticDataOptimizer()
    # ZERO-KNOWLEDGE AUTONOMOUS BREAKTHROUGH
    # The engine starts with the default 'tvae' and must autonomously pivot to 'ddpm'
    # if it detects a plateau, and scale hyperparameters accordingly.
    current_method_info = {"method": "tvae", "hyperparams": {}}
    current_params = {} # Let Optimizer decide defaults
    
    audit_trail = []
    
    # Run fully autonomous GreenGuard Loop (simulated via outer loop here if needed, 
    # but the worker.py execute_run already has the loop. 
    # For this proof, we will run the worker's own loop by NOT overriding params.)
    
    print("\n[Autonomous] Starting Zero-Knowledge Run (TVAE -> Auto-Pivot)")
    start = time.time()
    
    # We simulate the worker's loop by running it effectively via _attempt_train
    # But wait, iterative_proof.py is usually for testing the logic. 
    # Let's make this script USE the worker's logic properly.
    
    # Since worker.py execute_run is too heavy to run directly (needs Supabase/Redis),
    # We will replicate the Autonomous Loop here using the new recommend_next_step logic.
    
    current_method = "tvae"
    current_params = {} # Start with defaults
    
    for attempt in range(1, 6):
        print(f"\n[Attempt {attempt}] Running with {current_method}: {current_params}")
        
        start_step = time.time()
        # Train
        train_item = {"method": current_method, "hyperparams": current_params}
        out = _attempt_train(train_item, cleaned_df, metadata, 1.0, 5000, None)
        synth = out["synth"]
        
        # Evaluate
        util = _utility_metrics(cleaned_df, synth)
        priv = _run_red_team_attack(cleaned_df, synth)
        
        metrics = {"utility": util, "privacy": priv}
        ks = util.get("ks_mean", 1.0)
        cd = util.get("corr_delta", 1.0)
        ident = priv.get("identifiability_score", 1.0)
        ok = (ks <= 0.10 and cd <= 0.10 and ident <= 0.05)
        
        print(f" -> Results: KS={ks:.3f}, Corr Δ={cd:.3f}, Re-id={ident:.2%}")
        
        log_entry = {
            "attempt": attempt,
            "method": current_method,
            "hparams": current_params.copy(),
            "metrics": metrics,
            "status": "PASS" if ok else "FAIL"
        }
        
        if ok:
            print(f"✅ AUTONOMOUS ALL GREEN REACHED in {attempt} tries!")
            audit_trail.append(log_entry)
            break
            
        # ASK OPTIMIZER FOR NEXT STEP (Architectural Intelligence)
        next_method, next_params = optimizer.recommend_next_step(
            method=current_method,
            dataset_size=cleaned_df.shape,
            metrics=metrics,
            retry_count=attempt
        )
        
        if next_method != current_method:
            print(f"🧩 ARCHITECTURAL PIVOT: {current_method} -> {next_method}")
            
        current_method = next_method
        current_params = next_params
        audit_trail.append(log_entry)
        
    return audit_trail
                
    return audit_trail

if __name__ == "__main__":
    # Test on Chronic Kidney Disease as requested
    kidney_path = 'local_benchmarks/data/kidney_disease.csv'
    if os.path.exists(kidney_path):
        results = run_iterative_benchmark(kidney_path, "Chronic Kidney Disease")
        
        with open('iteration_results.json', 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"\nIteration Audit saved to iteration_results.json")
    else:
        print(f"File not found: {kidney_path}")
