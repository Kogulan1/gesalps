# 2026-01-10 - Eval Modules API Fix - DevOpsAgent - MainAgent

## Status
⏳ Assigned to DevOpsAgent - P0 Critical

## Summary
Standalone quality test script fails in production with error: `eval_privacy` and `eval_statistical` are modules, not callable functions. This suggests incorrect API usage or environment difference. Training completes successfully, but metrics evaluation fails. Need to fix the API calls to use correct module structure.

## Key Findings / Decisions

### 🔴 **Problem Identified**:

**Error**: `eval_privacy` and `eval_statistical` are modules, not callable functions

**Context**:
- Training completes successfully ✅
- KS metric checking fails ❌
- Script works in different environment but fails in production
- Suggests incorrect API usage or import issue

**Impact**:
- **CRITICAL**: Metrics cannot be calculated
- Quality test cannot complete
- Cannot verify "all green" status
- Blocks deployment verification

### 🔍 **Root Cause Analysis**:

**Possible Causes**:
1. **Incorrect Import**: Importing modules instead of functions
2. **Incorrect API Call**: Calling modules as functions instead of using correct API
3. **Environment Difference**: Different SynthCity version or structure
4. **API Change**: SynthCity API may have changed between environments

**Expected Behavior**:
- `eval_privacy` and `eval_statistical` should be callable
- Or should be accessed via correct module structure
- Need to verify correct SynthCity API usage

### 📋 **What Needs Investigation**:

1. **Check Current Usage**:
   - How are `eval_privacy` and `eval_statistical` currently imported?
   - How are they being called?
   - What error message exactly?

2. **Check SynthCity Documentation**:
   - What is the correct API for these evaluators?
   - Are they modules or functions?
   - What is the correct way to call them?

3. **Check Environment**:
   - What SynthCity version is in production?
   - What version was used in working environment?
   - Are there version differences?

4. **Fix API Calls**:
   - Update imports if needed
   - Update function calls to use correct API
   - Test in production environment

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: P0 - CRITICAL - Blocks Quality Test**

**Action**: Fix eval_privacy and eval_statistical API calls in standalone_quality_test.py

**Tasks**:

1. **Investigate Current Usage**:
   ```bash
   # SSH to VPS
   ssh root@194.34.232.76
   cd /opt/gesalps/backend
   
   # Check how eval_privacy/eval_statistical are used
   grep -n "eval_privacy\|eval_statistical" standalone_quality_test.py
   
   # Check error in container
   docker compose exec synth-worker python -c "from synthcity.plugins.core.plugin import Plugin; import synthcity.metrics.eval_privacy as ep; print(type(ep))"
   ```

2. **Check SynthCity API**:
   ```bash
   # In container, check SynthCity structure
   docker compose exec synth-worker python -c "
   import synthcity.metrics.eval_privacy as ep
   import synthcity.metrics.eval_statistical as es
   print('eval_privacy type:', type(ep))
   print('eval_statistical type:', type(es))
   print('eval_privacy dir:', dir(ep)[:10])
   print('eval_statistical dir:', dir(es)[:10])
   "
   ```

3. **Find Correct API**:
   - Check if they're modules with functions inside
   - Check if they need to be called differently
   - Look for correct function names (e.g., `eval_privacy.evaluate()`, `eval_privacy.privacy()`)

4. **Fix standalone_quality_test.py**:
   - Update imports if needed
   - Update function calls to use correct API
   - Test fix in container

5. **Verify Fix**:
   ```bash
   # Test the fix
   docker compose exec -T synth-worker python standalone_quality_test.py
   
   # Should complete without eval_privacy/eval_statistical errors
   ```

**Expected Deliverables**:
- Fixed `standalone_quality_test.py` with correct API calls
- Verification that metrics can be calculated
- Test results showing metrics calculated correctly

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

### → **SyntheticDataSpecialist**: 
**INFO: Eval Modules API Issue**

**What This Means**:
- Standalone test fails on metrics evaluation
- `eval_privacy` and `eval_statistical` API usage incorrect
- Need to fix API calls

**If DevOpsAgent Needs Help**:
- Provide correct SynthCity API usage
- Verify correct function signatures
- Test fix locally if possible

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

## Code Changes Proposed/Applied (if any)
- None yet - need to investigate first

## Open Questions
- What is the exact error message?
- What SynthCity version is in production?
- How are eval_privacy/eval_statistical supposed to be called?
- What was the working environment configuration?

---

Agent: MainAgent  
Date: 2026-01-10  
Priority: P0 - Critical - Blocks Quality Test  
Status: Assigned to DevOpsAgent
