# 2026-01-10 - Smart Preprocessing via OpenRouter LLM - BackendAgent

## Status
✅ Completed

## Summary
Integrated and enhanced mandatory smart preprocessing via OpenRouter LLM as a step before synthetic data generation. This uses SyntheticDataSpecialist's existing `preprocessing_agent.py` implementation and ensures it's applied consistently across all worker pipelines. The preprocessing automatically detects and fixes data quality issues (numeric column names, skewed distributions, feature collapse) to improve KS Mean and reach "all green" metrics faster.

## Key Findings / Decisions

### 🎯 **CTO Directive Implementation**:
- **Mandatory preprocessing step** before model training
- **OpenRouter LLM integration** for intelligent preprocessing plan generation
- **Automatic issue detection**: numeric column names, skewed distributions, feature collapse
- **Fallback mechanism**: Basic preprocessing if LLM fails
- **Retry loop integration**: If KS still high after preprocessing, automatically try different model (e.g., CTGAN)

### 📋 **Implementation Details**:

**1. New Preprocessing Module** (`backend/synth_worker/preprocessing.py`):
- `get_preprocessing_plan()`: Calls OpenRouter LLM with dataset statistics
- `apply_preprocessing_plan()`: Applies transformations using pandas
- `basic_fallback_preprocessing()`: Fallback when LLM fails
- `smart_preprocess()`: Main entry point with error handling

**2. Preprocessing Plan Structure**:
```json
{
  "column_renames": {"old_name": "new_name", ...},
  "transformations": [
    {
      "column": "column_name",
      "type": "log_transform" | "quantile_transform" | "clip" | "winsorize" | "remove" | "impute",
      "params": {...}
    }
  ],
  "rationale": "Explanation of why these changes improve synthetic data quality"
}
```

**3. Supported Transformations**:
- **Column renaming**: Fix numeric column names (e.g., '233.0' → 'col_233')
- **Log transform**: Handle skewed distributions
- **Quantile transform**: Normalize distributions (with sklearn fallback)
- **Clipping/Winsorization**: Handle outliers
- **Imputation**: Handle missing values
- **Removal**: Remove constant/near-constant columns

**4. Integration Points**:
- **Main worker pipeline** (`backend/synth_worker/worker.py`): Preprocessing applied after `_clean_df_for_sdv()` and before metadata preparation
- **Retry-enabled pipeline** (`backend/synth_worker_dp/worker.py`): Preprocessing integrated with retry logic
- **API endpoint** (`api/main.py`): Parameter support via `config_json.enable_smart_preprocess` (default: true)

**5. Retry Loop Integration**:
- If preprocessing is applied and KS Mean is still high after first attempt, automatically switch to CTGAN
- This addresses cases where preprocessing alone wasn't sufficient

## Code Changes Proposed/Applied

### File: `backend/synth_worker/preprocessing_agent.py` (EXISTING - SyntheticDataSpecialist)
- **Status**: Using existing implementation by SyntheticDataSpecialist
- **Key Functions**:
  - `analyze_dataset_for_preprocessing()`: Analyzes dataset statistics, detects issues
  - `generate_preprocessing_prompt()`: Generates structured OpenRouter prompt
  - `call_openrouter_for_preprocessing()`: Calls OpenRouter API with JSON response format
  - `apply_preprocessing_plan()`: Executes preprocessing plan (renaming, transformations, outlier clipping)
  - `get_preprocessing_plan()`: Main entry point that orchestrates analysis → LLM call → application

