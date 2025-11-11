# Vercel Environment Variables Setup

## Quick Fix: Set Backend API URL

Your frontend needs to know where your backend API is located. Since you've moved the backend to your Contabo VPS at `https://api.gesalpai.ch`, you need to configure this in Vercel.

## Steps to Configure

### 1. Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com) and log in
2. Select your project (gesalps or gesalpai.ch)

### 2. Navigate to Settings
1. Click on your project
2. Go to **Settings** tab
3. Click on **Environment Variables** in the left sidebar

### 3. Add/Update Environment Variable

**Variable Name:**
```
NEXT_PUBLIC_BACKEND_API_BASE
```

**Value:**
```
https://api.gesalpai.ch
```

**Important:** 
- ✅ Check **Production**
- ✅ Check **Preview** 
- ✅ Check **Development** (optional, for local testing)

### 4. Redeploy

After adding/updating the environment variable:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeploy

## Verify Configuration

After redeploying, you can verify the configuration is working:

1. Open your browser's Developer Console (F12)
2. Try to delete a run or dataset
3. Check the console logs - you should see:
   ```
   [Delete Run] Calling: DELETE https://api.gesalpai.ch/v1/runs/...
   ```
   or
   ```
   [Delete Dataset] Calling: DELETE https://api.gesalpai.ch/v1/datasets/...
   ```

If you see errors about "Backend API URL not configured", the environment variable is not set correctly.

## All Required Environment Variables

Make sure you have these set in Vercel:

```
NEXT_PUBLIC_BACKEND_API_BASE=https://api.gesalpai.ch
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Issue: "Backend API URL not configured" error
**Solution:** The `NEXT_PUBLIC_BACKEND_API_BASE` variable is missing or empty. Add it in Vercel settings.

### Issue: CORS errors in browser console
**Solution:** Make sure your backend `.env` file on the VPS includes your Vercel frontend URL in `CORS_ALLOW_ORIGINS`.

On your VPS, edit `/opt/gesalps/backend/.env` and update the CORS line:
```bash
# Add your Vercel URL(s) to the list
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,https://gesalps-rjf4k2tr8-kogulan1s-projects.vercel.app,https://gesalps-git-main-kogulan1s-projects.vercel.app
```

Then restart the backend:
```bash
cd /opt/gesalps/backend
docker compose restart api
```

**Note:** If you're using a custom domain on Vercel (like gesalpai.ch), you might not need the `.vercel.app` URLs, but it's safer to include them.

### Issue: 401 Unauthorized errors
**Solution:** Check that:
1. User is logged in
2. Supabase authentication is working
3. Backend is receiving the Authorization header (check backend logs)

### Issue: Network errors / Connection refused
**Solution:** 
1. Verify `https://api.gesalpai.ch/health` works in your browser
2. Check that Nginx is running on the VPS
3. Check that SSL certificate is valid
4. Check backend Docker containers are running: `docker ps` on VPS

## Testing Locally

If you want to test locally, create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_API_BASE=https://api.gesalpai.ch
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then restart your Next.js dev server.

