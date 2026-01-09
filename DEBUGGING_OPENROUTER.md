# Debugging OpenRouter Integration

## Quick Checklist

### 1. Verify API Key is Set
```bash
# In backend directory
cd backend
grep OPENROUTER_API_KEY .env
```

Should show:
```
OPENROUTER_API_KEY=sk-or-v1-...
```

### 2. Check Logs for OpenRouter Usage

**In Worker Logs:**
```bash
docker-compose logs worker | grep -i openrouter
```

Look for:
- `[worker][agent][openrouter] Re-planning with OpenRouter`
- `[worker][clinical-selector] Enhanced hyperparameters for ... via OpenRouter`

**In API Logs:**
```bash
docker-compose logs api | grep -i openrouter
```

Look for:
- OpenRouter API calls in `_agent_plan_internal`

### 3. Verify ClinicalModelSelector is Called

```bash
docker-compose logs worker | grep -i "clinical-selector"
```

Should see:
- `[worker][clinical-selector] selected method='...' via ClinicalModelSelector`
- `[worker][clinical-selector] Enhanced hyperparameters for ... via OpenRouter`

### 4. Check OpenRouter Dashboard

1. Go to https://openrouter.ai/activity
2. Check for API calls
3. Verify model: `mistralai/mistral-small-24b-instruct:free`
4. Check for errors or rate limits

## Common Issues

### Issue: OpenRouter Not Called

**Symptoms:**
- No API usage in OpenRouter dashboard
- Logs show Ollama usage instead

**Solutions:**
1. **Check API Key:**
   ```bash
   echo $OPENROUTER_API_KEY
   ```
   If empty, add to `.env` file

2. **Restart Services:**
   ```bash
   docker-compose restart api worker
   ```

3. **Check Environment Variable Loading:**
   ```bash
   docker-compose exec api env | grep OPENROUTER
   ```

### Issue: ClinicalModelSelector Not Called

**Symptoms:**
- No `[worker][clinical-selector]` logs
- Method selection uses schema heuristics only

**Solutions:**
1. **Check Import:**
   ```bash
   docker-compose logs worker | grep -i "clinical.*selector"
   ```
   Should not show import errors

2. **Verify Path:**
   - Check `backend/libs/model_selector.py` exists
   - Verify Python path includes `backend/`

3. **Check Method Selection:**
   - If method is pre-selected, ClinicalModelSelector still called for hyperparameters
   - Check logs for `Enhanced hyperparameters`

### Issue: Performance Not Improving

**Possible Causes:**
1. **OpenRouter Not Actually Called:**
   - Check logs for OpenRouter usage
   - Verify API key is correct

2. **Hyperparameters Not Applied:**
   - Check logs for `Applying optimized hyperparams`
   - Verify `current_hparams` includes optimized values

3. **Method Not Optimal:**
   - ClinicalModelSelector may suggest different method
   - Check logs for `selected method='...' via ClinicalModelSelector`

4. **Dataset Too Small/Simple:**
   - Small datasets may not show significant improvement
   - Complex datasets show more benefit

## Testing OpenRouter Integration

### Test 1: Verify API Key Works
```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/mistral-small-24b-instruct:free",
    "messages": [{"role": "user", "content": "test"}]
  }'
```

### Test 2: Check Worker Can Import
```bash
docker-compose exec worker python -c "
import sys
sys.path.insert(0, '/app')
from libs.model_selector import ClinicalModelSelector
print('Import successful')
"
```

### Test 3: Test ClinicalModelSelector Directly
```bash
docker-compose exec worker python -c "
import sys
sys.path.insert(0, '/app')
import pandas as pd
from libs.model_selector import select_model_for_dataset

df = pd.DataFrame({'age': [25, 30, 35], 'income': [50000, 60000, 70000]})
result = select_model_for_dataset(df)
print('Result:', result)
"
```

## Expected Behavior

### When OpenRouter is Configured:
1. **Initial Planning** (API):
   - `_agent_plan_internal` uses OpenRouter
   - Creates plan with method and hyperparameters

2. **Worker Execution**:
   - ClinicalModelSelector called (uses OpenRouter)
   - Gets optimized hyperparameters
   - Merges with config hyperparameters

3. **Agent Re-planning** (Worker):
   - `_agent_plan_ollama` uses OpenRouter
   - Re-plans if metrics fail thresholds

### Log Messages to Look For:

**Success:**
```
[worker][clinical-selector] selected method='ddpm' via ClinicalModelSelector
[worker][clinical-selector] Enhanced hyperparameters for ddpm via OpenRouter: {"n_iter": 400, "batch_size": 256}
[worker][agent][openrouter] Re-planning with OpenRouter model: mistralai/mistral-small-24b-instruct:free
```

**Failure (Fallback):**
```
[worker][clinical-selector] failed, falling back to schema heuristics: ...
[worker][agent][openrouter] OpenRouter failed, falling back to Ollama: ...
```

## Next Steps if Still Not Working

1. **Check Docker Environment:**
   ```bash
   docker-compose exec api printenv | grep OPENROUTER
   docker-compose exec worker printenv | grep OPENROUTER
   ```

2. **Verify Code is Updated:**
   ```bash
   grep -n "USE_OPENROUTER" backend/synth_worker/worker.py
   grep -n "OPENROUTER_API_KEY" backend/synth_worker/worker.py
   ```

3. **Check for Import Errors:**
   ```bash
   docker-compose logs worker | grep -i "import.*error\|module.*not.*found"
   ```

4. **Test with Simple Run:**
   - Create small test dataset
   - Start run in agent mode
   - Check logs immediately
