"""
Smart preprocessing module using OpenRouter LLM to detect and fix data quality issues.

This module automatically:
- Detects numeric column names (e.g., '233.0')
- Identifies skewed distributions
- Detects feature collapse
- Suggests transformations (renaming, quantile/log transforms, outlier handling)
"""

import os
import json
import logging
from typing import Any, Dict, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats
import httpx

logger = logging.getLogger(__name__)

# OpenRouter configuration (reuse from worker.py env vars)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or os.getenv("AGENT_MODEL") or "mistralai/mistral-small-24b-instruct:free"
USE_OPENROUTER = bool(OPENROUTER_API_KEY)

# Ollama fallback
OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL") or os.getenv("AGENT_MODEL") or "llama3.1:8b"


def _compute_dataset_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute statistical summary of dataset for LLM analysis."""
    stats_dict = {
        "n_rows": len(df),
        "n_cols": len(df.columns),
        "columns": []
    }
    
    for col in df.columns:
        col_info = {
            "name": str(col),
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isna().sum()),
            "null_pct": float(df[col].isna().sum() / len(df) * 100) if len(df) > 0 else 0.0,
        }
        
        # Numeric columns
        if pd.api.types.is_numeric_dtype(df[col]):
            col_info["type"] = "numeric"
            col_info["mean"] = float(df[col].mean()) if not df[col].isna().all() else None
            col_info["std"] = float(df[col].std()) if not df[col].isna().all() else None
            col_info["min"] = float(df[col].min()) if not df[col].isna().all() else None
            col_info["max"] = float(df[col].max()) if not df[col].isna().all() else None
            col_info["median"] = float(df[col].median()) if not df[col].isna().all() else None
            
            # Check for skewness
            try:
                col_info["skewness"] = float(stats.skew(df[col].dropna()))
            except Exception:
                col_info["skewness"] = None
            
            # Check for constant/zero variance
            col_info["is_constant"] = df[col].nunique() <= 1
            col_info["n_unique"] = int(df[col].nunique())
            
            # Check if column name is numeric (problematic)
            try:
                float(str(col))
                col_info["name_is_numeric"] = True
            except ValueError:
                col_info["name_is_numeric"] = False
        else:
            # Categorical columns
            col_info["type"] = "categorical"
            col_info["n_unique"] = int(df[col].nunique())
            col_info["is_constant"] = df[col].nunique() <= 1
            col_info["top_value"] = str(df[col].mode().iloc[0]) if len(df[col].mode()) > 0 else None
            col_info["top_value_count"] = int(df[col].value_counts().iloc[0]) if len(df[col].value_counts()) > 0 else None
            
            # Check if column name is numeric
            try:
                float(str(col))
                col_info["name_is_numeric"] = True
            except ValueError:
                col_info["name_is_numeric"] = False
        
        stats_dict["columns"].append(col_info)
    
    return stats_dict


def _call_openrouter_preprocessing(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call OpenRouter API for preprocessing plan generation."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not set")
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,  # Lower temperature for more consistent JSON
        "max_tokens": 3000,
        "response_format": {"type": "json_object"},  # Request JSON format
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://gesalp.ai"),
        "X-Title": "Gesalp AI Synthetic Data Generator",
    }
    
    try:
        with httpx.Client(timeout=90) as client:
            response = client.post(
                f"{OPENROUTER_BASE}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            output = response.json()
            text = output["choices"][0]["message"]["content"]
            
            # Parse JSON response
            plan = json.loads(text)
            return plan
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenRouter API HTTP error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"OpenRouter API call failed: {e}")
        raise


def _call_ollama_preprocessing(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call Ollama API for preprocessing plan generation (fallback)."""
    prompt = f"System:\n{system_prompt}\n\nUser:\n{user_prompt}\n"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json"  # Request JSON format
    }
    
    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{OLLAMA_BASE}/api/generate",
                json=payload
            )
            response.raise_for_status()
            output = response.json()
            text = output.get("response", "{}")
            
            # Parse JSON response
            plan = json.loads(text)
            return plan
    except Exception as e:
        logger.error(f"Ollama API call failed: {e}")
        raise


