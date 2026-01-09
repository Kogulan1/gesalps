# Backend Agent Prompt: Fix Localhost Frontend → VPS Backend → Supabase DB

## Problem
The frontend running on `localhost:3000` cannot access the database because:
1. ✅ Frontend now points to VPS backend (`https://api.gesalpai.ch`) - FIXED
2. ❌ VPS backend CORS may not allow `http://localhost:3000` - NEEDS FIX

## Current State
- **VPS Backend:** `https://api.gesalpai.ch` ✅ (running, health check works)
- **Supabase DB:** `https://dcshmrmkfybpmixlfddj.supabase.co` ✅ (configured)
- **Frontend Local:** `http://localhost:3000` (updated to use VPS backend)
- **VPS CORS:** Needs to include `http://localhost:3000`

## Task: Update VPS Backend CORS

### Step 1: SSH to VPS Server
```bash
ssh root@your-vps-ip
# Or use your SSH key/credentials
```

### Step 2: Update Backend .env File
```bash
cd /opt/gesalps/backend
nano .env
# Or use vi/vim if preferred
```

### Step 3: Find and Update CORS_ALLOW_ORIGINS
**Current line (likely):**
```
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch
```

**Updated line (add localhost):**
```
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,http://localhost:3000
```

**Important:** Keep all existing origins, just add `http://localhost:3000` to the comma-separated list.

### Step 4: Save and Restart Backend
```bash
# Save the file (Ctrl+X, then Y, then Enter for nano)
# Or :wq for vi/vim

# Restart the backend API container
docker compose restart api

# Verify the change was applied
docker compose exec api env | grep CORS_ALLOW_ORIGINS
```

### Step 5: Verify Backend is Running
```bash
# Check container status
docker ps | grep gesalps_api

# Check backend logs for any errors
docker compose logs api --tail 50

# Test health endpoint
curl https://api.gesalpai.ch/health
```

## Verify Supabase Connection

### Check Backend Can Connect to Supabase
```bash
# On VPS, check backend logs for Supabase connection
docker compose logs api | grep -i supabase

# Should see successful connection messages, no errors
```

### Test Database Query (Optional)
If you have backend access, you can test a simple query:
```bash
# This would require Python access or API endpoint
# Just verify backend starts without Supabase errors
```

## Expected Result

After these changes:
- ✅ Frontend at `http://localhost:3000` can make API calls to `https://api.gesalpai.ch`
- ✅ No CORS errors in browser console
- ✅ Backend accepts requests from `http://localhost:3000`
- ✅ Backend successfully queries Supabase database
- ✅ Projects, datasets, runs can be created/read/updated

## Troubleshooting

### If CORS errors persist:
1. **Verify CORS is set correctly:**
   ```bash
   docker compose exec api env | grep CORS
   ```

2. **Check backend CORS middleware:**
   - Verify `backend/api/main.py` reads `CORS_ALLOW_ORIGINS` correctly
   - Check that CORS middleware is configured properly

3. **Restart backend:**
   ```bash
   docker compose restart api
   ```

4. **Check backend logs:**
   ```bash
   docker compose logs api --tail 100
   ```

### If Supabase connection fails:
1. **Verify Supabase credentials in .env:**
   ```bash
   docker compose exec api env | grep SUPABASE
   ```

2. **Check Supabase project is active:**
   - Visit https://app.supabase.com
   - Verify project is not paused

3. **Test Supabase connection:**
   - Check backend logs for connection errors
   - Verify network connectivity from VPS to Supabase

## Files Modified
- `/opt/gesalps/backend/.env` - Add `http://localhost:3000` to CORS_ALLOW_ORIGINS

## Success Criteria
✅ VPS backend `.env` includes `http://localhost:3000` in CORS_ALLOW_ORIGINS  
✅ Backend restarted successfully  
✅ `curl https://api.gesalpai.ch/health` returns `{"ok":true}`  
✅ Frontend at `http://localhost:3000` can fetch data without CORS errors  
✅ Database operations work from localhost frontend

