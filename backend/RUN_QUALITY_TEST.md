# How to Run the Quality Test

## Option 1: Run in Docker (Recommended)

The easiest way is to run the test inside the Docker container where all dependencies are already installed:

```bash
cd backend
docker-compose exec worker python standalone_quality_test.py
```

Or if containers aren't running:

```bash
cd backend
docker-compose run --rm worker python standalone_quality_test.py
```

## Option 2: Install Dependencies Locally

If you want to run locally, install all dependencies:

```bash
cd backend
pip install -r requirements.txt
pip install -r synth_worker/requirements.txt
python standalone_quality_test.py
```

## Option 3: Use Python Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r synth_worker/requirements.txt
python standalone_quality_test.py
```

## Expected Runtime

- **Fast test**: ~2-5 minutes (with TabDDPM, n_iter=300)
- **Full test**: ~10-20 minutes (if testing multiple methods)

## What the Test Does

1. ✅ Loads Heart dataset (clinical data)
2. ✅ Tests OpenRouter integration (falls back to Ollama if not configured)
3. ✅ Tests Optimizer integration (hyperparameter suggestions)
4. ✅ Tests Compliance integration
5. ✅ Runs full pipeline with TabDDPM
6. ✅ Evaluates all metrics (KS Mean, Corr Delta, MIA AUC, Dup Rate)
7. ✅ Provides pass/fail verdict

## Success Criteria

**All Green Metrics:**
- KS Mean ≤ 0.10 ✅
- Corr Delta ≤ 0.10 ✅
- MIA AUC ≤ 0.60 ✅
- Dup Rate ≤ 0.05 ✅

If all pass → **DEPLOYMENT APPROVED** ✅
If any fail → **DEPLOYMENT NOT APPROVED** ❌

## Troubleshooting

### Issue: ModuleNotFoundError
**Solution**: Install dependencies or run in Docker

### Issue: OpenRouter not configured
**Solution**: Test will use Ollama fallback (still works, just slower)

### Issue: Heart dataset not found
**Solution**: Ensure `heart.csv` is in `backend/` directory

### Issue: Test takes too long
**Solution**: This is normal - TabDDPM training takes time. Consider reducing `n_iter` in optimizer for faster tests.
