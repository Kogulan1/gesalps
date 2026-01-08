# 2026-01-08 - Metrics Integration Instructions - MainAgent

## Status
✅ Completed

## Summary
Created integration plan and instructions for SyntheticDataSpecialist and ClinicalGradeDataScientist to integrate their improvements into the main worker pipeline. Fixed metrics insertion TypeError. Integration will add auto-optimization and compliance evaluation to achieve "all green" metrics.

## Key Findings / Decisions

### Fixed Issues:
1. **Metrics Insertion TypeError** - Fixed format string error on line 1531
   - Changed from: `KS={met.get('utility', {}).get('ks_mean'):.3f}`
   - Changed to: Safe formatting with None checks

### Integration Points Identified:
1. **Optimizer Integration**:
   - Import optimizer at top of `worker.py`
   - Use `optimizer.suggest_hyperparameters()` before training attempts
   - Use `optimizer.analyze_failure()` when metrics fail thresholds
   - Add retry loop with optimized parameters (up to 3 attempts)

2. **Compliance Integration**:
   - Import compliance evaluator at top of `worker.py`
   - Evaluate compliance after metrics calculation
   - Add compliance results to final metrics payload
   - Log compliance violations and scores

## Code Changes Proposed/Applied (if any)

### Fixed:
- File: `backend/synth_worker/worker.py` (line 1531-1538)
  - Fixed TypeError in metrics logging
  - Added None-safe formatting for KS, Corr, MIA values

### To Be Integrated (by specialists):
1. **SyntheticDataSpecialist**:
   - Add optimizer import and initialization
   - Integrate `suggest_hyperparameters()` before training
   - Integrate `analyze_failure()` in retry loop
   - Add auto-retry with parameter adjustment (up to 3 attempts)

2. **ClinicalGradeDataScientist**:
   - Add compliance evaluator import and initialization
   - Integrate compliance evaluation after metrics calculation
   - Add compliance results to metrics payload
   - Log compliance violations

## Next Steps / Handoff

### → SyntheticDataSpecialist:
**Task**: Integrate optimizer into `backend/synth_worker/worker.py`

**Integration Points**:
1. **Import** (add after line 35):
   ```python
   try:
       from synth_worker.optimizer import SyntheticDataOptimizer
       optimizer = SyntheticDataOptimizer()
   except ImportError:
       optimizer = None
   ```

2. **Before Training** (around line 1403, before `_apply_defaults`):
   ```python
   # Get optimizer suggestions if available
   if optimizer:
       dataset_size = (len(real_clean), len(real_clean.columns))
       suggested_hp = optimizer.suggest_hyperparameters(
           method=user_explicit_method,
           dataset_size=dataset_size,
           previous_metrics=None,  # Could use last_metrics if available
           dp_requested=False,
       )
       # Merge with defaults
       first["hyperparams"] = {**_apply_defaults(user_explicit_method), **suggested_hp}
   ```

3. **After Metrics Calculation** (around line 1522, after `_thresholds_status`):
   ```python
   # If metrics fail, analyze failure and suggest retry
   if not ok and optimizer and i < 3:  # Allow up to 3 attempts
       dataset_size = (len(real_clean), len(real_clean.columns))
       failure_type, root_cause, suggestions = optimizer.analyze_failure(
           metrics=met,
           hyperparams=item.get("hyperparams", {}),
           method=item.get("method"),
           dataset_size=dataset_size,
       )
       print(f"[worker][optimizer] Failure: {failure_type.value}, Root cause: {root_cause}")
       print(f"[worker][optimizer] Suggestions: {suggestions}")
       
       # Get optimized hyperparameters for retry
       optimized_hp = optimizer.suggest_hyperparameters(
           method=item.get("method"),
           dataset_size=dataset_size,
           previous_metrics=met,
           dp_requested=False,
       )
       # Update item for next iteration (if retry logic is added)
       # For now, just log suggestions
   ```

**Expected Result**: 
- Optimizer suggests better hyperparameters based on dataset size
- Failure analysis provides actionable suggestions
- Retry loop (if implemented) automatically adjusts parameters

### → ClinicalGradeDataScientist:
**Task**: Integrate compliance evaluator into `backend/synth_worker/worker.py`

**Integration Points**:
1. **Import** (add after line 35):
   ```python
   try:
       from libs.compliance import ComplianceEvaluator, ComplianceLevel
       compliance_evaluator = ComplianceEvaluator(ComplianceLevel.HIPAA_LIKE)
   except ImportError:
       compliance_evaluator = None
   ```

2. **After Metrics Calculation** (around line 1564, before composing final metrics):
   ```python
   # Evaluate compliance
   compliance_result = None
   if compliance_evaluator and chosen:
       try:
           compliance_result = compliance_evaluator.evaluate(
               metrics=chosen["metrics"],
               method=chosen.get("method"),
               hyperparams=current_hparams,
           )
           print(f"[worker][compliance] Score: {compliance_result.score:.2f}, Passed: {compliance_result.passed}")
           if compliance_result.violations:
               print(f"[worker][compliance] Violations: {len(compliance_result.violations)}")
       except Exception as e:
           print(f"[worker][compliance] Error evaluating compliance: {e}")
   ```

3. **Add to Final Metrics** (around line 1564, in final_metrics composition):
   ```python
   final_metrics = {
       "utility": chosen["metrics"].get("utility", {}),
       "privacy": chosen["metrics"].get("privacy", {}),
       "fairness": chosen["metrics"].get("fairness", {}),
   }
   if compliance_result:
       final_metrics["compliance"] = {
           "score": compliance_result.score,
           "passed": compliance_result.passed,
           "level": compliance_result.level.value,
           "violations": [
               {
                   "metric": v.metric,
                   "threshold": v.threshold,
                   "actual": v.actual,
                   "severity": v.severity.value,
               }
               for v in compliance_result.violations
           ],
       }
   ```

**Expected Result**:
- Compliance evaluation runs after metrics calculation
- Compliance score and violations added to metrics payload
- Compliance status visible in run results

## Open Questions
- Should optimizer retry loop be enabled by default or opt-in via config?
- Should compliance evaluation be mandatory or optional?
- What compliance level should be default? (HIPAA_LIKE recommended)

Agent: MainAgent  
Date: 2026-01-08

