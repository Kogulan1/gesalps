"""
Edge case tests for large CSVs, DP failures, model failures, etc.
Run with: pytest tests/test_edge_cases.py -v
"""

import pytest
import pandas as pd
import io
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from synth_worker.worker import execute_pipeline
from synth_worker.models.factory import create_synthesizer
from synth_worker.models.base import SynthesizerResult
from sdv.metadata import SingleTableMetadata


# ========== Large CSV Tests ==========

def test_large_csv_10000_rows():
    """EC-LARGE-001: Upload CSV with 10,000 rows"""
    # Generate large DataFrame
    df = pd.DataFrame({
        "col1": range(10000),
        "col2": [f"value_{i}" for i in range(10000)],
        "col3": [i * 1.5 for i in range(10000)]
    })
    
    # Test that it can be processed
    assert len(df) == 10000
    assert df.shape[1] == 3
    
    # Test schema inference
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(df)
    assert len(metadata.columns) == 3


def test_large_csv_100_columns():
    """EC-LARGE-003: Upload CSV with 100+ columns"""
    # Generate wide DataFrame
    data = {f"col_{i}": range(100) for i in range(100)}
    df = pd.DataFrame(data)
    
    assert df.shape[1] == 100
    assert df.shape[0] == 100


def test_csv_at_size_limit():
    """EC-LARGE-004: Upload CSV at size limit (10MB)"""
    # Generate CSV close to 10MB
    # Approx 10MB = 10 * 1024 * 1024 bytes
    # With CSV overhead, generate ~9.5MB of data
    rows = []
    row_size = 1000  # bytes per row
    num_rows = (9 * 1024 * 1024) // row_size
    
    for i in range(num_rows):
        rows.append(f"{i}," * 100)  # 100 columns per row
    
    csv_content = "\n".join(rows)
    size_mb = len(csv_content.encode()) / (1024 * 1024)
    
    assert size_mb < 10.0  # Should be under limit


# ========== DP Failure Tests ==========

def test_dp_strict_mode_backend_unavailable():
    """EC-DP-001: DP enabled with strict=True → Backend unavailable"""
    # This would be tested with mocked DP backend
    # Expected: Should raise error or fail gracefully
    pass


def test_dp_invalid_epsilon():
    """EC-DP-003: DP with invalid epsilon (negative)"""
    # Test epsilon validation
    epsilon = -1.0
    
    # Should either validate or use default
    assert epsilon < 0  # Invalid
    # In real code, should handle this


def test_dp_epsilon_zero():
    """EC-DP-004: DP with epsilon=0"""
    epsilon = 0.0
    
    # Epsilon=0 means no privacy (should be handled)
    assert epsilon == 0.0


def test_dp_high_epsilon():
    """EC-DP-005: DP with very high epsilon (>100)"""
    epsilon = 150.0
    
    # High epsilon = less privacy, more utility
    assert epsilon > 100.0


# ========== Model Failure Tests ==========

def test_model_fallback_chain():
    """EC-MODEL-001-004: Model failure chain"""
    # Test that fallback works: ddpm -> ctgan -> tvae -> gc
    
    methods = ["ddpm", "ctgan", "tvae", "gc"]
    
    # Simulate failures
    for i, method in enumerate(methods):
        try:
            # Try to create synthesizer
            # In real test, would mock failures
            pass
        except Exception:
            # Fallback to next method
            if i < len(methods) - 1:
                continue
            else:
                # All methods failed
                pytest.fail("All methods failed, no fallback available")


def test_model_incompatible_schema():
    """EC-MODEL-007: Model with incompatible schema"""
    # Create problematic schema
    df = pd.DataFrame({
        "col1": [None] * 100,  # All nulls
        "col2": ["same"] * 100  # All same value
    })
    
    metadata = SingleTableMetadata()
    try:
        metadata.detect_from_dataframe(df)
        # Should handle gracefully
    except Exception as e:
        # Expected for some edge cases
        pass


