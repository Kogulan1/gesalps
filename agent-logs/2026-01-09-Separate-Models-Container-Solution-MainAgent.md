# 2026-01-09 - Separate Models Container Solution - MainAgent

## Status
✅ Solution Designed - Multiple Approaches Proposed

## Summary
Designed solution to separate models/dependencies into a separate container to avoid repeated downloads. Proposed three approaches: base image registry, shared volume, and multi-stage with base image. This will reduce build times from 1+ hour to 2-5 minutes for code changes.

## Key Findings / Decisions

### 💡 **Your Idea**: Separate Container for Models
**Goal**: Avoid downloading PyTorch and other large dependencies repeatedly

**Benefits**:
- ✅ Dependencies downloaded once, reused forever
- ✅ Code changes don't trigger dependency rebuilds
- ✅ Faster iteration (2-5 minutes instead of 1+ hour)
- ✅ Can update dependencies independently

### 🎯 **Three Approaches**:

---

## **Approach 1: Base Image in Registry** (Recommended)

**Concept**: Build a base image with all dependencies, push to registry, pull for builds

### **Implementation**:

**Step 1: Create Base Image Dockerfile**
**File**: `backend/synth_worker/Dockerfile.base`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install core dependencies
RUN pip install --no-cache-dir numpy==1.26.4 pandas==1.5.3 scipy==1.13.1

# Install shap
RUN pip install --no-cache-dir "shap>=0.45.0"

# Install PyTorch (the big one - ~650-1000 MB)
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2

# Install remaining dependencies
COPY synth_worker/requirements.txt .
RUN pip install --no-cache-dir supabase==2.5.1 python-jose==3.3.0 httpx==0.27.2 \
    sdv==1.26.0 scikit-learn==1.4.2 python-dateutil==2.9.0.post0
RUN pip install --no-cache-dir -r requirements.txt || \
    (pip install --no-cache-dir $(grep -v "^#" requirements.txt | grep -v "^$" | grep -v "shap" | tr '\n' ' ') && \
     pip install --no-cache-dir synthcity --no-deps || pip install --no-cache-dir synthcity)

# Patch Opacus
COPY synth_worker/patch_opacus.py /tmp/patch_opacus.py
RUN python /tmp/patch_opacus.py && rm /tmp/patch_opacus.py

# Verify installation
RUN pip list | grep -E "(supabase|synthcity|torch|opacus)" || echo "Warning: Some packages may be missing"
```

**Step 2: Build and Push Base Image** (One-time, or when dependencies change)

```bash
# Build base image (takes 30-60 minutes, but only once!)
docker build -f backend/synth_worker/Dockerfile.base -t gesalps-worker-base:latest .

# Tag for registry (if using Docker Hub, GitHub Container Registry, etc.)
docker tag gesalps-worker-base:latest your-registry/gesalps-worker-base:latest

# Push to registry
docker push your-registry/gesalps-worker-base:latest
```

**Step 3: Use Base Image in Main Dockerfile**
**File**: `backend/synth_worker/Dockerfile`

```dockerfile
# Use pre-built base image with all dependencies
FROM gesalps-worker-base:latest
# OR from registry:
# FROM your-registry/gesalps-worker-base:latest

WORKDIR /app

# Only copy application code (dependencies already in base image)
COPY synth_worker/ /app/
COPY libs/ /app/libs/

# Verify optimizer.py exists
RUN test -f /app/optimizer.py || echo "Warning: optimizer.py not found"

ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
```

**Benefits**:
- ✅ Code changes: **2-5 minutes** (just copy code)
- ✅ Dependencies: Already in base image (no download)
- ✅ Can push to registry for team/VPS to use
- ✅ Easy to update: Rebuild base when dependencies change

**Build Time**:
- **First build**: 30-60 minutes (builds base image)
- **Code changes**: 2-5 minutes (uses cached base)
- **Dependency changes**: 30-60 minutes (rebuild base, rare)

---

## **Approach 2: Shared Volume for Python Packages** (Alternative)

**Concept**: Use Docker volume to share Python packages between containers

### **Implementation**:

**Step 1: Create Dependency Container**
**File**: `backend/synth_worker/Dockerfile.deps`

```dockerfile
FROM python:3.11-slim

WORKDIR /deps

# Install all dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir numpy==1.26.4 pandas==1.5.3 scipy==1.13.1
RUN pip install --no-cache-dir "shap>=0.45.0"
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2

