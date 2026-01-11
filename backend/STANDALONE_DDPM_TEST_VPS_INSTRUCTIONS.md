# Standalone DDPM Test - VPS Execution Instructions

## Environment Details (Where It Was Successfully Run)

The `standalone_ddpm_test.py` script that achieved **KS Mean 0.0650** was designed to run in a **Docker container** with the following specifications:

### Container Environment

- **Container Name**: `gesalps_worker` (or service name: `synth-worker`)
- **Working Directory**: `/app`
- **Python Version**: 3.11 (from Docker image)
- **Base Image**: `python:3.11-slim` (from synth_worker Dockerfile)

### Required Files

1. **Script**: `standalone_ddpm_test.py` → `/app/standalone_ddpm_test.py`
2. **Dataset**: `heart.csv` → `/app/heart.csv`

### Dependencies (Already in Container)

The container already has all required dependencies:
- `pandas`
- `synthcity` (with eval_privacy, eval_statistical)
- `numpy`
- All other dependencies from `synth_worker/requirements.txt`

## How to Run on Production VPS

### Step 1: SSH to VPS
```bash
ssh root@194.34.232.76
```

### Step 2: Navigate to Backend Directory
```bash
cd /opt/gesalps/backend
```

### Step 3: Ensure Container is Running
```bash
# Check if container is running
docker compose ps synth-worker

# If not running, start it
docker compose up -d synth-worker

# Wait a few seconds for container to be ready
sleep 5
```

### Step 4: Copy Files to Container
```bash
# Copy the standalone script
docker cp standalone_ddpm_test.py gesalps_worker:/app/standalone_ddpm_test.py

# Copy heart.csv (if not already in container)
docker cp heart.csv gesalps_worker:/app/heart.csv
```

### Step 5: Run the Script
```bash
# Run in container's /app directory
docker exec -w /app gesalps_worker python standalone_ddpm_test.py
```

## Alternative: One-Line Command

If files are already in the backend directory on VPS:

```bash
cd /opt/gesalps/backend && \
docker cp standalone_ddpm_test.py gesalps_worker:/app/standalone_ddpm_test.py && \
docker cp heart.csv gesalps_worker:/app/heart.csv && \
docker exec -w /app gesalps_worker python standalone_ddpm_test.py
```

## Expected Output

The script should:
1. Load heart.csv (302 rows, 14 columns)
2. Train TabDDPM with n_iter=500
3. Generate synthetic data
4. Evaluate metrics using `eval_privacy()` and `eval_statistical()`
5. Print results:
   - MIA AUC
   - Duplicate rate
   - KS Complement
   - Feature Coverage

## Expected Metrics (From Previous Successful Run)

- **KS Mean**: 0.0650 ✅ (calculated as 1 - KS Complement)
- **MIA AUC**: Low (excellent privacy)
- **Duplicate Rate**: Low (< 0.05)
- **KS Complement**: ~0.935 (higher = better)

## Key Differences from standalone_quality_test.py

The `standalone_ddpm_test.py` script is simpler and uses:

1. **Direct SynthCity API**:
   ```python
   from synthcity.metrics import eval_privacy, eval_statistical
   privacy = eval_privacy(df, synthetic_df)
   utility = eval_statistical(df, synthetic_df)
   ```

2. **Raw Data** (no preprocessing):
   - Uses `GenericDataLoader(df)` directly
   - No `_clean_df_for_sdv()` transformation
   - No preprocessing agent calls

3. **Simple Hyperparameters**:
   - `n_iter=500` (fixed, not optimized)
   - No optimizer integration
   - No compliance evaluation

4. **Direct Plugin Usage**:
   ```python
   syn_model = Plugins().get("ddpm", n_iter=500)
   syn_model.fit(loader)
   synthetic_loader = syn_model.generate(count=len(df))
   ```

## Troubleshooting

### Issue: Container not found
```bash
# Check container name
docker ps -a | grep gesalps

# If different name, adjust commands accordingly
```

### Issue: Files not found in container
```bash
# Verify files are in container
docker exec gesalps_worker ls -la /app/standalone_ddpm_test.py
docker exec gesalps_worker ls -la /app/heart.csv
```

### Issue: Module import errors
```bash
# Check SynthCity version
docker exec gesalps_worker pip show synthcity

# Check if eval_privacy/eval_statistical are available
docker exec gesalps_worker python -c "from synthcity.metrics import eval_privacy, eval_statistical; print('OK')"
```

### Issue: eval_privacy/eval_statistical are modules, not functions
This is the current issue. The script expects them to be callable functions, but in SynthCity 0.2.12 they are modules. This is why the script needs to be run in the same environment where it worked before, or the API needs to be fixed.

## Environment Verification

To verify the environment matches where it worked:

```bash
# Check Python version
docker exec gesalps_worker python --version

# Check SynthCity version
docker exec gesalps_worker pip show synthcity | grep Version

# Check if eval_privacy/eval_statistical work as functions
docker exec gesalps_worker python -c "
from synthcity.metrics import eval_privacy, eval_statistical
import pandas as pd
df = pd.DataFrame({'a': [1,2,3], 'b': [4,5,6]})
try:
    result = eval_privacy(df, df)
    print('✅ eval_privacy works as function')
except Exception as e:
    print(f'❌ eval_privacy error: {e}')
    print(f'Type: {type(eval_privacy)}')
"
```

## Notes

- The script was originally designed to run **locally in Docker** (not on VPS)
- The VPS environment should match the local Docker environment
- If `eval_privacy`/`eval_statistical` are modules in VPS but functions locally, there may be a SynthCity version difference
- The working script achieved KS Mean 0.0650, which is the target for the production pipeline
