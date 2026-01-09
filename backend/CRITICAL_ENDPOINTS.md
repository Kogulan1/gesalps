# Critical API Endpoints - Deployment Verification

## Purpose
This document lists all critical API endpoints that **MUST** exist after every deployment. These endpoints are verified automatically during deployment to prevent regressions.

## Why This Exists
We've experienced cases where endpoints disappeared after deployment (e.g., `GET /v1/runs/{run_id}`). This verification system ensures all critical endpoints are present.

## Critical Endpoints List

### Projects
- ✅ `GET /v1/projects` - List all projects
- ✅ `GET /v1/projects/{project_id}` - Get single project details
- ✅ `POST /v1/projects` - Create new project
- ✅ `PUT /v1/projects/{project_id}/rename` - Rename project

### Runs
- ✅ `GET /v1/runs` - List all runs
- ✅ `GET /v1/runs/{run_id}` - **CRITICAL** - Get single run details (includes agent plan)
- ✅ `GET /v1/runs/{run_id}/status` - Get run status
- ✅ `GET /v1/runs/{run_id}/metrics` - Get run metrics
- ✅ `GET /v1/runs/{run_id}/steps` - Get run execution steps
- ✅ `GET /v1/runs/{run_id}/artifacts` - Get run artifacts
- ✅ `POST /v1/runs` - Start new run
- ✅ `DELETE /v1/runs/{run_id}` - Delete run

### Datasets
- ✅ `GET /v1/datasets` - List all datasets
- ✅ `POST /v1/datasets/upload` - Upload dataset

### Health & System
- ✅ `GET /health` - Health check endpoint
- ✅ `GET /v1/capabilities` - System capabilities

## Verification Process

### Automatic Verification
The deployment script (`deploy.sh`) automatically verifies endpoints after API deployment:
```bash
./deploy.sh api
# Automatically runs endpoint verification
```

### Manual Verification
Run the verification script manually:
```bash
./verify-endpoints.sh
```

### What Happens If Endpoints Are Missing
- ❌ Deployment script will report failure
- ❌ Error message will list missing endpoints
- ⚠️  Deployment should be reviewed immediately
- ⚠️  May indicate merge conflict or accidental deletion

## Common Causes of Missing Endpoints

1. **Merge Conflicts**: Endpoints accidentally removed during merge
2. **File Copy Issues**: Code not copied to build directory correctly
3. **Container Rebuild**: Container not rebuilt after code changes
4. **Route Ordering**: FastAPI route ordering issues (less common)

## Prevention Measures

1. **Always Rebuild Containers**: Use `--no-cache` when code changes
2. **Verify After Deployment**: Run `./verify-endpoints.sh` after every deployment
3. **Check Git History**: Review commits before merging
4. **Test Locally First**: Verify endpoints work before deploying

## Updating This List

When adding new critical endpoints:
1. Add to `CRITICAL_ENDPOINTS` array in `verify-endpoints.sh`
2. Add to `verify_endpoints()` function in `deploy.sh`
3. Update this document
4. Test verification script

## Related Files

- `backend/verify-endpoints.sh` - Standalone verification script
- `backend/deploy.sh` - Deployment script with integrated verification
- `backend/EXECUTE_ON_CONTABO.sh` - VPS execution script
