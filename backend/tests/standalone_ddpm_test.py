"""
Standalone TabDDPM test script for Mac (Apple Silicon) compatibility.

Run with: pip install -r requirements.txt && python tests/standalone_ddpm_test.py

This script:
- Tests TabDDPM (SynthCity's diffusion model) with heart.csv
- Evaluates privacy (MIA AUC, duplicate rate) and utility (KS complement)
- Saves synthetic data to synthetic_ddpm_heart.csv
"""

import os
import sys
import pandas as pd
from pathlib import Path

# Add parent directory to path to import from backend
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from synthcity.plugins import Plugins
    from synthcity.plugins.core.dataloader import GenericDataLoader
    from synthcity.metrics.eval import Metrics
except ImportError as e:
    print(f"❌ Error importing SynthCity: {e}")
    print("\nPlease install dependencies:")
    print("  pip install -r requirements.txt")
    sys.exit(1)

# Locate heart.csv (check backend folder and current directory)
heart_csv_path = None
possible_paths = [
    backend_dir / "heart.csv",
    Path("heart.csv"),
    Path(__file__).parent.parent.parent / "backend" / "heart.csv",
]

for path in possible_paths:
    if path.exists():
        heart_csv_path = path
        break

if heart_csv_path is None:
    print("❌ heart.csv not found!")
    print("\nPlease download heart.csv and place it in the backend/ folder.")
    print("You can download it from:")
    print("  https://www.kaggle.com/datasets/johnsmith88/heart-disease-dataset")
    print("\nOr use any CSV file with the same path structure.")
    sys.exit(1)

print(f"✅ Found heart.csv at: {heart_csv_path}")

# Load data
try:
    df = pd.read_csv(heart_csv_path)
    print(f"✅ Loaded real data: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"   Columns: {list(df.columns)}")
except Exception as e:
    print(f"❌ Error loading heart.csv: {e}")
    sys.exit(1)

# Create SynthCity loader
try:
    loader = GenericDataLoader(df)
    print("✅ Created SynthCity DataLoader")
except Exception as e:
    print(f"❌ Error creating DataLoader: {e}")
    sys.exit(1)

# Train TabDDPM (SOTA diffusion model)
print("\n🚀 Training TabDDPM (n_iter=300 for fast test)...")
print("   This may take a few minutes on CPU (faster on GPU if available)")
try:
    syn_model = Plugins().get("ddpm", n_iter=300)  # 300 iterations for fast test
    syn_model.fit(loader)
    print("✅ TabDDPM training completed")
except Exception as e:
    print(f"❌ Error training TabDDPM: {e}")
    print("\nTroubleshooting:")
    print("  - Ensure torch==2.0.1 is installed (check: pip show torch)")
    print("  - Ensure opacus==1.4.0 is installed (check: pip show opacus)")
    print("  - Try: pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 opacus==1.4.0")
    sys.exit(1)

# Generate synthetic data
print("\n📊 Generating synthetic data...")
try:
    synthetic_loader = syn_model.generate(count=len(df))
    synthetic_df = synthetic_loader.dataframe()
    print(f"✅ Generated {len(synthetic_df)} synthetic rows")
except Exception as e:
    print(f"❌ Error generating synthetic data: {e}")
    sys.exit(1)

# Save result
output_path = backend_dir / "synthetic_ddpm_heart.csv"
try:
    synthetic_df.to_csv(output_path, index=False)
    print(f"✅ Synthetic data saved to: {output_path}")
except Exception as e:
    print(f"❌ Error saving synthetic data: {e}")
    sys.exit(1)

# Evaluate with SynthCity metrics
print("\n📈 Evaluating privacy & utility metrics...")
try:
    metrics_evaluator = Metrics()
    # Evaluate privacy and statistical metrics
    # Note: Metrics.evaluate returns a DataFrame, not a dict
    metrics_df = metrics_evaluator.evaluate(
        df, 
        synthetic_df, 
        metrics={
            "privacy": ["k-anonymization", "identifiability_score"],
            "stats": ["ks_test", "feature_corr", "jensenshannon_dist"]
        },
        reduction="mean"
    )
    
    # Convert DataFrame to dict for easier access
    privacy = {}
    utility = {}
    
    if not metrics_df.empty:
        # Extract privacy metrics
        for idx in metrics_df.index:
            metric_name = idx.lower()
            if any(p in metric_name for p in ["k-anonymization", "identifiability", "delta", "privacy"]):
                privacy[metric_name] = metrics_df.loc[idx, "mean"] if "mean" in metrics_df.columns else None
            elif any(s in metric_name for s in ["ks", "corr", "jensen", "statistical"]):
                utility[metric_name] = metrics_df.loc[idx, "mean"] if "mean" in metrics_df.columns else None
        
        # Also try to get all metrics as dict
        print(f"   Found {len(metrics_df)} metrics in results")
        print(f"   Metric names: {list(metrics_df.index)}")
except Exception as e:
    print(f"❌ Error evaluating metrics: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Print key scores
print("\n" + "="*60)
print("PRIVACY METRICS (lower = better)")
print("="*60)
if privacy:
    for key, value in privacy.items():
        if value is not None:
            print(f"  {key}: {value:.4f}")
        else:
            print(f"  {key}: N/A")
else:
    print("  No privacy metrics available")

print("\n" + "="*60)
print("UTILITY METRICS")
print("="*60)
if utility:
    for key, value in utility.items():
        if value is not None:
            print(f"  {key}: {value:.4f}")
        else:
            print(f"  {key}: N/A")
else:
    print("  No utility metrics available")

# Print all available metrics from DataFrame
if not metrics_df.empty:
    print("\n" + "="*60)
    print("ALL METRICS (from DataFrame)")
    print("="*60)
    for idx in metrics_df.index:
        mean_val = metrics_df.loc[idx, "mean"] if "mean" in metrics_df.columns else "N/A"
        print(f"  {idx}: {mean_val}")

print("\n✅ Test completed successfully!")
print(f"   Synthetic data: {output_path}")

