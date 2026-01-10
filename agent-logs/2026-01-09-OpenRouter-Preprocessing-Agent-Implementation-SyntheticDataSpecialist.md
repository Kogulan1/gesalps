# 2026-01-09 - OpenRouter Preprocessing Agent Implementation - SyntheticDataSpecialist

## Status
✅ Completed

## Summary
Implemented an OpenRouter LLM-powered preprocessing agent that analyzes datasets and generates intelligent preprocessing plans to fix high KS Mean issues (stuck at 0.72-0.74). The agent addresses numeric column names, distribution normalization, outlier handling, and other preprocessing steps before data is sent to synthetic models.

## Key Findings / Decisions

### Core Problem Identified
- **Numeric column names** (e.g., '233.0', '2.3') confuse preprocessing/normalization
- **Numerical feature collapse** to extremes / failure to learn multimodal/skewed distributions
- **Heterogeneous data** not fitting diffusion assumptions

### Solution Design
1. **OpenRouter LLM Agent**: Uses `google/gemma-3-27b-it:free` (or configured model) to analyze dataset schema/stats and output JSON preprocessing plan
2. **Preprocessing Execution**: Applies the plan (column renaming, transformations, outlier handling) using pandas/sklearn
3. **Adaptive Retry**: If KS still high after 3 attempts, re-runs preprocessing with `previous_ks` context
4. **Fallback Logic**: Forces method switch (TabDDPM → CTGAN → TVAE) if preprocessing doesn't help enough

## Code Changes Proposed/Applied

### File: `backend/synth_worker/preprocessing_agent.py` (NEW)
**Change**: Created new preprocessing agent module with:
- `analyze_dataset_for_preprocessing()`: Analyzes dataset statistics, detects issues (numeric column names, outliers, skewness)
- `generate_preprocessing_prompt()`: Generates structured OpenRouter prompt for JSON preprocessing plan
- `call_openrouter_for_preprocessing()`: Calls OpenRouter API with JSON response format
- `apply_preprocessing_plan()`: Executes preprocessing plan (renaming, transformations, outlier clipping)
- `get_preprocessing_plan()`: Main entry point that orchestrates analysis → LLM call → application

**Key Features**:
- Detects numeric column names and suggests renaming (e.g., '233.0' → 'feature_233')
- Identifies outliers using IQR method
- Detects highly skewed distributions
- Applies quantile, log, sqrt, standardize, minmax transformations
- Handles missing values (fill_mean, fill_median, fill_mode, drop)
- Corrects data types

### File: `backend/synth_worker/worker.py`
**Change**: Integrated preprocessing agent into pipeline:
1. **Initial Preprocessing** (line ~1169): Calls `get_preprocessing_plan()` before `_clean_df_for_sdv()` to apply initial preprocessing
2. **Adaptive Preprocessing** (line ~2269): After 3 failed attempts with high KS (>0.5), re-runs preprocessing with `previous_ks` context
3. **Fallback Logic** (line ~2295): Forces method switch (TabDDPM → CTGAN → TVAE) if KS still high after preprocessing

**Integration Points**:
- Preprocessing applied to `real` DataFrame before `_clean_df_for_sdv()`
- Metadata and loader re-prepared after adaptive preprocessing
- Graceful fallback if preprocessing agent unavailable

## OpenRouter Prompt Design

The core prompt sent to OpenRouter is structured as follows:

