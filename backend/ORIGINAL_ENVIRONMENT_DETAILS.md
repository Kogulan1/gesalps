# Original Environment Where standalone_ddpm_test.py Achieved KS Mean 0.0650

## Environment Details

Based on the chat history and logs, the `standalone_ddpm_test.py` script that achieved **KS Mean 0.0650** was run in:

### **VPS Production Container** (Not Local Docker)

- **Location**: VPS (Contabo) - `194.34.232.76`
- **Container Name**: `gesalps_worker` 
- **Service Name**: `synth-worker`
- **Working Directory**: `/app`
- **Python Version**: 3.11
- **Base Image**: `python:3.11-slim` (from `synth_worker/Dockerfile`)

### Execution Command

```bash
# SSH to VPS
ssh root@194.34.232.76

# Navigate to backend
cd /opt/gesalps/backend

# Copy files to container
docker cp standalone_ddpm_test.py gesalps_worker:/app/standalone_ddpm_test.py
docker cp heart.csv gesalps_worker:/app/heart.csv

# Run the script
docker exec -w /app gesalps_worker python standalone_ddpm_test.py
```

### Why VPS, Not Local?

1. **Local container doesn't have SynthCity**: The local `gesalps_worker` container doesn't have SynthCity installed
2. **VPS container has all dependencies**: The production VPS container is built with `synth_worker/Dockerfile` which includes all dependencies from `synth_worker/requirements.txt`
3. **Documentation points to VPS**: The `STANDALONE_DDPM_TEST_VPS_INSTRUCTIONS.md` and `test_quality_on_vps.sh` scripts all reference VPS execution

### Key Environment Characteristics

- **SynthCity Version**: Installed in VPS container (version unknown, but must support `eval_privacy`/`eval_statistical` as callable functions OR the script worked with a different API)
- **All dependencies**: Available in VPS container from `synth_worker/requirements.txt`
- **Dataset**: `heart.csv` (302 rows, 14 columns) in `/app/heart.csv`

### Important Note

The script uses:
```python
from synthcity.metrics import eval_privacy, eval_statistical
privacy = eval_privacy(df, synthetic_df)  # Direct function call
utility = eval_statistical(df, synthetic_df)  # Direct function call
```

This suggests either:
1. The VPS container has a different SynthCity version where these are callable functions
2. OR the script was run in an environment where a wrapper was already in place
3. OR the original successful run was before SynthCity API changed

### To Replicate Original Results

Run on VPS production container:
```bash
ssh root@194.34.232.76
cd /opt/gesalps/backend
docker cp standalone_ddpm_test.py gesalps_worker:/app/standalone_ddpm_test.py
docker cp heart.csv gesalps_worker:/app/heart.csv
docker exec -w /app gesalps_worker python standalone_ddpm_test.py
```
