# VPS Quality Test Instructions

## Quick Test on VPS

Run this command on your VPS:

```bash
cd /opt/gesalps/backend
bash test_quality_on_vps.sh
```

## Manual Steps (if script doesn't work)

### 1. SSH to VPS
```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

### 2. Navigate to Backend Directory
```bash
cd /opt/gesalps/backend
```

### 3. Ensure Files Are Present
```bash
# Check if test script exists
ls -la standalone_quality_test.py

# Check if heart.csv exists
ls -la heart.csv

# If heart.csv doesn't exist, check if it's in the repo
find . -name "heart.csv"
```

### 4. Ensure Containers Are Running
```bash
# Check container status
docker compose ps

# If synth-worker is not running, start it
docker compose up -d synth-worker

# Wait for container to be ready
sleep 5
```

### 5. Copy Files to Container
```bash
# Copy test script
docker cp standalone_quality_test.py gesalps_worker:/app/standalone_quality_test.py

# Copy heart.csv if needed
docker cp heart.csv gesalps_worker:/app/heart.csv
```

### 6. Run the Test
```bash
docker compose exec -T synth-worker python standalone_quality_test.py
```

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

## What the Test Checks

1. **OpenRouter Integration** - Verifies OpenRouter is configured
2. **Optimizer Integration** - Tests hyperparameter optimization
3. **Compliance Integration** - Tests compliance evaluation
4. **Full Pipeline** - Tests complete synthetic data generation
5. **All Green Metrics** - Verifies all thresholds are met:
   - KS Mean ≤ 0.10
   - Corr Delta ≤ 0.10
   - MIA AUC ≤ 0.60
   - Dup Rate ≤ 0.05

## Troubleshooting

### Issue: "standalone_quality_test.py not found"
**Solution**: Ensure you're in `/opt/gesalps/backend` and the file exists:
```bash
cd /opt/gesalps/backend
ls -la standalone_quality_test.py
```

### Issue: "heart.csv not found"
**Solution**: The heart.csv should be in the backend directory. If not:
```bash
# Check if it's in the repo
find /opt/gesalps -name "heart.csv"

# Or download it (if needed)
# The file should be in the repository
```

### Issue: "Container not running"
**Solution**: Start the container:
```bash
docker compose up -d synth-worker
```

### Issue: "Module not found" errors
**Solution**: The container might need to be rebuilt with latest code:
```bash
cd /opt/gesalps/backend
git pull origin main
docker compose build synth-worker
docker compose up -d synth-worker
```

### Issue: Test takes too long
**Solution**: This is normal - TabDDPM training takes time (5-15 minutes). Be patient.

## After Test

If the test passes:
- ✅ All improvements are working correctly
- ✅ Ready for production use
- ✅ Metrics are meeting "all green" thresholds

If the test fails:
- Review the failed metrics
- Check logs: `docker compose logs synth-worker`
- Verify OpenRouter API key is set: `docker compose exec synth-worker env | grep OPENROUTER`
- Check optimizer is available: `docker compose exec synth-worker ls -la /app/optimizer.py`
