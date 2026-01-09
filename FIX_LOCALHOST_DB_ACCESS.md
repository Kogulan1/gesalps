# Fix Localhost Database Access - Quick Guide

## Problem
Frontend on `localhost:3000` cannot access database through backend API.

## Quick Fix

### Step 1: Ensure Frontend .env.local has Backend URL
```bash
cd frontend
echo "NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000" >> .env.local
```

### Step 2: Start Backend API
```bash
cd backend
# Option A: Using Docker
docker compose up -d api

# Option B: Direct Python
cd api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Verify Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

### Step 4: Restart Frontend
```bash
cd frontend
pnpm dev
```

## Backend Agent Prompt

Use this prompt with the Backend Agent:

---

**You are the Backend Developer Agent for Gesalp AI. The frontend running on localhost:3000 cannot access the database through the backend API.**

**Current Status:**
- Backend has Supabase credentials in `backend/.env`
- Backend needs to run on `http://localhost:8000`
- Frontend needs `NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000` in `.env.local`
- CORS is configured for `http://localhost:3000`

**Tasks:**
1. Verify `backend/.env` has correct Supabase credentials
2. Ensure `CORS_ALLOW_ORIGINS=http://localhost:3000` is set
3. Start backend API on port 8000 (Docker or direct)
4. Verify backend can connect to Supabase (test with a simple query)
5. Update/create `frontend/.env.local` with `NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000`
6. Test that frontend can reach backend health endpoint
7. Verify database queries work from frontend

**Files to check:**
- `backend/.env` - Supabase config
- `backend/api/main.py` - Supabase client initialization
- `frontend/.env.local` - Backend API URL
- `backend/docker-compose.yml` - CORS config if using Docker

**Success criteria:**
- `curl http://localhost:8000/health` returns `{"status": "healthy"}`
- Frontend at `http://localhost:3000` can fetch projects/datasets/runs
- No CORS errors in browser console
- Backend logs show successful Supabase connections

---

## Alternative: Direct Fix (If Backend Agent Not Available)

I can fix this directly. Would you like me to:
1. Check and update `frontend/.env.local` with backend URL
2. Verify backend configuration
3. Provide commands to start backend

Let me know if you want me to proceed with the direct fix!

