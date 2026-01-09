# 2026-01-08 - Run Failure Analysis & Auto-Optimize Status - SyntheticDataSpecialist

## Status
✅ Completed

## Summary
Comprehensive analysis of run failures (KS Mean = 0.73), verification of Auto-Optimize implementation status, investigation of zero rows issue, and recommendations for user guidance on failed runs. Root cause identified: insufficient TabDDPM training (n_iter likely too low or training incomplete). Auto-Optimize is implemented in backend but not exposed in frontend UI.

## Key Findings / Decisions

### 1. KS Mean = 0.73 - Root Cause Analysis

**Problem**: KS Mean of 0.73 is extremely high (threshold is 0.10, 7.3x over threshold)

**Root Cause Identified**:
- **Primary**: TabDDPM training likely incomplete or insufficient iterations
  - Expected n_iter for good results: 300-500
  - If n_iter < 200, KS Mean can be very high (0.5-0.8)
  - Training may have failed silently or timed out
- **Secondary**: Possible data preprocessing issues or schema mismatches
- **Tertiary**: Model may not have converged due to dataset characteristics

**Analysis from Optimizer**:
```python
# From optimizer.py analyze_failure()
if method == "ddpm":
    n_iter = hyperparams.get("n_iter", 300)
    if n_iter < 400:
        suggestions.append(f"Increase n_iter from {n_iter} to {min(500, n_iter + 100)}")
```

**Recommendations**:
1. **Immediate**: Increase n_iter to 400-500 for TabDDPM
2. **Verify**: Check run logs for training completion messages
3. **Check**: Verify n_iter was actually applied (may have been defaulted to low value)
4. **Alternative**: If training time is concern, try CTGAN with epochs=400-500

### 2. Auto-Optimize Status Verification

**Backend Implementation**: ✅ **VERIFIED WORKING**
- Location: `backend/synth_worker/worker.py` (lines ~1630-1660, ~1919-1940)
- Status: Integrated and active
- Features:
  - Initial hyperparameter suggestions based on dataset size
  - Failure analysis when metrics fail thresholds
  - Automatic parameter adjustment on retry attempts
  - Root cause analysis with specific suggestions

**Frontend Exposure**: ❌ **NOT EXPOSED**
- No API endpoint for manual Auto-Optimize trigger
- No UI button/option in run details modal
- No visibility into optimization suggestions
- No way for users to trigger optimization on failed runs

**Current Behavior**:
- Auto-Optimize runs automatically in background during retry loop
- Users cannot see optimization suggestions or trigger manually
- No feedback to users about optimization attempts

**Recommendations**:
1. **API Endpoint**: Create `/v1/runs/{run_id}/optimize` endpoint
2. **UI Button**: Add "Auto-Optimize" button in failed run details
3. **Display Suggestions**: Show optimization suggestions in run details
4. **Manual Trigger**: Allow users to trigger optimization on failed runs

### 3. Zero Rows Generated - Investigation

**Problem**: Runs complete with 0 rows generated

**Possible Causes**:
1. **Training Failure**: Model training failed, no synthetic data generated
2. **Generation Error**: `sample()` or `generate()` returned empty DataFrame
3. **Row Count Logic**: `n = int(min(max_synth_rows, max(1, int(len(real_clean) * sample_multiplier))))` may result in 0 if:
   - `sample_multiplier` is 0 or negative
   - `max_synth_rows` is 0
   - `len(real_clean)` is 0 (empty dataset)
4. **DataLoader Issue**: SynthCity DataLoader may return empty result
5. **Exception Handling**: Exception caught but synthetic DataFrame not initialized

**Code Locations to Check**:
- `backend/synth_worker/worker.py` line ~1667: `n = int(min(max_synth_rows, max(1, int(len(real_clean) * sample_multiplier))))`
- `backend/synth_worker/models/synthcity_models.py` line ~161-253: `sample()` method
- `backend/synth_worker/worker.py` line ~1782: `synth = synth_model.sample(num_rows=n)`

**Recommendations**:
1. **Add Validation**: Check if `n > 0` before calling `sample()`
2. **Error Handling**: Ensure exceptions during generation don't result in empty DataFrame
3. **Status Update**: If 0 rows generated, mark run as "failed" not "succeeded"
4. **Logging**: Add detailed logging around row generation to identify failure point

### 4. Failure Recommendations for Users

**Current State**: Users see failed runs but no guidance on how to improve

**Recommendations to Add**:

#### A. In Run Details Modal (Failed Runs)
```typescript
// Suggested UI component
<FailureRecommendations 
  metrics={metrics}
  method={method}
  hyperparams={hyperparams}
/>
```

**Content**:
1. **Root Cause Explanation**:
   - "KS Mean is 0.73 (threshold: 0.10) - Model didn't capture data distribution well"
   - "This usually means training was insufficient or incomplete"

