# 2026-01-09 - Docker Build Performance Analysis - MainAgent

## Status
✅ Analysis Complete - Root Causes Identified

## Summary
Analyzed Docker build performance for synth-worker container. Identified multiple bottlenecks causing 1+ hour build times. Root causes: large PyTorch packages, inefficient layer caching, multiple RUN commands, and SynthCity compilation. Proposed optimization solutions to reduce build time to 5-15 minutes.

## Key Findings / Decisions

### 🔴 **Root Causes Identified**:

#### **1. Large PyTorch Packages** (Biggest Bottleneck)
- **torch==2.2.2**: ~500-700 MB download
- **torchvision==0.17.2**: ~100-200 MB download
- **torchaudio==2.2.2**: ~50-100 MB download
- **Total**: ~650-1000 MB just for PyTorch ecosystem
- **Impact**: 10-20 minutes just to download PyTorch packages

#### **2. Inefficient Layer Caching**
- **Problem**: Multiple separate RUN commands for pip installs
- **Current Structure**:
  ```dockerfile
  RUN pip install numpy pandas scipy
  RUN pip install shap
  RUN pip install torch torchvision torchaudio
  RUN pip install -r requirements.txt
  ```
- **Impact**: If any dependency changes, all subsequent layers rebuild
- **Better**: Combine related installs, use better layer ordering

#### **3. SynthCity Compilation**
- **Problem**: SynthCity may compile C extensions during install
- **Impact**: 5-15 minutes of compilation time
- **Solution**: Use pre-built wheels if available

#### **4. Build Tools Installed**
- **Problem**: `build-essential` is large (~200 MB) and needed for compilation
- **Impact**: Larger base image, longer apt-get operations
- **Solution**: Multi-stage build - install in build stage, copy to runtime

#### **5. No pip Cache**
- **Problem**: Using `--no-cache-dir` means pip can't use cache
- **Impact**: Re-downloads packages every build
- **Solution**: Use pip cache or Docker build cache

#### **6. Code Changes Trigger Full Rebuild**
- **Problem**: Code is copied AFTER dependencies
- **Current**: Dependencies → Code
- **Better**: Dependencies → Code (but dependencies rarely change)
- **Impact**: Any code change triggers dependency reinstall

### 📊 **Estimated Time Breakdown** (Current Build):

| Step | Time | Percentage |
|------|------|------------|
| Base image pull | 1-2 min | 2-3% |
| System packages (apt-get) | 2-3 min | 3-5% |
| PyTorch download | 10-20 min | 15-30% |
| NumPy/Pandas/SciPy | 3-5 min | 5-8% |
| SynthCity + dependencies | 15-30 min | 25-45% |
| Other packages | 5-10 min | 8-15% |
| Code copy + verification | 1-2 min | 2-3% |
| **Total** | **37-72 min** | **100%** |

### 💡 **Optimization Solutions**:

#### **Solution 1: Multi-Stage Build** (Recommended)
**Reduces**: Build time, image size, rebuild frequency

```dockerfile
# Stage 1: Build stage (with build tools)
FROM python:3.11-slim as builder
WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir numpy==1.26.4 pandas==1.5.3 scipy==1.13.1
RUN pip install --no-cache-dir "shap>=0.45.0"
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2

COPY synth_worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime stage (minimal, no build tools)
FROM python:3.11-slim
WORKDIR /app

# Copy only runtime dependencies
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Install only runtime system packages (no build-essential)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Copy application code
COPY synth_worker/ /app/
COPY libs/ /app/libs/

ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
```

**Benefits**:
- ✅ Smaller final image (no build tools)
- ✅ Faster rebuilds (build tools only in build stage)
- ✅ Better layer caching

---

#### **Solution 2: Optimize Layer Ordering** (Quick Win)
**Reduces**: Rebuild frequency

**Current Problem**:
```dockerfile
# Dependencies installed first
RUN pip install torch...
RUN pip install -r requirements.txt
# Code copied last
COPY synth_worker/ /app/
```

**Better Approach**:
```dockerfile
# Copy requirements first (rarely changes)
COPY synth_worker/requirements.txt .
# Install dependencies (only rebuilds if requirements.txt changes)
RUN pip install --no-cache-dir ...
# Copy code last (changes frequently, but doesn't trigger dependency rebuild)
COPY synth_worker/ /app/
COPY libs/ /app/libs/
```

