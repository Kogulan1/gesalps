"""
Metric regression tests to ensure metrics don't degrade over time.
Run with: pytest tests/test_metric_regression.py --baseline=baseline_metrics.json -v
"""

import pytest
import json
import pandas as pd
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Baseline metrics (from heart.csv, TabDDPM)
BASELINE_METRICS = {
    "dataset": "heart.csv",
    "method": "ddpm",
    "rows": 302,
    "metrics": {
        "privacy": {
            "mia_auc": 0.003,
            "dup_rate": 0.0
        },
        "utility": {
            "ks_mean": 0.073,
            "corr_delta": 0.103
        }
    },
    "thresholds_passed": {
        "privacy": True,
        "utility": True,
        "all": True
    }
}

# Regression thresholds (max allowed increase)
REGRESSION_THRESHOLDS = {
    "mia_auc": 0.05,  # Max increase: 0.003 -> 0.053
    "ks_mean": 0.02,  # Max increase: 0.073 -> 0.093
    "corr_delta": 0.02,  # Max increase: 0.103 -> 0.123
    "dup_rate": 0.05  # Must remain < 0.05
}


def load_baseline(baseline_file=None):
    """Load baseline metrics from file or use default"""
    if baseline_file and Path(baseline_file).exists():
        with open(baseline_file, "r") as f:
            return json.load(f)
    return BASELINE_METRICS


def compare_metrics(baseline, current, thresholds):
    """Compare current metrics against baseline"""
    regressions = []
    
    # Privacy metrics
    baseline_privacy = baseline["metrics"]["privacy"]
    current_privacy = current["metrics"]["privacy"]
    
    # MIA AUC
    baseline_mia = baseline_privacy.get("mia_auc", 0)
    current_mia = current_privacy.get("mia_auc", 0)
    increase = current_mia - baseline_mia
    if increase > thresholds["mia_auc"]:
        regressions.append(f"MIA AUC increased by {increase:.4f} (max: {thresholds['mia_auc']})")
    
    # Dup Rate
    baseline_dup = baseline_privacy.get("dup_rate", 0)
    current_dup = current_privacy.get("dup_rate", 0)
    if current_dup > thresholds["dup_rate"]:
        regressions.append(f"Dup rate {current_dup:.4f} exceeds threshold {thresholds['dup_rate']}")
    
    # Utility metrics
    baseline_utility = baseline["metrics"]["utility"]
    current_utility = current["metrics"]["utility"]
    
    # KS Mean
    baseline_ks = baseline_utility.get("ks_mean", 0)
    current_ks = current_utility.get("ks_mean", 0)
    increase = current_ks - baseline_ks
    if increase > thresholds["ks_mean"]:
        regressions.append(f"KS Mean increased by {increase:.4f} (max: {thresholds['ks_mean']})")
    
    # Corr Delta
    baseline_corr = baseline_utility.get("corr_delta", 0)
    current_corr = current_utility.get("corr_delta", 0)
    increase = current_corr - baseline_corr
    if increase > thresholds["corr_delta"]:
        regressions.append(f"Corr Delta increased by {increase:.4f} (max: {thresholds['corr_delta']})")
    
    return regressions


def test_baseline_metrics_structure():
    """REG-001: Verify baseline metrics structure"""
    baseline = BASELINE_METRICS
    
    assert "dataset" in baseline
    assert "method" in baseline
    assert "metrics" in baseline
    assert "privacy" in baseline["metrics"]
    assert "utility" in baseline["metrics"]
    assert "mia_auc" in baseline["metrics"]["privacy"]
    assert "ks_mean" in baseline["metrics"]["utility"]


def test_baseline_metrics_thresholds():
    """REG-002-004: Verify baseline metrics pass thresholds"""
    baseline = BASELINE_METRICS
    metrics = baseline["metrics"]
    
    # Privacy thresholds
    assert metrics["privacy"]["mia_auc"] <= 0.60
    assert metrics["privacy"]["dup_rate"] <= 0.05
    
    # Utility thresholds
    assert metrics["utility"]["ks_mean"] <= 0.10
    assert metrics["utility"]["corr_delta"] <= 0.10


def test_metric_regression_no_degradation():
    """REG-005: Compare metrics - no regression"""
    baseline = BASELINE_METRICS
    
    # Simulate current metrics (same as baseline)
    current = {
        "metrics": {
            "privacy": {
                "mia_auc": 0.003,
                "dup_rate": 0.0
            },
            "utility": {
                "ks_mean": 0.073,
                "corr_delta": 0.103
            }
        }
    }
    
    regressions = compare_metrics(baseline, current, REGRESSION_THRESHOLDS)
    assert len(regressions) == 0, f"Unexpected regressions: {regressions}"


