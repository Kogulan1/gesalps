# Zero-Downtime Docker Deployment Guide

This guide explains how to achieve zero-downtime deployments for the Gesalp AI backend using Docker Compose on the Contabo VPS.

## Overview

The zero-downtime deployment strategy uses:
- **Docker Compose** for container orchestration
- **Gunicorn with Uvicorn workers** for the API (production-ready ASGI server)
- **Health checks** to ensure services are ready before routing traffic
- **Graceful shutdown** with stop grace periods
- **Nginx reverse proxy** with upstream configuration for seamless switching

## Architecture

```
Internet → Nginx (443) → Docker Network → API Container (8000)
                              ↓
                    Worker Container
                    Report Service Container
                    Ollama Container
```

## Prerequisites

1. Docker and Docker Compose installed on VPS
2. Nginx installed and configured
3. SSL certificate (Let's Encrypt) configured
4. Environment variables in `.env` file

## Setup Instructions

### 1. Initial Deployment

```bash
cd /opt/gesalps/backend

# Copy environment file
cp ENV_TEMPLATE.txt .env
# Edit .env with your production values
nano .env

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 2. Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx-zero-downtime.conf /etc/nginx/sites-available/gesalps-api

# Edit if needed (update domain, SSL paths)
sudo nano /etc/nginx/sites-available/gesalps-api

# Enable site
sudo ln -s /etc/nginx/sites-available/gesalps-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Verify Deployment

```bash
# Check API health
curl https://api.gesalpai.ch/health

# Check container health
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs api
```

## Zero-Downtime Deployment Process

### Using the Deployment Script

The `deploy.sh` script handles zero-downtime deployments:

```bash
# Deploy all services
./deploy.sh all

# Deploy specific service
./deploy.sh api
./deploy.sh synth-worker
./deploy.sh report-service
```

### Manual Deployment Steps

1. **Build new image** (doesn't affect running container):
   ```bash
   docker compose -f docker-compose.prod.yml build api
   ```

2. **Update container** (graceful replacement):
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps api
   ```

3. **Wait for health check**:
   ```bash
   # Monitor until healthy
   docker compose -f docker-compose.prod.yml ps api
   # Or check health endpoint
   curl http://localhost:8000/health
   ```

4. **Reload Nginx** (if needed):
   ```bash
   sudo systemctl reload nginx
   ```

### How Zero-Downtime Works

1. **Container Replacement**: Docker Compose stops the old container gracefully (30s grace period) and starts a new one
2. **Health Checks**: New container must pass health checks before being considered ready
3. **Nginx Upstream**: Nginx automatically routes to healthy backends
4. **Graceful Shutdown**: Gunicorn workers finish current requests before shutting down

## Production Configuration

### API Server (Gunicorn + Uvicorn)

The API uses Gunicorn with Uvicorn workers for production:

- **Workers**: 2 (adjust based on CPU cores)
- **Worker Class**: `uvicorn.workers.UvicornWorker` (async support)
- **Timeout**: 120s (for long-running synthetic data generation)
- **Graceful Timeout**: 30s (allows requests to complete)

To adjust workers, edit `backend/api/Dockerfile`:
```dockerfile
CMD ["gunicorn", \
     "main:app", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \  # Increase for more CPU cores
     ...]
```

### Resource Limits

Services have resource limits configured in `docker-compose.prod.yml`:

- **API**: 2GB RAM, 1 CPU
- **Worker**: 2GB RAM, 1 CPU
- **Report Service**: 512MB RAM, 0.5 CPU
- **Ollama**: 8GB RAM, 2 CPU (adjust based on VPS)

### Health Checks

All services have health checks configured:

- **Interval**: 10s
- **Timeout**: 5s
- **Retries**: 3
- **Start Period**: 30s (initial grace period)

## Monitoring

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### Check Status

```bash
# Service status
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats

# Health endpoint
curl https://api.gesalpai.ch/health
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/gesalps-api-access.log

# Error logs
sudo tail -f /var/log/nginx/gesalps-api-error.log
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Check container status
docker compose -f docker-compose.prod.yml ps

# Restart service
docker compose -f docker-compose.prod.yml restart api
```

### Health Check Failing

```bash
# Test health endpoint directly
curl http://localhost:8000/health

# Check container logs
docker compose -f docker-compose.prod.yml logs api

# Verify environment variables
docker compose -f docker-compose.prod.yml exec api env | grep SUPABASE
```

### Nginx 502 Bad Gateway

```bash
# Check if API container is running
docker compose -f docker-compose.prod.yml ps api

# Check Nginx error logs
sudo tail -f /var/log/nginx/gesalps-api-error.log

# Test upstream connection
curl http://localhost:8000/health

# Reload Nginx
sudo systemctl reload nginx
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Adjust resource limits in docker-compose.prod.yml
# Then redeploy
./deploy.sh all
```

## Advanced: Multiple API Instances

For true zero-downtime with multiple API instances:

1. **Update docker-compose.prod.yml**:
   ```yaml
   api:
     deploy:
       replicas: 2  # Run 2 instances
   ```

2. **Update Nginx upstream**:
   ```nginx
   upstream gesalps_api_backend {
       least_conn;
       server 127.0.0.1:8000;
       server 127.0.0.1:8001;
   }
   ```

3. **Expose multiple ports**:
   ```yaml
   api:
     ports:
       - "8000:8000"
       - "8001:8000"  # Second instance
   ```

## Rollback Procedure

If a deployment fails:

```bash
# Stop new container
docker compose -f docker-compose.prod.yml stop api

# Start previous version (if image tagged)
docker run -d --name gesalps_api_old \
  --env-file .env \
  gesalps-api:previous \
  gunicorn main:app --bind 0.0.0.0:8000

# Or rebuild previous version from git
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d api
```

## Maintenance Windows

For major updates or migrations:

```bash
# Put Nginx in maintenance mode
sudo cp nginx-maintenance.conf /etc/nginx/sites-available/gesalps-api
sudo systemctl reload nginx

# Perform updates
./deploy.sh all

# Restore normal mode
sudo cp nginx-zero-downtime.conf /etc/nginx/sites-available/gesalps-api
sudo systemctl reload nginx
```

## Best Practices

1. **Always test deployments** in staging first
2. **Monitor logs** during and after deployment
3. **Verify health checks** before considering deployment complete
4. **Keep previous images** tagged for quick rollback
5. **Use resource limits** to prevent resource exhaustion
6. **Regular backups** of volumes and databases
7. **Monitor metrics** (CPU, memory, request rates)

## Security Considerations

1. **Keep containers updated**: Regularly update base images
2. **Use secrets management**: Don't commit `.env` files
3. **Network isolation**: Services communicate via Docker network
4. **SSL/TLS**: Always use HTTPS in production
5. **Firewall**: Only expose necessary ports (80, 443)
6. **Regular audits**: Review logs and access patterns

## Support

For issues or questions:
- Check logs first: `docker compose -f docker-compose.prod.yml logs`
- Review this documentation
- Check GitHub issues
- Contact DevOps team

