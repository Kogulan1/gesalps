# Metric Threshold Alignment Documentation

## Overview

This document provides a comprehensive comparison of metric thresholds across all components of the Gesalp AI system to ensure clinical-grade compliance alignment.

## Threshold Sources

### 1. Compliance Module (`backend/libs/compliance.py`)
**Status**: ✅ Authoritative source for compliance thresholds

**HIPAA_LIKE Level** (Default):
- Privacy: MIA AUC ≤ 0.60, Dup Rate ≤ 5%, k-Anonymity ≥ 5, Identifiability ≤ 0.10, DP Epsilon ≤ 1.0
- Utility: KS Mean ≤ 0.10, Corr Delta ≤ 0.10, Jensen-Shannon ≤ 0.15, AUROC ≥ 0.80, C-Index ≥ 0.70
- Fairness: Rare Coverage ≥ 70%, Freq Skew ≤ 0.30

**CLINICAL_STRICT Level**:
- Privacy: MIA AUC ≤ 0.50, Dup Rate ≤ 3%, k-Anonymity ≥ 10, DP required (ε ≤ 0.5)
- Utility: KS Mean ≤ 0.08, Corr Delta ≤ 0.08
- Fairness: Rare Coverage ≥ 75%, Freq Skew ≤ 0.25

**RESEARCH Level**:
- Privacy: MIA AUC ≤ 0.65, Dup Rate ≤ 10%, k-Anonymity ≥ 3
- Utility: KS Mean ≤ 0.12, Corr Delta ≤ 0.12

### 2. Worker Pipeline (`backend/synth_worker/worker.py`)
**Status**: ✅ Aligned with compliance module

**Environment Variables**:
- `KS_MAX = 0.10` (default)
- `CORR_MAX = 0.10` (default)
- `MIA_MAX = 0.60` (default)

**Function**: `_thresholds_status()` uses these thresholds to determine if metrics pass.

### 3. Optimizer (`backend/synth_worker/optimizer.py`)
**Status**: ✅ Aligned with compliance module

**Hardcoded Thresholds**:
- `KS_MAX = 0.10`
- `CORR_MAX = 0.10`
- `MIA_MAX = 0.60`

**Function**: `analyze_failure()` uses these thresholds to detect failures.

### 4. QA Test Plan (`QA_TEST_PLAN.md`)
**Status**: ✅ Aligned with compliance module

**Documented Thresholds**:
- Privacy: MIA AUC ≤ 0.60, Dup Rate ≤ 5%
- Utility: KS Mean ≤ 0.10, Corr Delta ≤ 0.10, AUROC ≥ 0.80, C-Index ≥ 0.70
- Fairness: Rare Coverage ≥ 70%, Freq Skew ≤ 0.30

### 5. Baseline Metrics (`backend/tests/baseline_metrics.json`)
**Status**: ✅ Aligned with compliance module

**Thresholds Documented**:
- `mia_auc_max: 0.60`
- `dup_rate_max: 0.05`
- `ks_mean_max: 0.10`
- `corr_delta_max: 0.10`
- `auroc_min: 0.80`
- `c_index_min: 0.70`

### 6. Regression Tests (`backend/tests/test_metric_regression.py`)
**Status**: ✅ Aligned with compliance module

**Regression Tolerances**:
- MIA AUC: +0.05 (max increase)
- KS Mean: +0.02 (max increase)
- Corr Delta: +0.02 (max increase)
- Dup Rate: ≤ 0.05 (must remain)

## Alignment Status

### ✅ Fully Aligned Metrics

| Metric | Compliance | Worker | Optimizer | QA Plan | Baseline | Status |
|--------|-----------|--------|-----------|---------|----------|--------|
| MIA AUC | ≤ 0.60 | ≤ 0.60 | ≤ 0.60 | ≤ 0.60 | ≤ 0.60 | ✅ |
| Dup Rate | ≤ 0.05 | N/A | N/A | ≤ 5% | ≤ 0.05 | ✅ |
| KS Mean | ≤ 0.10 | ≤ 0.10 | ≤ 0.10 | ≤ 0.10 | ≤ 0.10 | ✅ |
| Corr Delta | ≤ 0.10 | ≤ 0.10 | ≤ 0.10 | ≤ 0.10 | ≤ 0.10 | ✅ |
| AUROC | ≥ 0.80 | N/A | N/A | ≥ 0.80 | ≥ 0.80 | ✅ |
| C-Index | ≥ 0.70 | N/A | N/A | ≥ 0.70 | ≥ 0.70 | ✅ |

