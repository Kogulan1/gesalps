# Gesalp AI - VPS Deployment Guide

## Recommended Hosting: Hostinger KVM 2 Plan

**Specs:**
- 2 vCPU cores
- 8 GB RAM
- 100 GB NVMe storage
- 8 TB bandwidth
- **Price: ₹499/month** (with Black Friday pricing)

## Resource Allocation

### Memory Budget (8 GB total):
- **Ollama LLM (llama3.1:8b)**: 4-6 GB (largest component)
- **API service (FastAPI)**: 500 MB - 1 GB
- **Report service**: 300-500 MB
- **Synth worker (TabDDPM/TimeCSDI)**: 500 MB - 1 GB
- **System overhead**: 500 MB - 1 GB

### CPU Usage:
- API endpoints: Light load
- Synthetic data generation: CPU-intensive but sequential jobs
- LLM inference: Moderate load

### Storage Budget (100 GB):
- Docker images: ~5-10 GB
- Application code: ~1 GB
- Generated synthetic data: ~20-50 GB (can be cleaned periodically)
- System files: ~5 GB
- Models cache: ~10-20 GB
- Available for data: ~40-60 GB

## Optimization Tips:

1. **Run services without DP worker** (you're not using differential privacy):
   ```bash
   # Disable synth-worker-dp in docker-compose.yml
   ```

2. **Limit Ollama memory** if needed:
   ```bash
   # In docker-compose.yml, add to ollama service:
   deploy:
     resources:
       limits:
         memory: 5G
   ```

3. **Monitor memory usage**:
   ```bash
   docker stats
   ```

4. **Configure swap** (if running low on memory):
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

5. **Schedule cleanup** of old synthetic data files

## Alternative: KVM 4 Plan
If you experience memory issues or need to run multiple generations concurrently:
- **Price**: ₹749/month
- **RAM**: 16 GB (would comfortably run with room for growth)
- Better for production if you expect high concurrent usage

## Current Setup (No DP)
Your `synth_worker` service uses:
- TabDDPM (tabular synthesis)
- TimeCSDI (time-series synthesis)
- No differential privacy overhead

This is the **lightweight path** ✅

