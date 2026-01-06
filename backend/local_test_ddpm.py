import pandas as pd
from synth_worker.worker import execute_pipeline  # Adjust path if needed
from synth_worker.models.factory import create_synthesizer
import logging

# Optional: More verbose logs
logging.basicConfig(level=logging.INFO)

# 1. Load a small clinical-like dataset
# Replace with your own CSV path — e.g., UCI Heart, Diabetes, or one from your projects
df = pd.read_csv("heart.csv")  # Example: https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data
print(f"Real data loaded: {df.shape[0]} rows, {df.shape[1]} columns")

# 2. Mock a run dict (same structure the worker expects)
run = {
    "id": "local-test-ddpm-2026",
    "project_id": "local",
    "dataset_id": "heart",
    "config": {
        "method": "ddpm",              # Force TabDDPM — the 2025 SOTA
        "epochs": 500,
        "sample_size": len(df),        # Same number of rows
        "dp_epsilon": 1.0,             # Medium privacy
        "use_synthcity_metrics": True
    },
    "status": "queued"
}

# 3. Run the pipeline locally
print("\nStarting TabDDPM generation...")
try:
    result = execute_pipeline(run)
    print("\n✅ Generation complete!")
    print(f"Synthetic data: {result['synthetic_path']}")
    print(f"Report: {result['report_path']}")

    # Load and show key metrics
    synth_df = pd.read_csv(result['synthetic_path'])
    print(f"Synthetic shape: {synth_df.shape}")

    # Simple preview of metrics (full in JSON report)
    print("\nKey metrics preview:")
    print(f"Model used: {result.get('metrics', {}).get('meta', {}).get('model')}")
    print(f"Evaluator: {result.get('metrics', {}).get('meta', {}).get('evaluator_backend')}")
    print(f"MIA AUC: {result.get('metrics', {}).get('privacy', {}).get('mia_auc')}")
    print(f"Duplicate rate: {result.get('metrics', {}).get('privacy', {}).get('dup_rate')}")
    print(f"KS mean: {result.get('metrics', {}).get('utility', {}).get('ks_mean')}")

except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()