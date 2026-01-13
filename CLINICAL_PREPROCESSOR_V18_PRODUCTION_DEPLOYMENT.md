# Clinical Preprocessor v18 + TabDDPM Production Deployment Guide

## Status: ✅ Ready for Production Deployment

This guide ensures Clinical Preprocessor v18 is properly deployed and integrated with TabDDPM in production to achieve "all green" metrics.

## What Was Changed

### Code Changes (Already Committed)
1. **`backend/synth_worker/worker.py`**:
   - Integrated Clinical Preprocessor v18 with TabDDPM (ddpm/tabddpm methods)
   - Previously only used for TVAE, now supports both TVAE and TabDDPM
   - Transform → Train → Sample → Inverse Transform flow

2. **`scripts/verify_run_logs.py`**:
   - New verification script to check run logs
   - Verifies method used, preprocessor usage, and metrics

## Pre-Deployment Verification

### ✅ Step 1: Verify Code is Committed
```bash
cd /Users/kogulan/Desktop/gesalps
git log --oneline -5
# Should see: "feat: Integrate Clinical Preprocessor v18 with TabDDPM"
```

### ✅ Step 2: Verify Clinical Preprocessor File Exists
```bash
cd backend
ls -la synth_worker/clinical_preprocessor.py
# Should show the file exists
```

### ✅ Step 3: Verify Dockerfile Includes Clinical Preprocessor
The Dockerfile at `backend/synth_worker/Dockerfile` line 40 copies the entire `synth_worker/` directory:
```dockerfile
COPY synth_worker/ /app/
```
This automatically includes `clinical_preprocessor.py`.

## Production Deployment Steps

### Option A: Deploy via Git (Recommended)

**On Production VPS:**

```bash
# 1. SSH to production VPS
ssh root@your-vps-ip

# 2. Navigate to backend directory
cd /opt/gesalps/backend

# 3. Pull latest code
git pull origin main

# 4. Verify clinical_preprocessor.py is present
ls -la synth_worker/clinical_preprocessor.py

# 5. Rebuild and deploy worker
./deploy.sh synth-worker

# OR deploy all services
./deploy.sh all
```

### Option B: Manual Docker Build

```bash
# On production VPS
cd /opt/gesalps/backend

# Build worker image
docker compose -f docker-compose.prod.yml build synth-worker

# Deploy worker
docker compose -f docker-compose.prod.yml up -d synth-worker

# Verify worker is running
docker compose -f docker-compose.prod.yml ps synth-worker
docker compose -f docker-compose.prod.yml logs synth-worker | tail -50
```

## Post-Deployment Verification

### Step 1: Verify Clinical Preprocessor is Available in Container

```bash
# On production VPS
docker compose -f docker-compose.prod.yml exec synth-worker ls -la /app/clinical_preprocessor.py
# Should show the file exists

# Test import
docker compose -f docker-compose.prod.yml exec synth-worker python -c "from clinical_preprocessor import ClinicalPreprocessor; print('✅ Clinical Preprocessor available')"
```

### Step 2: Check Worker Logs for Integration

```bash
# Watch worker logs
docker compose -f docker-compose.prod.yml logs -f synth-worker | grep -i "clinical-preprocessor"
```

Expected output when TabDDPM uses Clinical Preprocessor:
```
[worker][clinical-preprocessor] Initializing ClinicalPreprocessor for TabDDPM (v18)...
[worker][clinical-preprocessor] Data transformed for TabDDPM training (v18)
[worker][clinical-preprocessor] Applying inverse transform for TabDDPM (v18)...
[worker][clinical-preprocessor] Data restored to original space (v18)
```

### Step 3: Run a Test Synthesis

1. **Start a new run** via frontend (use TabDDPM method)
2. **Monitor logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f synth-worker
   ```
3. **Verify preprocessor is used** (look for `[worker][clinical-preprocessor]` messages)

### Step 4: Verify Run Logs

After a run completes, use the verification script:

```bash
# On local machine (or VPS if script is available)
cd /Users/kogulan/Desktop/gesalps
python scripts/verify_run_logs.py <run_id>
```

Expected output:
```
--- Summary ---
  Method Used: ddpm
  Clinical Preprocessor v18 Used: YES
  
  ✅ ALL GREEN METRICS ACHIEVED!
```

## Troubleshooting

### Issue: Clinical Preprocessor Not Found

**Symptoms:**
- Logs show: `[worker][clinical-preprocessor] Preprocessing failed: ...`
- No preprocessor messages in logs

**Solution:**
1. Verify file exists in container:
   ```bash
   docker compose exec synth-worker ls -la /app/clinical_preprocessor.py
   ```
2. If missing, rebuild container:
   ```bash
   docker compose build synth-worker
   docker compose up -d synth-worker
   ```

### Issue: Import Error

**Symptoms:**
- `ImportError: cannot import name 'ClinicalPreprocessor'`

**Solution:**
1. Check Python path in container:
   ```bash
   docker compose exec synth-worker python -c "import sys; print(sys.path)"
   ```
2. Verify file is in `/app/` directory
3. Check file permissions

### Issue: Preprocessor Not Used for TabDDPM

**Symptoms:**
- TabDDPM runs but no preprocessor messages
- Method is `ddpm` but preprocessor not detected

**Solution:**
1. Verify code changes are deployed:
   ```bash
   docker compose exec synth-worker grep -A 5 "if current_method in" /app/worker.py
   ```
2. Should show: `if current_method in ("tvae", "ddpm", "tabddpm")`
3. If not, redeploy with latest code

## Expected Behavior

### Before Integration
- TabDDPM runs without Clinical Preprocessor
- Metrics may not achieve "all green"
- No preprocessor logs

### After Integration
- TabDDPM uses Clinical Preprocessor v18
- Data is transformed before training
- Synthetic data is inverse transformed after sampling
- Better metrics (should achieve "all green")
- Logs show preprocessor usage

## Success Criteria

✅ **Deployment Successful When:**
1. Clinical Preprocessor file exists in container
2. Worker logs show preprocessor initialization for TabDDPM
3. Test run completes successfully
4. Verification script confirms preprocessor was used
5. Metrics achieve "all green" (KS Mean ≤ 0.10, Corr Δ ≤ 0.10, MIA AUC ≤ 0.60)

## Rollback Plan

If issues occur, rollback to previous version:

```bash
# On production VPS
cd /opt/gesalps/backend

# Checkout previous commit
git log --oneline -10  # Find commit before integration
git checkout <previous-commit-hash>

# Rebuild and deploy
./deploy.sh synth-worker
```

## Notes

- Clinical Preprocessor is **optional** - if unavailable, falls back gracefully
- Works with both **agent mode** and **custom mode**
- Compatible with existing **TVAE** workflows
- **TabDDPM** is the state-of-the-art method (2025 SOTA diffusion model)
- Integration combines TabDDPM + Clinical Preprocessor v18 for best results

## Support

If you encounter issues:
1. Check worker logs: `docker compose logs synth-worker`
2. Verify file exists: `docker compose exec synth-worker ls -la /app/clinical_preprocessor.py`
3. Test import: `docker compose exec synth-worker python -c "from clinical_preprocessor import ClinicalPreprocessor"`
4. Check code: `docker compose exec synth-worker grep -A 10 "CLINICAL_PREPROCESSOR_AVAILABLE" /app/worker.py`
