# QA Testing - Quick Start Guide

## Quick Commands

### Run All Tests
```bash
cd backend
./scripts/run_all_tests.sh
```

### Run Specific Test Suites
```bash
# Unit tests only
pytest tests/test_api_unit.py -v

# Integration tests (requires Supabase)
pytest tests/test_integration.py -v

# Edge cases
pytest tests/test_edge_cases.py -v

# Metric regression
pytest tests/test_metric_regression.py -v
```

### Run with Coverage
```bash
pytest --cov=api --cov=synth_worker --cov-report=html
open htmlcov/index.html  # View coverage report
```

### Generate Test Data
```bash
# Generate 1000 row CSV
python scripts/generate_test_csv.py --rows 1000 --output test_1000.csv

# Generate wide CSV (100 columns)
python scripts/generate_test_csv.py --rows 1000 --cols 100 --output test_wide.csv
```

## Test Categories

### 1. Unit Tests (`test_api_unit.py`)
- Fast, isolated tests
- No external dependencies
- Tests individual functions/endpoints

### 2. Integration Tests (`test_integration.py`)
- Tests full workflows
- Requires Supabase connection
- Tests database operations

### 3. Edge Cases (`test_edge_cases.py`)
- Large CSVs
- DP failures
- Model failures
- Data quality issues

### 4. Regression Tests (`test_metric_regression.py`)
- Compares metrics against baseline
- Flags metric degradation
- Ensures quality doesn't degrade

## Expected Results

### ✅ Passing Tests
- All unit tests: 100% pass
- Integration tests: Pass (if Supabase configured)
- Edge cases: Pass or documented known issues
- Regression: No metric degradation

### Metric Thresholds
- **Privacy:** MIA AUC ≤ 0.60, Dup Rate ≤ 5%
- **Utility:** KS Mean ≤ 0.10, Corr Delta ≤ 0.10

## Troubleshooting

### Tests Fail with Import Errors
```bash
# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx
```

### Integration Tests Skip
- Check `.env` file exists
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### Tests Timeout
- Increase timeout: `pytest --timeout=300`
- Check worker is running: `docker compose ps`

## Full Documentation

See `QA_TEST_PLAN.md` for complete test matrix and detailed documentation.