**Benefits**:
- ✅ Code changes don't trigger dependency reinstall
- ✅ Better Docker layer caching
- ✅ Faster iteration

---

#### **Solution 3: Use pip Cache** (Medium Impact)
**Reduces**: Download time for unchanged packages

**Option A: Docker BuildKit Cache**:
```dockerfile
# syntax=docker/dockerfile:1.4
FROM python:3.11-slim
# ... setup ...

# Mount pip cache
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2
```

**Option B: Build with Cache**:
```bash
# Build with BuildKit cache
DOCKER_BUILDKIT=1 docker build --cache-from gesalps-worker:latest -t gesalps-worker:latest .
```

**Benefits**:
- ✅ Faster subsequent builds (cached packages)
- ✅ Reduced network usage
- ✅ 5-10 minutes saved on rebuilds

---

#### **Solution 4: Pre-build Base Image** (Best for Production)
**Reduces**: Build time to 2-5 minutes

**Create Base Image** (`backend/synth_worker/Dockerfile.base`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app

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
```

**Build Base Image** (once, or when dependencies change):
```bash
docker build -f synth_worker/Dockerfile.base -t gesalps-worker-base:latest .
```

**Use in Main Dockerfile**:
```dockerfile
FROM gesalps-worker-base:latest
WORKDIR /app

# Only copy code (dependencies already in base image)
COPY synth_worker/ /app/
COPY libs/ /app/libs/

ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
```

**Benefits**:
- ✅ Code changes: 2-5 minutes (just copy code)
- ✅ Dependency changes: Rebuild base image (rare)
- ✅ Best for production

---

#### **Solution 5: Use BuildKit Parallel Builds** (Quick Win)
**Reduces**: Overall build time

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with parallel stages
docker build --progress=plain -t gesalps-worker:latest .
```

**Benefits**:
- ✅ Parallel layer building
- ✅ Better progress visibility
- ✅ 10-20% faster builds

---

### 🎯 **Recommended Approach**:

**For Immediate Improvement** (Quick Win):
1. **Solution 2**: Optimize layer ordering (5 minutes to implement)
2. **Solution 5**: Enable BuildKit (instant)
3. **Solution 3**: Use pip cache (5 minutes to implement)

**Expected Result**: 20-30 minutes instead of 1+ hour

**For Long-term** (Best Performance):
1. **Solution 4**: Pre-build base image (30 minutes to implement)
2. **Solution 1**: Multi-stage build (1 hour to implement)

**Expected Result**: 2-5 minutes for code changes, 15-20 minutes for dependency changes

---

## Code Changes Proposed/Applied (if any)

### **Proposed: Optimized Dockerfile**

**File**: `backend/synth_worker/Dockerfile.optimized` (NEW)

See Solution 2 + Solution 3 for optimized version.

---

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: High - Performance Critical**

**Immediate Actions** (Quick Wins):
1. **Optimize Layer Ordering**:
   - Move `COPY requirements.txt` before dependency installs
   - Move `COPY synth_worker/` and `COPY libs/` to end
   - This ensures code changes don't trigger dependency rebuilds

2. **Enable BuildKit**:
   - Use `DOCKER_BUILDKIT=1` for builds
   - Add to build scripts

3. **Use pip Cache**:
   - Add `--mount=type=cache` to pip install commands
   - Or use `DOCKER_BUILDKIT=1` with cache mounts

**Expected Improvement**: 20-30 minutes instead of 1+ hour

**Long-term Actions**:
1. **Create Base Image**:
   - Build base image with all dependencies
   - Use base image in main Dockerfile
   - Rebuild base only when dependencies change

2. **Multi-Stage Build**:
   - Separate build and runtime stages
   - Smaller final image
   - Faster rebuilds

**Expected Improvement**: 2-5 minutes for code changes

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

## Open Questions
- Should we implement quick wins first or go straight to base image approach?
- Do we have BuildKit available on VPS?
- Can we schedule base image rebuilds (e.g., weekly)?

---

Agent: MainAgent  
Date: 2026-01-09  
Priority: High - Performance Critical  
Status: Analysis Complete
