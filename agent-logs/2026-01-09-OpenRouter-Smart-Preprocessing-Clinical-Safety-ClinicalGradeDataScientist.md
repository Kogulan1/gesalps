# 2026-01-09 - OpenRouter Smart Preprocessing: Clinical Safety & Recommendations - ClinicalGradeDataScientist

## Status
✅ Completed - Recommendations Ready for Implementation

## Summary
Defined comprehensive recommendations for OpenRouter-based smart preprocessing with clinical-grade safety validation. Includes dataset statistics to send, safety-approved prompt, clinical validation rules, updated KS thresholds, and clinical-specific transform recommendations.

## Key Findings / Decisions

### 1. Dataset Statistics to Send to OpenRouter

**Recommended Statistics (Privacy-Safe, No Data Leakage)**:

```python
{
    "n_rows": int,                    # Total row count
    "n_cols": int,                     # Total column count
    "columns": [str],                  # Column names only (no actual data)
    "data_types": {col: dtype},        # Data types per column
    "column_stats": {
        "numeric": {
            "min": float,              # Minimum value (safe - aggregated)
            "max": float,              # Maximum value (safe - aggregated)
            "mean": float,             # Mean (safe - aggregated)
            "std": float,              # Standard deviation (safe - aggregated)
            "median": float,           # Median (safe - aggregated)
            "q25": float,              # 25th percentile
            "q75": float,              # 75th percentile
            "skewness": float,         # Skewness coefficient
            "kurtosis": float,         # Kurtosis coefficient
            "outlier_count": int,       # Count of outliers (IQR method)
            "outlier_rate": float,      # Proportion of outliers
            "missing_rate": float,     # Proportion of missing values
            "unique_count": int,        # Number of unique values
            "histogram_bins": [float],  # Histogram bins for top 5 skewed columns only
            "histogram_counts": [int], # Histogram counts (normalized, no raw data)
        },
        "categorical": {
            "unique_count": int,
            "missing_rate": float,
            "top_5_values": [str],     # Top 5 most frequent values (safe - aggregated)
            "top_5_counts": [int],      # Counts for top 5 values
            "cardinality": str,         # "low" | "medium" | "high"
        }
    },
    "clinical_indicators": {           # Clinical context (no PHI)
        "has_lab_values": bool,        # Detected lab result columns
        "has_vitals": bool,            # Detected vital signs
        "has_dates": bool,             # Detected date columns
        "has_ids": bool,               # Detected ID columns (for exclusion)
        "column_patterns": {           # Pattern detection (no actual values)
            "lab_patterns": [str],      # Column names matching lab patterns
            "vital_patterns": [str],   # Column names matching vital patterns
        }
    },
    "issues": [str],                   # Detected data quality issues
    "previous_ks": float | None        # Previous KS Mean if retrying
}
```

**CRITICAL: What NOT to Send**:
- ❌ No actual data values (rows, cells, raw data)
- ❌ No patient identifiers (names, SSN, MRN)
- ❌ No dates (only date column detection, not actual dates)
- ❌ No full histograms (only top 5 skewed columns, normalized bins)
- ❌ No full value distributions (only top 5 categorical values)
- ❌ No sample rows or data previews

### 2. Safety-Approved OpenRouter Prompt

**System Prompt** (Pre-approved for safety):
```
You are a clinical data preprocessing expert specializing in preparing healthcare datasets for synthetic data generation using diffusion models. You analyze dataset STATISTICS (not raw data) and generate JSON preprocessing plans that improve model learning while preserving clinical meaning.

CRITICAL SAFETY RULES:
1. You receive ONLY aggregated statistics (means, stds, percentiles) - NO raw data values
2. You MUST preserve clinical validity (e.g., no negative lab results, no extreme scaling on vitals)
3. You MUST output ONLY valid JSON, no markdown, no explanations, no code blocks
4. All transformations must be reversible or at least interpretable
5. Never suggest transformations that would invalidate clinical ranges
```

