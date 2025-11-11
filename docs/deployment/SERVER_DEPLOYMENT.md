# Server Deployment Guide for gesalpai.ch

## Quick Start - Copy & Paste Ready

### Step 1: On Your Contabo VPS Server

```bash
# 1. Connect to your server
ssh root@your-vps-ip

# 2. Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y

# 3. Create directory and navigate
mkdir -p /opt/gesalps/backend
cd /opt/gesalps/backend
```

### Step 2: Upload Files to Server

Upload these files to `/opt/gesalps/backend/` on your server:
- All files from `backend/` directory (api/, synth_worker/, report_service/, etc.)
- `docker-compose.prod.yml` (rename it to `docker-compose.yml` on server)
- Or use git: `git clone <your-repo> /opt/gesalps && cd /opt/gesalps/backend`

### Step 3: Create .env File on Server

```bash
nano .env
```

Copy and paste this (replace with your actual Supabase values):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# CORS Configuration for gesalpai.ch
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,http://gesalpai.ch,http://www.gesalpai.ch

# Email Configuration (Optional)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=noreply@gesalpai.ch

# Service URLs (don't change)
REPORT_SERVICE_BASE=http://report-service:8010
OLLAMA_BASE=http://ollama:11434

# Worker Configuration
WORKER_ENABLED=true
DP_BACKEND=custom
DP_STRICT_DEFAULT=false

# Security
ALLOW_INSECURE_SUPABASE_DEFAULTS=false

# Upload Limits
MAX_UPLOAD_MB=10
```

Save and set permissions:
```bash
chmod 600 .env
```

### Step 4: Rename docker-compose.prod.yml to docker-compose.yml

```bash
# If you uploaded docker-compose.prod.yml
mv docker-compose.prod.yml docker-compose.yml

# Or if using git, copy it
cp docker-compose.prod.yml docker-compose.yml
```

### Step 5: Build and Start

```bash
# Build images (takes 10-20 minutes first time)
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 6: Verify

```bash
# Check API health
curl http://localhost:8000/health

# Check all services
docker compose ps
```

## Docker Compose File for Server

Use `docker-compose.prod.yml` - it's already configured with:
- Resource limits
- Production health checks
- Logging configuration
- Optimized for VPS

**Just rename it to `docker-compose.yml` on your server!**

## Environment Variables Template

See `ENV_GESALPAI_CH.txt` for the complete template with gesalpai.ch CORS settings.

## Next Steps

1. Set up Nginx reverse proxy (see CONTABO_DEPLOYMENT.md Step 6)
2. Configure SSL with Let's Encrypt
3. Update frontend to point to `https://api.gesalpai.ch`

## Important Notes

- **Don't change local files** - these are for server only
- The `docker-compose.prod.yml` file is ready to use on your server
- Just rename it to `docker-compose.yml` on the server
- Adjust Ollama memory limit in docker-compose.yml if your VPS has less than 16GB RAM

