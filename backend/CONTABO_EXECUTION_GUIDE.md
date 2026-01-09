# Contabo VPS Execution Guide - Docker Build Fix

## Quick Start

**SSH into Contabo VPS and run:**

```bash
cd /opt/gesalps/backend
bash EXECUTE_ON_CONTABO.sh
```

That's it! The script will handle everything automatically.

## What the Script Does

1. ✅ Verifies source files exist (`optimizer.py`, `libs/compliance.py`)
2. ✅ Verifies Dockerfile configuration
3. ✅ Stops current container
4. ✅ Rebuilds container with `--no-cache`
5. ✅ Starts new container
6. ✅ Verifies both modules exist in container
7. ✅ Tests module imports
8. ✅ Tests module integration
9. ✅ Checks logs for errors

## Manual Execution (if needed)

If you prefer to run steps manually:

```bash
# 1. Navigate to backend directory
cd /opt/gesalps/backend

# 2. Verify files exist
ls -la synth_worker/optimizer.py
ls -la libs/compliance.py

# 3. Stop container
docker compose -f docker-compose.yml stop synth-worker

# 4. Rebuild (takes 10-20 minutes)
docker compose -f docker-compose.yml build --no-cache synth-worker

# 5. Start container
docker compose -f docker-compose.yml up -d synth-worker

# 6. Verify optimizer.py
docker exec gesalps_worker ls -la /app/optimizer.py

# 7. Verify compliance.py
docker exec gesalps_worker ls -la /app/libs/compliance.py

# 8. Test imports
docker exec gesalps_worker python3 -c "from optimizer import get_optimizer; print('OK')"
docker exec gesalps_worker python3 -c "from libs.compliance import get_compliance_evaluator; print('OK')"

# 9. Check logs
docker compose -f docker-compose.yml logs synth-worker --tail=50
```

## Verification Checklist

After execution, verify:

- [ ] Container is running: `docker compose -f docker-compose.yml ps synth-worker`
- [ ] optimizer.py exists: `docker exec gesalps_worker test -f /app/optimizer.py`
- [ ] compliance.py exists: `docker exec gesalps_worker test -f /app/libs/compliance.py`
- [ ] Optimizer imports: `docker exec gesalps_worker python3 -c "from optimizer import get_optimizer"`
- [ ] Compliance imports: `docker exec gesalps_worker python3 -c "from libs.compliance import get_compliance_evaluator"`
- [ ] No errors in logs: `docker compose -f docker-compose.yml logs synth-worker | grep -i error`

## Troubleshooting

### Build fails
- Check disk space: `df -h`
- Check Docker logs: `docker compose -f docker-compose.yml build --no-cache synth-worker 2>&1 | tee build.log`
- Verify network connectivity for package downloads

### Container won't start
- Check logs: `docker compose -f docker-compose.yml logs synth-worker`
- Check container status: `docker ps -a | grep gesalps_worker`
- Try manual start: `docker start gesalps_worker`

### Import errors
- Verify files copied correctly: `docker exec gesalps_worker find /app -name "*.py" | grep -E "(optimizer|compliance)"`
- Check Python path: `docker exec gesalps_worker python3 -c "import sys; print('\n'.join(sys.path))"`
- Check file permissions: `docker exec gesalps_worker ls -la /app/optimizer.py /app/libs/compliance.py`

## Expected Output

Successful execution should show:

```
[SUCCESS] Build completed successfully
[SUCCESS] Container is running
[SUCCESS] optimizer.py found at /app/optimizer.py
[SUCCESS] compliance.py found at /app/libs/compliance.py
[SUCCESS] optimizer module imports successfully
[SUCCESS] compliance module imports successfully
[SUCCESS] Both modules work together correctly
[SUCCESS] ALL VERIFICATION CHECKS PASSED!
```

## After Successful Execution

1. **Monitor logs** for a few minutes to ensure no startup errors:
   ```bash
   docker compose -f docker-compose.yml logs -f synth-worker
   ```

2. **Test with a run** - Create a new synthetic data generation run and verify:
   - Optimizer is being used (check logs for optimizer messages)
   - Compliance evaluator is working (check metrics for compliance results)
   - No import errors occur

3. **Report back** - Update the agent log with results

## Support

If issues occur:
1. Check the script output for specific error messages
2. Review container logs: `docker compose -f docker-compose.yml logs synth-worker`
3. Verify Docker and Docker Compose versions: `docker --version && docker compose version`
4. Check system resources: `free -h && df -h`

