# 2026-01-09 - OpenRouter Agent Mode Fix - SyntheticDataSpecialist

## Status
✅ Completed

## Summary
Fixed critical issues preventing OpenRouter from being used in agent mode. The `_agent_plan_ollama` function was hardcoded to only use Ollama, and ClinicalModelSelector wasn't being called when a method was already selected. Now OpenRouter is used for all agent re-planning, and ClinicalModelSelector is called even when method is pre-selected to get optimized hyperparameters.

## Issues Found

### Issue 1: OpenRouter Not Called in Agent Mode
**Problem**: `_agent_plan_ollama` function was hardcoded to only use Ollama
- Function name suggested Ollama-only
- Checked for provider == "ollama" and returned empty if not
- Used `_ollama_generate` function directly
- No OpenRouter integration

**Impact**: OpenRouter API key was set but never used in agent mode re-planning

### Issue 2: ClinicalModelSelector Bypassed
**Problem**: ClinicalModelSelector only called when `method` is not set
- If API creates plan with method, ClinicalModelSelector is skipped
- Missed opportunity for better hyperparameters
- OpenRouter not called for initial model selection

**Impact**: OpenRouter not used for initial planning, only for re-planning (which also wasn't working)

## Fixes Applied

### File: `backend/synth_worker/worker.py`

1. **Line ~86-93**: Added OpenRouter configuration
   ```python
   OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
   OPENROUTER_BASE = os.getenv("OPENROUTER_BASE", "https://openrouter.ai/api/v1")
   OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or "mistralai/mistral-small-24b-instruct:free"
   USE_OPENROUTER = bool(OPENROUTER_API_KEY)
   ```

2. **Line ~1069-1100**: Completely rewrote `_agent_plan_ollama` function
   - Removed Ollama-only restriction
   - Added OpenRouter support with automatic fallback
   - Uses OpenRouter if API key available
   - Falls back to Ollama if OpenRouter unavailable
   - Added logging to show which provider is used

3. **Line ~1146-1200**: Enhanced ClinicalModelSelector integration
   - Now called even when method is pre-selected
   - Extracts optimized hyperparameters from ClinicalModelSelector
   - Merges with existing hyperparameters
   - Ensures OpenRouter is called for hyperparameter optimization

**Key Changes**:
```python
# OpenRouter support in agent re-planning
if USE_OPENROUTER:
    # Use OpenRouter API
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [...],
        "response_format": {"type": "json_object"},
    }
    # ... make API call
else:
    # Fallback to Ollama
    text = _ollama_generate(...)

# ClinicalModelSelector even when method is set
if CLINICAL_SELECTOR_AVAILABLE and method:
    # Get optimized hyperparameters
    plan = select_model_for_dataset(...)
    # Extract and merge hyperparameters
```

## Expected Results

### Before Fix
- **OpenRouter Usage**: 0% (never called)
- **Agent Re-planning**: Used Ollama only
- **Hyperparameter Optimization**: Missed when method pre-selected
- **Performance**: No improvement from OpenRouter

### After Fix
- **OpenRouter Usage**: 100% (when API key set)
- **Agent Re-planning**: Uses OpenRouter (better quality)
- **Hyperparameter Optimization**: Always called
- **Performance**: Better model selection and hyperparameters

## Testing

### Test 1: Verify OpenRouter is Called
1. Set `OPENROUTER_API_KEY` in environment
2. Start a run in agent mode
3. Check logs for: `[worker][agent][openrouter] Re-planning with OpenRouter`
4. Check OpenRouter dashboard for API usage

### Test 2: Verify ClinicalModelSelector is Called
1. Start a run with method pre-selected (e.g., "ddpm")
2. Check logs for: `[worker][clinical-selector] Enhanced hyperparameters`
3. Verify hyperparameters are optimized

### Test 3: Verify Fallback Works
1. Remove `OPENROUTER_API_KEY` from environment
2. Start a run in agent mode
3. Check logs for Ollama usage (fallback should work)

## Next Steps / Handoff

- → **QA Tester**: Test OpenRouter integration:
  - Verify OpenRouter API calls in agent mode
  - Check OpenRouter dashboard for usage
  - Test with and without API key
  - Verify performance improvements
- → **DevOps Agent**: Deploy updated code:
  - Ensure `OPENROUTER_API_KEY` is set in production
  - Monitor OpenRouter API usage
  - Check logs for OpenRouter calls

## Debugging

If OpenRouter still not being called:

1. **Check Environment Variable**:
   ```bash
   echo $OPENROUTER_API_KEY
   ```

2. **Check Logs**:
   ```bash
   docker-compose logs worker | grep -i openrouter
   ```

3. **Verify API Key**:
   - Check OpenRouter dashboard
   - Verify key is correct
   - Check for rate limits

4. **Check Provider Setting**:
   - Verify `agent_provider` is not forcing "ollama"
   - Should be "openrouter" or None

Agent: SyntheticDataSpecialist  
Date: 2026-01-09
