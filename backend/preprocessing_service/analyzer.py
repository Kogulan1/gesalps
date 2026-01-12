"""
Dataset Analyzer Module
Analyzes datasets and generates statistics for preprocessing plan generation.
"""

import pandas as pd
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def analyze_dataset_for_preprocessing(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze dataset and generate statistics for preprocessing agent.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        Dictionary with dataset statistics and characteristics
    """
    analysis = {
        "n_rows": len(df),
        "n_cols": len(df.columns),
        "columns": list(df.columns),
        "column_stats": {},
        "data_types": {},
        "issues": [],
    }
    
    for col in df.columns:
        col_data = df[col]
        dtype = str(col_data.dtype)
        analysis["data_types"][col] = dtype
        
        # UNIVERSAL HANDLER: Detect and handle all data types
        
        # 1. Datetime columns
        if pd.api.types.is_datetime64_any_dtype(col_data):
            valid_data = col_data.dropna()
            stats = {
                "type": "datetime",
                "unique_count": int(col_data.nunique()),
                "missing_count": int(col_data.isna().sum()),
                "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
            }
            if len(valid_data) > 0:
                stats["min"] = str(valid_data.min())
                stats["max"] = str(valid_data.max())
                analysis["issues"].append(
                    f"Column '{col}' is datetime - should extract features (year, month, day) or convert to numeric"
                )
            analysis["column_stats"][col] = stats
        
        # 2. Boolean columns
        elif pd.api.types.is_bool_dtype(col_data):
            stats = {
                "type": "boolean",
                "unique_count": int(col_data.nunique()),
                "missing_count": int(col_data.isna().sum()),
                "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
            }
            analysis["issues"].append(
                f"Column '{col}' is boolean - should convert to int (0/1) for model compatibility"
            )
            analysis["column_stats"][col] = stats
        
        # 3. Numeric columns (int, float)
        elif pd.api.types.is_numeric_dtype(col_data):
            valid_data = col_data.dropna()
            
            stats = {
                "type": "numeric",
                "min": float(valid_data.min()) if len(valid_data) > 0 else None,
                "max": float(valid_data.max()) if len(valid_data) > 0 else None,
                "mean": float(valid_data.mean()) if len(valid_data) > 0 else None,
                "std": float(valid_data.std()) if len(valid_data) > 0 else None,
                "median": float(valid_data.median()) if len(valid_data) > 0 else None,
                "unique_count": int(col_data.nunique()),
                "missing_count": int(col_data.isna().sum()),
                "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
            }
            
            # Detect numeric column names (e.g., '233.0', '2.3')
            col_str = str(col)
            if col_str.replace('.', '').replace('-', '').isdigit():
                analysis["issues"].append(
                    f"Column '{col}' has numeric name - may confuse models, should rename"
                )
            
            # Check for outliers (using IQR method)
            if len(valid_data) > 0:
                try:
                    q1 = valid_data.quantile(0.25)
                    q3 = valid_data.quantile(0.75)
                    iqr = q3 - q1
                    if iqr > 0 and not pd.isna(iqr):
                        outliers = ((valid_data < (q1 - 1.5 * iqr)) | (valid_data > (q3 + 1.5 * iqr))).sum()
                        if outliers > 0:
                            stats["outlier_count"] = int(outliers)
                            stats["outlier_rate"] = float(outliers / len(valid_data))
                            if stats["outlier_rate"] > 0.05:  # >5% outliers
                                analysis["issues"].append(
                                    f"Column '{col}' has {outliers} outliers ({stats['outlier_rate']*100:.1f}%) - consider winsorization"
                                )
                except Exception as e:
                    logger.warning(f"Failed to calculate outliers for column '{col}': {e}")
            
            # Check skewness
            if stats["std"] is not None and stats["std"] > 0 and stats["mean"] is not None:
                try:
                    from scipy.stats import skew
                    skew_val = float(skew(valid_data))
                    if skew_val is not None and not pd.isna(skew_val):
                        stats["skewness"] = skew_val
                        if abs(skew_val) > 2:
                            analysis["issues"].append(
                                f"Column '{col}' is highly skewed (skew={skew_val:.2f}) - consider quantile/log transform"
                            )
                        elif abs(skew_val) > 1:
                            analysis["issues"].append(
                                f"Column '{col}' is moderately skewed (skew={skew_val:.2f}) - consider log transform"
                            )
                except ImportError:
                    # Manual skewness calculation if scipy not available
                    if len(valid_data) > 0 and stats["std"] > 0:
                        mean_val = float(stats["mean"])
                        std_val = float(stats["std"])
                        centered = valid_data - mean_val
                        skew_val = float((centered ** 3).mean() / (std_val ** 3))
                        if skew_val is not None and not pd.isna(skew_val):
                            stats["skewness"] = skew_val
                            if abs(skew_val) > 2:
                                analysis["issues"].append(
                                    f"Column '{col}' is highly skewed (skew={skew_val:.2f}) - consider quantile/log transform"
                                )
                except Exception as e:
                    logger.warning(f"Failed to calculate skewness for column '{col}': {e}")
            
            analysis["column_stats"][col] = stats
        
        # 4. Categorical/text columns (object, string, category)
        else:
            # Check if it's actually numeric stored as string
            try:
                numeric_test = pd.to_numeric(col_data, errors='coerce')
                if numeric_test.notna().sum() > len(col_data) * 0.8:  # 80%+ are numeric
                    analysis["issues"].append(
                        f"Column '{col}' appears numeric but stored as {dtype} - should convert to numeric"
                    )
                    stats = {
                        "type": "numeric_string",
                        "unique_count": int(col_data.nunique()),
                        "missing_count": int(col_data.isna().sum()),
                        "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
                    }
                else:
                    # True categorical/text
                    is_categorical = col_data.nunique() < len(col_data) * 0.5 and col_data.nunique() < 100
                    stats = {
                        "type": "categorical" if is_categorical else "text",
                        "unique_count": int(col_data.nunique()),
                        "missing_count": int(col_data.isna().sum()),
                        "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
                    }
                    # High cardinality categorical warning
                    if col_data.nunique() > 50 and col_data.nunique() < len(col_data) * 0.5:
                        analysis["issues"].append(
                            f"Column '{col}' has high cardinality ({col_data.nunique()} unique values) - may need encoding strategy"
                        )
            except Exception as e:
                # Fallback: treat as categorical/text
                stats = {
                    "type": "categorical" if col_data.nunique() < len(col_data) * 0.5 else "text",
                    "unique_count": int(col_data.nunique()),
                    "missing_count": int(col_data.isna().sum()),
                    "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
                }
            
            analysis["column_stats"][col] = stats
    
    return analysis
