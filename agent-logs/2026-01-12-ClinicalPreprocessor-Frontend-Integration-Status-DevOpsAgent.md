# 2026-01-12 - ClinicalPreprocessor Frontend Integration Status - DevOpsAgent

## Status
⚠️ **NOT FULLY INTEGRATED** - ClinicalPreprocessor is available but not used in production worker pipeline

## Summary
Verified the connection between the new frontend (Quick Config UI, Real-Time Progress Dashboard) and ClinicalPreprocessor. ClinicalPreprocessor is deployed and available, but it's **not currently integrated** into the production worker pipeline.

## Integration Flow Analysis

### ✅ Frontend → Backend API (CONNECTED)

**Frontend Components:**
1. **QuickConfigCard** (`frontend/components/runs/QuickConfigCard.tsx`)
   - ✅ Sends config to `handleStartRun` callback
   - ✅ Config includes: `name`, `privacy_level`, `mode: 'agent'`

2. **NewRunLayout** (`frontend/components/runs/NewRunLayout.tsx`)
   - ✅ Calls `POST /v1/runs` endpoint
   - ✅ Sends: `project_id`, `dataset_id`, `...config`
   - ✅ Receives: `run_id` for tracking

3. **RealTimeProgressDashboard** (`frontend/components/runs/RealTimeProgressDashboard.tsx`)
   - ✅ Polls backend for run status
   - ✅ Displays live progress and metrics

**API Endpoint:**
- ✅ `POST /v1/runs` - Handles run creation
- ✅ Located in `backend/api/main.py`
- ✅ Calls `execute_pipeline()` in worker

### ✅ Backend API → Worker (CONNECTED)

**API Flow:**
1. `POST /v1/runs` receives request
2. Creates run record in database
3. Calls `execute_pipeline(run)` in worker
4. Returns `run_id` to frontend

### ⚠️ Worker Pipeline → ClinicalPreprocessor (NOT CONNECTED)

**Current Worker Pipeline:**
- ✅ Uses `get_preprocessing_plan()` from `preprocessing_agent.py`
- ✅ Uses OpenRouter LLM for preprocessing
- ❌ **Does NOT use ClinicalPreprocessor**

**ClinicalPreprocessor Status:**
- ✅ File exists: `/app/clinical_preprocessor.py`
- ✅ Importable in worker
- ❌ **Not referenced in `worker.py`**
- ❌ **Not used in `execute_pipeline()`**

## Where ClinicalPreprocessor IS Used

### ✅ Benchmarks (Local)
1. **`local_benchmarks/finalize_and_generalize.py`**
   - Uses ClinicalPreprocessor for TVAE models
   - Pattern: Fit → Transform → Train TVAE → Sample → Inverse Transform

2. **`local_benchmarks/run_benchmark_with_retry.py`**
   - Uses ClinicalPreprocessor for GreenGuard benchmarks
   - Mocks `get_preprocessing_plan` to use ClinicalPreprocessor

### ❌ Production Worker
- **NOT used** in `backend/synth_worker/worker.py`
- **NOT used** in `execute_pipeline()`
- **NOT integrated** with TVAE models in production

## Integration Gap

### Current Production Flow:
```
Frontend (QuickConfigCard)
  ↓ POST /v1/runs
Backend API
  ↓ execute_pipeline()
Worker
  ↓ get_preprocessing_plan() [OpenRouter LLM]
Preprocessing Agent
  ↓ Preprocessed data
Model Training (TVAE/CTGAN/DDPM)
  ↓ Synthetic data
```

### Expected Flow (with ClinicalPreprocessor):
```
Frontend (QuickConfigCard)
  ↓ POST /v1/runs
Backend API
  ↓ execute_pipeline()
Worker
  ↓ ClinicalPreprocessor.fit() + transform() [for TVAE]
  ↓ Model Training (TVAE on transformed data)
  ↓ Model.sample()
  ↓ ClinicalPreprocessor.inverse_transform()
  ↓ Synthetic data
```

## Recommendation

### Option 1: Integrate ClinicalPreprocessor for TVAE Models
**When**: TVAE method is selected
**How**: 
1. Add ClinicalPreprocessor to `execute_pipeline()` in `worker.py`
2. Use it before TVAE training (fit + transform)
3. Use inverse_transform after TVAE sampling
4. Keep OpenRouter preprocessing as fallback/alternative

### Option 2: Use ClinicalPreprocessor as Alternative Preprocessing
**When**: User selects "Clinical Mode" or specific config
**How**:
1. Add config option: `use_clinical_preprocessor: true`
2. If enabled, use ClinicalPreprocessor instead of OpenRouter preprocessing
3. Works for all models (not just TVAE)

### Option 3: Keep Current Setup (OpenRouter Only)
**When**: Current preprocessing is sufficient
**How**:
- ClinicalPreprocessor remains for benchmarks only
- Production uses OpenRouter LLM preprocessing

## Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend → API | ✅ Connected | QuickConfigCard → POST /v1/runs |
| API → Worker | ✅ Connected | execute_pipeline() called |
| Worker → ClinicalPreprocessor | ❌ Not Connected | Not used in production |
| ClinicalPreprocessor Available | ✅ Yes | File exists, importable |
| ClinicalPreprocessor Used | ❌ No | Only in benchmarks |

## Next Steps

1. **Decision Required**: Should ClinicalPreprocessor be integrated into production?
   - If YES: Integrate into `execute_pipeline()` for TVAE models
   - If NO: Document that it's benchmark-only

2. **If Integrating**:
   - Add ClinicalPreprocessor to `execute_pipeline()` in `worker.py`
   - Use for TVAE models (fit → transform → train → sample → inverse_transform)
   - Test with real datasets
   - Verify metrics improvement

3. **Frontend Integration**:
   - ✅ Already connected (no changes needed)
   - Frontend will automatically benefit once backend integrates ClinicalPreprocessor

## Conclusion

**Frontend Integration**: ✅ **CONNECTED** - New frontend properly calls backend API

**ClinicalPreprocessor Integration**: ⚠️ **NOT CONNECTED** - Available but not used in production worker pipeline

**Action Required**: Decision needed on whether to integrate ClinicalPreprocessor into production worker for TVAE models.

---

**Owner**: DevOpsAgent  
**Completed**: 2026-01-12  
**Status**: ⚠️ Integration Gap Identified
