# Quick Deployment Reference

## First-Time Setup

```bash
cd /opt/gesalps/backend

# 1. Set up environment
cp ENV_TEMPLATE.txt .env
nano .env  # Edit with production values

# 2. Configure Nginx
sudo cp nginx-zero-downtime.conf /etc/nginx/sites-available/gesalps-api
sudo ln -s /etc/nginx/sites-available/gesalps-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 3. Start services
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify
curl https://api.gesalpai.ch/health
docker compose -f docker-compose.prod.yml ps
```

## Daily Deployments

```bash
cd /opt/gesalps/backend

# Deploy all services
./deploy.sh all

# Or deploy specific service
./deploy.sh api
./deploy.sh synth-worker
```

## Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f api

# Check status
docker compose -f docker-compose.prod.yml ps

# Restart service
docker compose -f docker-compose.prod.yml restart api

# Stop all
docker compose -f docker-compose.prod.yml down

# Update and restart
git pull
./deploy.sh all
```

## Troubleshooting

```bash
# Container not starting
docker compose -f docker-compose.prod.yml logs api

# Health check failing
curl http://localhost:8000/health

# Nginx 502
sudo tail -f /var/log/nginx/gesalps-api-error.log
docker compose -f docker-compose.prod.yml ps api
```

