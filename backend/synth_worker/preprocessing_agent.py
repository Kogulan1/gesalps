"""
OpenRouter LLM-Powered Preprocessing Agent for Synthetic Data Generation

This module uses OpenRouter LLM to analyze datasets and generate intelligent
preprocessing plans to improve synthetic data quality and achieve "all green" metrics.

Key Features:
- Analyzes dataset schema, statistics, and characteristics
- Generates JSON preprocessing plan (column renaming, transformations, outlier handling)
- Applies preprocessing before model training
- Handles failures gracefully with fallback logic
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
import pandas as pd
import numpy as np

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

logger = logging.getLogger(__name__)

# OpenRouter Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or os.getenv("AGENT_MODEL") or "google/gemma-3-27b-it:free"
OPENROUTER_REFERER = os.getenv("OPENROUTER_REFERER", "https://gesalp.ai")

USE_OPENROUTER = bool(OPENROUTER_API_KEY)


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
                # Extract datetime features for model compatibility
                analysis["issues"].append(f"Column '{col}' is datetime - should extract features (year, month, day) or convert to numeric")
            analysis["column_stats"][col] = stats
        
        # 2. Boolean columns
        elif pd.api.types.is_bool_dtype(col_data):
            stats = {
                "type": "boolean",
                "unique_count": int(col_data.nunique()),
                "missing_count": int(col_data.isna().sum()),
                "missing_rate": float(col_data.isna().mean()) if len(col_data) > 0 else 0.0,
            }
            # Convert boolean to int for model compatibility
            analysis["issues"].append(f"Column '{col}' is boolean - should convert to int (0/1) for model compatibility")
            analysis["column_stats"][col] = stats
        
        # 3. Numeric columns (int, float)
        elif pd.api.types.is_numeric_dtype(col_data):
            # Get valid (non-NaN) values for statistics
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
            
            # Detect issues
            if pd.api.types.is_string_dtype(type(col)) or str(col).replace('.', '').isdigit():
                analysis["issues"].append(f"Column '{col}' has numeric name - may confuse models")
            
            # Check for outliers (using IQR method) - only if we have valid data
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
                except Exception as e:
                    logger.warning(f"Failed to calculate outliers for column '{col}': {e}")
            
            # Check skewness - only if we have valid mean and std
            if stats["std"] is not None and stats["std"] > 0 and stats["mean"] is not None:
                try:
                    # Ensure mean and std are scalars (not Series)
                    mean_val = float(stats["mean"]) if not isinstance(stats["mean"], pd.Series) else float(stats["mean"].iloc[0])
                    std_val = float(stats["std"]) if not isinstance(stats["std"], pd.Series) else float(stats["std"].iloc[0])
                    
                    # Use scipy.stats.skew if available, otherwise calculate manually
                    try:
                        from scipy.stats import skew
                        skew_val = float(skew(valid_data))
                    except ImportError:
                        # Manual skewness calculation
                        if len(valid_data) > 0 and std_val > 0:
                            centered = valid_data - mean_val
                            skew_val = float((centered ** 3).mean() / (std_val ** 3))
                        else:
                            skew_val = None
                    
                    if skew_val is not None and not pd.isna(skew_val):
                        stats["skewness"] = skew_val
                        if abs(skew_val) > 2:
                            analysis["issues"].append(f"Column '{col}' is highly skewed (skew={skew_val:.2f})")
                except Exception as e:
                    logger.warning(f"Failed to calculate skewness for column '{col}': {e}")
            
            analysis["column_stats"][col] = stats
        
        # 4. Categorical/text columns (object, string, category)
        else:
            # Check if it's actually numeric stored as string
            try:
                numeric_test = pd.to_numeric(col_data, errors='coerce')
                if numeric_test.notna().sum() > len(col_data) * 0.8:  # 80%+ are numeric
                    analysis["issues"].append(f"Column '{col}' appears numeric but stored as {dtype} - should convert to numeric")
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
                        analysis["issues"].append(f"Column '{col}' has high cardinality ({col_data.nunique()} unique values) - may need encoding strategy")
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


def generate_preprocessing_prompt(dataset_analysis: Dict[str, Any], previous_ks: Optional[float] = None) -> str:
    """
    Generate the OpenRouter prompt for preprocessing plan generation.
    
    This is the CORE PROMPT that will be sent to OpenRouter LLM.
    
    Args:
        dataset_analysis: Dataset analysis from analyze_dataset_for_preprocessing()
        previous_ks: Previous KS Mean value (if retrying)
        
    Returns:
        Complete prompt string for OpenRouter
    """
    
    # Build dataset summary
    n_rows = dataset_analysis["n_rows"]
    n_cols = dataset_analysis["n_cols"]
    columns = dataset_analysis["columns"]
    issues = dataset_analysis.get("issues", [])
    
    # Build column details
    column_details = []
    for col in columns[:20]:  # Limit to first 20 columns for prompt size
        stats = dataset_analysis["column_stats"].get(col, {})
        dtype = dataset_analysis["data_types"].get(col, "unknown")
        
        detail = f"- '{col}' ({dtype})"
        if stats.get("type") == "numeric":
            # Handle None values properly - convert to 'N/A' string before formatting
            min_val = stats.get('min')
            max_val = stats.get('max')
            mean_val = stats.get('mean')
            std_val = stats.get('std')
            
            min_str = f"{min_val:.2f}" if min_val is not None else "N/A"
            max_str = f"{max_val:.2f}" if max_val is not None else "N/A"
            mean_str = f"{mean_val:.2f}" if mean_val is not None else "N/A"
            std_str = f"{std_val:.2f}" if std_val is not None else "N/A"
            
            detail += f": min={min_str}, max={max_str}, mean={mean_str}, std={std_str}"
            if stats.get("outlier_count", 0) > 0:
                detail += f", {stats.get('outlier_count')} outliers"
            skewness = stats.get("skewness")
            if skewness is not None and abs(skewness) > 2:
                detail += f", skew={skewness:.2f}"
        else:
            detail += f": {stats.get('unique_count', 'N/A')} unique values"
        column_details.append(detail)
    
    if len(columns) > 20:
        column_details.append(f"... and {len(columns) - 20} more columns")
    
    # Build issues summary
    issues_text = "\n".join([f"- {issue}" for issue in issues[:10]]) if issues else "None detected"
    
    # Previous KS context
    ks_context = ""
    if previous_ks:
        ks_context = f"\n\nPREVIOUS ATTEMPT RESULT:\n- KS Mean: {previous_ks:.4f} (threshold: ≤0.10) - FAILED\n- The model failed to learn the distribution properly. Your preprocessing plan must address this."
    
    prompt = f"""You are a data preprocessing expert for synthetic data generation. Your task is to analyze a dataset and create a preprocessing plan that will help a diffusion model (TabDDPM) learn the data distribution effectively and achieve "all green" metrics (KS Mean ≤ 0.10).

