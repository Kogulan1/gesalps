# 2026-01-10 - VPS Update Script Created - BackendAgent

## Status
✅ Completed

## Summary
Created a comprehensive VPS update script (`update-vps.sh`) that automates pulling latest code from git and rebuilding Docker containers on the VPS. This script handles the complete deployment workflow with error handling and verification.

## Key Features

### Script: `backend/update-vps.sh`

**Capabilities**:
1. **Git Pull**: Pulls latest code from `origin main`
   - Handles uncommitted changes (stashes and restores)
   - Graceful error handling

2. **Container Rebuild**: Rebuilds Docker containers with `--no-cache`
   - Supports rebuilding all services or individual services
   - Uses production compose file if available

3. **Service Restart**: Restarts services after rebuild
   - Zero-downtime deployment support
   - Health check verification

4. **Verification**: Comprehensive verification steps
   - Container status check
   - Log inspection for errors
   - API health endpoint test

5. **Flexible Usage**:
   - `./update-vps.sh` - Updates all services
   - `./update-vps.sh api` - Updates only API service
   - `./update-vps.sh synth-worker` - Updates only worker service
   - `./update-vps.sh report-service` - Updates only report service

## Usage Instructions

### On VPS:

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to backend directory
cd /opt/gesalps/backend

# Run update script
./update-vps.sh

# Or update specific service
./update-vps.sh synth-worker
```

### Environment Variables:

The script respects:
- `BACKEND_DIR`: Backend directory path (default: `/opt/gesalps/backend`)
- `API_URL`: API URL for health check (default: `http://localhost:8000`)

## What Gets Updated

1. **Code**: Latest code from `origin main` branch
2. **Containers**: All Docker containers rebuilt with new code
3. **Services**: Services restarted with new containers
4. **Dependencies**: Any new Python packages in requirements.txt

## Safety Features

- **Error Handling**: Script exits on any error (`set -e`)
- **Change Preservation**: Uncommitted changes are stashed and restored
- **Health Verification**: Waits for services to be healthy before completion
- **Log Inspection**: Shows recent logs to catch errors early
- **Status Reporting**: Shows container status after update

## Integration with Existing Scripts

This script complements existing deployment scripts:
- `deploy.sh`: Zero-downtime deployment with health checks
- `deploy-zero-downtime.sh`: Advanced zero-downtime deployment
- `update-vps.sh`: Simple update workflow (this script)

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: Medium - Deployment**

**Action**: Deploy update script to VPS and test

**Tasks**:
1. Copy `update-vps.sh` to VPS at `/opt/gesalps/backend/`
2. Make it executable: `chmod +x update-vps.sh`
3. Test the script with a small update
4. Verify all services restart correctly
5. Document any VPS-specific requirements

**Testing**:
```bash
# On VPS
cd /opt/gesalps/backend
./update-vps.sh synth-worker  # Test with worker service first
```

**Expected Results**:
- Code pulled successfully
- Container rebuilt
- Service restarted
- Health checks pass
- No errors in logs

---

## Code Changes

### File: `backend/update-vps.sh` (NEW)
- **Lines 1-200**: Complete VPS update script
- Handles git pull, container rebuild, service restart, and verification
- Supports both `docker compose` (v2) and `docker-compose` (v1)
- Detects production vs development compose files
- Comprehensive error handling and logging

---

Agent: BackendAgent  
Date: 2026-01-10  
Priority: Medium - Deployment Automation  
Status: ✅ Completed