```
You are a data preprocessing expert for synthetic data generation. Your task is to analyze a dataset and create a preprocessing plan that will help a diffusion model (TabDDPM) learn the data distribution effectively and achieve "all green" metrics (KS Mean ≤ 0.10).

DATASET INFORMATION:
- Rows: {n_rows}
- Columns: {n_cols}
- Column names: {column_list}

COLUMN DETAILS:
- '{col}' ({dtype}): min=X, max=Y, mean=Z, std=W, outliers=N, skew=S
...

DETECTED ISSUES:
- Column '233.0' has numeric name - may confuse models
- Column 'X' is highly skewed (skew=2.5)
...

PREVIOUS ATTEMPT RESULT (if retrying):
- KS Mean: 0.7289 (threshold: ≤0.10) - FAILED
- The model failed to learn the distribution properly. Your preprocessing plan must address this.

YOUR TASK:
Generate a JSON preprocessing plan that addresses:
1. **Column Renaming**: Rename numeric column names (e.g., '233.0', '2.3') to descriptive names
2. **Outlier Handling**: Clip or transform extreme values
3. **Distribution Normalization**: Apply transformations (quantile, log, etc.) for highly skewed columns
4. **Missing Value Handling**: Fill or drop missing values appropriately
5. **Data Type Corrections**: Ensure correct types (numeric vs categorical)
6. **Feature Engineering**: Any transformations that will help the model learn better

OUTPUT FORMAT (JSON only, no markdown, no explanations):
{
  "column_renames": {"old_name": "new_name", ...},
  "outlier_handling": {
    "column_name": {
      "method": "clip" | "remove" | "transform",
      "lower_percentile": 0.01,
      "upper_percentile": 0.99
    }
  },
  "transformations": {
    "column_name": {
      "method": "quantile" | "log" | "sqrt" | "standardize" | "minmax",
      "params": {}
    }
  },
  "missing_value_strategy": {
    "method": "fill_mean" | "fill_median" | "fill_mode" | "drop",
    "columns": ["col1", "col2"]
  },
  "data_type_corrections": {"column_name": "int64" | "float64" | "category" | "object"},
  "rationale": "Brief explanation of why these preprocessing steps will help"
}

CRITICAL REQUIREMENTS:
- Column names MUST be renamed if they are numeric (e.g., '233.0' → 'feature_233')
- Address any detected issues (outliers, skewness, etc.)
- Keep transformations simple and reversible if possible
- Focus on making the data learnable by diffusion models
- Output ONLY valid JSON, no markdown formatting, no code blocks
```

**Prompt Features**:
- Includes dataset statistics (rows, columns, column details with min/max/mean/std)
- Lists detected issues (numeric column names, outliers, skewness)
- Provides previous KS context if retrying (adaptive preprocessing)
- Requests structured JSON output with specific preprocessing operations
- Emphasizes column renaming for numeric column names

## Test Results

### Test Setup
- Dataset: `heart.csv` (302 rows, 14 columns)
- Issue: Numeric column names ('233.0', '2.3', etc.) causing high KS Mean (0.72-0.74)
- Model: TabDDPM with n_iter=400-800

### Expected Behavior
1. **Initial Preprocessing**: OpenRouter analyzes dataset, detects numeric column names, generates preprocessing plan
2. **Column Renaming**: Numeric column names renamed to descriptive names (e.g., '233.0' → 'feature_233')
3. **Distribution Normalization**: Highly skewed columns transformed (quantile/log/sqrt)
4. **Outlier Handling**: Extreme values clipped to 1st-99th percentiles
5. **Adaptive Preprocessing**: After 3 failed attempts, re-runs preprocessing with `previous_ks=0.7289` context
6. **Fallback**: If KS still >0.5 after preprocessing, forces method switch (TabDDPM → CTGAN → TVAE)

### Testing Status
- ✅ Code implemented and integrated
- ⏳ Pending: VPS testing with actual dataset
- ⏳ Pending: Verification of OpenRouter API usage
- ⏳ Pending: KS Mean improvement measurement

## Next Steps / Handoff

### Handoffs FROM ClinicalGradeDataScientist

- → **SyntheticDataSpecialist**: Implement OpenRouter-based smart preprocessing with clinical safety:
  1. **Enhance `preprocessing_agent.py`** with clinical indicators and safety validation:
     - Add clinical pattern detection (lab values, vitals, dates, IDs)
     - Add histogram bins for top 5 skewed columns only (privacy-safe)
     - Add kurtosis calculation
     - Implement `validate_clinical_preprocessing()` function
     - Add `winsorize_column()` method (1%/99% percentiles, NOT hard clipping)
  2. **Update prompt generation** with safety-approved template:
     - Use privacy-safe statistics (aggregates only, no raw data)
     - Include clinical context (lab values, vitals, dates, IDs)
     - Preserve clinical ranges in transformations
     - Exclude ID columns from transformations
  3. **Update worker retry logic** with relaxed KS thresholds:
     - KS ≤ 0.25 after preprocessing (relaxed threshold)
     - KS ≤ 0.10 final target (may require model switch)
     - Add clinical validation after preprocessing application
  4. **Implement clinical-safe transforms**:
     - Log transform for positive, skewed lab values only
     - Winsorize outliers at 1%/99% (preserve clinical ranges)
     - Quantile transform for highly skewed non-lab columns
     - Standardize only if clinically appropriate
     - Min-max scaling for bounded clinical ranges
  5. **Add clinical validation rules**:
     - No negative values in originally non-negative columns
     - Preserve vital sign ranges (no extreme scaling)
     - Lab values remain in reasonable clinical ranges
     - ID columns excluded from transformations
     - Data loss < 10%
  
  **Source**: `2026-01-09-OpenRouter-Smart-Preprocessing-Clinical-Safety-ClinicalGradeDataScientist.md`

