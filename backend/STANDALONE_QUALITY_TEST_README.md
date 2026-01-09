# Standalone Quality Test - Pre-Deployment Verification

## Purpose

This script verifies that our synthetic data generation improvements are working and achieving "clinical trial quality all green data" before deploying to production.

## What It Tests

1. **OpenRouter Integration** - Verifies OpenRouter is configured and working
2. **Optimizer Integration** - Tests hyperparameter optimization
3. **Compliance Integration** - Tests compliance evaluation
4. **Full Pipeline** - Tests complete synthetic data generation with Heart dataset
5. **All Green Metrics** - Verifies all thresholds are met (clinical trial quality)

## Quick Start

```bash
cd backend
python standalone_quality_test.py
```

## Requirements

- Python 3.8+
- Dependencies from `requirements.txt`
- `heart.csv` in `backend/` directory
- OpenRouter API key (optional - will use Ollama if not set)

## Expected Output

### Success Case:
```
✅ QUALITY TEST PASSED
✅ Clinical trial quality 'all green' data achieved
✅ Ready for production deployment

DEPLOYMENT APPROVED - All quality checks passed
```

### Failure Case:
```
❌ QUALITY TEST FAILED
❌ Not all metrics passed thresholds

DEPLOYMENT NOT APPROVED - Quality checks failed
```

## Metrics Checked

### Utility Metrics (Must Pass):
- **KS Mean**: ≤ 0.10 (distribution matching)
- **Corr Delta**: ≤ 0.10 (correlation preservation)

### Privacy Metrics (Must Pass):
- **MIA AUC**: ≤ 0.60 (membership inference attack)
- **Dup Rate**: ≤ 0.05 (duplicate rate ≤ 5%)

## What "All Green" Means

All four metrics must pass their thresholds:
- ✅ KS Mean ≤ 0.10
- ✅ Corr Delta ≤ 0.10
- ✅ MIA AUC ≤ 0.60
- ✅ Dup Rate ≤ 0.05

This ensures:
- **High Utility**: Synthetic data closely matches real data distribution
- **Strong Privacy**: Synthetic data protects individual privacy
- **Clinical Trial Quality**: Suitable for clinical research and trials

## Test Results

The script will:
1. Test OpenRouter integration
2. Test optimizer integration
3. Test compliance integration
4. Run full pipeline with Heart dataset
5. Evaluate all metrics
6. Provide pass/fail verdict

## Output Files

- `synthetic_quality_test_heart.csv` - Generated synthetic data (if successful)

## Troubleshooting

### Issue: OpenRouter not available
- **Solution**: Script will use Ollama fallback
- **Impact**: May have slightly lower quality, but should still work

### Issue: Heart dataset not found
- **Solution**: Place `heart.csv` in `backend/` directory
- **Download**: Available in repository or from UCI ML repository

### Issue: Import errors
- **Solution**: Install dependencies: `pip install -r requirements.txt`
- **Check**: Verify all packages are installed

### Issue: Metrics not passing
- **Check**: Review optimizer suggestions
- **Check**: Verify n_iter is high enough (≥300 for TabDDPM)
- **Check**: Review logs for training issues

## Before Deployment

**MUST PASS:**
- ✅ All green metrics achieved
- ✅ OpenRouter integration working (or Ollama fallback)
- ✅ Optimizer providing good suggestions
- ✅ Compliance evaluation working

**If test fails:**
- Review failed metrics
- Check optimizer suggestions
- Verify hyperparameters are applied
- Review training logs
- **DO NOT DEPLOY** until all green is achieved

## Usage in CI/CD

```bash
# In CI/CD pipeline
cd backend
python standalone_quality_test.py
if [ $? -eq 0 ]; then
    echo "Quality test passed - proceeding with deployment"
else
    echo "Quality test failed - blocking deployment"
    exit 1
fi
```

## Example Output

```
================================================================================
                    Clinical Trial Quality Test - Pre-Deployment Verification
================================================================================

✅ Found heart.csv at: /path/to/backend/heart.csv
ℹ️  Loaded: 302 rows, 14 columns

================================================================================
                        Testing OpenRouter Integration
================================================================================

✅ OpenRouter API key found: sk-or-v1-...
✅ ClinicalModelSelector imported successfully
✅ OpenRouter integration working - ClinicalModelSelector returned plan

================================================================================
                        Testing Optimizer Integration
================================================================================

✅ Optimizer imported and initialized
✅ Optimizer suggestions: {
  "n_iter": 300,
  "batch_size": 64
}
✅ n_iter=300 is sufficient (≥300)

================================================================================
                    Running Full Pipeline Test with All Improvements
================================================================================

ℹ️  Prepared data: 302 rows, 14 columns
ℹ️  Optimizer suggested hyperparameters: {
  "n_iter": 300,
  "batch_size": 64
}
ℹ️  Training TabDDPM (this may take a few minutes)...
✅ Training completed in 12.3 seconds
✅ Generated 302 synthetic rows
ℹ️  Evaluating metrics...

================================================================================
                            Test Results Summary
================================================================================

Method Used: DDPM
Attempts: 1
Time: 15.2 seconds

Utility Metrics:
  KS Mean: 0.0650 (threshold: ≤0.10)
  Corr Delta: 0.0820 (threshold: ≤0.10)

Privacy Metrics:
  MIA AUC: 0.0230 (threshold: ≤0.60)
  Dup Rate: 0.0100 (threshold: ≤0.05)

Compliance:
  Status: ✅ PASSED
  Score: 95.00%
  Violations: 0

All Green Status:
✅ ALL GREEN ACHIEVED - Clinical Trial Quality ✅
✅ Ready for production deployment!

================================================================================
                              Final Verdict
================================================================================

✅ QUALITY TEST PASSED
✅ Clinical trial quality 'all green' data achieved
✅ Ready for production deployment

================================================================================
        DEPLOYMENT APPROVED - All quality checks passed
================================================================================
```
