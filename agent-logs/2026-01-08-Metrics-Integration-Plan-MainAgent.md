# 2026-01-08 - Metrics Integration Plan - MainAgent

## Status
⏳ In Progress

## Summary
Reviewing and integrating improvements from SyntheticDataSpecialist (auto-optimization system) and ClinicalGradeDataScientist (compliance framework) to achieve "all green" metrics. Fixing metrics insertion TypeError and integrating optimizer/compliance evaluator into main worker pipeline.

## Key Findings / Decisions

### Issues Found:
1. **Metrics Insertion TypeError**: Line 1531 in `worker.py` uses format strings on potentially None values
   - `KS={met.get('utility', {}).get('ks_mean'):.3f}` fails if `ks_mean` is None
   - Same issue for `corr_delta` and `mia_auc`

### Improvements to Integrate:
1. **SyntheticDataSpecialist - Auto-Optimization System**:
   - `backend/synth_worker/optimizer.py` - Root cause analysis, adaptive hyperparameters
   - Retry loop with parameter adjustment
   - Parameter suggestion tables for all methods

2. **ClinicalGradeDataScientist - Compliance Framework**:
   - `backend/libs/compliance.py` - Compliance evaluator with thresholds
   - `backend/libs/model_selector.py` - LLM-powered model selection
   - Enhanced report service with compliance validation

## Code Changes Proposed/Applied (if any)
- To be applied:
  1. Fix metrics insertion TypeError (handle None values)
  2. Integrate optimizer into main worker pipeline
  3. Integrate compliance evaluator into metrics calculation
  4. Add retry loop with auto-optimization
  5. Add compliance validation to run results

## Next Steps / Handoff
- → FixArchitect: Review integration approach for optimizer and compliance
- → SyntheticDataSpecialist: Verify optimizer integration points
- → ClinicalGradeDataScientist: Verify compliance evaluator integration
- → QATester: Test integrated system with various datasets

## Open Questions
- Should optimizer be enabled by default or opt-in?
- Should compliance evaluation be mandatory or optional?

Agent: MainAgent  
Date: 2026-01-08

