"""
OpenRouter LLM Client Module
Handles communication with OpenRouter API for preprocessing plan generation.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

import httpx

logger = logging.getLogger(__name__)

# Environment configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or os.getenv("AGENT_MODEL") or "mistralai/mistral-small-24b-instruct:free"
USE_OPENROUTER = bool(OPENROUTER_API_KEY)


def generate_preprocessing_prompt(dataset_analysis: Dict[str, Any], previous_ks: Optional[float] = None) -> str:
    """
    Generate the OpenRouter prompt for preprocessing plan generation.
    
    This is the CORE PROMPT that will be sent to OpenRouter LLM.
    Optimized for JSON output only, focused on reducing KS Mean from 0.72-0.74 to ≤0.30-0.40.
    
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
    
    # Build column details (limit to first 20 columns for prompt size)
    column_details = []
    for col in columns[:20]:
        stats = dataset_analysis["column_stats"].get(col, {})
        dtype = dataset_analysis["data_types"].get(col, "unknown")
        
        detail = f"- '{col}' ({dtype})"
        if stats.get("type") == "numeric":
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
            if skewness is not None and abs(skewness) > 1:
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
        ks_context = (
            f"\n\nPREVIOUS ATTEMPT RESULT:\n"
            f"- KS Mean: {previous_ks:.4f} (target: ≤0.10, current: FAILED)\n"
            f"- The model failed to learn the distribution properly. "
            f"Your preprocessing plan must address root causes: numeric column names, "
            f"skewed distributions, outliers, or type mismatches."
        )
    
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
      "method": "clip",
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
      "features": ["year", "month", "day", "hour", "minute"]
    }},
    ...
  }},
  "categorical_encoding": {{
    "column_name": {{
      "method": "one_hot" | "label" | "group_rare" | "target_encoding",
      "max_categories": 50
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


def call_openrouter_for_preprocessing(
    dataset_analysis: Dict[str, Any],
    previous_ks: Optional[float] = None
) -> Optional[Dict[str, Any]]:
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
    
    # Handle models that don't support system prompts (e.g., gemma)
    is_gemma = "gemma" in OPENROUTER_MODEL.lower()
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
        ] if is_gemma else [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent JSON
        "max_tokens": 3000,  # Increased for complex plans
    }
    
    # Don't use response_format for gemma models (not supported)
    if not is_gemma:
        payload["response_format"] = {"type": "json_object"}
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://gesalp.ai"),
        "X-Title": "Gesalp AI Preprocessing Service",
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
            # Remove markdown code blocks if present
            text = text.strip()
            if text.startswith("```"):
                # Extract JSON from markdown code block
                lines = text.split("\n")
                text = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
            
            plan = json.loads(text)
            logger.info("Successfully generated preprocessing plan from OpenRouter")
            return plan
    
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenRouter API HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from OpenRouter response: {e}")
        logger.debug(f"Response text: {text[:500] if 'text' in locals() else 'N/A'}")
        return None
    except Exception as e:
        logger.error(f"OpenRouter API call failed: {e}")
        return None
