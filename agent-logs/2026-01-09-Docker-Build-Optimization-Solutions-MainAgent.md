# 2026-01-09 - Docker Build Optimization Solutions - MainAgent

## Status
✅ Solutions Proposed

## Summary
Identified that Docker builds are taking over an hour, blocking DevOpsAgent from working on other tasks. Proposed multiple solutions to dramatically reduce build times and enable faster iteration.

## Key Findings / Decisions

### 🔴 **Problem Identified**:
- **Issue**: Docker builds taking 1+ hours for simple updates
- **Impact**: Blocks DevOpsAgent from working on other critical tasks (CORS fix, etc.)
- **Root Cause**: Full rebuilds with `--no-cache`, installing all dependencies from scratch

### 💡 **Solutions Proposed**:

#### **Solution 1: Use Volume Mounts for Development (FASTEST)**
**For code/config changes that don't require dependency changes**

**Create**: `backend/docker-compose.dev.yml`
```yaml
services:
  api:
    build: ./api
    volumes:
      - ./api:/app  # Mount code directly - no rebuild needed!
    environment:
      - PYTHONUNBUFFERED=1
    # Restart on code changes
```

**Benefits**:
- ✅ Code changes apply instantly (no rebuild)
- ✅ Config changes (like CORS in .env) just need restart
- ✅ Only rebuild when dependencies change

**Usage**:
```bash
# For simple config changes (CORS, etc.)
docker compose -f docker-compose.dev.yml restart api

# For code changes
# Just edit code - changes apply automatically!
```

---

#### **Solution 2: Selective Service Rebuilds**
**Only rebuild the service that changed**

**Current Problem**: Rebuilding all services even when only one changed

**Solution**:
```bash
# Instead of: docker compose build --no-cache
# Use: Only rebuild the service that changed

# Example: Only API changed
docker compose build api
docker compose up -d api

# Example: Only worker changed  
docker compose build synth-worker
docker compose up -d synth-worker
```

**Benefits**:
- ✅ 5-10 minutes instead of 1+ hour
- ✅ Other services keep running
- ✅ Faster iteration

---

#### **Solution 3: Use Docker Layer Caching (Smart Builds)**
**Let Docker cache layers that haven't changed**

**Current Problem**: Using `--no-cache` forces full rebuild

**Solution**:
```bash
# Instead of: docker compose build --no-cache synth-worker
# Use: docker compose build synth-worker  # Uses cache!

# Only use --no-cache when:
# - Dependencies changed (requirements.txt)
# - Dockerfile structure changed
# - First time build
```

**Benefits**:
- ✅ Subsequent builds: 2-5 minutes (cached layers)
- ✅ Only rebuilds changed layers
- ✅ Much faster iteration

---

#### **Solution 4: Development vs Production Builds**
**Separate configs for dev (fast) and prod (optimized)**

**Create**: `backend/docker-compose.dev.yml` (fast, with volumes)
**Keep**: `backend/docker-compose.prod.yml` (optimized, no volumes)

**Benefits**:
- ✅ Dev: Fast iteration with volume mounts
- ✅ Prod: Optimized builds for deployment
- ✅ Best of both worlds

---

#### **Solution 5: For Simple Config Changes (CORS, etc.)**
**Just restart, no rebuild needed!**

**For CORS fix specifically**:
```bash
# 1. Edit .env file (CORS_ALLOW_ORIGINS)
nano .env

# 2. Restart API service (no rebuild!)
docker compose restart api

# 3. Verify
docker compose exec api env | grep CORS
```

**Benefits**:
- ✅ Instant (seconds, not hours)
- ✅ No rebuild needed for config changes
- ✅ Works for most environment variable changes

---

### 🎯 **Recommended Approach**:

**For Immediate CORS Fix** (Solution 5):
1. Edit `.env` file on VPS
2. Restart API: `docker compose restart api`
3. Test CORS headers
4. **Time**: ~30 seconds instead of 1+ hour

**For Future Development** (Solution 1 + 2):
1. Create `docker-compose.dev.yml` with volume mounts
2. Use selective rebuilds
3. Use layer caching (avoid `--no-cache` unless needed)
4. **Time**: 2-5 minutes for most changes

---

## Code Changes Proposed/Applied (if any)

### **Proposed: Create docker-compose.dev.yml**

**File**: `backend/docker-compose.dev.yml` (NEW)

```yaml
services:
  api:
    build: ./api
    volumes:
      - ./api:/app  # Hot reload - no rebuild needed
    environment:
      - PYTHONUNBUFFERED=1
    # ... rest of config

  synth-worker:
    build:
      context: .
      dockerfile: synth_worker/Dockerfile
    volumes:
      - ./synth_worker:/app/synth_worker  # Hot reload
      - ./libs:/app/libs  # Hot reload
    # ... rest of config
```

**Benefits**: Code changes apply instantly, no rebuild needed

---

## Next Steps / Handoff

### → **DevOpsAgent**: 
**PRIORITY: High - Unblock Other Tasks**

**Immediate Action for CORS Fix** (No rebuild needed!):
1. SSH to VPS: `ssh root@194.34.232.76`
2. Edit `.env`: `cd /opt/gesalps/backend && nano .env`
3. Verify `CORS_ALLOW_ORIGINS` includes `https://www.gesalpai.ch`
4. Restart API: `docker compose restart api`
5. Test: `curl -H "Origin: https://www.gesalpai.ch" https://api.gesalpai.ch/health -v`
6. **Time**: ~2 minutes total (not 1+ hour!)

**Future Optimization**:
1. Create `docker-compose.dev.yml` with volume mounts
2. Use selective rebuilds instead of full rebuilds
3. Use layer caching (avoid `--no-cache` unless dependencies changed)
4. Document when to use dev vs prod compose files

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

## Open Questions
- Should we create `docker-compose.dev.yml` now or after CORS fix?
- Do we need hot reload for all services or just API/worker?

---

Agent: MainAgent  
Date: 2026-01-09  
Priority: High - Unblock DevOpsAgent  
Status: Solutions Proposed
