# Backend Agent Prompt: Fix Localhost Database Access

## Issue
The frontend running on `localhost:3000` cannot access the database through the backend API. The backend needs to be properly configured for localhost development.

## Current State
- Backend has Supabase credentials in `backend/.env`:
  - `SUPABASE_URL=https://dcshmrmkfybpmixlfddj.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` is set
  - `CORS_ALLOW_ORIGINS=http://localhost:3000` is configured
- Frontend expects backend at `http://localhost:8000` (default fallback)
- Frontend needs `NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000` in `.env.local`

## Required Fixes

### 1. Verify Backend Environment Configuration
**File:** `backend/.env`
- ✅ Already has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Already has `CORS_ALLOW_ORIGINS=http://localhost:3000`
- **Action:** Verify these are correct and backend can connect to Supabase

### 2. Create/Update Frontend Environment File
**File:** `frontend/.env.local` (create if doesn't exist)
```env
NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://dcshmrmkfybpmixlfddj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjYxOTcsImV4cCI6MjA3MjMwMjE5N30.LNJlS7cBIhgsELKoO6UseqKaglqMMMVChVJPcRqRPyk
```

### 3. Verify Backend API is Running
**Check:**
- Backend should be running on `http://localhost:8000`
- Health endpoint should work: `curl http://localhost:8000/health`
- Backend should be able to connect to Supabase

### 4. Test Database Connection
**Verify:**
- Backend can query Supabase tables (projects, datasets, runs)
- Backend can authenticate JWT tokens from frontend
- CORS is properly configured to allow `http://localhost:3000`

## Implementation Steps

1. **Check if backend is running:**
   ```bash
   cd backend
   # If using Docker:
   docker compose up -d
   # Or if running directly:
   cd api
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Verify backend health:**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status": "healthy"}
   ```

3. **Test Supabase connection from backend:**
   - Backend should be able to query `projects` table
   - Check backend logs for any Supabase connection errors

4. **Create frontend .env.local:**
   ```bash
   cd frontend
   cat > .env.local << EOF
   NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=https://dcshmrmkfybpmixlfddj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc2htcm1rZnlicG1peGxmZGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjYxOTcsImV4cCI6MjA3MjMwMjE5N30.LNJlS7cBIhgsELKoO6UseqKaglqMMMVChVJPcRqRPyk
   EOF
   ```

5. **Restart frontend dev server:**
   ```bash
   cd frontend
   pnpm dev
   ```

## Expected Behavior After Fix

- Frontend at `http://localhost:3000` can make API calls to `http://localhost:8000`
- Backend can query Supabase database
- Authentication works (JWT tokens validated)
- Projects, datasets, and runs can be created/read/updated

## Troubleshooting

### If backend can't connect to Supabase:
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`
- Verify Supabase project is active
- Check network connectivity

### If CORS errors occur:
- Verify `CORS_ALLOW_ORIGINS=http://localhost:3000` in `backend/.env`
- Check backend logs for CORS-related errors
- Ensure backend is reading `.env` file correctly

### If frontend can't reach backend:
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_BACKEND_API_BASE` in `frontend/.env.local`
- Restart frontend dev server after adding env vars

## Files to Check/Modify

1. `backend/.env` - Backend environment variables
2. `frontend/.env.local` - Frontend environment variables (create if missing)
3. `backend/api/main.py` - Verify Supabase client initialization
4. `backend/docker-compose.yml` - If using Docker, verify CORS config

## Success Criteria

✅ Backend health endpoint responds: `curl http://localhost:8000/health`  
✅ Frontend can fetch projects: `http://localhost:3000/en/dashboard` shows data  
✅ No CORS errors in browser console  
✅ Backend logs show successful Supabase queries  
✅ Frontend can create/read/update projects, datasets, runs