def get_preprocessing_plan(df: pd.DataFrame, dataset_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Get preprocessing plan from LLM based on dataset statistics.
    
    Args:
        df: Input DataFrame
        dataset_name: Optional dataset name for context
    
    Returns:
        Dictionary with preprocessing plan containing:
        - column_renames: Dict[str, str] - mapping old_name -> new_name
        - transformations: List[Dict] - list of transformation operations
        - rationale: str - explanation of suggested changes
    """
    # Compute dataset statistics
    stats_dict = _compute_dataset_stats(df)
    
    # Build prompts
    system_prompt = """You are a data preprocessing expert specializing in synthetic data generation.
Your goal is to identify and fix data quality issues that prevent good synthetic data generation.

Common issues to detect:
1. Numeric column names (e.g., '233.0', '42') - rename to meaningful names
2. Highly skewed distributions - suggest log/quantile transforms
3. Feature collapse (constant or near-constant columns) - flag for removal or transformation
4. Outliers - suggest clipping or winsorization
5. Missing values - suggest imputation strategies

Return a JSON object with this structure:
{
  "column_renames": {"old_name": "new_name", ...},
  "transformations": [
    {
      "column": "column_name",
      "type": "log_transform" | "quantile_transform" | "clip" | "winsorize" | "remove" | "impute",
      "params": {...}  // type-specific parameters
    }
  ],
  "rationale": "Explanation of why these changes improve synthetic data quality"
}

Only suggest transformations that will improve KS Mean and overall data quality.
Be conservative - only suggest changes that are clearly beneficial."""

    user_prompt = f"""Dataset: {dataset_name or 'unnamed'}
Statistics:
{json.dumps(stats_dict, indent=2)}

Analyze this dataset and provide a preprocessing plan to improve synthetic data generation quality.
Focus on issues that cause high KS Mean (distribution mismatch) or poor model training.

Return the preprocessing plan as JSON."""

    # Call LLM
    try:
        if USE_OPENROUTER:
            plan = _call_openrouter_preprocessing(system_prompt, user_prompt)
        else:
            plan = _call_ollama_preprocessing(system_prompt, user_prompt)
        
        # Validate plan structure
        if not isinstance(plan, dict):
            raise ValueError("LLM returned non-dict response")
        
        # Ensure required keys exist
        plan.setdefault("column_renames", {})
        plan.setdefault("transformations", [])
        plan.setdefault("rationale", "No rationale provided")
        
        return plan
    except Exception as e:
        logger.warning(f"Failed to get preprocessing plan from LLM: {e}")
        raise


def apply_preprocessing_plan(df: pd.DataFrame, plan: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Apply preprocessing plan to DataFrame.
    
    Args:
        df: Input DataFrame
        plan: Preprocessing plan from get_preprocessing_plan()
    
    Returns:
        Tuple of (preprocessed_df, applied_operations_log)
    """
    # Safety check: ensure DataFrame is not empty
    if df.empty:
        logger.warning("DataFrame is empty, skipping preprocessing")
        return df, {"applied_operations": [], "error": "empty_dataframe"}
    
    df_out = df.copy()
    applied_ops = []
    
    # Step 1: Rename columns
    column_renames = plan.get("column_renames", {})
    if not isinstance(column_renames, dict):
        logger.warning("column_renames is not a dict, skipping renames")
        column_renames = {}
    
    rename_mapping = {}
    for old_name, new_name in column_renames.items():
        if old_name in df_out.columns:
            # Validate new name doesn't already exist
            if new_name not in df_out.columns:
                # Validate new name is a valid string
                if isinstance(new_name, str) and len(new_name.strip()) > 0:
                    rename_mapping[old_name] = new_name.strip()
                    applied_ops.append({
                        "operation": "rename",
                        "old_name": old_name,
                        "new_name": new_name.strip()
                    })
                else:
                    logger.warning(f"Invalid new name for {old_name}: {new_name}")
            else:
                logger.warning(f"Skipping rename {old_name} -> {new_name}: target name already exists")
    
    if rename_mapping:
        df_out = df_out.rename(columns=rename_mapping)
    
    # Step 2: Apply transformations
    transformations = plan.get("transformations", [])
    for trans in transformations:
        col_name = trans.get("column")
        trans_type = trans.get("type")
        params = trans.get("params", {})
        
        if col_name not in df_out.columns:
            logger.warning(f"Skipping transformation on {col_name}: column not found")
            continue
        
        try:
            if trans_type == "remove":
                df_out = df_out.drop(columns=[col_name])
                applied_ops.append({
                    "operation": "remove",
                    "column": col_name
                })
            
            elif trans_type == "log_transform":
                # Apply log transform (handle zeros/negatives)
                if pd.api.types.is_numeric_dtype(df_out[col_name]):
                    # Shift to positive values if needed
                    min_val = df_out[col_name].min()
                    if min_val <= 0:
                        shift = abs(min_val) + 1
                        df_out[col_name] = df_out[col_name] + shift
                    df_out[col_name] = np.log1p(df_out[col_name])
                    applied_ops.append({
                        "operation": "log_transform",
                        "column": col_name
                    })
            
            elif trans_type == "quantile_transform":
                # Apply quantile transform (normalize distribution)
                if pd.api.types.is_numeric_dtype(df_out[col_name]):
                    try:
                        from sklearn.preprocessing import QuantileTransformer
                        qt = QuantileTransformer(output_distribution='normal', random_state=42)
                        df_out[col_name] = qt.fit_transform(df_out[[col_name]]).flatten()
                        applied_ops.append({
                            "operation": "quantile_transform",
                            "column": col_name
                        })
                    except ImportError:
                        logger.warning(f"sklearn not available, skipping quantile_transform on {col_name}")
                        # Fallback to log transform
                        min_val = df_out[col_name].min()
                        if min_val <= 0:
                            shift = abs(min_val) + 1
                            df_out[col_name] = df_out[col_name] + shift
                        df_out[col_name] = np.log1p(df_out[col_name])
                        applied_ops.append({
                            "operation": "log_transform",
                            "column": col_name,
                            "fallback_from": "quantile_transform"
                        })
            
            elif trans_type == "clip":
                # Clip outliers
                if pd.api.types.is_numeric_dtype(df_out[col_name]):
                    lower = params.get("lower", df_out[col_name].quantile(0.01))
                    upper = params.get("upper", df_out[col_name].quantile(0.99))
                    df_out[col_name] = df_out[col_name].clip(lower=lower, upper=upper)
                    applied_ops.append({
                        "operation": "clip",
                        "column": col_name,
                        "lower": lower,
                        "upper": upper
                    })
            
            elif trans_type == "winsorize":
                # Winsorize (clip to percentiles)
                if pd.api.types.is_numeric_dtype(df_out[col_name]):
                    lower_pct = params.get("lower_percentile", 0.01)
                    upper_pct = params.get("upper_percentile", 0.99)
                    lower = df_out[col_name].quantile(lower_pct)
                    upper = df_out[col_name].quantile(upper_pct)
                    df_out[col_name] = df_out[col_name].clip(lower=lower, upper=upper)
                    applied_ops.append({
                        "operation": "winsorize",
                        "column": col_name,
                        "lower_percentile": lower_pct,
                        "upper_percentile": upper_pct
                    })
            
            elif trans_type == "impute":
                # Impute missing values
                strategy = params.get("strategy", "mean")
                if pd.api.types.is_numeric_dtype(df_out[col_name]):
                    if strategy == "mean":
                        df_out[col_name] = df_out[col_name].fillna(df_out[col_name].mean())
                    elif strategy == "median":
                        df_out[col_name] = df_out[col_name].fillna(df_out[col_name].median())
                    elif strategy == "mode":
                        df_out[col_name] = df_out[col_name].fillna(df_out[col_name].mode().iloc[0] if len(df_out[col_name].mode()) > 0 else 0)
                else:
                    # Categorical: use mode
                    df_out[col_name] = df_out[col_name].fillna(df_out[col_name].mode().iloc[0] if len(df_out[col_name].mode()) > 0 else "unknown")
                
                applied_ops.append({
                    "operation": "impute",
                    "column": col_name,
                    "strategy": strategy
                })
            
            else:
                logger.warning(f"Unknown transformation type: {trans_type}")
        
        except Exception as e:
            logger.warning(f"Failed to apply transformation {trans_type} on {col_name}: {e}")
            continue
    
    return df_out, {"applied_operations": applied_ops, "plan_rationale": plan.get("rationale", "")}


def basic_fallback_preprocessing(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Basic fallback preprocessing when LLM fails.
    
    Automatically:
    - Rename numeric column names to 'col_<number>'
    - Remove constant columns
    """
    df_out = df.copy()
    applied_ops = []
    
    # Rename numeric columns
    rename_mapping = {}
    for col in df_out.columns:
        try:
            # Check if column name is numeric
            float(str(col))
            new_name = f"col_{col}"
            # Ensure uniqueness
            counter = 1
            while new_name in df_out.columns or new_name in rename_mapping.values():
                new_name = f"col_{col}_{counter}"
                counter += 1
            rename_mapping[col] = new_name
            applied_ops.append({
                "operation": "rename",
                "old_name": str(col),
                "new_name": new_name,
                "reason": "numeric_column_name"
            })
        except ValueError:
            pass
    
    if rename_mapping:
        df_out = df_out.rename(columns=rename_mapping)
    
    # Remove constant columns
    constant_cols = []
    for col in df_out.columns:
        if df_out[col].nunique() <= 1:
            constant_cols.append(col)
            applied_ops.append({
                "operation": "remove",
                "column": col,
                "reason": "constant_column"
            })
    
    if constant_cols:
        df_out = df_out.drop(columns=constant_cols)
    
    return df_out, {"applied_operations": applied_ops, "fallback": True}


def smart_preprocess(
    df: pd.DataFrame,
    dataset_name: Optional[str] = None,
    enable_smart_preprocess: bool = True,
    fallback_on_error: bool = True
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Main entry point for smart preprocessing.
    
    Args:
        df: Input DataFrame
        dataset_name: Optional dataset name
        enable_smart_preprocess: Whether to use LLM-based preprocessing
        fallback_on_error: Whether to use basic preprocessing if LLM fails
    
    Returns:
        Tuple of (preprocessed_df, metadata_dict)
    """
    metadata = {
        "preprocessing_enabled": enable_smart_preprocess,
        "preprocessing_method": None,
        "applied_operations": [],
        "plan_rationale": None
    }
    
    if not enable_smart_preprocess:
        return df, metadata
    
    try:
        # Get preprocessing plan from LLM
        plan = get_preprocessing_plan(df, dataset_name)
        metadata["preprocessing_method"] = "llm"
        metadata["plan_rationale"] = plan.get("rationale")
        
        # Apply plan
        df_preprocessed, apply_metadata = apply_preprocessing_plan(df, plan)
        metadata["applied_operations"] = apply_metadata["applied_operations"]
        
        logger.info(f"Smart preprocessing applied: {len(metadata['applied_operations'])} operations")
        return df_preprocessed, metadata
    
    except Exception as e:
        logger.warning(f"Smart preprocessing failed: {e}")
        metadata["preprocessing_error"] = str(e)
        
        if fallback_on_error:
            # Use basic fallback
            df_preprocessed, fallback_metadata = basic_fallback_preprocessing(df)
            metadata["preprocessing_method"] = "fallback"
            metadata["applied_operations"] = fallback_metadata["applied_operations"]
            logger.info(f"Using fallback preprocessing: {len(metadata['applied_operations'])} operations")
            return df_preprocessed, metadata
        else:
            # Return original DataFrame
            return df, metadata
