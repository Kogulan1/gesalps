# Backend Agent Prompt: Fix Localhost Frontend → VPS Backend → Supabase DB Access

## Issue
The frontend running on `localhost:3000` cannot access the database because:
1. Frontend `.env.local` points to `http://localhost:8000` (local backend) instead of VPS backend
2. VPS backend CORS may not allow `http://localhost:3000`

## Current Configuration
- **VPS Backend:** `https://api.gesalpai.ch` (running and accessible)
- **Supabase DB:** `https://dcshmrmkfybpmixlfddj.supabase.co` (configured)
- **Frontend Local:** `http://localhost:3000` (needs to connect to VPS backend)
- **Frontend .env.local:** Currently has `NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000` ❌

## Required Fixes

### 1. Update VPS Backend CORS Configuration
**File:** `/opt/gesalps/backend/.env` on VPS server

**Current CORS (likely):**
```
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch
```

**Updated CORS (add localhost):**
```
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,http://localhost:3000
```

**Action on VPS:**
```bash
# SSH to VPS
ssh root@your-vps-ip

# Edit .env file
cd /opt/gesalps/backend
nano .env

# Update CORS_ALLOW_ORIGINS line to include http://localhost:3000
# Save and exit (Ctrl+X, Y, Enter)

# Restart backend to apply changes
docker compose restart api

# Verify CORS is updated
docker compose exec api env | grep CORS_ALLOW_ORIGINS
```

### 2. Update Frontend .env.local
**File:** `frontend/.env.local` (local development)

**Current:**
```
NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000
```

**Updated:**
```
NEXT_PUBLIC_BACKEND_API_BASE=https://api.gesalpai.ch
```

**Action locally:**
```bash
cd frontend
# Edit .env.local and change the backend URL
# Or use sed:
sed -i '' 's|NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000|NEXT_PUBLIC_BACKEND_API_BASE=https://api.gesalpai.ch|g' .env.local

# Restart frontend dev server
pnpm dev
```

### 3. Verify Supabase Connection
**Check:** VPS backend can connect to Supabase

**On VPS:**
```bash
# Check backend logs for Supabase connection
docker compose logs api | grep -i supabase

# Test backend health
curl https://api.gesalpai.ch/health
```

## Implementation Steps

### Step 1: Update VPS Backend CORS
1. SSH to VPS server
2. Navigate to `/opt/gesalps/backend`
3. Edit `.env` file
4. Add `http://localhost:3000` to `CORS_ALLOW_ORIGINS`
5. Restart backend: `docker compose restart api`
6. Verify: Check backend logs for CORS configuration

### Step 2: Update Frontend Configuration
1. Edit `frontend/.env.local`
2. Change `NEXT_PUBLIC_BACKEND_API_BASE` to `https://api.gesalpai.ch`
3. Restart frontend dev server
4. Test: Open `http://localhost:3000` and check browser console

### Step 3: Verify Connection
1. Frontend should make requests to `https://api.gesalpai.ch`
2. Backend should accept requests from `http://localhost:3000`
3. Backend should connect to Supabase successfully
4. Database queries should work

## Expected Behavior After Fix

✅ Frontend at `http://localhost:3000` makes API calls to `https://api.gesalpai.ch`  
✅ No CORS errors in browser console  
✅ Backend can query Supabase database  
✅ Projects, datasets, runs can be created/read/updated from localhost frontend  
✅ Authentication works (JWT tokens validated by VPS backend)

## Troubleshooting

### CORS Errors
**Symptom:** Browser console shows CORS errors  
**Fix:** 
- Verify `CORS_ALLOW_ORIGINS` includes `http://localhost:3000` on VPS
- Restart backend after updating CORS
- Check backend logs: `docker compose logs api | grep CORS`

### Connection Refused
**Symptom:** Network errors when calling API  
**Fix:**
- Verify `https://api.gesalpai.ch/health` is accessible
- Check VPS backend is running: `docker ps` on VPS
- Verify SSL certificate is valid

### 401 Unauthorized
**Symptom:** Authentication errors  
**Fix:**
- Verify Supabase credentials in VPS backend `.env`
- Check JWT token is being sent from frontend
- Verify backend can validate Supabase JWKS

## Files to Modify

1. **VPS:** `/opt/gesalps/backend/.env` - Add localhost to CORS
2. **Local:** `frontend/.env.local` - Change backend URL to VPS

## Success Criteria

✅ `curl https://api.gesalpai.ch/health` returns healthy  
✅ Frontend `.env.local` has `NEXT_PUBLIC_BACKEND_API_BASE=https://api.gesalpai.ch`  
✅ VPS backend `.env` has `CORS_ALLOW_ORIGINS=...,http://localhost:3000`  
✅ Frontend can fetch projects/datasets/runs from VPS backend  
✅ No CORS errors in browser console  
✅ Database operations work correctly

