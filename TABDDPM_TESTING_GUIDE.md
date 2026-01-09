# TabDDPM Testing Guide

## Deployment Status ✅

- **Code deployed**: Latest fixes are live on Contabo VPS
- **Worker restarted**: Container rebuilt and running
- **Fixes applied**:
  1. TabDDPM no longer converts to GC
  2. Hyperparameters (n_iter=200) are now applied
  3. Debug logging added for verification

## How to Test

### Step 1: Start a New TabDDPM Run

1. Go to **gesalpai.ch** and log in
2. Navigate to your project (or create a new one)
3. Upload **heart.csv** (302 rows) or use an existing dataset
4. Click **"Start Run"**
5. **Select "TabDDPM (Diffusion - Highest Fidelity)"** as the method
6. Click **"Run"**

### Step 2: Monitor the Run

While the run is executing, check the logs:

```bash
# On your local machine:
ssh root@194.34.232.76 "cd /root/gesalps_new/backend && docker compose logs -f synth-worker" | grep -E "TabDDPM|ddpm|n_iter"
```

**Expected log messages:**
```
[factory][TabDDPM] Initializing with n_iter=200, batch_size=64
[worker][TabDDPM] Starting training with n_iter=200 (this may take 5-15 minutes)
[worker][training] ddpm training completed in ~12-15s
```

### Step 3: Verify After Completion

Once the run completes, note the **Run ID** from the UI, then run:

```bash
./verify_tabddpm_run.sh <run_id>
```

**Expected results:**
- **Model**: `ddpm` (NOT `gc`)
- **n_iter**: `200` (for 302 rows)
- **batch_size**: `64` (for 302 rows)
- **MIA AUC**: `~0.003-0.05` (NOT `0.818` like GC)
- **KS Mean**: `~0.05-0.08`
- **Training time**: `~12-15 seconds` (NOT `1.5s`)

## What to Look For

### ✅ Success Indicators

1. **Logs show TabDDPM initialization:**
   ```
   [factory][TabDDPM] Initializing with n_iter=200, batch_size=64
   ```

2. **Training takes 12-15 seconds** (not 1.5s):
   ```
   [worker][training] ddpm training completed in 12.5s
   ```

3. **Metrics show ddpm model:**
   ```
   Model: ddpm
   MIA AUC: 0.003-0.05
   ```

### ❌ Failure Indicators

1. **Model shows as "gc"** - Fix didn't work
2. **Training completes in <2 seconds** - Hyperparameters not applied
3. **MIA AUC > 0.5** - Using GC instead of TabDDPM
4. **No TabDDPM log messages** - Method not being used

## Quick Verification Commands

### Check Recent Runs
```bash
ssh root@194.34.232.76 "docker exec gesalps_worker python3 -c \"
import supabase, os
sb = supabase.create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
runs = sb.table('runs').select('id,method,status,started_at').order('started_at', desc=True).limit(5).execute()
for r in runs.data:
    print(f\"{r['id']}: {r.get('method', 'N/A')} - {r.get('status', 'N/A')}\")
\" 2>&1 | grep -v 'CONFIG'"
```

### Check Worker Logs for TabDDPM
```bash
ssh root@194.34.232.76 "cd /root/gesalps_new/backend && docker compose logs synth-worker --tail=200 2>&1 | grep -E 'TabDDPM|ddpm|factory.*ddpm'"
```

### Check Metrics for a Specific Run
```bash
# Replace RUN_ID with actual run ID
./verify_tabddpm_run.sh <RUN_ID>
```

## Troubleshooting

### If TabDDPM still shows as GC:
1. Check if code was pulled: `ssh root@194.34.232.76 "cd /root/gesalps_new/backend && git log --oneline -1"`
2. Verify container was rebuilt: `ssh root@194.34.232.76 "cd /root/gesalps_new/backend && docker compose ps synth-worker"`
3. Check logs for errors: `ssh root@194.34.232.76 "cd /root/gesalps_new/backend && docker compose logs synth-worker --tail=50"`

### If training is still too fast:
1. Check hyperparameters in logs: Look for `[factory][TabDDPM] Initializing with n_iter=...`
2. Verify `_defaults()` is being called: Check for `_apply_defaults` in logs
3. Check if method is being passed correctly: Look for `[worker][agent] User explicitly selected method: 'ddpm'`

## Next Steps

After successful verification:
1. ✅ TabDDPM is working correctly
2. ✅ Metrics show excellent privacy (MIA AUC ~0.003)
3. ✅ Training time is appropriate (~12-15s for n_iter=200)
4. ✅ Ready for production use