RESEARCH-BASED PREPROCESSING STRATEGIES (from arXiv 2504.16506, NeurIPS 2024, ICLR 2023):
- **Quantile Transformation**: For highly skewed distributions (skew > 2), use quantile transform to normal distribution (30-50% KS reduction)
- **Winsorization (1%/99%)**: Clip extreme outliers to 1st and 99th percentiles (prevents distribution collapse)
- **Binary Discretization**: For multimodal distributions, consider discretizing into bins (256 bins) then one-hot encoding (from NeurIPS 2024)
- **Log/Sqrt Transform**: For right-skewed data (skew > 1), apply log1p or sqrt transform
- **Standardization**: For columns with large value ranges, standardize to mean=0, std=1

DATASET INFORMATION:
- Rows: {n_rows}
- Columns: {n_cols}
- Column names: {', '.join(columns[:10])}{'...' if len(columns) > 10 else ''}

COLUMN DETAILS:
{chr(10).join(column_details)}

DETECTED ISSUES:
{issues_text}
{ks_context}

YOUR TASK (UNIVERSAL HANDLER + RESEARCH-BASED):
Generate a JSON preprocessing plan that handles ANY data type and delivers SynthCity-compatible format for "all green" metrics:
1. **Column Renaming**: Rename numeric column names (e.g., '233.0', '2.3') to descriptive names (e.g., 'feature_233', 'measurement_2_3')
2. **Data Type Conversions (UNIVERSAL)**:
   - Datetime → numeric (extract timestamp or features: year, month, day, hour, minute)
   - Boolean → int (0/1) for model compatibility
   - Numeric strings → numeric (convert string numbers to int/float)
   - Ensure categorical columns are properly typed (category dtype)
