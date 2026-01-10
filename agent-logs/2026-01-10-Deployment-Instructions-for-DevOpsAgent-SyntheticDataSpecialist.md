# 2026-01-10 - Deployment Instructions for DevOpsAgent - SyntheticDataSpecialist

## Status
⏳ **READY FOR DEPLOYMENT** - All fixes committed and pushed to git

## Summary

All code fixes have been committed and pushed to git. The DevOpsAgent needs to:
1. Pull latest code on VPS
2. Rebuild container (with --no-cache to include preprocessing_agent.py)
3. Restart container
4. Run quality test
5. Iterate until "all green" metrics achieved

## Code Status

✅ **All fixes committed and pushed to git**:
- `preprocessing_agent.py` - OpenRouter model compatibility fix (gemma system prompt)
- `standalone_quality_test.py` - CTGAN parameter fix (epochs → num_epochs)
- `optimizer.py` - CTGAN parameter fix (epochs → num_epochs)
- All files are in git and ready for deployment

## Deployment Steps

### Step 1: Pull Latest Code on VPS
```bash
ssh root@194.34.232.76
cd /opt/gesalps/backend
git pull origin main
```

### Step 2: Verify Files Exist
```bash
# Verify preprocessing_agent.py exists
ls -la synth_worker/preprocessing_agent.py

# Should show: -rw-r--r-- 1 root root 20731 Jan 10 12:33 synth_worker/preprocessing_agent.py
```

### Step 3: Rebuild Container (CRITICAL - Use --no-cache)
```bash
cd /opt/gesalps/backend
docker compose build --no-cache synth-worker
```

**Note**: This will take 10-20 minutes. The `--no-cache` flag is **CRITICAL** to ensure `preprocessing_agent.py` is included in the container.

### Step 4: Restart Container
```bash
docker compose restart synth-worker
```

### Step 5: Verify Preprocessing Agent in Container
```bash
# Verify file exists in container
docker exec gesalps_worker ls -la /app/preprocessing_agent.py

# Verify import works
docker exec gesalps_worker python -c "from preprocessing_agent import get_preprocessing_plan; print('✅ Preprocessing agent OK')"
```

### Step 6: Run Quality Test
```bash
cd /opt/gesalps/backend
docker compose exec -T synth-worker python standalone_quality_test.py
```

## Expected Results After Deployment

### ✅ **Should Work**:
1. Preprocessing agent available in container
2. Preprocessing agent import succeeds
3. OpenRouter calls work (no 400 error for gemma model)
4. CTGAN fallback works (no parameter error)

### ⚠️ **May Still Need Iteration**:
- KS Mean may still be high initially (preprocessing needs to be applied)
- May need multiple test runs to achieve "all green"
- May need to adjust preprocessing strategy based on results

## Success Criteria

**"All Green" Metrics Required**:
1. ✅ KS Mean ≤ 0.10
2. ✅ MIA AUC ≤ 0.60
3. ✅ Compliance Score ≥ 80%
4. ✅ Corr Delta ≤ 0.10 (if calculated)
5. ✅ Dup Rate ≤ 0.05 (if calculated)

## If Test Fails

### If Preprocessing Agent Still Missing:
- Verify `preprocessing_agent.py` exists on VPS: `ls -la synth_worker/preprocessing_agent.py`
- Verify Dockerfile copies synth_worker files: Check `backend/synth_worker/Dockerfile`
- Rebuild with `--no-cache` flag

### If OpenRouter Still Errors:
- Check environment variable: `docker exec gesalps_worker env | grep OPENROUTER_MODEL`
- Verify model name is correct
- Check OpenRouter API key is set

### If KS Mean Still High:
- Check if preprocessing is being called (look for preprocessing logs)
- Verify preprocessing plan is being applied
- May need to adjust preprocessing strategy
- May need to try different models (CTGAN, TVAE)

### If CTGAN Fallback Still Broken:
- Verify `num_epochs` is used (not `epochs`)
- Check optimizer.py and standalone_quality_test.py
- Test CTGAN independently

## Iteration Plan

If "all green" is not achieved on first test:

1. **Analyze Results**:
   - Check KS Mean value
   - Check which metrics failed
   - Review preprocessing logs
   - Review model selection

2. **Adjust Strategy**:
   - If preprocessing not called: Fix integration
   - If preprocessing called but KS still high: Adjust preprocessing plan
   - If model fails: Try alternative model (CTGAN, TVAE)
   - If hyperparameters insufficient: Increase n_iter/num_epochs

3. **Re-run Test**:
   - Make code changes if needed
   - Push to git
   - Pull on VPS
   - Rebuild container (if code changed)
   - Run test again

4. **Repeat Until "All Green"**:
   - Continue iterating until all metrics pass
   - Document each iteration
   - Track improvements

## Files Changed in This Deployment

1. `backend/synth_worker/preprocessing_agent.py`
   - Fixed OpenRouter model compatibility (gemma system prompt issue)
   - Merges system prompt into user prompt for gemma models

2. `backend/standalone_quality_test.py`
   - Fixed CTGAN parameter: `epochs` → `num_epochs`

3. `backend/synth_worker/optimizer.py`
   - Fixed CTGAN parameter: `epochs` → `num_epochs`
   - Updated parameter reading to support both `num_epochs` and `epochs` (backward compatibility)

## Git Commit Information

**Latest Commit**: `b834d87` - "fix: All preprocessing and CTGAN fixes ready for deployment"

**Files Included**:
- `backend/synth_worker/preprocessing_agent.py` (NEW - 20KB)
- `backend/synth_worker/preprocessing.py` (NEW - from BackendAgent)
- `backend/standalone_quality_test.py` (UPDATED)
- `backend/synth_worker/optimizer.py` (UPDATED)
- Multiple agent log files

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: P0 - CRITICAL**

**Action**: Deploy latest code and run quality test until "all green"

**Tasks**:
1. ✅ Pull latest code on VPS: `cd /opt/gesalps/backend && git pull origin main`
2. ✅ Verify `preprocessing_agent.py` exists: `ls -la synth_worker/preprocessing_agent.py`
3. ✅ Rebuild container: `docker compose build --no-cache synth-worker` (10-20 min)
4. ✅ Restart container: `docker compose restart synth-worker`
5. ✅ Verify preprocessing agent: `docker exec gesalps_worker python -c "from preprocessing_agent import get_preprocessing_plan; print('OK')"`
6. ✅ Run quality test: `docker compose exec -T synth-worker python standalone_quality_test.py`
7. ✅ Analyze results
8. ✅ If not "all green", iterate (adjust code, rebuild, retest)
9. ✅ Continue until all metrics pass
10. ✅ Report final results

**Success Criteria**: All metrics "all green" (KS Mean ≤ 0.10, Compliance ≥ 80%, etc.)

---

Agent: SyntheticDataSpecialist  
Date: 2026-01-10  
Priority: P0 - CRITICAL  
Status: ⏳ **READY FOR DEPLOYMENT - AWAITING DEVOPSAGENT**
