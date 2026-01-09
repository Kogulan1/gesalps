# Synthetic Data Generation Analysis & SynthCity Migration Plan

## ✅ Migration Status: Step 1 COMPLETED

**Latest Update:** Factory now prefers SynthCity for ALL methods (gc, ctgan, tvae, ddpm)
- ✅ SynthCity is first choice for all core methods
- ✅ SDV fallback maintained for backward compatibility
- ✅ Logging added to track backend selection
- ✅ DDPM (TabDDPM) added as high-priority method for mixed/high-dim data

---

## Current Implementation Analysis

### 1. Main Generation Function

**File:** `backend/synth_worker/worker.py`  
**Function:** `execute_pipeline(run: Dict[str, Any], cancellation_checker=None)` (line 866)

**Flow:**
1. Loads dataset from Supabase storage
2. Prepares SDV metadata (`SingleTableMetadata`)
3. Selects method (from run config, agent plan, or schema heuristics)
4. Creates synthesizer via `create_synthesizer()` factory
5. Trains model: `synthesizer.fit(real_df)`
6. Generates data: `synthesizer.sample(num_rows)`
7. Computes metrics (utility, privacy, fairness)
8. Post-processes synthetic data (quantile matching, jitter, categorical marginals)
9. Saves artifacts (CSV + JSON report)

**Key Helper:** `_train_unified()` (line 147) → calls `train_synthesizer()` from `models/trainer.py`

### 2. Libraries & Models Used

**Primary Libraries:**
- **SDV (Synthetic Data Vault)**: Main library
  - `GaussianCopulaSynthesizer` (GC) - default/fallback
  - `CTGANSynthesizer` (CTGAN) - for categorical-heavy data
  - `TVAESynthesizer` (TVAE) - for numeric-heavy data
  - Uses `SingleTableMetadata` for schema detection

**Secondary/Experimental:**
- **SynthCity**: Partial support exists (see `models/synthcity_models.py`)
  - Currently only used for DP methods (`dp-ctgan`, `pategan`, `dpgan`)
  - Wrapper: `SynthcitySynthesizer` class
  - Factory checks `SYNTHCITY_METHOD_MAP` before falling back to SDV

**Experimental Models:**
- TabDDPM (Diffusion) - lazy import, adapter pattern
- TabTransformer - via SynthCity

**Factory Pattern:**
- `backend/synth_worker/models/factory.py` → `create_synthesizer()`
- Routes method names to appropriate synthesizer class
- Returns `(synthesizer_instance, is_dp_enabled)` tuple

### 3. Privacy Handling

**Function:** `_privacy_metrics(real: pd.DataFrame, synth: pd.DataFrame)` (line 715)

**Metrics Computed:**
1. **MIA AUC (Membership Inference Attack)**
   - Uses RandomForestClassifier to distinguish real vs synthetic
   - Encodes categoricals as category codes
   - Trains on 67% split, tests on 33%
   - Returns ROC AUC score (lower = better privacy)

2. **Duplicate Rate**
   - Exact full-row matches between real and synthetic
   - Aligns dtypes for consistent equality checks
   - Returns fraction: `len(duplicates) / len(synthetic)`

**Differential Privacy:**
- Configurable via `dp_options` in run config
- Backends: `none`, `custom` (Opacus), `synthcity`
- Epsilon/delta tracked in privacy metrics
- `dp_effective` flag indicates if DP was actually applied

**Thresholds (env-configurable):**
- `MIA_MAX = 0.60` (default)
- `DUP_MAX = 5%` (implicit)

### 4. Report Generation

**Artifacts Function:** `_make_artifacts(run_id, synth_df, metrics)` (line 777)

**Outputs:**
1. **Synthetic CSV**: `{run_id}/synthetic.csv` → Supabase storage bucket `artifacts`
2. **Metrics JSON**: `{run_id}/report.json` → Contains full metrics payload

**Report Service:** `backend/report_service/main.py`
- Generates PDF reports from metrics JSON
- Uses WeasyPrint for HTML→PDF conversion
- Endpoint: `POST /v1/runs/{run_id}/report/pdf`
- Falls back to local PDF generation if service unavailable

