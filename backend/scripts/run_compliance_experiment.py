#!/usr/bin/env python3
"""
Example Compliance Experiment Script
Demonstrates how to use the compliance framework for validation.
"""

import sys
import os
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from libs.compliance import get_compliance_evaluator
from libs.experiments import ExperimentRunner, run_compliance_simulation
from libs.model_selector import select_model_for_dataset

def generate_mock_synthetic(real_df: pd.DataFrame, method: str = "ddpm") -> tuple[pd.DataFrame, dict]:
    """Mock synthetic data generator for demonstration.
    
    In production, this would call the actual synthesizer.
    """
    # Simple mock: add noise to real data
    synth_df = real_df.copy()
    for col in synth_df.select_dtypes(include=[np.number]).columns:
        noise = np.random.normal(0, synth_df[col].std() * 0.1, size=len(synth_df))
        synth_df[col] = synth_df[col] + noise
    
    # Mock metrics (in production, compute from real vs synthetic)
    metrics = {
        "privacy": {
            "mia_auc": 0.05,  # Good privacy
            "dup_rate": 0.02,  # 2% duplicates
            "k_anonymization": 7,
            "identifiability_score": 0.08,
            "dp_effective": True,
            "dp_epsilon": 0.8,
            "dp_delta": 1e-6,
        },
        "utility": {
            "ks_mean": 0.08,  # Good utility
            "corr_delta": 0.09,
            "jensenshannon_dist": 0.12,
            "auroc": 0.85,
            "c_index": 0.75,
        },
        "fairness": {
            "rare_coverage": 0.72,
            "freq_skew": 0.25,
        },
        "meta": {
            "n_real": len(real_df),
            "n_synth": len(synth_df),
            "model": method,
        },
    }
    
    return synth_df, metrics


def main():
    """Run example compliance experiments."""
    print("=" * 60)
    print("Gesalp AI - Compliance Experiment Framework")
    print("=" * 60)
    
    # Load or create sample dataset
    data_file = Path(__file__).parent.parent.parent / "test_data.csv"
    if data_file.exists():
        print(f"\n📊 Loading dataset: {data_file}")
        real_df = pd.read_csv(data_file)
    else:
        print("\n📊 Generating mock clinical dataset...")
        # Generate mock clinical data
        np.random.seed(42)
        n_rows = 500
        real_df = pd.DataFrame({
            "patient_id": range(n_rows),
            "age": np.random.normal(55, 15, n_rows).astype(int),
            "bmi": np.random.normal(25, 5, n_rows),
            "blood_pressure_systolic": np.random.normal(120, 15, n_rows).astype(int),
            "diagnosis_code": np.random.choice(["A", "B", "C", "D"], n_rows),
            "medication_count": np.random.poisson(3, n_rows),
            "hospital_stay_days": np.random.exponential(5, n_rows).astype(int),
        })
        real_df["age"] = np.clip(real_df["age"], 18, 100)
        real_df["bmi"] = np.clip(real_df["bmi"], 15, 50)
    
    print(f"   Rows: {len(real_df)}, Columns: {len(real_df.columns)}")
    
    # Experiment 1: Single compliance validation
    print("\n" + "=" * 60)
    print("Experiment 1: Single Compliance Validation")
    print("=" * 60)
    
    runner = ExperimentRunner(compliance_level="hipaa_like")
    
    synthetic_df, metrics = generate_mock_synthetic(real_df, method="ddpm")
    
    results = runner.run_single_experiment(
        real_data=real_df,
        synthetic_data=synthetic_df,
        metrics=metrics,
        experiment_name="example_validation",
        metadata={"method": "ddpm", "dataset": "test_data"},
    )
    
    print(f"\n✅ Compliance Status: {'PASSED' if results['compliance']['passed'] else 'FAILED'}")
    print(f"   Score: {results['compliance']['score']:.2%}")
    print(f"   Level: {results['compliance']['level']}")
    
    if results['compliance'].get('violations'):
        print(f"\n⚠️  Violations ({len(results['compliance']['violations'])}):")
        for violation in results['compliance']['violations']:
            print(f"   - {violation}")
    else:
        print("\n✅ No violations detected")
    
    # Experiment 2: Model comparison
    print("\n" + "=" * 60)
    print("Experiment 2: Model Comparison")
    print("=" * 60)
    
    model_configs = [
        {"method": "ddpm", "hyperparams": {"n_iter": 500}},
        {"method": "gc", "hyperparams": {"sample_multiplier": 1.0}},
    ]
    
    def synthesizer_fn(df, config):
        method = config.get("method", "ddpm")
        return generate_mock_synthetic(df, method=method)
    
    comparison_results = runner.run_model_comparison(
        real_data=real_df,
        model_configs=model_configs,
        synthesizer_fn=synthesizer_fn,
        experiment_name="model_comparison_example",
    )
    
    print(f"\n📊 Tested {len(comparison_results['models'])} models")
    if comparison_results.get('best_model'):
        best = comparison_results['best_model']
        print(f"🏆 Best Model: {best['model_name']}")
        if best.get('compliance'):
            print(f"   Compliance Score: {best['compliance']['score']:.2%}")
    
    # Experiment 3: Threshold sensitivity
    print("\n" + "=" * 60)
    print("Experiment 3: Threshold Sensitivity Analysis")
    print("=" * 60)
    
    threshold_variations = [
        {
            "privacy": {"mia_auc_max": 0.50},
            "utility": {"ks_mean_max": 0.08},
        },
        {
            "privacy": {"mia_auc_max": 0.60},
            "utility": {"ks_mean_max": 0.10},
        },
        {
            "privacy": {"mia_auc_max": 0.70},
            "utility": {"ks_mean_max": 0.12},
        },
    ]
    
    sensitivity_results = runner.run_threshold_sensitivity(
        real_data=real_df,
        synthetic_data=synthetic_df,
        metrics=metrics,
        threshold_variations=threshold_variations,
        experiment_name="threshold_sensitivity_example",
    )
    
    print(f"\n📈 Tested {len(sensitivity_results['threshold_tests'])} threshold configurations")
    for idx, test in enumerate(sensitivity_results['threshold_tests']):
        if 'compliance_result' in test:
            result = test['compliance_result']
            print(f"   Config {idx+1}: {'✅ PASSED' if result.get('passed') else '❌ FAILED'} (Score: {result.get('score', 0.0):.2%})")
    
    # Experiment 4: Model selection
    print("\n" + "=" * 60)
    print("Experiment 4: Clinical Model Selection")
    print("=" * 60)
    
    try:
        plan = select_model_for_dataset(
            real_df,
            compliance_level="hipaa_like",
            preference={"tradeoff": "privacy_first"},
            goal="Generate synthetic clinical data for research",
        )
        print(f"\n🤖 Selected Model: {plan['choice']['method'].upper()}")
        print(f"   Rationale: {plan.get('rationale', 'N/A')}")
        print(f"   DP Enabled: {plan['dp'].get('enabled', False)}")
    except Exception as e:
        print(f"\n⚠️  Model selection failed (LLM may not be available): {e}")
        print("   This is expected if Ollama is not running.")
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print("\n✅ All experiments completed!")
    print(f"📁 Results saved to: {runner.output_dir}")
    print("\nNext steps:")
    print("  1. Review experiment results in the output directory")
    print("  2. Generate reports: runner.generate_report('experiment_name')")
    print("  3. Integrate compliance checks into production pipeline")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()

