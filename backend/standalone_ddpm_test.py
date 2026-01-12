import pandas as pd
from synthcity.plugins import Plugins
from synthcity.plugins.core.dataloader import GenericDataLoader
from synthcity.metrics import eval_privacy, eval_statistical

# Load your heart.csv (already downloaded)
df = pd.read_csv("heart.csv")
print(f"Loaded real data: {df.shape[0]} rows, {df.shape[1]} columns")

# Create SynthCity loader
loader = GenericDataLoader(df)

# Train TabDDPM (SOTA diffusion model)
print("\nTraining TabDDPM — this may take 5-15 minutes on CPU...")
syn_model = Plugins().get("ddpm", n_iter=500)  # 500 iterations for good quality
syn_model.fit(loader)

# Generate synthetic data
print("Generating synthetic data...")
synthetic_loader = syn_model.generate(count=len(df))
synthetic_df = synthetic_loader.dataframe()

# Save result
synthetic_df.to_csv("synthetic_ddpm_heart.csv", index=False)
print("✅ Synthetic data saved to synthetic_ddpm_heart.csv")

# Evaluate with SynthCity metrics
print("\nEvaluating privacy & utility...")
privacy = eval_privacy(df, synthetic_df)
utility = eval_statistical(df, synthetic_df)

print("\nPrivacy Metrics (lower = better):")
print(f"  MIA AUC: {privacy.get('mia_auc', 'N/A')}")
print(f"  Duplicate rate: {privacy.get('duplicate_rate', 'N/A')}")

print("\nUtility Metrics (higher = better):")
print(f"  KS Complement (closer to 1 = better): {utility.get('ks_complement', 'N/A')}")
print(f"  Feature Coverage: {utility.get('feature_coverage', 'N/A')}")