3. **Outlier Handling (WINSORIZATION)**: Clip extreme values to 1st and 99th percentiles (winsorize_1_99 method) - CRITICAL for preventing distribution collapse
4. **Distribution Normalization (RESEARCH-BASED)**:
   - For highly skewed columns (skew > 2): Use QUANTILE transform (30-50% KS reduction per research)
   - For right-skewed (skew > 1): Use LOG transform (log1p for safety)
   - For multimodal distributions: Consider BINARY DISCRETIZATION (256 bins) then one-hot
   - For large ranges: Use STANDARDIZATION (mean=0, std=1)
5. **Missing Value Handling**: Fill or drop missing values appropriately (mean/median/mode for numeric, mode for categorical)
6. **Categorical Encoding**: Handle high-cardinality categoricals (label encoding, one-hot, or group rare categories)
7. **Feature Engineering**: Any transformations that will help the model learn better
8. **SynthCity Compatibility**: Ensure final output is compatible with SynthCity GenericDataLoader (numeric, categorical, or string only)

OUTPUT FORMAT (JSON only, no markdown, no explanations):
{{
  "column_renames": {{
    "old_name": "new_name",
    ...
  }},
  "outlier_handling": {{
    "column_name": {{
      "method": "clip" | "remove" | "transform",
      "lower_percentile": 0.01,
      "upper_percentile": 0.99
    }},
    ...
  }},
  "transformations": {{
    "column_name": {{
      "method": "quantile" | "log" | "sqrt" | "standardize" | "minmax" | "winsorize_1_99" | "binary_discretize",
      "params": {{}}
    }},
    ...
  }},
  "missing_value_strategy": {{
    "method": "fill_mean" | "fill_median" | "fill_mode" | "drop",
    "columns": ["col1", "col2"]
  }},
  "data_type_corrections": {{
    "column_name": "int64" | "float64" | "category" | "object" | "boolean_to_int" | "datetime_to_numeric",
    ...
  }},
  "datetime_extractions": {{
    "column_name": {{
      "method": "timestamp" | "extract_features",
      "features": ["year", "month", "day", "hour", "minute"]  // if extract_features
    }},
    ...
  }},
  "categorical_encoding": {{
    "column_name": {{
      "method": "one_hot" | "label" | "group_rare" | "target_encoding",
      "max_categories": 50  // for group_rare
    }},
    ...
  }},
  "rationale": "Brief explanation of why these preprocessing steps will help"
}}

CRITICAL REQUIREMENTS (UNIVERSAL HANDLER):
- Column names MUST be renamed if they are numeric (e.g., '233.0' → 'feature_233')
- Handle ALL data types: numeric, categorical, datetime, boolean, mixed types
- Convert datetime to numeric (timestamp or extract features) for model compatibility
- Convert boolean to int (0/1) for model compatibility
- Address any detected issues (outliers, skewness, high cardinality, etc.)
- Handle high-cardinality categoricals (group rare or encode appropriately)
- Keep transformations simple and reversible if possible
- Focus on making the data learnable by diffusion models (TabDDPM)
- Ensure final output is SynthCity-compatible (numeric, categorical, or string only)
- Output ONLY valid JSON, no markdown formatting, no code blocks

