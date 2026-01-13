# Clinical Preprocessor v18 + TabDDPM Integration

## Summary

Integrated Clinical Preprocessor v18 with TabDDPM (state-of-the-art diffusion model) to improve synthetic data quality and achieve "all green" metrics.

## Changes Made

### 1. Worker Integration (`backend/synth_worker/worker.py`)

**Before:** Clinical Preprocessor v18 was only used for TVAE models.

**After:** Clinical Preprocessor v18 is now used for both:
- **TVAE** (existing)
- **TabDDPM** (new) - State-of-the-art diffusion model

### Integration Points

1. **Legacy Loop (lines 2229-2268):**
   - Clinical preprocessor now applies to `ddpm`, `tabddpm`, and `tvae` methods
   - Transforms data before training
   - Applies inverse transform after sampling

2. **Plan Attempt Helper (lines 2875-2917):**
   - Clinical preprocessor now applies to `ddpm`, `tabddpm`, and `tvae` methods
   - Same transform/inverse transform flow

### Flow for TabDDPM with Clinical Preprocessor v18

```
1. Load real data (real_clean)
   ↓
2. ClinicalPreprocessor.fit(real_clean, metadata)
   ↓
3. real_train = ClinicalPreprocessor.transform(real_clean)
   ↓
4. TabDDPM.fit(real_train)  [trained on transformed data]
   ↓
5. synth = TabDDPM.sample(num_rows=n)  [synthetic data in transformed space]
   ↓
6. synth_final = ClinicalPreprocessor.inverse_transform(synth)  [back to original space]
   ↓
7. Evaluate metrics on synth_final
```

## Verification Script

Created `scripts/verify_run_logs.py` to check:
- Which method was used (should be `ddpm` for TabDDPM)
- Whether Clinical Preprocessor v18 was used
- Metrics achieved (KS Mean, Corr Δ, MIA AUC)
- Whether "all green" metrics were achieved

### Usage

```bash
# Verify a specific run
python scripts/verify_run_logs.py <run_id>

# Example
python scripts/verify_run_logs.py abc123-def456-ghi789
```

### What It Checks

1. **Run Details:**
   - Method used (should be `ddpm` for TabDDPM)
   - Status, timestamps
   - Agent plan and rationale

2. **Clinical Preprocessor Usage:**
   - Searches run steps for `[worker][clinical-preprocessor]` logs
   - Verifies preprocessor was initialized and used

3. **Metrics:**
   - KS Mean (target: ≤0.10)
   - Corr Δ (target: ≤0.10)
   - MIA AUC (target: ≤0.60)
   - Reports if "all green" achieved

## Expected Log Output

When TabDDPM uses Clinical Preprocessor v18, you should see:

```
[worker][clinical-preprocessor] Initializing ClinicalPreprocessor for TabDDPM (v18)...
[worker][clinical-preprocessor] Data transformed for TabDDPM training (v18)
[worker][clinical-preprocessor] Applying inverse transform for TabDDPM (v18)...
[worker][clinical-preprocessor] Data restored to original space (v18)
```

## Benefits

1. **Better Data Quality:** Clinical preprocessor handles:
   - Medical code encoding (ICD-10, CPT, etc.)
   - Clinical data normalization
   - Domain-specific transformations

2. **Improved Metrics:** Should help achieve:
   - KS Mean ≤ 0.10 ✅
   - Corr Δ ≤ 0.10 ✅
   - MIA AUC ≤ 0.60 ✅

3. **State-of-the-Art:** Combines:
   - TabDDPM (2025 SOTA diffusion model)
   - Clinical Preprocessor v18 (domain-specific preprocessing)

## Testing

After deploying, verify:
1. Run a new synthesis with TabDDPM
2. Check logs for clinical preprocessor messages
3. Run verification script: `python scripts/verify_run_logs.py <run_id>`
4. Verify metrics are "all green"

## Notes

- Clinical preprocessor is optional (falls back gracefully if unavailable)
- Works with both agent mode and custom mode
- Compatible with existing TVAE workflows
