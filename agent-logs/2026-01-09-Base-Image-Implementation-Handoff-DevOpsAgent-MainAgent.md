# 2026-01-09 - Base Image Implementation Handoff - DevOpsAgent - MainAgent

## Status
✅ Ready for Implementation

## Summary
Base image solution has been implemented and is ready for deployment on VPS. This will reduce Docker build times from 1+ hour to 2-5 minutes for code changes. All files are ready - DevOpsAgent needs to build the base image once on VPS.

## Key Findings / Decisions

### ✅ **What's Been Done**:
- ✅ `Dockerfile.base` created (contains all dependencies)
- ✅ `Dockerfile.optimized` created (uses base image)
- ✅ Build scripts created (`build-base-image.sh`, `rebuild-worker-fast.sh`)
- ✅ Documentation created (`BASE_IMAGE_SETUP.md`)
- ✅ All files committed to repository

### 🎯 **What DevOpsAgent Needs to Do**:

**Simple 3-Step Process**:

1. **Pull Latest Code** (1 minute)
2. **Build Base Image Once** (30-60 minutes, one-time)
3. **Use Fast Rebuild Script** (2-5 minutes for future builds)

---

## Implementation Steps

### **Step 1: Pull Latest Code**

```bash
# SSH to VPS
ssh root@194.34.232.76

# Navigate to backend
cd /opt/gesalps/backend

# Pull latest code (includes new files)
git pull origin main
```

**Expected**: New files should appear:
- `synth_worker/Dockerfile.base`
- `synth_worker/Dockerfile.optimized`
- `scripts/build-base-image.sh`
- `scripts/rebuild-worker-fast.sh`
- `BASE_IMAGE_SETUP.md`

---

### **Step 2: Build Base Image** (One-Time, 30-60 Minutes)

```bash
# Make script executable (if needed)
chmod +x scripts/build-base-image.sh

# Build base image (this downloads PyTorch, SynthCity, etc.)
./scripts/build-base-image.sh
```

**What This Does**:
- Downloads and installs all dependencies (PyTorch ~650-1000 MB)
- Creates base image: `gesalps-worker-base:latest`
- Takes 30-60 minutes (but only once!)

**Expected Output**:
```
[INFO] Building base image: gesalps-worker-base:latest
[WARNING] This will take 30-60 minutes...
[INFO] Building...
... (build progress) ...
[SUCCESS] Base image built successfully!
```

**Verify**:
```bash
docker images | grep gesalps-worker-base
# Should show: gesalps-worker-base  latest  ...  ~2-3GB
```

---

### **Step 3: Update docker-compose.yml** (Optional - Script Handles This)

**Option A: Use Fast Rebuild Script** (Recommended)
- Script automatically uses optimized Dockerfile
- No manual changes needed

**Option B: Update docker-compose.yml Manually**
```yaml
synth-worker:
  build:
    context: .
    dockerfile: synth_worker/Dockerfile.optimized  # Change this line
```

---

### **Step 4: Test Fast Rebuild** (2-5 Minutes)

```bash
# Make script executable (if needed)
chmod +x scripts/rebuild-worker-fast.sh

# Fast rebuild (uses base image, just copies code)
./scripts/rebuild-worker-fast.sh
```

**Expected Output**:
```
[INFO] Checking for local base image: gesalps-worker-base:latest
[SUCCESS] Base image found locally
[INFO] Using optimized Dockerfile
[INFO] Rebuilding synth-worker (2-5 minutes, using base image)...
... (fast build - just copying code) ...
[SUCCESS] Build completed successfully!
[SUCCESS] Container is running
[SUCCESS] Fast rebuild complete!
[INFO] Build time: 2-5 minutes (instead of 1+ hour)
```

**Verify Container**:
```bash
docker compose ps synth-worker
# Should show: Up and running

docker compose logs synth-worker --tail=20
# Should show: No import errors, worker started
```

---

## Optional: Push to Registry

**If you want to use a registry** (Docker Hub, GitHub, etc.):

```bash
# Set registry (choose one)
export REGISTRY="docker.io/yourusername"        # Docker Hub
# OR
export REGISTRY="ghcr.io/yourusername"          # GitHub Container Registry
# OR
export REGISTRY="registry.yourdomain.com"      # Private registry

# Push to registry
export PUSH_TO_REGISTRY="true"
./scripts/build-base-image.sh
```

**Then update `Dockerfile.optimized`**:
```dockerfile
# Uncomment and set registry image
FROM your-registry/gesalps-worker-base:latest
```

**Note**: Registry is optional - local base image works perfectly fine!

---

## Troubleshooting

### **Base Image Not Found**
```bash
# Check if base image exists
docker images | grep gesalps-worker-base

# If not, build it
./scripts/build-base-image.sh
```

### **Script Permission Denied**
```bash
chmod +x scripts/build-base-image.sh
chmod +x scripts/rebuild-worker-fast.sh
```

### **Build Fails**
```bash
# Check Docker disk space
df -h

# Check Docker logs
docker system df

# Clean up if needed
docker system prune -a  # WARNING: Removes unused images
```

### **Container Won't Start**
```bash
# Check logs
docker compose logs synth-worker --tail=50

# Verify base image
docker images gesalps-worker-base

# Rebuild if needed
./scripts/rebuild-worker-fast.sh
```

---

## Expected Results

### **Before Implementation**:
- Every build: **1+ hour** (downloads everything)
- Code changes: **1+ hour** (full rebuild)
- Dependency changes: **1+ hour** (full rebuild)

### **After Implementation**:
- First build: **30-60 minutes** (builds base image once)
- Code changes: **2-5 minutes** (uses base image) ✅
- Dependency changes: **30-60 minutes** (rebuild base, rare)

### **Improvement**:
- **10-20x faster** for code changes
- **No repeated downloads** of PyTorch
- **Faster iteration** and deployment

---

## When to Rebuild Base Image

**Rebuild base image when**:
- ✅ `requirements.txt` changes
- ✅ PyTorch version changes
- ✅ New dependencies added
- ✅ Dependencies updated

**Frequency**: Rare - maybe once a month

**How to Rebuild**:
```bash
./scripts/build-base-image.sh
```

---

## Quick Reference

### **Daily Usage** (Code Changes):
```bash
./scripts/rebuild-worker-fast.sh
# Takes 2-5 minutes
```

### **Dependency Changes** (Rare):
```bash
./scripts/build-base-image.sh
# Takes 30-60 minutes
# Then use fast rebuild script
```

### **Check Base Image**:
```bash
docker images | grep gesalps-worker-base
```

### **Check Container Status**:
```bash
docker compose ps synth-worker
docker compose logs synth-worker --tail=20
```

---

## Code Changes Proposed/Applied (if any)
- All files already created and committed
- No code changes needed on VPS
- Just need to build base image

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: High - Performance Critical**

**Action Required**: Implement base image solution on VPS

**Steps**:
1. ✅ Pull latest code: `git pull origin main`
2. ✅ Build base image: `./scripts/build-base-image.sh` (30-60 min, one-time)
3. ✅ Test fast rebuild: `./scripts/rebuild-worker-fast.sh` (2-5 min)
4. ✅ Verify container works: `docker compose logs synth-worker`

**Expected Time**:
- Setup: 30-60 minutes (one-time)
- Future builds: 2-5 minutes ✅

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

## Open Questions
- None - implementation is ready, just needs to be deployed

---

Agent: MainAgent  
Date: 2026-01-09  
Priority: High - Performance Critical  
Status: Ready for DevOpsAgent Implementation
