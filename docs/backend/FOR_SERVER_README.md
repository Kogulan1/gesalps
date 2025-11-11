# Files for Your Contabo Server (gesalpai.ch)

## ✅ What to Use on Your Server

### 1. Docker Compose File
**File**: `docker-compose.prod.yml`  
**Action**: Rename to `docker-compose.yml` on your server

This file is production-ready with:
- Resource limits for VPS
- Production health checks
- Logging configuration
- Optimized settings

### 2. Environment Variables
**File**: `ENV_GESALPAI_CH.txt`  
**Action**: Copy content to `.env` file on your server

Contains CORS settings for gesalpai.ch domain.

### 3. Setup Script (Optional)
**File**: `scripts/setup-contabo.sh`  
**Action**: Run on server to install Docker and dependencies

## 📋 Quick Server Setup

```bash
# On your Contabo VPS:

# 1. Upload backend files to /opt/gesalps/backend/

# 2. Navigate to backend directory
cd /opt/gesalps/backend

# 3. Rename production docker-compose file
mv docker-compose.prod.yml docker-compose.yml

# 4. Create .env file (copy from ENV_GESALPAI_CH.txt)
nano .env
# Paste content from ENV_GESALPAI_CH.txt and fill in Supabase values

# 5. Set permissions
chmod 600 .env

# 6. Build and start
docker compose build
docker compose up -d

# 7. Check status
docker compose ps
docker compose logs -f
```

## 📁 File Structure on Server

```
/opt/gesalps/backend/
├── docker-compose.yml          # (renamed from docker-compose.prod.yml)
├── .env                        # (created from ENV_GESALPAI_CH.txt)
├── api/
├── synth_worker/
├── report_service/
└── ... (all other backend files)
```

## 🔑 Key Configuration

### CORS Origins (in .env)
```
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,http://gesalpai.ch,http://www.gesalpai.ch
```

### Supabase (in .env)
Replace these with your actual values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### Memory Limits (in docker-compose.yml)
If your VPS has less than 16GB RAM, adjust Ollama memory:
```yaml
deploy:
  resources:
    limits:
      memory: 6G  # Reduce from 8G if needed
```

## 📚 Full Documentation

See `CONTABO_DEPLOYMENT.md` for complete deployment guide including:
- Nginx reverse proxy setup
- SSL certificate configuration
- Monitoring and troubleshooting

## ⚠️ Important

- **Don't change local files** - these are for server deployment only
- The `docker-compose.prod.yml` is ready to use - just rename it on server
- Keep `.env` file secure (chmod 600)

