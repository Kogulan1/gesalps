import pandas as pd
from synthcity.plugins import Plugins
from synthcity.plugins.core.dataloader import GenericDataLoader
from synthcity.metrics import eval_privacy, eval_statistical

# Check if eval_privacy and eval_statistical are callable (functions) or modules
# In SynthCity 0.2.12, they are modules, not callable functions
def eval_privacy_wrapper(real_df, synth_df):
    """Wrapper to handle both function-based and module-based eval_privacy."""
    if callable(eval_privacy):
        # Old API: direct function call
        return eval_privacy(real_df, synth_df)
    else:
        # New API (SynthCity 0.2.12): use Metrics class
        try:
            from synthcity.metrics.eval import Metrics
            metrics_evaluator = Metrics()
            metrics_df = metrics_evaluator.evaluate(
                real_df,
                synth_df,
                metrics={
                    "privacy": ["k-anonymization", "identifiability_score", "delta-presence"]
                },
                reduction="mean"
            )
            
            mia_auc = None
            dup_rate = None
            
            if not metrics_df.empty:
                for idx in metrics_df.index:
                    metric_name = str(idx).lower()
                    mean_val = metrics_df.loc[idx, "mean"] if "mean" in metrics_df.columns else None
                    
                    if "mia" in metric_name or "membership" in metric_name or "inference" in metric_name:
                        mia_auc = float(mean_val) if mean_val is not None else None
                    elif "duplicate" in metric_name or "dup" in metric_name:
                        dup_rate = float(mean_val) if mean_val is not None else None
                    elif "identifiability" in metric_name:
                        if mia_auc is None:
                            mia_auc = float(mean_val) if mean_val is not None else None
            
            return {
                'mia_auc': mia_auc,
                'duplicate_rate': dup_rate,
            }
        except Exception as e:
            print(f"Error in eval_privacy_wrapper: {e}")
            return {'mia_auc': None, 'duplicate_rate': None}

def eval_statistical_wrapper(real_df, synth_df):
    """Wrapper to handle both function-based and module-based eval_statistical."""
    if callable(eval_statistical):
        # Old API: direct function call
        return eval_statistical(real_df, synth_df)
    else:
        # New API (SynthCity 0.2.12): use Metrics class
        try:
            from synthcity.metrics.eval import Metrics
            metrics_evaluator = Metrics()
            metrics_df = metrics_evaluator.evaluate(
                real_df,
                synth_df,
                metrics={
                    "stats": ["ks_test", "feature_corr", "jensenshannon_dist"]
                },
                reduction="mean"
            )
            
            ks_complement = None
            feature_coverage = None
            
            if not metrics_df.empty:
                for idx in metrics_df.index:
                    metric_name = str(idx).lower()
                    mean_val = metrics_df.loc[idx, "mean"] if "mean" in metrics_df.columns else None
                    
                    if "ks" in metric_name or "kolmogorov" in metric_name:
                        # KS test returns the statistic (lower is better)
                        # KS complement = 1 - KS statistic (higher is better)
                        ks_stat = float(mean_val) if mean_val is not None else None
                        if ks_stat is not None:
                            ks_complement = 1.0 - ks_stat
                    elif "feature" in metric_name and "coverage" in metric_name:
                        feature_coverage = float(mean_val) if mean_val is not None else None
            
            return {
                'ks_complement': ks_complement,
                'feature_coverage': feature_coverage,
            }
        except Exception as e:
            print(f"Error in eval_statistical_wrapper: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()[:200]}")
            return {'ks_complement': None, 'feature_coverage': None}

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
privacy = eval_privacy_wrapper(df, synthetic_df)
utility = eval_statistical_wrapper(df, synthetic_df)

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