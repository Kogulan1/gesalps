# Gesalps Backend - Contabo VPS Deployment Guide

## Prerequisites

- Contabo VPS with at least:
  - 4 vCPU cores (recommended: 6-8)
  - 16 GB RAM (minimum: 8 GB, recommended: 16 GB)
  - 100 GB+ storage
  - Ubuntu 22.04 LTS or 24.04 LTS
- Domain name (optional, for SSL)
- SSH access to your VPS

## Step 1: Initial VPS Setup

### 1.1 Connect to Your VPS

```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install Required Dependencies

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Add your user to docker group (if not root)
usermod -aG docker $USER

# Install Git
apt install git -y

# Install other utilities
apt install curl wget nano htop -y
```

### 1.4 Verify Installation

```bash
docker --version
docker compose version
```

## Step 2: Clone and Prepare Backend

### 2.1 Clone Repository

```bash
cd /opt
git clone <your-repo-url> gesalps
cd gesalps/backend
```

Or if you prefer to upload files manually:
```bash
mkdir -p /opt/gesalps/backend
# Then upload your backend files via SCP or SFTP
```

### 2.2 Create Environment File

```bash
# For gesalpai.ch, use the pre-configured template
cp .env.gesalpai.ch .env
nano .env
```

Or create manually:

```bash
nano .env
```

Copy the contents from `.env.gesalpai.ch` template and fill in your actual Supabase values:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# CORS Configuration - Already configured for gesalpai.ch
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,http://gesalpai.ch,http://www.gesalpai.ch

# Email Configuration (Optional)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=noreply@gesalpai.ch

# Service URLs (internal Docker network)
REPORT_SERVICE_BASE=http://report-service:8010
OLLAMA_BASE=http://ollama:11434

# Worker Configuration
WORKER_ENABLED=true
DP_BACKEND=custom
DP_STRICT_DEFAULT=false

# Security
ALLOW_INSECURE_SUPABASE_DEFAULTS=false
```

**Important**: 
- The CORS origins are already set for gesalpai.ch
- Replace Supabase credentials with your actual values
- Keep `SUPABASE_SERVICE_ROLE_KEY` secure (never commit to git)

### 2.3 Set Proper Permissions

```bash
chmod 600 .env  # Only owner can read/write
```

## Step 3: Configure Docker Compose for Production

### 3.1 Use Production Docker Compose

The `docker-compose.yml` file is already configured for production with:
- Resource limits for each service
- Proper health checks
- Logging configuration
- Production-ready settings

**For gesalpai.ch**: The `docker-compose.yml` file is ready to use. Just make sure your `.env` file has the correct CORS origins set for gesalpai.ch.

**Note**: If you need to adjust memory limits for Ollama based on your VPS RAM, edit the `memory: 8G` value in the `ollama` service section.

### 3.2 Optional: Configure Swap (if low on RAM)

```bash
# Create 4GB swap file
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile 
swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Step 4: Build and Start Services

### 4.1 Build Docker Images

```bash
cd /opt/gesalps/backend
docker compose build
```

This will take 10-20 minutes on first run (downloading base images, installing dependencies).

### 4.2 Start Services

```bash
docker compose up -d
```

### 4.3 Check Service Status

```bash
# View all containers
docker compose ps

# View logs
docker compose logs -f

# Check specific service
docker compose logs -f api
docker compose logs -f synth-worker
```

### 4.4 Verify Services

```bash
# Check API health
curl http://localhost:8000/health

# Check Ollama
curl http://localhost:11434/api/tags

# Check report service
curl http://localhost:8010/health
```

## Step 5: Configure Firewall

### 5.1 Allow Required Ports

```bash
# Install UFW if not installed
apt install ufw -y

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS (if using reverse proxy)
ufw allow 80/tcp
ufw allow 443/tcp

# If exposing API directly (not recommended for production)
# ufw allow 8000/tcp

# Enable firewall
ufw enable
ufw status
```

**Note**: In production, you should use a reverse proxy (Nginx/Caddy) and only expose ports 80/443.

## Step 6: Set Up Reverse Proxy (Recommended)

### 6.1 Install Nginx

```bash
apt install nginx -y
```

### 6.2 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/gesalps-api
```

Add configuration:

```nginx
server {
    listen 80;
    server_name api.gesalpai.ch;  # For gesalpai.ch

    # Increase timeouts for long-running requests
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.3 Enable Site

```bash
ln -s /etc/nginx/sites-available/gesalps-api /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

### 6.4 Set Up SSL with Let's Encrypt

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.gesalpai.ch
```

## Step 7: Update Frontend Configuration

Update your frontend `.env` or environment variables:

```bash
# For gesalpai.ch with reverse proxy
NEXT_PUBLIC_API_URL=https://api.gesalpai.ch

# Or if not using reverse proxy (not recommended for production)
# NEXT_PUBLIC_API_URL=http://your-vps-ip:8000
```

## Step 8: Monitoring and Maintenance

### 8.1 View Resource Usage

```bash
docker stats
htop
```

### 8.2 View Logs

```bash
# All services
docker compose logs --tail=100 -f

# Specific service
docker compose logs -f api
docker compose logs -f synth-worker
```

### 8.3 Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart api
```

### 8.4 Update Services

```bash
cd /opt/gesalps/backend
git pull  # If using git
docker compose build
docker compose up -d
```

### 8.5 Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (be careful!)
docker volume prune

# View disk usage
docker system df
```

## Step 9: Set Up Auto-Restart on Reboot

### 9.1 Enable Docker to Start on Boot

```bash
systemctl enable docker
```

### 9.2 Docker Compose Auto-Start

Docker Compose with `restart: unless-stopped` in docker-compose.yml will automatically restart containers on reboot.

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs

# Check container status
docker compose ps

# Check system resources
free -h
df -h
```

### Out of Memory

```bash
# Check memory usage
docker stats

# If Ollama is using too much memory, edit docker-compose.yml
# Change the memory limit in the ollama service:
#   limits:
#     memory: 6G  # Reduce from 8G if needed
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8000
netstat -tulpn | grep 8000

# Kill process if needed
kill -9 <PID>
```

### Database Connection Issues

- Verify Supabase credentials in `.env`
- Check if Supabase project is active
- Verify network connectivity: `curl https://your-project.supabase.co`

## Security Checklist

- [ ] `.env` file has proper permissions (600)
- [ ] Firewall is configured and enabled
- [ ] CORS is configured with specific origins (not `*`)
- [ ] SSL/TLS is enabled (via Let's Encrypt)
- [ ] Supabase service role key is kept secure
- [ ] Regular backups are configured
- [ ] System is updated regularly
- [ ] SSH key authentication is used (disable password auth)

## Backup Strategy

### Database
- Supabase handles database backups automatically
- Export data periodically if needed

### Application Data
- Back up `.env` file securely
- Back up any uploaded datasets if stored locally
- Back up Docker volumes if needed

## Performance Optimization

1. **Monitor Resource Usage**: Use `docker stats` and `htop` regularly
2. **Adjust Ollama Memory**: Limit if needed in docker-compose.prod.yml
3. **Clean Up Old Data**: Remove old synthetic data files periodically
4. **Use Swap**: Configure swap if RAM is limited
5. **Optimize Docker**: Regularly prune unused images and volumes

## Support

For issues:
1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Check system resources: `htop`, `df -h`, `free -h`
3. Verify environment variables: `cat .env` (be careful with sensitive data)
4. Check network connectivity: `curl http://localhost:8000/health`

