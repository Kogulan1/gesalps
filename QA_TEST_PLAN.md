# QA Test Plan - Clinical-Grade Reliability

**Version:** 1.0  
**Date:** 2025-01-27  
**QA Agent:** Comprehensive Testing Matrix

## Overview

This document provides a rigorous testing framework for the Gesalps synthetic data generation platform, ensuring clinical-grade reliability across all components.

---

## Table of Contents

1. [Test Plan Matrix](#test-plan-matrix)
2. [Test Scripts & Commands](#test-scripts--commands)
3. [Expected Results](#expected-results)
4. [Metric Regression Tests](#metric-regression-tests)
5. [Edge Case Scenarios](#edge-case-scenarios)
6. [Test Execution Guide](#test-execution-guide)

---

## Test Plan Matrix

### 1. Unit Tests

#### 1.1 Backend API Unit Tests

| Test ID | Component | Test Case | Priority | Status |
|---------|-----------|-----------|----------|--------|
| UT-API-001 | Authentication | JWT validation with valid token | P0 | ⬜ |
| UT-API-002 | Authentication | JWT validation with invalid token | P0 | ⬜ |
| UT-API-003 | Authentication | JWT validation with expired token | P0 | ⬜ |
| UT-API-004 | Authentication | Missing authorization header | P0 | ⬜ |
| UT-API-005 | Projects | Create project with valid name | P0 | ⬜ |
| UT-API-006 | Projects | Create project with empty name | P1 | ⬜ |
| UT-API-007 | Projects | Create project with special characters | P2 | ⬜ |
| UT-API-008 | Datasets | Upload CSV - valid file | P0 | ⬜ |
| UT-API-009 | Datasets | Upload CSV - file size > 10MB | P0 | ⬜ |
| UT-API-010 | Datasets | Upload CSV - invalid format (not CSV) | P0 | ⬜ |
| UT-API-011 | Datasets | Upload CSV - empty file | P1 | ⬜ |
| UT-API-012 | Datasets | Upload CSV - malformed CSV | P1 | ⬜ |
| UT-API-013 | Datasets | Upload CSV - >5000 rows (free plan) | P0 | ⬜ |
| UT-API-014 | Datasets | Upload CSV - >5000 rows (enterprise) | P0 | ⬜ |
| UT-API-015 | Datasets | Schema inference - numeric columns | P0 | ⬜ |
| UT-API-016 | Datasets | Schema inference - categorical columns | P0 | ⬜ |
| UT-API-017 | Datasets | Schema inference - mixed types | P0 | ⬜ |
| UT-API-018 | Datasets | Schema inference - missing values | P1 | ⬜ |
| UT-API-019 | Runs | Create run - valid dataset_id | P0 | ⬜ |
| UT-API-020 | Runs | Create run - invalid dataset_id | P0 | ⬜ |
| UT-API-021 | Runs | Create run - method="auto" | P0 | ⬜ |
| UT-API-022 | Runs | Create run - method="ddpm" | P0 | ⬜ |
| UT-API-023 | Runs | Create run - method="gc" | P0 | ⬜ |
| UT-API-024 | Runs | Create run - with DP enabled | P0 | ⬜ |
| UT-API-025 | Runs | Get run status - queued | P0 | ⬜ |
| UT-API-026 | Runs | Get run status - running | P0 | ⬜ |
| UT-API-027 | Runs | Get run status - succeeded | P0 | ⬜ |
| UT-API-028 | Runs | Get run status - failed | P0 | ⬜ |
| UT-API-029 | Runs | Get run status - cancelled | P0 | ⬜ |
| UT-API-030 | Runs | Get run status - invalid run_id | P0 | ⬜ |
| UT-API-031 | Runs | Cancel run - queued state | P0 | ⬜ |
| UT-API-032 | Runs | Cancel run - running state | P0 | ⬜ |
| UT-API-033 | Runs | Cancel run - already completed | P1 | ⬜ |
| UT-API-034 | Metrics | Get metrics - valid run_id | P0 | ⬜ |
| UT-API-035 | Metrics | Get metrics - invalid run_id | P0 | ⬜ |
| UT-API-036 | Metrics | Metrics structure validation | P0 | ⬜ |
| UT-API-037 | Artifacts | Get artifacts - valid run_id | P0 | ⬜ |
| UT-API-038 | Artifacts | Get artifacts - invalid run_id | P0 | ⬜ |
| UT-API-039 | Health | Health check endpoint | P0 | ⬜ |

#### 1.2 Worker Unit Tests

| Test ID | Component | Test Case | Priority | Status |
|---------|-----------|-----------|----------|--------|
| UT-WRK-001 | Model Factory | Create synthesizer - "ddpm" | P0 | ⬜ |
| UT-WRK-002 | Model Factory | Create synthesizer - "gc" | P0 | ⬜ |
| UT-WRK-003 | Model Factory | Create synthesizer - "ctgan" | P0 | ⬜ |
| UT-WRK-004 | Model Factory | Create synthesizer - "tvae" | P0 | ⬜ |
| UT-WRK-005 | Model Factory | Create synthesizer - invalid method | P0 | ⬜ |
| UT-WRK-006 | Model Factory | Create synthesizer - with DP options | P0 | ⬜ |
| UT-WRK-007 | Metrics | Privacy metrics - MIA AUC calculation | P0 | ⬜ |
| UT-WRK-008 | Metrics | Privacy metrics - Duplicate rate calculation | P0 | ⬜ |
| UT-WRK-009 | Metrics | Utility metrics - KS test calculation | P0 | ⬜ |
| UT-WRK-010 | Metrics | Utility metrics - Correlation delta | P0 | ⬜ |
| UT-WRK-011 | Metrics | Threshold validation - all pass | P0 | ⬜ |
| UT-WRK-012 | Metrics | Threshold validation - MIA fail | P0 | ⬜ |
| UT-WRK-013 | Metrics | Threshold validation - KS fail | P0 | ⬜ |
| UT-WRK-014 | Post-processing | Quantile matching | P0 | ⬜ |
| UT-WRK-015 | Post-processing | Jitter numeric columns | P1 | ⬜ |
| UT-WRK-016 | Post-processing | Schema dtype enforcement | P0 | ⬜ |
| UT-WRK-017 | Post-processing | Categorical marginals matching | P1 | ⬜ |
| UT-WRK-018 | DP Backend | Custom DP - epsilon validation | P0 | ⬜ |
| UT-WRK-019 | DP Backend | Custom DP - strict mode | P0 | ⬜ |
| UT-WRK-020 | DP Backend | Custom DP - fallback on error | P1 | ⬜ |
| UT-WRK-021 | Agent | Plan generation - balanced tradeoff | P0 | ⬜ |
| UT-WRK-022 | Agent | Plan generation - privacy-first | P0 | ⬜ |
| UT-WRK-023 | Agent | Plan generation - utility-first | P0 | ⬜ |
| UT-WRK-024 | Agent | Re-planning on threshold failure | P0 | ⬜ |

#### 1.3 Frontend Unit Tests

| Test ID | Component | Test Case | Priority | Status |
|---------|-----------|-----------|----------|--------|
| UT-FE-001 | File Upload | CSV file validation | P0 | ⬜ |
| UT-FE-002 | File Upload | File size validation (10MB) | P0 | ⬜ |
| UT-FE-003 | File Upload | Drag & drop functionality | P1 | ⬜ |
| UT-FE-004 | Runs List | Display runs with status | P0 | ⬜ |
| UT-FE-005 | Runs List | Progress bar rendering | P0 | ⬜ |
| UT-FE-006 | Runs List | Cancel button visibility | P0 | ⬜ |
| UT-FE-007 | Report View | Metric display - privacy | P0 | ⬜ |
| UT-FE-008 | Report View | Metric display - utility | P0 | ⬜ |
| UT-FE-009 | Report View | Threshold pass/fail indicators | P0 | ⬜ |
| UT-FE-010 | Agent Timeline | Step display | P0 | ⬜ |
| UT-FE-011 | Agent Timeline | Intervention badges | P1 | ⬜ |
| UT-FE-012 | Real-time Status | Polling mechanism | P0 | ⬜ |
| UT-FE-013 | Real-time Status | Status updates | P0 | ⬜ |

### 2. Integration Tests

#### 2.1 API Integration Tests

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| IT-001 | Full workflow: Create project → Upload dataset → Start run → Get results | P0 | ⬜ |
| IT-002 | Run with TabDDPM method - end-to-end | P0 | ⬜ |
| IT-003 | Run with Gaussian Copula method - end-to-end | P0 | ⬜ |
| IT-004 | Run with CTGAN method - end-to-end | P0 | ⬜ |
| IT-005 | Run with TVAE method - end-to-end | P0 | ⬜ |
| IT-006 | Run with auto method selection | P0 | ⬜ |
| IT-007 | Run with agent mode | P0 | ⬜ |
| IT-008 | Run cancellation workflow | P0 | ⬜ |
| IT-009 | Multiple runs in parallel | P1 | ⬜ |
| IT-010 | Run with DP enabled | P0 | ⬜ |
| IT-011 | Metrics persistence and retrieval | P0 | ⬜ |
| IT-012 | Artifact generation and download | P0 | ⬜ |
| IT-013 | Report PDF generation | P1 | ⬜ |
| IT-014 | Schema inference accuracy | P0 | ⬜ |
| IT-015 | Storage bucket operations | P0 | ⬜ |

#### 2.2 Worker Integration Tests

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| IT-WRK-001 | Worker picks up queued run | P0 | ⬜ |
| IT-WRK-002 | Worker processes run to completion | P0 | ⬜ |
| IT-WRK-003 | Worker handles run cancellation | P0 | ⬜ |
| IT-WRK-004 | Worker retry logic on method failure | P0 | ⬜ |
| IT-WRK-005 | Worker fallback to GC on error | P0 | ⬜ |
| IT-WRK-006 | Worker step logging | P0 | ⬜ |
| IT-WRK-007 | Worker metrics computation | P0 | ⬜ |
| IT-WRK-008 | Worker artifact upload | P0 | ⬜ |
| IT-WRK-009 | Worker agent planning integration | P0 | ⬜ |
| IT-WRK-010 | Worker DP backend integration | P0 | ⬜ |

### 3. End-to-End (E2E) Tests

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| E2E-001 | User login → Create project → Upload CSV → Start run → View results | P0 | ⬜ |
| E2E-002 | User uploads large CSV (5000 rows) → Run completes successfully | P0 | ⬜ |
| E2E-003 | User starts run → Cancels mid-execution → Verifies cancellation | P0 | ⬜ |
| E2E-004 | User views real-time progress updates | P0 | ⬜ |
| E2E-005 | User downloads synthetic CSV artifact | P0 | ⬜ |
| E2E-006 | User downloads PDF report | P1 | ⬜ |
| E2E-007 | User views agent plan and timeline | P0 | ⬜ |
| E2E-008 | User runs with DP enabled → Verifies DP metrics | P0 | ⬜ |
| E2E-009 | User runs multiple datasets in sequence | P1 | ⬜ |
| E2E-010 | User runs with different methods (ddpm, gc, ctgan, tvae) | P0 | ⬜ |

### 4. Edge Case Tests

#### 4.1 Large CSV Handling

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| EC-LARGE-001 | Upload CSV with 10,000 rows (enterprise) | P0 | ⬜ |
| EC-LARGE-002 | Upload CSV with 50,000 rows (enterprise) | P1 | ⬜ |
| EC-LARGE-003 | Upload CSV with 100+ columns | P1 | ⬜ |
| EC-LARGE-004 | Upload CSV at size limit (10MB) | P0 | ⬜ |
| EC-LARGE-005 | Upload CSV just under size limit | P0 | ⬜ |
| EC-LARGE-006 | Run generation on large dataset (memory) | P0 | ⬜ |
| EC-LARGE-007 | Run generation on large dataset (timeout) | P1 | ⬜ |

#### 4.2 Differential Privacy Failures

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| EC-DP-001 | DP enabled with strict=True → Backend unavailable | P0 | ⬜ |
| EC-DP-002 | DP enabled with strict=False → Fallback to non-DP | P0 | ⬜ |
| EC-DP-003 | DP with invalid epsilon (negative) | P0 | ⬜ |
| EC-DP-004 | DP with epsilon=0 | P1 | ⬜ |
| EC-DP-005 | DP with very high epsilon (>100) | P1 | ⬜ |
| EC-DP-006 | DP custom backend error → Fallback | P0 | ⬜ |
| EC-DP-007 | DP metrics validation (epsilon, delta) | P0 | ⬜ |
| EC-DP-008 | DP with method that doesn't support DP | P0 | ⬜ |

#### 4.3 Model Failure Scenarios

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| EC-MODEL-001 | TabDDPM training failure → Fallback to CTGAN | P0 | ⬜ |
| EC-MODEL-002 | CTGAN training failure → Fallback to TVAE | P0 | ⬜ |
| EC-MODEL-003 | TVAE training failure → Fallback to GC | P0 | ⬜ |
| EC-MODEL-004 | All methods fail → Run fails gracefully | P0 | ⬜ |
| EC-MODEL-005 | Model timeout (long training) | P1 | ⬜ |
| EC-MODEL-006 | Model memory error | P1 | ⬜ |
| EC-MODEL-007 | Model with incompatible schema | P0 | ⬜ |

#### 4.4 Data Quality Edge Cases

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| EC-DATA-001 | CSV with 100% missing values in column | P1 | ⬜ |
| EC-DATA-002 | CSV with all identical rows | P1 | ⬜ |
| EC-DATA-003 | CSV with single row | P0 | ⬜ |
| EC-DATA-004 | CSV with single column | P0 | ⬜ |
| EC-DATA-005 | CSV with mixed encodings | P1 | ⬜ |
| EC-DATA-006 | CSV with special characters | P1 | ⬜ |
| EC-DATA-007 | CSV with very high cardinality (>1000 unique) | P1 | ⬜ |
| EC-DATA-008 | CSV with datetime columns | P0 | ⬜ |
| EC-DATA-009 | CSV with boolean columns | P0 | ⬜ |
| EC-DATA-010 | CSV with mixed numeric types (int, float) | P0 | ⬜ |

#### 4.5 Network & Infrastructure Edge Cases

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| EC-NET-001 | Supabase connection timeout | P1 | ⬜ |
| EC-NET-002 | Storage upload failure | P0 | ⬜ |
| EC-NET-003 | Storage download failure | P0 | ⬜ |
| EC-NET-004 | Database connection loss during run | P1 | ⬜ |
| EC-NET-005 | Worker crash during execution | P1 | ⬜ |
| EC-NET-006 | Report service unavailable | P1 | ⬜ |
| EC-NET-007 | Ollama service unavailable (agent mode) | P1 | ⬜ |

### 5. Metric Regression Tests

| Test ID | Test Case | Priority | Status |
|---------|-----------|----------|--------|
| REG-001 | Baseline: heart.csv with TabDDPM - MIA AUC < 0.01 | P0 | ⬜ |
| REG-002 | Baseline: heart.csv with TabDDPM - KS Mean < 0.10 | P0 | ⬜ |
| REG-003 | Baseline: heart.csv with TabDDPM - Corr Delta < 0.10 | P0 | ⬜ |
| REG-004 | Baseline: heart.csv with TabDDPM - Dup Rate < 0.05 | P0 | ⬜ |
| REG-005 | Regression: Compare metrics across versions | P0 | ⬜ |
| REG-006 | Regression: Privacy metrics must not degrade | P0 | ⬜ |
| REG-007 | Regression: Utility metrics must not degrade | P0 | ⬜ |
| REG-008 | Regression: Threshold pass rates must not decrease | P0 | ⬜ |

---

## Test Scripts & Commands

### Prerequisites

```bash
# Install dependencies
cd backend
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx

cd ../frontend
npm install
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### 1. Backend Unit Tests

**File:** `backend/tests/test_api_unit.py`

```bash
# Run all API unit tests
cd backend
pytest tests/test_api_unit.py -v

# Run specific test
pytest tests/test_api_unit.py::test_upload_csv_valid -v

# Run with coverage
pytest tests/test_api_unit.py --cov=api --cov-report=html
```

**File:** `backend/tests/test_worker_unit.py`

```bash
# Run all worker unit tests
pytest tests/test_worker_unit.py -v

# Run metrics tests only
pytest tests/test_worker_unit.py -k metrics -v
```

### 2. Integration Tests

**File:** `backend/tests/test_integration.py`

```bash
# Run all integration tests
pytest tests/test_integration.py -v

# Run specific workflow
pytest tests/test_integration.py::test_full_workflow -v

# Run with real Supabase (requires .env)
pytest tests/test_integration.py --env-file=.env -v
```

**File:** `backend/tests/smoke.http` (REST Client)

```bash
# Use REST Client extension in VS Code
# Or use httpx/curl to execute requests
```

### 3. E2E Tests

**File:** `tests/e2e/test_user_workflow.spec.ts` (Playwright)

```bash
# Install Playwright
cd frontend
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- tests/e2e/test_user_workflow.spec.ts
```

### 4. Edge Case Tests

**File:** `backend/tests/test_edge_cases.py`

```bash
# Run all edge case tests
pytest tests/test_edge_cases.py -v

# Run large CSV tests
pytest tests/test_edge_cases.py -k large -v

# Run DP failure tests
pytest tests/test_edge_cases.py -k dp -v
```

### 5. Standalone TabDDPM Test

**File:** `backend/tests/standalone_ddpm_test.py`

```bash
# Run standalone TabDDPM test
cd backend
python tests/standalone_ddpm_test.py

# Expected: Synthetic data generated, metrics printed
```

### 6. Metric Regression Tests

**File:** `backend/tests/test_metric_regression.py`

```bash
# Run regression tests
pytest tests/test_metric_regression.py -v

# Compare with baseline
pytest tests/test_metric_regression.py --baseline=baseline_metrics.json -v
```

### 7. Quick Smoke Test

```bash
# Quick smoke test script
./scripts/run_smoke_test.sh

# Or manually:
cd backend
python -m pytest tests/test_api_unit.py::test_health_check -v
```

---

## Expected Results

### 1. Unit Test Results

#### API Unit Tests
- **All authentication tests:** ✅ Pass (401 for invalid tokens)
- **File upload tests:** ✅ Pass (413 for >10MB, 400 for invalid CSV)
- **Run creation tests:** ✅ Pass (200 with run_id)
- **Status retrieval tests:** ✅ Pass (200 with status)

#### Worker Unit Tests
- **Model factory tests:** ✅ Pass (correct synthesizer created)
- **Metrics calculation:** ✅ Pass (values within expected ranges)
- **Threshold validation:** ✅ Pass (correct pass/fail determination)

### 2. Integration Test Results

#### Full Workflow
```
✅ Create project: 200 OK, project_id returned
✅ Upload dataset: 200 OK, dataset_id returned
✅ Start run: 200 OK, run_id returned
✅ Poll status: 200 OK, status transitions: queued → running → succeeded
✅ Get metrics: 200 OK, metrics JSON with utility/privacy keys
✅ Get artifacts: 200 OK, signed URLs for CSV and report
```

#### Method-Specific Results

**TabDDPM (ddpm):**
- Training time: 2-5 minutes (300 iterations)
- MIA AUC: < 0.01 (excellent)
- KS Mean: < 0.10 (pass)
- Corr Delta: < 0.10 (pass)
- Dup Rate: < 0.05 (pass)

**Gaussian Copula (gc):**
- Training time: < 10 seconds
- MIA AUC: 0.50-0.80 (may fail threshold)
- KS Mean: 0.05-0.15 (usually pass)
- Corr Delta: 0.08-0.15 (usually pass)
- Dup Rate: < 0.05 (pass)

**CTGAN:**
- Training time: 1-3 minutes
- MIA AUC: 0.40-0.70 (may fail threshold)
- KS Mean: 0.08-0.12 (usually pass)
- Corr Delta: 0.10-0.15 (may fail threshold)
- Dup Rate: < 0.05 (pass)

**TVAE:**
- Training time: 1-2 minutes
- MIA AUC: 0.45-0.75 (may fail threshold)
- KS Mean: 0.08-0.12 (usually pass)
- Corr Delta: 0.10-0.15 (may fail threshold)
- Dup Rate: < 0.05 (pass)

### 3. Edge Case Results

#### Large CSV (10,000 rows)
- ✅ Upload succeeds (enterprise plan)
- ✅ Schema inference completes
- ✅ Run completes in < 10 minutes
- ✅ Memory usage < 2GB
- ✅ Metrics computed successfully

#### DP Failure (strict=False)
- ✅ DP backend error caught
- ✅ Fallback to non-DP model
- ✅ Run completes successfully
- ✅ Metrics indicate `dp_effective: false`

#### Model Failure Chain
- ✅ TabDDPM fails → CTGAN attempted
- ✅ CTGAN fails → TVAE attempted
- ✅ TVAE fails → GC attempted (should succeed)
- ✅ Final metrics from GC

### 4. Metric Thresholds (Pass Criteria)

#### Privacy Metrics
- **MIA AUC:** ≤ 0.60 ✅ (lower is better)
- **Dup Rate:** ≤ 5% ✅ (lower is better)

#### Utility Metrics
- **KS Mean:** ≤ 0.10 ✅ (lower is better)
- **Corr Delta:** ≤ 0.10 ✅ (lower is better)
- **AUROC:** ≥ 0.80 ✅ (higher is better, if applicable)
- **C-Index:** ≥ 0.70 ✅ (higher is better, if applicable)

#### Fairness Metrics (Optional)
- **Rare Coverage:** ≥ 0.70 ✅ (higher is better)
- **Freq Skew:** ≤ 0.30 ✅ (lower is better)

### 5. Performance Benchmarks

| Dataset Size | Method | Expected Time | Memory |
|--------------|---------|---------------|--------|
| 100 rows | GC | < 5s | < 100MB |
| 100 rows | TabDDPM | 30-60s | < 500MB |
| 1,000 rows | GC | < 10s | < 200MB |
| 1,000 rows | TabDDPM | 2-5 min | < 1GB |
| 5,000 rows | GC | < 30s | < 500MB |
| 5,000 rows | TabDDPM | 5-10 min | < 2GB |
| 10,000 rows | GC | < 1 min | < 1GB |
| 10,000 rows | TabDDPM | 10-20 min | < 3GB |

---

## Metric Regression Tests

### Baseline Metrics (heart.csv, TabDDPM)

**File:** `backend/tests/baseline_metrics.json`

```json
{
  "dataset": "heart.csv",
  "method": "ddpm",
  "rows": 302,
  "metrics": {
    "privacy": {
      "mia_auc": 0.003,
      "dup_rate": 0.0
    },
    "utility": {
      "ks_mean": 0.073,
      "corr_delta": 0.103
    }
  },
  "thresholds_passed": {
    "privacy": true,
    "utility": true,
    "all": true
  }
}
```

### Regression Test Criteria

1. **MIA AUC must not increase by > 0.05** (e.g., 0.003 → 0.053 max)
2. **KS Mean must not increase by > 0.02** (e.g., 0.073 → 0.093 max)
3. **Corr Delta must not increase by > 0.02** (e.g., 0.103 → 0.123 max)
4. **Dup Rate must remain < 0.05**
5. **Threshold pass rate must not decrease**

### Running Regression Tests

```bash
# Generate baseline (first run)
cd backend
pytest tests/test_metric_regression.py --save-baseline -v

# Compare against baseline
pytest tests/test_metric_regression.py --baseline=baseline_metrics.json -v

# Flag regressions
pytest tests/test_metric_regression.py --baseline=baseline_metrics.json --fail-on-regression -v
```

---

## Edge Case Scenarios

### 1. Large CSV Handling

**Test Data:** Generate large CSV files
```bash
# Generate 10,000 row CSV
python scripts/generate_test_csv.py --rows 10000 --output large_test.csv

# Generate 100 column CSV
python scripts/generate_test_csv.py --rows 1000 --cols 100 --output wide_test.csv
```

**Expected Behavior:**
- ✅ Upload succeeds (if within limits)
- ✅ Schema inference completes
- ✅ Run processes without memory errors
- ✅ Metrics computed successfully

### 2. DP Failure Scenarios

**Test Cases:**
```python
# Test 1: DP strict=True, backend unavailable
config = {"dp": {"strict": True, "epsilon": 1.0}}
# Expected: Run fails with clear error

# Test 2: DP strict=False, backend unavailable
config = {"dp": {"strict": False, "epsilon": 1.0}}
# Expected: Fallback to non-DP, run succeeds

# Test 3: Invalid epsilon
config = {"dp": {"epsilon": -1.0}}
# Expected: Validation error or default epsilon used
```

### 3. Model Failure Chain

**Test:** Intentionally break TabDDPM, CTGAN, TVAE
```python
# Mock failures
# Expected: GC fallback succeeds
```

### 4. Data Quality Edge Cases

**Test Files:**
- `tests/fixtures/empty_column.csv` - 100% missing values
- `tests/fixtures/single_row.csv` - Minimal data
- `tests/fixtures/high_cardinality.csv` - >1000 unique values
- `tests/fixtures/mixed_encoding.csv` - UTF-8 + Latin-1

---

## Test Execution Guide

### 1. Pre-Test Setup

```bash
# 1. Start services
cd backend
docker compose up -d

# 2. Verify services
curl http://localhost:8000/health
curl http://localhost:8010/health  # Report service

# 3. Set environment variables
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key
export SUPABASE_ANON_KEY=your_anon_key

# 4. Apply database schema
bash scripts/apply_schema.sh
```

### 2. Run Test Suite

```bash
# Full test suite
./scripts/run_all_tests.sh

# Or step by step:
# 1. Unit tests
pytest tests/test_api_unit.py tests/test_worker_unit.py -v

# 2. Integration tests
pytest tests/test_integration.py -v

# 3. Edge cases
pytest tests/test_edge_cases.py -v

# 4. Regression tests
pytest tests/test_metric_regression.py -v
```

### 3. Test Reports

```bash
# Generate HTML coverage report
pytest --cov=api --cov=synth_worker --cov-report=html

# Generate JUnit XML (for CI)
pytest --junitxml=test-results.xml

# Generate JSON report
pytest --json-report --json-report-file=test-report.json
```

### 4. Continuous Integration

**GitHub Actions Example:**
```yaml
name: QA Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/ -v --cov
      - name: Check metrics regression
        run: |
          pytest tests/test_metric_regression.py --baseline=baseline_metrics.json --fail-on-regression
```

---

## Test Data

### Standard Test Datasets

1. **heart.csv** (302 rows, 14 columns)
   - Location: `backend/heart.csv`
   - Use case: Standard regression testing

2. **smoke.csv** (small dataset)
   - Location: `backend/tests/fixtures/smoke.csv`
   - Use case: Quick smoke tests

3. **clinical_trial.csv** (if available)
   - Use case: Clinical data validation

### Generated Test Data

```bash
# Generate test CSVs
python scripts/generate_test_csv.py --rows 1000 --output test_1000.csv
python scripts/generate_test_csv.py --rows 5000 --output test_5000.csv
python scripts/generate_test_csv.py --rows 10000 --output test_10000.csv
```

---

## Success Criteria

### All Tests Must Pass
- ✅ Unit tests: 100% pass rate
- ✅ Integration tests: 100% pass rate
- ✅ E2E tests: 100% pass rate
- ✅ Edge case tests: 100% pass rate (or documented known issues)

### Metrics Must Meet Thresholds
- ✅ Privacy metrics: MIA AUC ≤ 0.60, Dup Rate ≤ 5%
- ✅ Utility metrics: KS Mean ≤ 0.10, Corr Delta ≤ 0.10
- ✅ No metric regressions from baseline

### Performance Must Be Acceptable
- ✅ Small datasets (< 1000 rows): < 5 minutes
- ✅ Medium datasets (1000-5000 rows): < 15 minutes
- ✅ Large datasets (5000-10000 rows): < 30 minutes

---

## Known Issues & Limitations

1. **TabDDPM Training Time:** Can be slow on CPU (5-10 min for 1000 rows)
2. **Memory Usage:** Large datasets (> 10,000 rows) may require > 2GB RAM
3. **DP Backend:** Custom DP backend is a stub, may not provide true DP guarantees
4. **Model Failures:** Some models may fail on edge case schemas

---

## Maintenance

- **Update baseline metrics** after significant changes
- **Review test coverage** quarterly
- **Add new edge cases** as they are discovered
- **Update thresholds** if clinical requirements change

---

**Last Updated:** 2025-01-27  
**Next Review:** 2025-04-27