**Key Features** (from SyntheticDataSpecialist's implementation):
- Detects numeric column names and suggests renaming (e.g., '233.0' → 'feature_233')
- Identifies outliers using IQR method
- Detects highly skewed distributions
- Applies quantile, log, sqrt, standardize, minmax transformations
- Handles missing values (fill_mean, fill_median, fill_mode, drop)
- Supports adaptive preprocessing with `previous_ks` parameter for retry logic

### File: `backend/synth_worker/worker.py`
- **Lines 74-80**: Import preprocessing_agent module with availability check
- **Lines 1177-1210**: Integration of smart preprocessing into `execute_pipeline()`:
  - Preprocessing applied BEFORE `_clean_df_for_sdv()` (on raw `real` DataFrame)
  - Uses SyntheticDataSpecialist's `get_preprocessing_plan()` function
  - Reads `enable_smart_preprocess` from `config_json` (default: true)
  - Logs preprocessing operations and rationale
  - Graceful fallback if preprocessing agent unavailable

**Integration Point**:
```python
real = _download_csv_from_storage(file_url)

# MANDATORY: Smart preprocessing via OpenRouter LLM (before model training)
if PREPROCESSING_AVAILABLE and get_preprocessing_plan:
    preprocessed_df, preprocessing_metadata = get_preprocessing_plan(real, previous_ks=None)
    if preprocessed_df is not None:
        real = preprocessed_df  # Use preprocessed DataFrame

real_clean = _clean_df_for_sdv(real)
```

**Note**: Also integrated with adaptive preprocessing at line 2322 (after 3 failed attempts with high KS).

### File: `backend/synth_worker_dp/worker.py`
- **Lines 72-120**: Integration of preprocessing into retry-enabled pipeline
- **Lines 256-280**: Enhanced retry logic:
  - If preprocessing was applied and KS Mean is still high after first attempt, switch to CTGAN
  - This addresses cases where preprocessing alone wasn't sufficient

**Retry Logic**:
```python
# If preprocessing was applied and KS is still high, try different model
if preprocessing_metadata and preprocessing_metadata.get("preprocessing_method") in ("llm", "fallback"):
    utility = metrics.get("utility", {})
    ks_mean = utility.get("ks_mean", 0.0)
    if ks_mean > KS_MAX and attempt == 1:
        # Switch to CTGAN if first attempt after preprocessing still has high KS
        method = "ctgan"
```

### File: `api/main.py`
- **Line 622**: Added documentation comment for `enable_smart_preprocess` parameter in `StartRun` model

**API Usage**:
```json
{
  "dataset_id": "...",
  "method": "ddpm",
  "mode": "agent",
  "config_json": {
    "enable_smart_preprocess": true  // default: true (mandatory per CTO directive)
  }
}
```

## Safety Checks & Validation

1. **Empty DataFrame Check**: Skips preprocessing if DataFrame is empty
2. **Column Name Validation**: Validates new column names are non-empty strings
3. **Duplicate Name Check**: Prevents renaming to existing column names
4. **Type Validation**: Validates preprocessing plan structure (dict, required keys)
5. **Error Handling**: Graceful fallback to basic preprocessing if LLM fails
6. **Import Safety**: Optional sklearn import with fallback to log transform

## Example Preprocessing Plan

**Input Dataset Issues**:
- Column name: `233.0` (numeric)
- Column name: `42` (numeric)
- Highly skewed distribution in `age` column
- Constant column: `status` (all values are "active")

**LLM-Generated Plan**:
```json
{
  "column_renames": {
    "233.0": "feature_233",
    "42": "feature_42"
  },
  "transformations": [
    {
      "column": "age",
      "type": "log_transform",
      "params": {}
    },
    {
      "column": "status",
      "type": "remove",
      "params": {}
    }
  ],
  "rationale": "Renamed numeric column names to meaningful names. Applied log transform to age to handle skewness. Removed constant status column."
}
```

## Testing Recommendations

1. **Test with numeric column names**: Verify automatic renaming
2. **Test with skewed distributions**: Verify log/quantile transforms
3. **Test with constant columns**: Verify removal
4. **Test LLM failure**: Verify fallback to basic preprocessing
5. **Test retry logic**: Verify model switching when KS still high after preprocessing
6. **Test API parameter**: Verify `enable_smart_preprocess` works correctly

## Next Steps / Handoff

### → **SyntheticDataSpecialist**: 
**PRIORITY: High - Testing & Validation**

**Action**: Test smart preprocessing integration with real datasets

**Tasks**:
1. Test preprocessing with datasets containing numeric column names
2. Test preprocessing with skewed distributions
3. Verify preprocessing improves KS Mean metrics
4. Test fallback mechanism when OpenRouter fails
5. Test retry logic with model switching (CTGAN fallback)
6. Validate preprocessing doesn't break existing functionality
7. Measure performance impact of preprocessing step

**Test Cases**:
- Dataset with numeric column names (e.g., '233.0', '42')
- Dataset with highly skewed distributions
- Dataset with constant/near-constant columns
- Dataset with missing values
- Dataset with outliers
- Test with OpenRouter API key set
- Test without OpenRouter API key (fallback to Ollama)
- Test with both API keys unavailable (fallback to basic preprocessing)

**Expected Outcomes**:
- Preprocessing automatically fixes numeric column names
- Preprocessing improves KS Mean by 10-30% on average
- Fallback mechanism works when LLM fails
- Retry logic switches to CTGAN when KS still high
- No regression in existing functionality

---

### → **DevOpsAgent**:
**PRIORITY: Medium - Deployment**

**Action**: Ensure OpenRouter API key is configured in production

**Tasks**:
1. Verify `OPENROUTER_API_KEY` is set in production environment
2. Verify `OPENROUTER_MODEL` is configured (default: "mistralai/mistral-small-24b-instruct:free")
3. Test OpenRouter API connectivity from worker containers
4. Monitor API usage and costs
5. Set up alerts for OpenRouter API failures

**Configuration**:
- `OPENROUTER_API_KEY`: Required for LLM-based preprocessing
- `OPENROUTER_BASE`: Default: "https://openrouter.ai/api/v1"
- `OPENROUTER_MODEL`: Default: "mistralai/mistral-small-24b-instruct:free"
- `OPENROUTER_REFERER`: Default: "https://gesalp.ai"

---

## Open Questions
- Should preprocessing be configurable per dataset type?
- Should we cache preprocessing plans for similar datasets?
- Should we track preprocessing effectiveness metrics?
- Should we expose preprocessing plan in API response?

---

Agent: BackendAgent  
Date: 2026-01-10  
Priority: High - CTO Directive  
Status: ✅ Completed