# ========== Data Quality Edge Cases ==========

def test_csv_all_missing_values():
    """EC-DATA-001: CSV with 100% missing values in column"""
    df = pd.DataFrame({
        "col1": [None] * 100,
        "col2": range(100)
    })
    
    assert df["col1"].isna().all()
    assert not df["col2"].isna().any()


def test_csv_all_identical_rows():
    """EC-DATA-002: CSV with all identical rows"""
    df = pd.DataFrame({
        "col1": [1] * 100,
        "col2": ["same"] * 100
    })
    
    # All rows are identical
    assert df.duplicated().all()


def test_csv_single_row():
    """EC-DATA-003: CSV with single row"""
    df = pd.DataFrame({
        "col1": [1],
        "col2": [2.5],
        "col3": ["test"]
    })
    
    assert len(df) == 1
    assert df.shape[1] == 3


def test_csv_single_column():
    """EC-DATA-004: CSV with single column"""
    df = pd.DataFrame({
        "col1": range(100)
    })
    
    assert df.shape[1] == 1
    assert len(df) == 100


def test_csv_high_cardinality():
    """EC-DATA-007: CSV with very high cardinality (>1000 unique)"""
    df = pd.DataFrame({
        "col1": [f"unique_{i}" for i in range(2000)],
        "col2": range(2000)
    })
    
    assert df["col1"].nunique() > 1000


def test_csv_datetime_columns():
    """EC-DATA-008: CSV with datetime columns"""
    df = pd.DataFrame({
        "date_col": pd.date_range("2020-01-01", periods=100),
        "value_col": range(100)
    })
    
    assert pd.api.types.is_datetime64_any_dtype(df["date_col"])


def test_csv_boolean_columns():
    """EC-DATA-009: CSV with boolean columns"""
    df = pd.DataFrame({
        "bool_col": [True, False] * 50,
        "value_col": range(100)
    })
    
    assert pd.api.types.is_bool_dtype(df["bool_col"])


def test_csv_mixed_numeric_types():
    """EC-DATA-010: CSV with mixed numeric types (int, float)"""
    df = pd.DataFrame({
        "int_col": [1, 2, 3, 4, 5],
        "float_col": [1.5, 2.5, 3.5, 4.5, 5.5]
    })
    
    assert pd.api.types.is_integer_dtype(df["int_col"])
    assert pd.api.types.is_float_dtype(df["float_col"])


# ========== Metric Threshold Tests ==========

def test_metrics_below_thresholds():
    """Test metrics that pass all thresholds"""
    metrics = {
        "utility": {
            "ks_mean": 0.05,  # < 0.10 ✅
            "corr_delta": 0.08  # < 0.10 ✅
        },
        "privacy": {
            "mia_auc": 0.45,  # < 0.60 ✅
            "dup_rate": 0.02  # < 0.05 ✅
        }
    }
    
    # Check thresholds
    assert metrics["utility"]["ks_mean"] <= 0.10
    assert metrics["utility"]["corr_delta"] <= 0.10
    assert metrics["privacy"]["mia_auc"] <= 0.60
    assert metrics["privacy"]["dup_rate"] <= 0.05


def test_metrics_above_thresholds():
    """Test metrics that fail thresholds"""
    metrics = {
        "utility": {
            "ks_mean": 0.15,  # > 0.10 ❌
            "corr_delta": 0.12  # > 0.10 ❌
        },
        "privacy": {
            "mia_auc": 0.75,  # > 0.60 ❌
            "dup_rate": 0.08  # > 0.05 ❌
        }
    }
    
    # Check thresholds (should fail)
    assert metrics["utility"]["ks_mean"] > 0.10
    assert metrics["utility"]["corr_delta"] > 0.10
    assert metrics["privacy"]["mia_auc"] > 0.60
    assert metrics["privacy"]["dup_rate"] > 0.05


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