### ⚠️ Compliance-Only Metrics

These metrics are evaluated by the compliance module but not by other components:

| Metric | Compliance Module | Other Components | Notes |
|--------|------------------|------------------|-------|
| k-Anonymity | ≥ 5 (HIPAA) | N/A | Compliance-specific privacy metric |
| Identifiability | ≤ 0.10 | N/A | Compliance-specific privacy metric |
| DP Epsilon | ≤ 1.0 | N/A | Differential Privacy proof |
| DP Delta | ≤ 1e-5 | N/A | Differential Privacy proof |
| Jensen-Shannon | ≤ 0.15 | N/A | Additional utility metric |
| Rare Coverage | ≥ 70% | N/A | Fairness metric |
| Freq Skew | ≤ 0.30 | N/A | Fairness metric |

**Note**: These are expected - compliance module provides additional validation beyond core thresholds.

## Recommendations

### 1. Threshold Consolidation (Future Enhancement)

**Current State**: Thresholds are defined in multiple places (compliance module, worker.py, optimizer.py)

**Proposed Solution**: 
- Use compliance module as single source of truth
- Import thresholds from compliance module in worker.py and optimizer.py
- Update all threshold references to use compliance module

**Benefits**:
- Single point of maintenance
- Guaranteed consistency
- Easier threshold updates
- Better alignment with compliance requirements

**Migration Steps**:
1. Update worker.py to import thresholds from compliance module
2. Update optimizer.py to import thresholds from compliance module
3. Update QA test plan to reference compliance module thresholds
4. Update baseline_metrics.json to reference compliance module thresholds
5. Test all changes to ensure no regressions

**Example Code**:
```python
# In worker.py
from libs.compliance import get_compliance_evaluator

evaluator = get_compliance_evaluator("hipaa_like")
thresholds = evaluator.get_thresholds()
KS_MAX = thresholds["utility"]["ks_mean_max"]
CORR_MAX = thresholds["utility"]["corr_delta_max"]
MIA_MAX = thresholds["privacy"]["mia_auc_max"]
```

### 2. Compliance-Specific Test Cases

**Status**: ✅ Created `backend/tests/test_compliance_thresholds.py`

**Test Coverage**:
- Compliance evaluation with different levels
- Threshold boundary testing
- Violation detection
- Compliance score calculation
- Integration with metrics payload

### 3. Documentation Updates

**Status**: ✅ Created this document

**Additional Documentation Needed**:
- Update QA test plan to reference compliance module
- Add compliance threshold section to worker documentation
- Document threshold migration process

## Validation

### Automated Tests

Run compliance threshold tests:
```bash
cd backend
pytest tests/test_compliance_thresholds.py -v
```

### Manual Verification

1. **Check Threshold Values**:
   ```python
   from libs.compliance import get_compliance_evaluator
   evaluator = get_compliance_evaluator("hipaa_like")
   thresholds = evaluator.get_thresholds()
   print(thresholds)
   ```

2. **Compare with Worker Thresholds**:
   ```python
   # In worker.py
   assert KS_MAX == 0.10
   assert CORR_MAX == 0.10
   assert MIA_MAX == 0.60
   ```

3. **Verify in Tests**:
   ```bash
   pytest tests/test_metric_regression.py::test_baseline_metrics_thresholds -v
   ```

## Conclusion

✅ **All thresholds are aligned and consistent across all components.**

The compliance module serves as the authoritative source for compliance thresholds, and all other components use matching values. The compliance module provides additional metrics (k-anonymity, DP, fairness) that are not evaluated by other components, which is expected and appropriate for clinical-grade compliance.

**Recommendation**: Proceed with current threshold alignment. Consider threshold consolidation as a future enhancement for easier maintenance.