**Metrics Structure:**
```json
{
  "utility": {
    "ks_mean": float,
    "corr_delta": float,
    "auroc": null,
    "c_index": null
  },
  "privacy": {
    "mia_auc": float,
    "dup_rate": float,
    "dp_requested": bool,
    "dp_effective": bool,
    "dp_epsilon": float | null
  },
  "fairness": {
    "rare_coverage": float,
    "freq_skew": float
  },
  "meta": {
    "model": str,
    "attempt": int,
    "n_real": int,
    "n_synth": int
  }
}
```

### 5. Background Task Queue

**Function:** `worker_loop()` (line 1792)

**Architecture:**
- **Polling-based**: Checks Supabase `runs` table every `POLL_SECONDS` (default 2.0s)
- **Status-driven**: Queries `status='queued'` runs, processes one at a time
- **Database-driven queue**: No external queue system (Redis, RabbitMQ, etc.)

**Flow:**
1. Polls `runs` table for `status='queued'`
2. Updates run to `status='running'` + sets `started_at`
3. Checks for cancellation before/during execution
4. Calls `execute_pipeline(run, cancellation_checker)`
5. Saves metrics to `metrics` table
6. Saves artifacts to `run_artifacts` table
7. Updates run to `status='succeeded'` or `'failed'`

**Cancellation Support:**
- Checks `status='cancelled'` before starting
- `cancellation_checker` callback passed to pipeline
- Used in training loops to stop early

**Deployment:**
- Runs as separate Docker container (`synth_worker`)
- Single worker instance (no horizontal scaling built-in)
- Logs to stdout/stderr

---

## 3-Step Migration Plan to SynthCity

### Step 1: Replace SDV Models with SynthCity Equivalents ✅ COMPLETED

**Goal:** Migrate core models (GC, CTGAN, TVAE) to SynthCity plugins

**Status:** ✅ **IMPLEMENTED**

**Changes Made:**

1. **Updated `models/synthcity_models.py`:**
   - Expanded `SYNTHCITY_METHOD_MAP` to include all SDV methods:
     ```python
     SYNTHCITY_METHOD_MAP = {
         # Core methods (preferred over SDV)
         "gc": ["gaussian_copula", "gaussiancopula"],
         "ctgan": ["ctgan"],
         "tvae": ["tvae"],
         # Diffusion models (high priority)
         "ddpm": ["ddpm", "tabddpm", "diffusion"],
         # DP methods
         "dp-ctgan": ["dpctgan", "ctgan_dp"],
         "pategan": ["pategan"],
         "dpgan": ["dpgan"],
     }
     ```

2. **Modified `models/factory.py`:**
   - ✅ **SynthCity is now FIRST choice** for all methods (gc, ctgan, tvae, ddpm)
   - ✅ Only falls back to SDV if SynthCity import fails or plugin unavailable
   - ✅ Added logging to track which backend was used
   - ✅ Maintains backward compatibility with SDV fallback
   - ✅ Handles DP methods with proper fallback logic

3. **Backend Selection Logic:**
   ```python
   # Try SynthCity FIRST for all methods
   if method in SYNTHCITY_METHOD_MAP or dp_requested:
       try:
           synthesizer = SynthcitySynthesizer(...)
           logger.info(f"Using SynthCity backend for '{method}'")
           return synthesizer, is_dp
       except (ImportError, NotImplementedError, RuntimeError):
           logger.warning(f"SynthCity failed, falling back to SDV")
           # Continue to SDV fallback
   
   # SDV fallback (only if SynthCity unavailable)
   if method in {"gc", "ctgan", "tvae"}:
       logger.info(f"Using SDV backend for '{method}'")
       return SDV_Synthesizer(...), False
   ```

**Files Modified:**
- ✅ `backend/synth_worker/models/synthcity_models.py`
- ✅ `backend/synth_worker/models/factory.py`

**Features:**
- ✅ SynthCity preferred for gc, ctgan, tvae, ddpm
- ✅ SDV fallback for backward compatibility
- ✅ Logging shows which backend was used
- ✅ DP methods supported (dp-ctgan, pategan, dpgan)
- ✅ DDPM (TabDDPM) added as high-priority method

**Next Steps:**
- Test with real datasets to verify SynthCity models work correctly
- Monitor logs to see backend selection in practice
- Compare metrics between SynthCity and SDV implementations

---

### Step 2: Update Privacy Metrics to Use SynthCity Evaluators

**Goal:** Leverage SynthCity's built-in privacy evaluators instead of custom MIA

**Changes Required:**