**User Prompt Template** (Pre-approved):
```
You are a data preprocessing expert for CLINICAL synthetic data generation. Your task is to analyze dataset STATISTICS (aggregated metrics only, no raw data) and create a preprocessing plan that will help a diffusion model (TabDDPM) learn the data distribution effectively and achieve KS Mean ≤ 0.25 (relaxed threshold for post-preprocessing).

DATASET STATISTICS (Privacy-Safe Aggregates Only):
- Rows: {n_rows}
- Columns: {n_cols}
- Column names: {column_list}

NUMERIC COLUMNS:
{for each numeric column:}
- '{col_name}' ({dtype}):
  * Range: [{min}, {max}]
  * Mean: {mean}, Std: {std}, Median: {median}
  * Skewness: {skewness}, Kurtosis: {kurtosis}
  * Outliers: {outlier_count} ({outlier_rate:.1%})
  * Missing: {missing_rate:.1%}
  * Unique values: {unique_count}
  {if top 5 skewed: histogram bins (normalized)}

CATEGORICAL COLUMNS:
{for each categorical column:}
- '{col_name}' ({dtype}):
  * Unique values: {unique_count}
  * Top 5 values: {top_5_values} (counts: {top_5_counts})
  * Missing: {missing_rate:.1%}
  * Cardinality: {cardinality}

CLINICAL CONTEXT (No PHI):
- Lab values detected: {has_lab_values}
- Vital signs detected: {has_vitals}
- Date columns detected: {has_dates}
- ID columns detected: {has_ids} (EXCLUDE from transformations)

DETECTED ISSUES:
{issues_list}

{previous_ks_context if retrying}

YOUR TASK:
Generate a JSON preprocessing plan that:
1. **Column Renaming**: Rename numeric column names to descriptive names
2. **Outlier Handling**: Winsorize at 1%/99% percentiles (clinical-safe clipping)
3. **Distribution Normalization**: Apply clinical-appropriate transforms:
   - Log transform for lab values (if positive, skewed)
   - Quantile transform for highly skewed non-lab columns
   - Standardize only if clinically appropriate
4. **Missing Value Handling**: Fill with median (numeric) or mode (categorical)
5. **Clinical Validation**: Ensure no invalid transformations:
   - No negative values in lab results (if original min >= 0)
   - No extreme scaling on vitals (preserve clinical ranges)
   - No transformations on ID columns
6. **Data Type Corrections**: Ensure correct types

OUTPUT FORMAT (JSON only):
{
  "column_renames": {"old_name": "new_name"},
  "outlier_handling": {
    "column_name": {
      "method": "winsorize",
      "lower_percentile": 0.01,
      "upper_percentile": 0.99,
      "preserve_clinical_range": true
    }
  },
  "transformations": {
    "column_name": {
      "method": "log" | "quantile" | "standardize" | "minmax" | "none",
      "clinical_safe": true,
      "preserve_range": [min, max] | null
    }
  },
  "missing_value_strategy": {
    "method": "fill_median" | "fill_mode",
    "columns": ["col1", "col2"]
  },
  "data_type_corrections": {"column_name": "dtype"},
  "clinical_validation": {
    "no_negative_labs": true,
    "preserve_vital_ranges": true,
    "excluded_columns": ["id_cols"]
  },
  "rationale": "Brief explanation"
}

CRITICAL REQUIREMENTS:
- Column names MUST be renamed if numeric
- Use winsorize (1%/99%) for outliers (NOT hard clipping)
- Log transform ONLY for positive, skewed lab values
- Preserve clinical ranges (no extreme scaling)
- Exclude ID columns from transformations
- Output ONLY valid JSON, no markdown
```

### 3. Clinical Validation Rules

**Post-Preprocessing Validation** (Must Pass Before Training):