Generate the preprocessing plan now:"""

    return prompt


def call_openrouter_for_preprocessing(dataset_analysis: Dict[str, Any], previous_ks: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """
    Call OpenRouter LLM to generate preprocessing plan.
    
    Args:
        dataset_analysis: Dataset analysis from analyze_dataset_for_preprocessing()
        previous_ks: Previous KS Mean value (if retrying)
        
    Returns:
        Preprocessing plan as dictionary, or None if failed
    """
    if not USE_OPENROUTER or not OPENROUTER_API_KEY:
        logger.warning("OpenRouter not available for preprocessing agent")
        return None
    
    system_prompt = """You are a data preprocessing expert specializing in preparing datasets for synthetic data generation using diffusion models. You analyze datasets and generate JSON preprocessing plans that improve model learning and achieve "all green" metrics (KS Mean ≤ 0.10).

You MUST output ONLY valid JSON, no markdown, no explanations, no code blocks. The JSON must be parseable by json.loads()."""
    
    user_prompt = generate_preprocessing_prompt(dataset_analysis, previous_ks)
    
    # PHASE 1 FIX: gemma-3-27b-it doesn't support system prompts OR response_format
    is_gemma = "gemma" in OPENROUTER_MODEL.lower()
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            # Some models (e.g., gemma-3-27b-it) don't support system prompts
            # Merge system prompt into user prompt for compatibility
            {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
        ] if is_gemma else [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent JSON
        "max_tokens": 2000,
    }
    
    # PHASE 1 FIX: Don't use response_format for gemma models (not supported)
    if not is_gemma:
        payload["response_format"] = {"type": "json_object"}  # Request JSON format
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": "Gesalp AI Synthetic Data Generator - Preprocessing Agent",
    }
    
    try:
        with httpx.Client(timeout=90) as client:
            response = client.post(
                f"{OPENROUTER_BASE}/chat/completions",
                json=payload,
                headers=headers
            )
            
            # PHASE 1 FIX: Handle 400 errors before raise_for_status()
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", "Unknown error")
                    logger.warning(f"OpenRouter API 400 error: {error_msg}")
                    
                    # If it's a response_format or system prompt issue, try without those
                    if "instruction" in error_msg.lower() or "response_format" in error_msg.lower() or "developer instruction" in error_msg.lower():
                        logger.info("Retrying OpenRouter call without response_format and with merged prompts...")
                        # Retry with minimal payload (no response_format, merged prompts)
                        retry_payload = {
                            "model": OPENROUTER_MODEL,
                            "messages": [{"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}],
                            "temperature": 0.3,
                            "max_tokens": 2000,
                        }
                        response = client.post(
                            f"{OPENROUTER_BASE}/chat/completions",
                            json=retry_payload,
                            headers=headers
                        )
                        if response.status_code != 200:
                            logger.error(f"OpenRouter retry also failed with status {response.status_code}")
                            return None
                except Exception as retry_error:
                    logger.error(f"Failed to handle 400 error or retry: {type(retry_error).__name__}: {retry_error}")
                    return None
            
            response.raise_for_status()
            output = response.json()
            
            # Extract JSON from response
            text = output["choices"][0]["message"]["content"]
            
            # Parse JSON
            try:
                plan = json.loads(text)
            except json.JSONDecodeError:
                # Try to extract JSON from text if not pure JSON
                import re
                match = re.search(r"\{.*\}", text, re.DOTALL)
                if match:
                    plan = json.loads(match.group(0))
                else:
                    logger.error(f"OpenRouter returned non-JSON response: {text[:200]}")
                    return None
            
            return plan
            
    except httpx.HTTPStatusError as e:
        # PHASE 1 FIX: Handle HTTP status errors
        logger.error(f"OpenRouter HTTP error {e.response.status_code}: {e.response.text[:200] if hasattr(e.response, 'text') else str(e)}")
        return None
    except Exception as e:
        logger.error(f"OpenRouter preprocessing call failed: {type(e).__name__}: {e}")
        import traceback
        logger.debug(f"OpenRouter traceback: {traceback.format_exc()[:300]}")
        return None


def apply_preprocessing_plan(df: pd.DataFrame, plan: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Apply preprocessing plan to DataFrame.
    
    Args:
        df: Original DataFrame
        plan: Preprocessing plan from OpenRouter
        
    Returns:
        Tuple of (preprocessed DataFrame, applied steps log)
    """
    result_df = df.copy()
    applied_steps = []
    
    try:
        # 1. Column renaming
        if "column_renames" in plan and isinstance(plan["column_renames"], dict):
            renames = {k: v for k, v in plan["column_renames"].items() if k in result_df.columns}
            if renames:
                result_df = result_df.rename(columns=renames)
                applied_steps.append(f"Renamed {len(renames)} columns: {list(renames.keys())[:3]}...")
        
        # 2. Data type corrections
        if "data_type_corrections" in plan and isinstance(plan["data_type_corrections"], dict):
            for col, dtype in plan["data_type_corrections"].items():
                if col in result_df.columns:
                    try:
                        if dtype == "int64":
                            result_df[col] = pd.to_numeric(result_df[col], errors='coerce').astype('Int64')
                        elif dtype == "float64":
                            result_df[col] = pd.to_numeric(result_df[col], errors='coerce').astype(float)
                        elif dtype == "category":
                            result_df[col] = result_df[col].astype('category')
                        applied_steps.append(f"Converted '{col}' to {dtype}")
                    except Exception as e:
                        logger.warning(f"Failed to convert '{col}' to {dtype}: {e}")
        
        # 3. Missing value handling
        if "missing_value_strategy" in plan and isinstance(plan["missing_value_strategy"], dict):
            strategy = plan["missing_value_strategy"]
            method = strategy.get("method")
            columns = strategy.get("columns", result_df.columns.tolist())
            
            for col in columns:
                if col in result_df.columns and result_df[col].isna().any():
                    try:
                        if method == "fill_mean" and pd.api.types.is_numeric_dtype(result_df[col]):
                            # Get valid (non-NaN) values for mean calculation
                            valid_values = result_df[col].dropna()
                            if len(valid_values) > 0:
                                mean_val = float(valid_values.mean())
                                result_df[col].fillna(mean_val, inplace=True)
                                applied_steps.append(f"Filled missing values in '{col}' with mean")
                            else:
                                logger.warning(f"Cannot fill '{col}' with mean: no valid values")
                        elif method == "fill_median" and pd.api.types.is_numeric_dtype(result_df[col]):
                            # Get valid (non-NaN) values for median calculation
                            valid_values = result_df[col].dropna()
                            if len(valid_values) > 0:
                                median_val = float(valid_values.median())
                                result_df[col].fillna(median_val, inplace=True)
                                applied_steps.append(f"Filled missing values in '{col}' with median")
                            else:
                                logger.warning(f"Cannot fill '{col}' with median: no valid values")
                        elif method == "fill_mode":
                            # Get valid (non-NaN) values for mode calculation
                            valid_values = result_df[col].dropna()
                            if len(valid_values) > 0:
                                mode_val = valid_values.mode()
                                if len(mode_val) > 0:
                                    result_df[col].fillna(mode_val.iloc[0], inplace=True)
                                    applied_steps.append(f"Filled missing values in '{col}' with mode")
                                else:
                                    logger.warning(f"Cannot fill '{col}' with mode: no mode found")
                            else:
                                logger.warning(f"Cannot fill '{col}' with mode: no valid values")
                        elif method == "drop":
                            result_df = result_df.dropna(subset=[col])
                            applied_steps.append(f"Dropped rows with missing values in '{col}'")
                    except Exception as e:
                        logger.warning(f"Failed to handle missing values in '{col}' with method '{method}': {type(e).__name__}: {e}")
        
        # 4. Outlier handling
        if "outlier_handling" in plan and isinstance(plan["outlier_handling"], dict):
            for col, config in plan["outlier_handling"].items():
                if col in result_df.columns and pd.api.types.is_numeric_dtype(result_df[col]):
                    try:
                        # Get valid (non-NaN) values for percentile calculation
                        valid_values = result_df[col].dropna()
                        if len(valid_values) == 0:
                            logger.warning(f"Cannot handle outliers in '{col}': no valid values")
                            continue
                        
                        method = config.get("method", "clip")
                        lower_p = config.get("lower_percentile", 0.01)
                        upper_p = config.get("upper_percentile", 0.99)
                        
                        if method == "clip":
                            lower_val = float(valid_values.quantile(lower_p))
                            upper_val = float(valid_values.quantile(upper_p))
                            clipped_count = ((result_df[col] < lower_val) | (result_df[col] > upper_val)).sum()
                            result_df[col] = result_df[col].clip(lower=lower_val, upper=upper_val)
                            applied_steps.append(f"Clipped {clipped_count} outliers in '{col}' ({lower_p}-{upper_p} percentiles)")
                        elif method == "remove":
                            lower_val = float(valid_values.quantile(lower_p))
                            upper_val = float(valid_values.quantile(upper_p))
                            before = len(result_df)
                            result_df = result_df[(result_df[col] >= lower_val) & (result_df[col] <= upper_val)]
                            removed = before - len(result_df)
                            applied_steps.append(f"Removed {removed} rows with outliers in '{col}'")
                    except Exception as e:
                        logger.warning(f"Failed to handle outliers in '{col}': {type(e).__name__}: {e}")
        
        # 5. Transformations
        if "transformations" in plan and isinstance(plan["transformations"], dict):
            try:
                from sklearn.preprocessing import QuantileTransformer, StandardScaler, MinMaxScaler
                SKLEARN_AVAILABLE = True
            except ImportError:
                SKLEARN_AVAILABLE = False
                logger.warning("sklearn not available for transformations")
            
            for col, config in plan["transformations"].items():
                if col in result_df.columns and pd.api.types.is_numeric_dtype(result_df[col]):
                    method = config.get("method")
                    
                    try:
                        if method == "quantile" and SKLEARN_AVAILABLE:
                            # Get valid (non-NaN) values for transformation
                            valid_mask = result_df[col].notna()
                            if valid_mask.sum() > 0:
                                transformer = QuantileTransformer(output_distribution='normal', n_quantiles=min(1000, valid_mask.sum()))
                                result_df.loc[valid_mask, col] = transformer.fit_transform(result_df.loc[valid_mask, [col]]).flatten()
                                applied_steps.append(f"Applied quantile transformation to '{col}'")
                            else:
                                logger.warning(f"Cannot apply quantile transformation to '{col}': no valid values")
                        elif method == "log":
                            # Log transform (handle zeros/negatives)
                            valid_values = result_df[col].dropna()
                            if len(valid_values) > 0:
                                min_val = float(valid_values.min())
                                if min_val <= 0:
                                    result_df[col] = np.log1p(result_df[col] - min_val + 1)
                                else:
                                    result_df[col] = np.log(result_df[col].clip(lower=1e-10))  # Avoid log(0)
                                applied_steps.append(f"Applied log transformation to '{col}'")
                            else:
                                logger.warning(f"Cannot apply log transformation to '{col}': no valid values")
                        elif method == "sqrt":
                            # Sqrt transform (handle negatives)
                            valid_values = result_df[col].dropna()
                            if len(valid_values) > 0:
                                min_val = float(valid_values.min())
                                if min_val < 0:
                                    result_df[col] = np.sqrt(result_df[col] - min_val)
                                else:
                                    result_df[col] = np.sqrt(result_df[col])
                                applied_steps.append(f"Applied sqrt transformation to '{col}'")
                            else:
                                logger.warning(f"Cannot apply sqrt transformation to '{col}': no valid values")
                        elif method == "standardize" and SKLEARN_AVAILABLE:
                            # Get valid (non-NaN) values for standardization
                            valid_mask = result_df[col].notna()
                            if valid_mask.sum() > 0:
                                scaler = StandardScaler()
                                result_df.loc[valid_mask, col] = scaler.fit_transform(result_df.loc[valid_mask, [col]]).flatten()
                                applied_steps.append(f"Standardized '{col}'")
                            else:
                                logger.warning(f"Cannot standardize '{col}': no valid values")
                        elif method == "minmax" and SKLEARN_AVAILABLE:
                            # Get valid (non-NaN) values for min-max scaling
                            valid_mask = result_df[col].notna()
                            if valid_mask.sum() > 0:
                                scaler = MinMaxScaler()
                                result_df.loc[valid_mask, col] = scaler.fit_transform(result_df.loc[valid_mask, [col]]).flatten()
                                applied_steps.append(f"Applied min-max scaling to '{col}'")
                            else:
                                logger.warning(f"Cannot apply min-max scaling to '{col}': no valid values")
                    except Exception as e:
                        logger.warning(f"Failed to apply transformation '{method}' to '{col}': {type(e).__name__}: {e}")
        
    except Exception as e:
        logger.error(f"Error applying preprocessing plan: {type(e).__name__}: {e}")
        import traceback
        logger.debug(f"Preprocessing error traceback: {traceback.format_exc()}")
        # Return original DataFrame if preprocessing fails
        return df, {"error": str(e), "applied_steps": applied_steps}
    
    # FINAL VALIDATION: Ensure output is compatible with SynthCity GenericDataLoader
    # SynthCity requires: numeric (int/float), categorical (category), or string (object)
    try:
        for col in result_df.columns:
            col_data = result_df[col]
            # Convert any remaining incompatible types
            if pd.api.types.is_datetime64_any_dtype(col_data):
                # Convert datetime to numeric timestamp
                result_df[col] = col_data.astype('int64') / 1e9
                applied_steps.append(f"Final conversion: '{col}' datetime → numeric timestamp")
            elif pd.api.types.is_bool_dtype(col_data):
                # Convert boolean to int
                result_df[col] = col_data.astype(int).astype('Int64')
                applied_steps.append(f"Final conversion: '{col}' boolean → int")
            elif pd.api.types.is_numeric_dtype(col_data):
                # Ensure numeric columns are float or Int64 (nullable int)
                if col_data.dtype in ['int64', 'int32', 'int16', 'int8']:
                    result_df[col] = col_data.astype('Int64')  # Nullable int
                elif col_data.dtype not in ['float64', 'float32']:
                    result_df[col] = pd.to_numeric(col_data, errors='coerce').astype(float)
            else:
                # Ensure object columns are string or category
                if col_data.dtype != 'category':
                    # Check if it should be categorical (low cardinality)
                    if col_data.nunique() < len(col_data) * 0.5 and col_data.nunique() < 100:
                        result_df[col] = col_data.astype('category')
                    else:
                        result_df[col] = col_data.astype(str)
    except Exception as e:
        logger.warning(f"Final validation/conversion failed: {type(e).__name__}: {e}")
    
    return result_df, {"applied_steps": applied_steps, "rationale": plan.get("rationale", "")}