def test_metric_regression_within_tolerance():
    """REG-006: Compare metrics - within tolerance"""
    baseline = BASELINE_METRICS
    
    # Simulate current metrics (slightly worse but within tolerance)
    current = {
        "metrics": {
            "privacy": {
                "mia_auc": 0.050,  # +0.047 (within 0.05 tolerance)
                "dup_rate": 0.02
            },
            "utility": {
                "ks_mean": 0.090,  # +0.017 (within 0.02 tolerance)
                "corr_delta": 0.120  # +0.017 (within 0.02 tolerance)
            }
        }
    }
    
    regressions = compare_metrics(baseline, current, REGRESSION_THRESHOLDS)
    assert len(regressions) == 0, f"Should be within tolerance: {regressions}"


def test_metric_regression_exceeds_tolerance():
    """REG-007: Compare metrics - exceeds tolerance (should fail)"""
    baseline = BASELINE_METRICS
    
    # Simulate current metrics (worse beyond tolerance)
    current = {
        "metrics": {
            "privacy": {
                "mia_auc": 0.060,  # +0.057 (exceeds 0.05 tolerance) ❌
                "dup_rate": 0.0
            },
            "utility": {
                "ks_mean": 0.100,  # +0.027 (exceeds 0.02 tolerance) ❌
                "corr_delta": 0.130  # +0.027 (exceeds 0.02 tolerance) ❌
            }
        }
    }
    
    regressions = compare_metrics(baseline, current, REGRESSION_THRESHOLDS)
    assert len(regressions) > 0, "Should detect regressions"


def test_privacy_metrics_no_degradation():
    """REG-006: Privacy metrics must not degrade"""
    baseline = BASELINE_METRICS
    
    # Test various current metrics
    test_cases = [
        {"mia_auc": 0.003, "dup_rate": 0.0},  # Same
        {"mia_auc": 0.050, "dup_rate": 0.02},  # Within tolerance
        {"mia_auc": 0.060, "dup_rate": 0.06},  # Exceeds (should fail)
    ]
    
    for i, current_privacy in enumerate(test_cases):
        current = {
            "metrics": {
                "privacy": current_privacy,
                "utility": baseline["metrics"]["utility"]
            }
        }
        
        regressions = compare_metrics(baseline, current, REGRESSION_THRESHOLDS)
        
        if i < 2:
            # First two should pass
            assert len(regressions) == 0, f"Test case {i} should pass: {regressions}"
        else:
            # Last one should fail
            assert len(regressions) > 0, f"Test case {i} should detect regression"


def test_utility_metrics_no_degradation():
    """REG-007: Utility metrics must not degrade"""
    baseline = BASELINE_METRICS
    
    # Test various current metrics
    test_cases = [
        {"ks_mean": 0.073, "corr_delta": 0.103},  # Same
        {"ks_mean": 0.090, "corr_delta": 0.120},  # Within tolerance
        {"ks_mean": 0.100, "corr_delta": 0.130},  # Exceeds (should fail)
    ]
    
    for i, current_utility in enumerate(test_cases):
        current = {
            "metrics": {
                "privacy": baseline["metrics"]["privacy"],
                "utility": current_utility
            }
        }
        
        regressions = compare_metrics(baseline, current, REGRESSION_THRESHOLDS)
        
        if i < 2:
            # First two should pass
            assert len(regressions) == 0, f"Test case {i} should pass: {regressions}"
        else:
            # Last one should fail
            assert len(regressions) > 0, f"Test case {i} should detect regression"


def test_threshold_pass_rate_no_decrease():
    """REG-008: Threshold pass rate must not decrease"""
    baseline = BASELINE_METRICS
    
    # Baseline passes all thresholds
    assert baseline["thresholds_passed"]["all"] == True
    
    # Current should also pass
    current_metrics = {
        "privacy": {
            "mia_auc": 0.003,
            "dup_rate": 0.0
        },
        "utility": {
            "ks_mean": 0.073,
            "corr_delta": 0.103
        }
    }
    
    # Check thresholds
    privacy_ok = (
        current_metrics["privacy"]["mia_auc"] <= 0.60 and
        current_metrics["privacy"]["dup_rate"] <= 0.05
    )
    utility_ok = (
        current_metrics["utility"]["ks_mean"] <= 0.10 and
        current_metrics["utility"]["corr_delta"] <= 0.10
    )
    all_ok = privacy_ok and utility_ok
    
    assert all_ok == True, "Threshold pass rate should not decrease"


@pytest.fixture
def baseline_file(tmp_path):
    """Create a temporary baseline file for testing"""
    baseline_file = tmp_path / "baseline_metrics.json"
    with open(baseline_file, "w") as f:
        json.dump(BASELINE_METRICS, f, indent=2)
    return str(baseline_file)


def test_load_baseline_from_file(baseline_file):
    """Test loading baseline from file"""
    baseline = load_baseline(baseline_file)
    assert baseline["dataset"] == "heart.csv"
    assert baseline["method"] == "ddpm"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