1. **Enhance `_privacy_metrics()` in `worker.py`:**
   ```python
   def _privacy_metrics(real: pd.DataFrame, synth: pd.DataFrame) -> Dict[str, Any]:
       # Try SynthCity evaluators first
       try:
           from synthcity.metrics import eval_privacy
           synthcity_metrics = eval_privacy(real, synth)
           return {
               "mia_auc": synthcity_metrics.get("mia_auc"),
               "dup_rate": synthcity_metrics.get("duplicate_rate"),
               "synthcity_evaluated": True
           }
       except (ImportError, Exception):
           # Fallback to existing custom implementation
           return _privacy_metrics_custom(real, synth)
   ```

2. **Keep Custom Implementation as Fallback:**
   - Rename current `_privacy_metrics()` to `_privacy_metrics_custom()`
   - Use when SynthCity unavailable or fails

3. **Add SynthCity Utility Evaluators:**
   - Optionally replace `_utility_metrics()` with SynthCity's `eval_statistical()`
   - Compare KS test, correlation preservation, etc.

**Files to Modify:**
- `backend/synth_worker/worker.py` (lines 715-773)

**Benefits:**
- More comprehensive privacy metrics
- Industry-standard evaluations
- Better comparison across methods

---

### Step 3: Migrate Worker to Use SynthCity Plugin System

**Goal:** Fully leverage SynthCity's plugin architecture and remove SDV dependency

**Changes Required:**

1. **Remove SDV Dependency:**
   - Update `requirements.txt`: Remove `sdv`, keep `synthcity`
   - Remove `models/sdv_models.py` (or keep as legacy fallback)
   - Update metadata handling: Use SynthCity's data schema instead of SDV

2. **Update Metadata Preparation:**
   ```python
   # Replace SDV metadata detection
   # OLD: metadata = SingleTableMetadata(); metadata.detect_from_dataframe(df)
   # NEW: Use SynthCity's DataLoader or direct DataFrame
   
   from synthcity.plugins.core.dataloader import DataLoader
   loader = DataLoader(real_df, sensitive_features=[])
   ```

3. **Simplify Factory:**
   - Remove SDV-specific code paths
   - All methods route through SynthCity plugins
   - Update method name mappings to match SynthCity plugin names

4. **Update Hyperparameter Mapping:**
   - Map existing hyperparams to SynthCity plugin params
   - Document differences in naming conventions
   - Add validation for plugin-specific params

5. **Update Worker Pipeline:**
   - Remove SDV-specific data cleaning (`_clean_df_for_sdv`)
   - Use SynthCity's data preprocessing if needed
   - Simplify schema enforcement (SynthCity handles this better)

**Files to Modify:**
- `backend/synth_worker/worker.py` (multiple functions)
- `backend/synth_worker/models/factory.py`
- `backend/synth_worker/models/base.py` (update interface if needed)
- `backend/synth_worker/requirements.txt`

**Migration Strategy:**
- **Phase 1**: Run both SDV and SynthCity in parallel, compare outputs
- **Phase 2**: Switch default to SynthCity, keep SDV as fallback
- **Phase 3**: Remove SDV entirely after validation period

**Testing Checklist:**
- [ ] All existing methods work (gc, ctgan, tvae)
- [ ] Metrics remain comparable
- [ ] Performance acceptable
- [ ] Privacy guarantees maintained
- [ ] Reports generate correctly
- [ ] Agent planning still works

---

## Additional Considerations

### Backward Compatibility
- Keep SDV models available during transition
- Add feature flag: `USE_SYNTHCITY_ONLY=false` (default true after migration)
- Log which backend was used in metrics

### Performance Impact
- SynthCity may have different training times
- Monitor memory usage (some plugins are more memory-intensive)
- Consider caching trained models if SynthCity supports it

### New Capabilities
- Access to 20+ SynthCity plugins (TimeGAN, ADSGAN, etc.)
- Better DP implementations
- Built-in evaluation metrics
- Active learning support

### Documentation Updates
- Update API docs with new method names
- Document SynthCity-specific hyperparameters
- Migration guide for users

---

## Estimated Timeline

- **Step 1**: 2-3 days (model replacement)
- **Step 2**: 1-2 days (metrics integration)
- **Step 3**: 3-5 days (full migration + testing)
- **Total**: ~1-2 weeks with testing and validation