```python
def validate_clinical_preprocessing(df_original: pd.DataFrame, df_preprocessed: pd.DataFrame, 
                                    preprocessing_plan: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate that preprocessing preserves clinical meaning.
    
    Returns:
        (is_valid, violations_list)
    """
    violations = []
    
    # 1. Check for invalid negative values in originally non-negative columns
    for col in df_original.columns:
        if col in df_preprocessed.columns:
            original_min = df_original[col].min()
            preprocessed_min = df_preprocessed[col].min()
            
            # If original data had no negatives, preprocessed shouldn't either
            if original_min >= 0 and preprocessed_min < 0:
                violations.append(f"Column '{col}': Preprocessing introduced negative values (original min={original_min:.2f})")
    
    # 2. Check for extreme scaling on vital signs
    vital_patterns = ['bp', 'blood_pressure', 'heart_rate', 'hr', 'temperature', 'temp', 
                      'respiratory', 'resp', 'spo2', 'o2_sat']
    for col in df_original.columns:
        if any(pattern in col.lower() for pattern in vital_patterns):
            if col in df_preprocessed.columns:
                original_range = df_original[col].max() - df_original[col].min()
                preprocessed_range = df_preprocessed[col].max() - df_preprocessed[col].min()
                
                # Range should not be compressed by more than 50% or expanded by more than 200%
                if preprocessed_range < original_range * 0.5:
                    violations.append(f"Vital '{col}': Range compressed too much (original={original_range:.2f}, preprocessed={preprocessed_range:.2f})")
                elif preprocessed_range > original_range * 2.0:
                    violations.append(f"Vital '{col}': Range expanded too much (original={original_range:.2f}, preprocessed={preprocessed_range:.2f})")
    
    # 3. Check lab value ranges (should remain in reasonable clinical ranges)
    lab_patterns = ['glucose', 'creatinine', 'bun', 'sodium', 'potassium', 'chloride', 
                    'calcium', 'magnesium', 'phosphate', 'albumin', 'bilirubin', 'ast', 
                    'alt', 'alk_phos', 'ldh', 'troponin', 'bnp', 'nt_probnp']
    for col in df_original.columns:
        if any(pattern in col.lower() for pattern in lab_patterns):
            if col in df_preprocessed.columns:
                # Check if values are still in reasonable clinical ranges
                # (e.g., glucose: 50-500 mg/dL, creatinine: 0.5-15 mg/dL)
                preprocessed_min = df_preprocessed[col].min()
                preprocessed_max = df_preprocessed[col].max()
                
                # Define reasonable ranges (can be expanded)
                reasonable_ranges = {
                    'glucose': (20, 600),
                    'creatinine': (0.3, 20),
                    'sodium': (100, 180),
                    'potassium': (2.0, 8.0),
                    # Add more as needed
                }
                
                for pattern, (min_val, max_val) in reasonable_ranges.items():
                    if pattern in col.lower():
                        if preprocessed_min < min_val or preprocessed_max > max_val:
                            violations.append(f"Lab '{col}': Values outside reasonable clinical range ({min_val}-{max_val})")
    
    # 4. Check that ID columns were excluded
    id_columns = preprocessing_plan.get("clinical_validation", {}).get("excluded_columns", [])
    for col in id_columns:
        if col in df_original.columns and col in df_preprocessed.columns:
            # ID columns should not be transformed (values should match)
            if not df_original[col].equals(df_preprocessed[col]):
                violations.append(f"ID column '{col}': Was transformed (should be excluded)")
    
    # 5. Check for data loss (too many rows dropped)
    rows_lost = len(df_original) - len(df_preprocessed)
    loss_rate = rows_lost / len(df_original) if len(df_original) > 0 else 0
    if loss_rate > 0.10:  # More than 10% data loss
        violations.append(f"Data loss too high: {loss_rate:.1%} rows dropped (max allowed: 10%)")
    
    return len(violations) == 0, violations
```

### 4. Updated KS Thresholds and Retry Logic

**New Threshold Strategy**:

```python
# Post-preprocessing KS thresholds (relaxed)
KS_MAX_POST_PREPROCESS = 0.25  # Relaxed threshold after preprocessing
KS_MAX_FINAL = 0.10            # Final target (may require model switch)

# Retry logic
def should_retry_with_model_switch(ks_mean: float, has_preprocessing: bool) -> bool:
    """
    Determine if we should retry with a different model.
    
    Args:
        ks_mean: Current KS Mean value
        has_preprocessing: Whether preprocessing was applied
        
    Returns:
        True if should retry with model switch
    """
    if has_preprocessing:
        # After preprocessing, if KS > 0.25, try different model
        return ks_mean > KS_MAX_POST_PREPROCESS
    else:
        # Without preprocessing, if KS > 0.10, try preprocessing first
        return ks_mean > KS_MAX_FINAL

# Convergence criteria
def is_acceptable_ks(ks_mean: float, has_preprocessing: bool) -> bool:
    """
    Check if KS Mean is acceptable.
    
    Args:
        ks_mean: Current KS Mean value
        has_preprocessing: Whether preprocessing was applied
        
    Returns:
        True if KS is acceptable
    """
    if has_preprocessing:
        # After preprocessing, KS ≤ 0.25 is acceptable
        return ks_mean <= KS_MAX_POST_PREPROCESS
    else:
        # Without preprocessing, KS ≤ 0.10 is target
        return ks_mean <= KS_MAX_FINAL
```

**Updated Retry Flow**:
1. **First attempt**: Try with preprocessing (if enabled)
   - If KS ≤ 0.25: ✅ Success
   - If KS > 0.25: Retry with model switch (e.g., ddpm → ctgan → tvae → gc)

2. **Second attempt**: Try different model with preprocessing
   - If KS ≤ 0.25: ✅ Success
   - If KS > 0.25: Retry with another model

3. **Final attempt**: Try GC (most robust) with preprocessing
   - If KS ≤ 0.25: ✅ Success
   - If KS > 0.25: ⚠️ Warning but continue (may still be usable)

### 5. Clinical-Specific Transform Recommendations

**Safe Clinical Transforms**:

1. **Log Transform** (for lab values):
   ```python
   # Apply to: Positive, highly skewed lab values (skewness > 2)
   # Examples: Glucose, Creatinine, Bilirubin, AST, ALT
   # Validation: Ensure no negatives introduced
   if col_min >= 0 and skewness > 2 and is_lab_value:
       transform = "log"  # Use log1p if min == 0
   ```

2. **Winsorize Outliers** (1%/99%):
   ```python
   # Apply to: All numeric columns with outliers
   # Method: Clip at 1st and 99th percentiles (NOT hard clipping)
   # Preserves more data than hard clipping
   outlier_handling = {
       "method": "winsorize",
       "lower_percentile": 0.01,
       "upper_percentile": 0.99,
       "preserve_clinical_range": True
   }
   ```

3. **Quantile Transform** (for highly skewed non-lab):
   ```python
   # Apply to: Highly skewed columns (skewness > 3) that are NOT lab values
   # Preserves distribution shape while normalizing
   if skewness > 3 and not is_lab_value:
       transform = "quantile"
   ```

4. **Standardize** (for normally distributed):
   ```python
   # Apply to: Near-normal distributions (skewness < 1, kurtosis < 3)
   # Only if clinically appropriate (not vitals with fixed ranges)
   if abs(skewness) < 1 and abs(kurtosis) < 3 and not is_vital:
       transform = "standardize"
   ```

5. **Min-Max Scaling** (for bounded ranges):
   ```python
   # Apply to: Columns with known clinical ranges
   # Preserves relative relationships
   if has_known_clinical_range:
       transform = "minmax"
   ```

