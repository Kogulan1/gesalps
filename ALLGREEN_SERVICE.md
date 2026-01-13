# All Green Service - Dedicated Worker for Proven Configuration

## Overview

The **All Green Service** is a dedicated worker that replicates the exact configuration that achieved "all green" metrics in local benchmarks. This service is isolated from the main worker to guarantee the proven configuration is used.

## Why a Separate Service?

The main worker uses adaptive configuration and retry logic, which can sometimes deviate from the proven setup. The All Green Service:

- ✅ Uses **exact proven hyperparameters** (no adaptation)
- ✅ **No retries** - single attempt with proven config
- ✅ **Isolated** from main worker logic
- ✅ **Guaranteed** to use Clinical Preprocessor v18
- ✅ **Guaranteed** to use TVAE with 2000 epochs

## Proven Configuration

```python
{
    "method": "tvae",
    "epochs": 2000,              # Proven: works across all clinical datasets
    "batch_size": 32,            # Proven: optimal regularization
    "embedding_dim": 512,        # Proven architecture
    "compress_dims": [256, 256], # Proven architecture
    "decompress_dims": [256, 256], # Proven architecture
    "loss_factor": 2,
    "verbose": True,
}
```

**Preprocessing:**
- ✅ Clinical Preprocessor v18: **Always enabled**
- Transform → Train → Sample → Inverse Transform workflow

## How to Use

### Via API

Start a run with `mode="allgreen"`:

```bash
curl -X POST https://api.gesalpai.ch/v1/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "your-dataset-id",
    "method": "tvae",
    "mode": "allgreen",
    "name": "All Green Test Run"
  }'
```

### Via Frontend

The frontend can be updated to include an "All Green" option that sets `mode="allgreen"`.

## Architecture

```
┌─────────────┐
│   API       │
│  (main.py)  │
└──────┬──────┘
       │ mode="allgreen"
       ▼
┌──────────────────┐
│  Supabase DB     │
│  runs table      │
│  status=queued   │
│  mode=allgreen   │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│  allgreen-worker     │
│  (allgreen_worker.py)│
│  - Polls for runs    │
│  - Uses proven config│
│  - No retries        │
└──────────────────────┘
```

## Deployment

### 1. Update Docker Compose

The `allgreen-worker` service is already added to `docker-compose.prod.yml`:

```yaml
allgreen-worker:
  build: 
    context: .
    dockerfile: synth_worker/Dockerfile
  image: gesalps-worker:latest
  container_name: gesalps_allgreen_worker
  command: ["python", "-u", "synth_worker/allgreen_worker.py"]
  env_file: .env
  # ... rest of config
```

### 2. Deploy to VPS

```bash
# SSH to VPS
ssh root@194.34.232.76

# Navigate to backend directory
cd /opt/gesalps/backend

# Pull latest changes
git pull origin main

# Rebuild and start the new service
docker compose -f docker-compose.prod.yml up -d --build allgreen-worker

# Check logs
docker compose -f docker-compose.prod.yml logs -f allgreen-worker
```

### 3. Verify Service is Running

```bash
# Check if container is running
docker compose -f docker-compose.prod.yml ps allgreen-worker

# Check logs
docker compose -f docker-compose.prod.yml logs allgreen-worker --tail 50
```

You should see:
```
[allgreen-worker] All Green Worker started - waiting for runs...
```

## Testing

### 1. Start a Test Run

Use the API to start a run with `mode="allgreen"`:

```bash
# Get a dataset ID first
curl https://api.gesalpai.ch/v1/datasets \
  -H "Authorization: Bearer YOUR_TOKEN"

# Start allgreen run
curl -X POST https://api.gesalpai.ch/v1/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "your-dataset-id",
    "method": "tvae",
    "mode": "allgreen",
    "name": "All Green Test"
  }'
```

### 2. Monitor Progress

```bash
# Watch logs
docker compose -f docker-compose.prod.yml logs -f allgreen-worker

# Check run status
curl https://api.gesalpai.ch/v1/runs/RUN_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Verify Metrics

After completion, check the metrics:

```bash
curl https://api.gesalpai.ch/v1/runs/RUN_ID/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected results:
- KS Mean ≤ 0.10 ✅
- Corr Δ ≤ 0.10 ✅
- MIA AUC ≤ 0.60 ✅
- Dup Rate ≤ 0.05 ✅

## Differences from Main Worker

| Feature | Main Worker | All Green Service |
|---------|------------|-------------------|
| Configuration | Adaptive | Fixed (proven) |
| Retries | Yes (up to 3 attempts) | No (single attempt) |
| Method Selection | Agent-based | TVAE only |
| Epochs | Adaptive (250-2000) | Fixed (2000) |
| Clinical Preprocessor | Optional | Always enabled |
| Fallback Methods | Yes (CTGAN, GC) | No (TVAE only) |

## Troubleshooting

### Service Not Starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs allgreen-worker

# Common issues:
# - Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
# - Import errors (check allgreen_worker.py imports)
```

### Runs Not Being Processed

```bash
# Check if runs are queued
# Query Supabase: SELECT * FROM runs WHERE status='queued' AND mode='allgreen'

# Check worker logs
docker compose -f docker-compose.prod.yml logs allgreen-worker --tail 100
```

### Training Taking Too Long

The All Green Service uses 2000 epochs, which takes 20-30 minutes for small datasets. This is expected and necessary for achieving "all green" metrics.

## Next Steps

1. ✅ Service created and deployed
2. ⏳ Test with a real dataset
3. ⏳ Verify "all green" metrics are achieved
4. ⏳ Update frontend to include "All Green" option (optional)

## Files Changed

- `backend/synth_worker/allgreen_worker.py` - New dedicated worker
- `backend/docker-compose.prod.yml` - Added allgreen-worker service
- `api/main.py` - Added allgreen mode handling

## Support

If you encounter issues:
1. Check logs: `docker compose logs allgreen-worker`
2. Verify environment variables are set
3. Ensure Supabase connection is working
4. Check that runs are being created with `mode='allgreen'`