### Other Handoffs

- → **DevOpsAgent**: Deploy updated code to VPS for testing
- → **QA Tester**: Test preprocessing agent on `heart.csv` and verify:
  - OpenRouter API is called and returns preprocessing plan
  - Column renaming is applied correctly
  - KS Mean improves after preprocessing
  - Adaptive preprocessing triggers after 3 failed attempts
  - Fallback logic switches methods when KS still high
  - Clinical validation passes (no negative values, preserved ranges, etc.)
- → **BackendAgent**: Monitor OpenRouter API usage in dashboard to verify calls are being made
- → **SyntheticDataSpecialist**: Analyze test results and iterate on preprocessing plan if needed
- → **QATester**: Test clinical validation:
  1. Test that no negative values introduced in originally non-negative columns
  2. Test that vital sign ranges are preserved
  3. Test that lab value ranges remain clinically reasonable
  4. Test that ID columns are excluded from transformations
  5. Test that data loss is < 10%
  
  **Source**: `2026-01-09-OpenRouter-Smart-Preprocessing-Clinical-Safety-ClinicalGradeDataScientist.md`

## Open Questions

1. **OpenRouter Model Selection**: Currently using `google/gemma-3-27b-it:free`. Should we test other models (e.g., `mistralai/mistral-small-3.1-24b-instruct:free`) for better preprocessing plans?
2. **Preprocessing Cost**: How many OpenRouter API calls per run? (Initial + adaptive after 3 attempts = 2 calls max)
3. **Fallback Threshold**: Is KS > 0.5 the right threshold for forcing method switch, or should it be higher/lower?
4. **Column Renaming Strategy**: Should we use a more systematic naming scheme (e.g., `feature_0`, `feature_1`, ...) or let LLM suggest descriptive names?

## Code Snippets

### Main Integration Point (worker.py)
```python
# Initial preprocessing before cleaning
from preprocessing_agent import get_preprocessing_plan
preprocessed_df, preprocessing_metadata = get_preprocessing_plan(real, previous_ks=None)
if preprocessed_df is not None:
    real = preprocessed_df
    real_clean = _clean_df_for_sdv(real)

# Adaptive preprocessing after 3 failed attempts
if attempts >= 3 and not overall_ok:
    current_ks = metrics.get("utility", {}).get("ks_mean")
    if current_ks and current_ks > 0.5:
        preprocessed_df, new_metadata = get_preprocessing_plan(real, previous_ks=current_ks)
        if preprocessed_df is not None:
            real_clean = _clean_df_for_sdv(preprocessed_df)
            # Re-prepare metadata and loader
```

### Preprocessing Plan Application
```python
# Column renaming
if "column_renames" in plan:
    result_df = result_df.rename(columns=plan["column_renames"])

# Outlier clipping
if "outlier_handling" in plan:
    for col, config in plan["outlier_handling"].items():
        lower_val = result_df[col].quantile(config["lower_percentile"])
        upper_val = result_df[col].quantile(config["upper_percentile"])
        result_df[col] = result_df[col].clip(lower=lower_val, upper=upper_val)

# Transformations
if "transformations" in plan:
    for col, config in plan["transformations"].items():
        if config["method"] == "quantile":
            transformer = QuantileTransformer(output_distribution='normal')
            result_df[col] = transformer.fit_transform(result_df[[col]]).flatten()
```

Agent: SyntheticDataSpecialist
Date: 2026-01-09
