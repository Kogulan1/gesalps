
import os
import sys
import pandas as pd
import time
from unittest.mock import MagicMock

# Set dummy env vars
os.environ['SUPABASE_URL'] = 'https://dummy.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'dummy-key'

# Add worker path
sys.path.append(os.path.abspath('backend/synth_worker'))

import worker
# Mock database/logging so we don't need Supabase
worker.supabase = MagicMock()
worker.supabase.table().insert().execute.return_value = MagicMock()
worker._log_step = lambda *args: None

from worker import _clean_clinical_data, _attempt_train, SingleTableMetadata

def benchmark_real(file_path, name):
    print(f"\n--- BENCHMARKING REAL TRAINING: {name} ---")
    df = pd.read_csv(file_path)
    
    start_total = time.time()
    
    # Clean
    cleaned_df = _clean_clinical_data(df)
    
    # Metadata
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(cleaned_df)
    
    # Training (GC - Default fast model)
    print(f"Starting GC training for {name} ({len(df)} rows)...")
    start_train = time.time()
    train_item = {"method": "gc", "hyperparams": {}}
    out = _attempt_train(train_item, cleaned_df, metadata, 1.0, 5000, None)
    train_end = time.time()
    
    total_end = time.time()
    
    print(f"Cleaning: {start_train - start_total:.2f}s")
    print(f"Training (GC): {train_end - start_train:.2f}s")
    print(f"Total Time: {total_end - start_total:.2f}s")
    
    # Try TVAE (The high-quality "All Green" model)
    print(f"\nStarting TVAE training (The 'All Green' Clinical Standard)...")
    start_tvae = time.time()
    # Mocking TVAE if deps missing, but let's try to run it if it exists
    try:
        tvae_item = {"method": "tvae", "hyperparams": {"epochs": 200, "batch_size": 32}}
        _attempt_train(tvae_item, cleaned_df, metadata, 1.0, 5000, None)
        tvae_end = time.time()
        print(f"Training (TVAE): {tvae_end - start_tvae:.2f}s")
    except Exception as e:
        print(f"TVAE skip/fail (likely missing deep learning deps in this env): {e}")

if __name__ == "__main__":
    benchmark_real('backend/heart.csv', 'Heart Disease')
    benchmark_real('local_benchmarks/data/diabetes.csv', 'Pima Diabetes')
