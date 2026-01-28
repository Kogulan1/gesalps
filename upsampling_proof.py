
import os
import sys
import pandas as pd
import numpy as np
import time
import json
from unittest.mock import MagicMock

# 1. Environment & Path Setup
os.environ['SUPABASE_URL'] = 'https://dummy.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'dummy-key'

sys.path.append(os.path.abspath('backend/synth_worker'))

# Mock Supabase
import worker
worker.supabase = MagicMock()

from worker import (
    _clean_clinical_data, 
    _attempt_train, 
    _run_red_team_attack, 
    _utility_metrics,
    SingleTableMetadata
)

def run_upsampling_test(file_path):
    print(f"\n{'='*80}")
    print(f"📈 UPSAMPLING FIDELITY PROOF: 10X and 25X Expansion")
    print(f"{'='*80}")
    
    df = pd.read_csv(file_path)
    cleaned_df = _clean_clinical_data(df)
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(cleaned_df)
    
    # We use the TVAE 7000 epochs configuration verified for Kidney
    hparams = {
        'num_epochs': 7000, 
        'batch_size': 32, 
        'embedding_dim': 512, 
        'compress_dims': [256, 256], 
        'decompress_dims': [256, 256]
    }
    
    print("\n[Step 1] Training baseline TVAE (7000 epochs)...")
    train_item = {"method": "tvae", "hyperparams": hparams}
    # Note: _attempt_train by default samples len(real) * sample_multiplier.
    # We will manually sample from the trained model to show upsampling.
    out = _attempt_train(train_item, cleaned_df, metadata, 1.0, 5000, None)
    synth_400 = out["synth"]
    model = out["out"]["synth"] # Extract the internal model for manual sampling
    
    results = []
    
    # Test cases
    test_sizes = [400, 4000, 10000]
    
    for size in test_sizes:
        print(f"\n[Step 2] Evaluating metrics for size N={size}...")
        
        # Sample manually if we have the model
        if size == 400:
            synth = synth_400
        else:
            # We use the SDV synthesizer's sample method
            synth = out["out"]["synth_model"]._model.sample(size)
            # Apply post-processing if needed (the internal model is already fitted)
            # But the worker's _attempt_train already returns a clean df.
            # Let's just use the synthesizer's method.
        
        util = _utility_metrics(cleaned_df, synth)
        priv = _run_red_team_attack(cleaned_df, synth)
        
        ks = util.get("ks_mean", 1.0)
        cd = util.get("corr_delta", 1.0)
        ident = priv.get("identifiability_score", 1.0)
        
        print(f" -> N={size}: KS={ks:.3f}, Corr Δ={cd:.3f}, Re-id={ident:.2%}")
        
        results.append({
            "size": size,
            "metrics": {
                "utility": util,
                "privacy": priv
            }
        })
        
    return results

if __name__ == "__main__":
    kidney_path = 'local_benchmarks/data/kidney_disease.csv'
    if os.path.exists(kidney_path):
        results = run_upsampling_test(kidney_path)
        with open('upsampling_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nUpsampling results saved to upsampling_results.json")
    else:
        print(f"File not found: {kidney_path}")