COPY synth_worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy packages to volume mount point
RUN mkdir -p /shared-packages && \
    cp -r /usr/local/lib/python3.11/site-packages/* /shared-packages/ && \
    cp -r /usr/local/bin/* /shared-packages/bin/ 2>/dev/null || true
```

**Step 2: Update docker-compose.yml**

```yaml
services:
  # Dependency container (builds once, runs in background)
  synth-worker-deps:
    build:
      context: .
      dockerfile: synth_worker/Dockerfile.deps
    image: gesalps-worker-deps:latest
    volumes:
      - python-packages:/shared-packages
    command: ["tail", "-f", "/dev/null"]  # Keep container running
    restart: unless-stopped

  # Main worker (uses shared packages)
  synth-worker:
    build:
      context: .
      dockerfile: synth_worker/Dockerfile
    volumes:
      - python-packages:/usr/local/lib/python3.11/site-packages:ro
    depends_on:
      - synth-worker-deps
    # ... rest of config

volumes:
  python-packages:
    driver: local
```

**Step 3: Update Main Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install only runtime system packages (no build tools needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Python packages will come from shared volume
# No pip install needed!

# Copy application code
COPY synth_worker/ /app/
COPY libs/ /app/libs/

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/usr/local/lib/python3.11/site-packages:$PYTHONPATH
CMD ["python", "-u", "worker.py"]
```

**Benefits**:
- ✅ Dependencies in separate container
- ✅ Shared via volume
- ✅ Can update dependencies independently

**Drawbacks**:
- ⚠️ More complex setup
- ⚠️ Volume management needed
- ⚠️ Potential path issues

---

## **Approach 3: Local Base Image (Simplest)** (Recommended for VPS)

**Concept**: Build base image locally on VPS, use it for builds

### **Implementation**:

**Step 1: Build Base Image on VPS** (One-time)

```bash
# On VPS
cd /opt/gesalps/backend

# Build base image (30-60 minutes, but only once!)
docker build -f synth_worker/Dockerfile.base -t gesalps-worker-base:latest .

# Verify it exists
docker images | grep gesalps-worker-base
```

**Step 2: Use in Main Dockerfile**

```dockerfile
# Use local base image
FROM gesalps-worker-base:latest

WORKDIR /app

# Only copy code
COPY synth_worker/ /app/
COPY libs/ /app/libs/

ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
```

**Step 3: Build Script**

```bash
#!/bin/bash
# rebuild-worker-fast.sh

# Check if base image exists
if ! docker images | grep -q gesalps-worker-base; then
    echo "Base image not found. Building base image (this will take 30-60 minutes)..."
    docker build -f synth_worker/Dockerfile.base -t gesalps-worker-base:latest .
fi

# Build worker (fast - just copies code)
echo "Building worker (2-5 minutes)..."
docker compose build synth-worker

# Restart
docker compose up -d synth-worker
```

**Benefits**:
- ✅ Simplest approach
- ✅ No registry needed
- ✅ Works on single VPS
- ✅ Code changes: 2-5 minutes

**When to Rebuild Base**:
- When `requirements.txt` changes
- When PyTorch version changes
- When new dependencies added
- **Rare** - maybe once a month

---

## **Comparison**:

| Approach | Complexity | Build Time (Code) | Build Time (Deps) | Best For |
|----------|-----------|-------------------|-------------------|----------|
| **Base Image (Local)** | Low | 2-5 min | 30-60 min | Single VPS |
| **Base Image (Registry)** | Medium | 2-5 min | 30-60 min | Team/Multi-VPS |
| **Shared Volume** | High | 2-5 min | 30-60 min | Complex setups |

---

## **Recommended: Approach 3 (Local Base Image)**

**Why**:
- ✅ Simplest to implement
- ✅ No external dependencies (registry, etc.)
- ✅ Works perfectly for single VPS
- ✅ Easy to maintain

**Implementation Steps**:
1. Create `Dockerfile.base` with all dependencies
2. Build base image once on VPS (30-60 min)
3. Update main `Dockerfile` to use base image
4. Create rebuild script that checks for base image
5. **Result**: Code changes = 2-5 minutes!

---

## Code Changes Proposed/Applied (if any)

### **Proposed Files**:

1. **`backend/synth_worker/Dockerfile.base`** (NEW)
   - Contains all dependency installation
   - Build once, reuse forever

2. **`backend/synth_worker/Dockerfile`** (MODIFIED)
   - Uses base image
   - Only copies code

3. **`backend/rebuild-worker-fast.sh`** (NEW)
   - Checks for base image
   - Builds base if missing
   - Fast rebuild for code changes

---

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: High - Performance Critical**

**Recommended Implementation** (Approach 3 - Local Base Image):

1. **Create Base Image Dockerfile**:
   - File: `backend/synth_worker/Dockerfile.base`
   - Contains all dependency installation steps
   - Build once on VPS

2. **Update Main Dockerfile**:
   - File: `backend/synth_worker/Dockerfile`
   - Use `FROM gesalps-worker-base:latest`
   - Only copy code

3. **Create Rebuild Script**:
   - File: `backend/rebuild-worker-fast.sh`
   - Checks for base image
   - Builds base if missing
   - Fast rebuild for code changes

4. **Build Base Image on VPS** (One-time):
   ```bash
   cd /opt/gesalps/backend
   docker build -f synth_worker/Dockerfile.base -t gesalps-worker-base:latest .
   ```

5. **Test Fast Rebuild**:
   ```bash
   # Make a code change
   # Rebuild (should be 2-5 minutes now!)
   docker compose build synth-worker
   ```

**Expected Results**:
- ✅ First build: 30-60 minutes (builds base)
- ✅ Code changes: **2-5 minutes** (uses base)
- ✅ Dependency changes: 30-60 minutes (rebuild base, rare)

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

## Open Questions
- Should we use local base image or push to registry?
- How often do dependencies change? (affects base rebuild frequency)
- Should base image be versioned? (e.g., gesalps-worker-base:v1.0)

---

Agent: MainAgent  
Date: 2026-01-09  
Priority: High - Performance Critical  
Status: Solution Designed
