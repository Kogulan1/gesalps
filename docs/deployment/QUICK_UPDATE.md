# Quick VPS Update - Copy & Paste Ready

## Step 1: Navigate to Backend Directory

```bash
cd /opt/gesalps/backend
```

## Step 2: Pull Latest Code

```bash
git pull origin main
```

If you get an error about uncommitted changes:
```bash
# Check what's modified
git status

# Option 1: Stash changes (save temporarily)
git stash
git pull origin main

# Option 2: Discard local changes (if not needed)
git reset --hard
git pull origin main
```

## Step 3: Rebuild and Restart

```bash
docker compose up -d --build
```

## Step 4: Verify

```bash
# Check services
docker compose ps

# Check logs
docker compose logs --tail=50

# Test API
curl https://api.gesalpai.ch/health
```

## Expected Result

After pulling, you should see:
- `docs/` folder in the root
- Old `.md` files moved to `docs/` subfolders
- New performance improvements in the code

## Troubleshooting

**If git pull says "Already up to date":**
- You're already on the latest version
- Just rebuild: `docker compose up -d --build`

**If build fails:**
- Check logs: `docker compose logs`
- Make sure you're in `/opt/gesalps/backend` directory