def get_preprocessing_plan(df: pd.DataFrame, previous_ks: Optional[float] = None) -> Tuple[Optional[pd.DataFrame], Optional[Dict[str, Any]]]:
    """
    Main function: Get preprocessing plan from OpenRouter and apply it.
    
    Args:
        df: Original DataFrame
        previous_ks: Previous KS Mean value (if retrying)
        
    Returns:
        Tuple of (preprocessed DataFrame, preprocessing metadata)
        Returns (None, None) if preprocessing fails or OpenRouter unavailable
    """
    if not USE_OPENROUTER:
        logger.info("OpenRouter not available - skipping preprocessing agent")
        return None, None
    
    try:
        # Analyze dataset
        analysis = analyze_dataset_for_preprocessing(df)
        
        # Call OpenRouter for preprocessing plan
        plan = call_openrouter_for_preprocessing(analysis, previous_ks)
        
        if not plan:
            logger.warning("OpenRouter did not return preprocessing plan")
            return None, None
        
        # Apply preprocessing plan
        preprocessed_df, metadata = apply_preprocessing_plan(df, plan)
        
        return preprocessed_df, {
            "plan": plan,
            "metadata": metadata,
            "original_shape": df.shape,
            "preprocessed_shape": preprocessed_df.shape,
        }
        
    except Exception as e:
        logger.error(f"Preprocessing agent failed: {type(e).__name__}: {e}", exc_info=True)
        import traceback
        logger.debug(f"Preprocessing agent traceback: {traceback.format_exc()}")
        return None, None
