#!/usr/bin/env python3
"""
Enhanced version of standalone_ddpm_test.py that captures environment details
to help identify the environment where KS Mean 0.0650 was achieved.
"""

import sys
import pandas as pd
import platform

print("=" * 80)
print("ENVIRONMENT INFORMATION")
print("=" * 80)
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")
print(f"Python executable: {sys.executable}")

# Try to get package versions
try:
    import synthcity
    print(f"SynthCity version: {synthcity.__version__}")
except:
    try:
        import importlib.metadata
        synthcity_version = importlib.metadata.version('synthcity')
        print(f"SynthCity version: {synthcity_version}")
    except:
        print("SynthCity version: Could not determine")

try:
    import pandas as pd
    print(f"Pandas version: {pd.__version__}")
except:
    print("Pandas version: Could not determine")

try:
    import numpy as np
    print(f"NumPy version: {np.__version__}")
except:
    print("NumPy version: Could not determine")

print("=" * 80)
print()

# Check if eval_privacy and eval_statistical are modules or functions
from synthcity.metrics import eval_privacy, eval_statistical
print(f"eval_privacy type: {type(eval_privacy)}")
print(f"eval_statistical type: {type(eval_statistical)}")
print()

# Load your heart.csv (already downloaded)
df = pd.read_csv("heart.csv")
print(f"Loaded real data: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Data types: {df.dtypes.to_dict()}")
print(f"Data columns: {list(df.columns)}")
print()

# Create SynthCity loader
from synthcity.plugins import Plugins
from synthcity.plugins.core.dataloader import GenericDataLoader

loader = GenericDataLoader(df)
print(f"GenericDataLoader created successfully")
print()

# Train TabDDPM (SOTA diffusion model)
print("Training TabDDPM — this may take 5-15 minutes on CPU...")
syn_model = Plugins().get("ddpm", n_iter=500)  # 500 iterations for good quality
syn_model.fit(loader)
print("✅ Training completed")
print()

# Generate synthetic data
print("Generating synthetic data...")
synthetic_loader = syn_model.generate(count=len(df))
synthetic_df = synthetic_loader.dataframe()
print(f"Generated synthetic data: {synthetic_df.shape[0]} rows, {synthetic_df.shape[1]} columns")
print()

# Save result
synthetic_df.to_csv("synthetic_ddpm_heart.csv", index=False)
print("✅ Synthetic data saved to synthetic_ddpm_heart.csv")
print()

# Evaluate with SynthCity metrics
print("Evaluating privacy & utility...")
print(f"eval_privacy type: {type(eval_privacy)}")
print(f"eval_statistical type: {type(eval_statistical)}")

# Check if they're callable
if callable(eval_privacy):
    print("eval_privacy is callable (function)")
    privacy = eval_privacy(df, synthetic_df)
else:
    print("eval_privacy is NOT callable (module) - trying alternative approach")
    # Try alternative approach
    try:
        from synthcity.metrics.eval import PrivacyEvaluator
        evaluator = PrivacyEvaluator()
        privacy = evaluator.evaluate(df, synthetic_df)
    except Exception as e:
        print(f"Error with PrivacyEvaluator: {e}")
        privacy = {}

if callable(eval_statistical):
    print("eval_statistical is callable (function)")
    utility = eval_statistical(df, synthetic_df)
else:
    print("eval_statistical is NOT callable (module) - trying alternative approach")
    # Try alternative approach
    try:
        from synthcity.metrics.eval import StatisticalEvaluator
        evaluator = StatisticalEvaluator()
        utility = evaluator.evaluate(df, synthetic_df)
    except Exception as e:
        print(f"Error with StatisticalEvaluator: {e}")
        utility = {}

print()
print("=" * 80)
print("RESULTS")
print("=" * 80)
print("\nPrivacy Metrics (lower = better):")
print(f"  MIA AUC: {privacy.get('mia_auc', 'N/A')}")
print(f"  Duplicate rate: {privacy.get('duplicate_rate', 'N/A')}")

print("\nUtility Metrics:")
ks_complement = utility.get('ks_complement', None)
if ks_complement is not None:
    ks_mean = 1.0 - float(ks_complement)
    print(f"  KS Complement (closer to 1 = better): {ks_complement}")
    print(f"  KS Mean (lower = better, target ≤0.10): {ks_mean}")
else:
    print(f"  KS Complement: {utility.get('ks_complement', 'N/A')}")
    print(f"  KS Mean: Could not calculate")

print(f"  Feature Coverage: {utility.get('feature_coverage', 'N/A')}")
print("=" * 80)
