# VPS Update Guide - How to Deploy Code Changes

## Quick Update Steps

When you've pushed code changes to GitHub, follow these steps on your VPS:

### 1. SSH into Your VPS

```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

### 2. Navigate to Backend Directory

```bash
cd /opt/gesalps/backend
```

### 3. Pull Latest Code

```bash
git pull origin main
```

If you get an error about uncommitted changes:
```bash
# Check what files are modified
git status

# Option 1: Stash changes (save them temporarily)
git stash
git pull origin main
git stash pop  # Restore your changes if needed

# Option 2: Discard local changes (if you don't need them)
git reset --hard
git pull origin main
```

### 4. Rebuild and Restart Docker Containers

Since the code changed, you need to rebuild the containers:

```bash
# Rebuild the containers (this will use the new code)
docker compose build

# Restart the services
docker compose up -d

# Or do both in one command:
docker compose up -d --build
```

### 5. Verify Services Are Running

```bash
# Check container status
docker compose ps

# Check logs for any errors
docker compose logs -f --tail=50
```

### 6. Test the API

```bash
# Test health endpoint
curl https://api.gesalpai.ch/health

# Should return: {"ok":true}
```

## What Gets Updated

- **Backend code** (`backend/api/`, `backend/synth_worker/`, etc.)
- **Docker images** are rebuilt with new code
- **Services restart** automatically with `docker compose up -d`

## What Doesn't Need Updating

- **Environment variables** (`.env` file) - stays the same
- **Database** - no changes needed
- **Nginx configuration** - no changes needed
- **SSL certificates** - no changes needed

## Troubleshooting

### Issue: "git pull" says "Already up to date"
**Solution:** Your code is already up to date. No action needed.

### Issue: Docker build fails
**Solution:** Check the error message:
```bash
docker compose logs build
```

### Issue: Services won't start
**Solution:** Check logs:
```bash
docker compose logs api
docker compose logs synth-worker
```

### Issue: Changes not taking effect
**Solution:** Make sure you:
1. Actually pulled the latest code (`git pull`)
2. Rebuilt the containers (`docker compose build`)
3. Restarted services (`docker compose up -d`)

## Automated Update Script (Optional)

You can create a script to automate this:

```bash
# Create update script
nano /opt/gesalps/backend/update.sh
```

Paste this:
```bash
#!/bin/bash
set -e
cd /opt/gesalps/backend
echo "Pulling latest code..."
git pull origin main
echo "Rebuilding containers..."
docker compose build
echo "Restarting services..."
docker compose up -d
echo "Update complete! Checking status..."
docker compose ps
```

Make it executable:
```bash
chmod +x /opt/gesalps/backend/update.sh
```

Then you can just run:
```bash
/opt/gesalps/backend/update.sh
```

## When to Update

Update your VPS whenever you:
- Push code changes to GitHub
- Want to deploy bug fixes
- Want to deploy new features
- Want to apply performance improvements (like the ones we just made!)

## Current Update Needed

Since we just pushed performance improvements, you should update now:

```bash
cd /opt/gesalps/backend
git pull origin main
docker compose up -d --build
```

This will deploy the new adaptive hyperparameter tuning and enhanced post-processing improvements!