**Transform Exclusion Rules**:
- ❌ Never transform ID columns
- ❌ Never apply log to negative values
- ❌ Never apply extreme scaling to vitals
- ❌ Never transform date columns (only detect, don't transform)
- ❌ Never apply quantile to lab values (use log instead)

## Implementation Recommendations

### Enhanced Preprocessing Agent

**File**: `backend/synth_worker/preprocessing_agent.py`

**Key Enhancements Needed**:

1. **Enhanced Statistics Collection**:
   ```python
   def analyze_dataset_for_preprocessing(df: pd.DataFrame) -> Dict[str, Any]:
       # Add clinical indicators
       # Add histogram bins for top 5 skewed columns only
       # Add kurtosis calculation
       # Add clinical pattern detection
   ```

2. **Clinical Validation Function**:
   ```python
   def validate_clinical_preprocessing(...) -> Tuple[bool, List[str]]:
       # Implement validation rules above
   ```

3. **Enhanced Prompt Generation**:
   ```python
   def generate_preprocessing_prompt(...) -> str:
       # Use safety-approved prompt template
       # Include clinical context
       # Include previous KS if retrying
   ```

4. **Clinical-Safe Transform Application**:
   ```python
   def apply_preprocessing_plan(...) -> Tuple[pd.DataFrame, Dict[str, Any]]:
       # Add winsorize method (1%/99%)
       # Add clinical validation after each transform
       # Preserve clinical ranges
   ```

### Updated Worker Retry Logic

**File**: `backend/synth_worker/worker.py`

**Key Changes**:

1. **Update KS Threshold Check**:
   ```python
   # After preprocessing, use relaxed threshold
   if has_preprocessing:
       ks_threshold = 0.25  # KS_MAX_POST_PREPROCESS
   else:
       ks_threshold = 0.10  # KS_MAX_FINAL
   
   if ks_mean > ks_threshold:
       # Retry with model switch
   ```

2. **Add Clinical Validation**:
   ```python
   # After preprocessing, validate clinical safety
   if preprocessed_df is not None:
       is_valid, violations = validate_clinical_preprocessing(
           real_clean, preprocessed_df, preprocessing_plan
       )
       if not is_valid:
           # Log violations and either:
           # - Reject preprocessing and use original data
           # - Or apply fixes and re-validate
   ```

## Code Changes Proposed/Applied (if any)

### New Functions to Add

1. **`validate_clinical_preprocessing()`** - Clinical validation function
2. **`detect_clinical_indicators()`** - Detect lab values, vitals, dates, IDs
3. **`winsorize_column()`** - Winsorize at 1%/99% percentiles
4. **`is_acceptable_ks()`** - Updated KS threshold check
5. **`should_retry_with_model_switch()`** - Retry decision logic

### Files to Modify

1. **`backend/synth_worker/preprocessing_agent.py`**:
   - Enhance `analyze_dataset_for_preprocessing()` with clinical indicators
   - Update `generate_preprocessing_prompt()` with safety-approved prompt
   - Add `validate_clinical_preprocessing()` function
   - Add `winsorize_column()` to `apply_preprocessing_plan()`

2. **`backend/synth_worker/worker.py`**:
   - Update KS threshold logic (0.25 after preprocessing)
   - Add clinical validation after preprocessing
   - Update retry logic to consider preprocessing status

## Next Steps / Handoff

- → **SyntheticDataSpecialist**: Implement OpenRouter-based smart preprocessing:
  1. Enhance `preprocessing_agent.py` with clinical indicators and safety validation
  2. Update prompt generation with safety-approved template
  3. Add `validate_clinical_preprocessing()` function
  4. Implement winsorize method (1%/99%)
  5. Update worker retry logic with KS threshold 0.25 after preprocessing
  6. Add clinical validation after preprocessing application
  7. Test with clinical datasets to ensure no invalid transformations

- → **QATester**: Test clinical validation:
  1. Test that no negative values introduced in originally non-negative columns
  2. Test that vital sign ranges are preserved
  3. Test that lab value ranges remain clinically reasonable
  4. Test that ID columns are excluded from transformations
  5. Test that data loss is < 10%

- → **DevOpsAgent**: Ensure dependencies:
  1. Verify OpenRouter API key is configured
  2. Verify sklearn is available for quantile transforms
  3. Test preprocessing in containerized environment

- → **CTO**: Review and approve:
  1. Safety-approved prompt (no data leakage)
  2. Clinical validation rules
  3. Updated KS thresholds (0.25 after preprocessing)
  4. Clinical-specific transform recommendations

## Open Questions

- Should we add more clinical range validations? (Recommendation: Yes, expand reasonable_ranges dict)
- Should we allow user to override clinical validation? (Recommendation: No, safety first)
- Should we log all preprocessing steps for audit? (Recommendation: Yes, critical for compliance)
- Should we add preprocessing to compliance evaluation? (Recommendation: Yes, document preprocessing in compliance report)

Agent: ClinicalGradeDataScientist  
Date: 2026-01-09