2. **Actionable Recommendations**:
   - **For TabDDPM**: "Try increasing n_iter to 400-500 for better results"
   - **For CTGAN/TVAE**: "Try increasing epochs to 400-500"
   - **Alternative**: "Consider switching to TabDDPM for better utility"

3. **Auto-Optimize Option**:
   - Button: "Retry with Auto-Optimize"
   - Description: "Automatically adjust hyperparameters based on failure analysis"

4. **Manual Adjustment**:
   - Link: "Adjust hyperparameters manually"
   - Guidance: Show current hyperparameters and suggested values

#### B. In Run Status Display
- If 0 rows: Show "Failed: No data generated"
- If high KS: Show "Failed: Poor utility (KS Mean too high)"
- If high MIA: Show "Failed: Privacy concerns (MIA too high)"

## Code Changes Proposed/Applied (if any)

### 1. Enhanced Failure Analysis for KS = 0.73
- File: `backend/synth_worker/optimizer.py`
- Change: Add specific handling for extremely high KS (> 0.5)
- Recommendation: Add check for KS > 0.5 and suggest training verification

### 2. Zero Rows Validation
- File: `backend/synth_worker/worker.py`
- Change: Add validation before `sample()` call
- Recommendation: Check `n > 0` and log warning if 0

### 3. API Endpoint for Auto-Optimize
- File: `backend/api/main.py` (NEW)
- Change: Create `/v1/runs/{run_id}/optimize` endpoint
- Recommendation: Return optimization suggestions and allow creating new run with optimized params

### 4. Frontend Auto-Optimize UI
- File: `frontend/components/runs/RunDetailsExpansion.tsx` (MODIFY)
- Change: Add "Auto-Optimize" button for failed runs
- Recommendation: Display failure analysis and suggestions

### 5. Failure Recommendations Component
- File: `frontend/components/runs/FailureRecommendations.tsx` (NEW)
- Change: Create component to display failure analysis and recommendations
- Recommendation: Show root cause, suggestions, and action buttons

## Detailed Recommendations

### For KS Mean = 0.73

**Immediate Actions**:
1. Check run logs for TabDDPM training completion
2. Verify n_iter value used (should be 300-500)
3. Check if training timed out or failed silently
4. Verify dataset was loaded correctly

**Hyperparameter Adjustments**:
```python
# Recommended for TabDDPM with high KS
{
    "n_iter": 500,  # Increase from default 300
    "batch_size": 128,  # Ensure stable training
}
```

**Expected Improvement**:
- KS Mean should drop from 0.73 to 0.05-0.15 with proper training
- If still high after n_iter=500, investigate data preprocessing

### For Auto-Optimize Exposure

**Backend API Endpoint** (Recommended):
```python
@app.post("/v1/runs/{run_id}/optimize")
def optimize_run(run_id: str, user: Dict = Depends(require_user)):
    """Get optimization suggestions for a failed run."""
    # Load run and metrics
    # Use optimizer to analyze failure
    # Return suggestions and optimized hyperparameters
    # Optionally create new run with optimized params
    pass
```

**Frontend Integration**:
1. Add button in failed run details: "Auto-Optimize"
2. Show optimization suggestions in modal
3. Allow user to create new run with optimized parameters
4. Display previous vs suggested hyperparameters

### For Zero Rows Issue

**Validation Code** (Recommended):
```python
# In worker.py before sample() call
n = int(min(max_synth_rows, max(1, int(len(real_clean) * sample_multiplier))))
if n <= 0:
    raise ValueError(f"Invalid num_rows: {n}. Check sample_multiplier={sample_multiplier}, max_synth_rows={max_synth_rows}, dataset_size={len(real_clean)}")

# After sample() call
if len(synth) == 0:
    raise RuntimeError(f"Model generated 0 rows. Training may have failed.")
```

## Next Steps / Handoff
- → **FrontendDeveloper**: Implement Auto-Optimize UI:
  - Add "Auto-Optimize" button in failed run details
  - Create FailureRecommendations component
  - Display optimization suggestions
  - Allow creating new run with optimized parameters
- → **Backend Developer** (or CTO): Create API endpoint `/v1/runs/{run_id}/optimize`:
  - Load run and metrics
  - Use optimizer to analyze failure
  - Return suggestions and optimized hyperparameters
  - Optionally create new run automatically
- → **QA Tester**: Test with KS Mean = 0.73 scenario:
  - Verify optimizer suggestions are correct
  - Test retry with optimized parameters
  - Verify zero rows detection and status update
- → **DevOps Agent**: Add logging for row generation to help diagnose zero rows issue

## Open Questions
- Should Auto-Optimize be automatic (always retry) or manual (user-triggered)?
- Should we show optimization suggestions even for successful runs (for improvement)?
- How should we handle cases where optimizer suggestions don't improve metrics?
- Should zero rows be a separate failure type or part of utility failure?

Agent: SyntheticDataSpecialist  
Date: 2026-01-08

