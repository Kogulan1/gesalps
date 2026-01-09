# Base Image Setup Guide - Fast Docker Builds

## Overview

This guide explains how to use the base image approach to dramatically reduce Docker build times from **1+ hour to 2-5 minutes** for code changes.

## The Problem

Every Docker build downloads:
- PyTorch (~500-700 MB)
- torchvision (~100-200 MB)
- torchaudio (~50-100 MB)
- SynthCity and dependencies (~200-300 MB)
- **Total: ~650-1000 MB every build = 1+ hour**

## The Solution

Build a **base image** with all dependencies once, then use it for all subsequent builds. Only code is copied, no downloads needed.

## Quick Start

### Step 1: Build Base Image (One-Time, 30-60 minutes)

```bash
cd /opt/gesalps/backend

# Build base image with all dependencies
./scripts/build-base-image.sh
```

**Or manually:**
```bash
docker build -f synth_worker/Dockerfile.base -t gesalps-worker-base:latest .
```

### Step 2: Use Optimized Dockerfile

The `Dockerfile.optimized` uses the base image. Update `docker-compose.yml` to use it:

```yaml
synth-worker:
  build:
    context: .
    dockerfile: synth_worker/Dockerfile.optimized  # Use optimized version
```

### Step 3: Fast Rebuilds (2-5 minutes)

```bash
# For code changes - fast!
./scripts/rebuild-worker-fast.sh

# Or manually:
docker compose build synth-worker
docker compose up -d synth-worker
```

## Using Registry (Optional)

### Build and Push to Registry

```bash
# Set registry (e.g., Docker Hub, GitHub Container Registry)
export REGISTRY="docker.io/yourusername"  # or "ghcr.io/yourusername"
export PUSH_TO_REGISTRY="true"

# Build and push
./scripts/build-base-image.sh
```

### Pull from Registry

```bash
# Set registry
export REGISTRY="docker.io/yourusername"
export USE_REGISTRY="true"

# Fast rebuild will pull from registry
./scripts/rebuild-worker-fast.sh
```

## Registry Options

### Docker Hub
```bash
export REGISTRY="docker.io/yourusername"
# Image: docker.io/yourusername/gesalps-worker-base:latest
```

### GitHub Container Registry
```bash
export REGISTRY="ghcr.io/yourusername"
# Image: ghcr.io/yourusername/gesalps-worker-base:latest
```

### Private Registry
```bash
export REGISTRY="registry.yourdomain.com"
# Image: registry.yourdomain.com/gesalps-worker-base:latest
```

## When to Rebuild Base Image

Rebuild base image when:
- ✅ `requirements.txt` changes
- ✅ PyTorch version changes
- ✅ New dependencies added
- ✅ Dependencies updated

**Frequency**: Rare - maybe once a month

## Build Time Comparison

| Scenario | Before | After |
|----------|--------|-------|
| **Code changes** | 1+ hour | 2-5 minutes |
| **Dependency changes** | 1+ hour | 30-60 minutes (rebuild base) |
| **First build** | 1+ hour | 30-60 minutes (build base) |

## Files

- `synth_worker/Dockerfile.base` - Base image with all dependencies
- `synth_worker/Dockerfile.optimized` - Main Dockerfile using base image
- `scripts/build-base-image.sh` - Script to build base image
- `scripts/rebuild-worker-fast.sh` - Fast rebuild script

## Troubleshooting

### Base Image Not Found

```bash
# Check if base image exists
docker images | grep gesalps-worker-base

# If not, build it
./scripts/build-base-image.sh
```

### Using Wrong Dockerfile

Make sure `docker-compose.yml` uses `Dockerfile.optimized`:

```yaml
synth-worker:
  build:
    dockerfile: synth_worker/Dockerfile.optimized
```

### Registry Authentication

If using private registry:

```bash
# Login first
docker login your-registry.com

# Then build/push
./scripts/build-base-image.sh
```

## Benefits

- ✅ **10-20x faster builds** for code changes
- ✅ **No repeated downloads** of PyTorch and dependencies
- ✅ **Faster iteration** - deploy code changes in minutes
- ✅ **Team sharing** - push base image to registry for team use
- ✅ **VPS efficiency** - less bandwidth, faster deployments

## Next Steps

1. Build base image once: `./scripts/build-base-image.sh`
2. Update docker-compose to use `Dockerfile.optimized`
3. Use fast rebuild script: `./scripts/rebuild-worker-fast.sh`
4. Enjoy 2-5 minute builds! 🚀
