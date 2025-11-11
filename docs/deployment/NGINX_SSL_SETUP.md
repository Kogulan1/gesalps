# Nginx Reverse Proxy & SSL Setup for api.gesalpai.ch

## Step 1: Install Nginx

```bash
# Update package list
apt update

# Install Nginx
apt install nginx -y

# Check Nginx status
systemctl status nginx
```

## Step 2: Create Nginx Configuration

```bash
# Create configuration file
nano /etc/nginx/sites-available/gesalps-api
```

Copy and paste this configuration:

```nginx
server {
    listen 80;
    server_name api.gesalpai.ch;

    # Increase timeouts for long-running requests (synthetic data generation can take time)
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    client_max_body_size 50M;  # Allow larger file uploads

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
        
        # WebSocket support (if needed)
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint (optional, for monitoring)
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
```

Save the file (Ctrl+X, then Y, then Enter).

## Step 3: Enable the Site

```bash
# Create symbolic link to enable the site
ln -s /etc/nginx/sites-available/gesalps-api /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
```

If you see "syntax is ok" and "test is successful", proceed.

## Step 4: Restart Nginx

```bash
# Restart Nginx to apply changes
systemctl restart nginx

# Enable Nginx to start on boot
systemctl enable nginx

# Check status
systemctl status nginx
```

## Step 5: Configure DNS

**Important**: Before setting up SSL, make sure your DNS is configured:

1. Go to your domain registrar (where you manage gesalpai.ch)
2. Add an A record:
   - **Type**: A
   - **Name**: api (or @ if you want root domain)
   - **Value**: Your Contabo VPS IP address
   - **TTL**: 3600 (or default)

3. Wait for DNS propagation (can take a few minutes to a few hours)
4. Verify DNS is working:
   ```bash
   # Check if DNS resolves
   nslookup api.gesalpai.ch
   # or
   dig api.gesalpai.ch
   ```

## Step 6: Install Certbot (Let's Encrypt)

```bash
# Install Certbot and Nginx plugin
apt install certbot python3-certbot-nginx -y
```

## Step 7: Obtain SSL Certificate

```bash
# Get SSL certificate (Certbot will automatically configure Nginx)
certbot --nginx -d api.gesalpai.ch

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

Certbot will:
- Obtain the SSL certificate
- Automatically update your Nginx configuration
- Set up automatic renewal

## Step 8: Verify SSL Certificate

```bash
# Test SSL certificate
curl https://api.gesalpai.ch/health

# Check certificate details
openssl s_client -connect api.gesalpai.ch:443 -servername api.gesalpai.ch
```

## Step 9: Test Automatic Renewal

```bash
# Test renewal process (dry run)
certbot renew --dry-run
```

## Step 10: Configure Firewall (if not already done)

```bash
# Allow HTTP and HTTPS
ufw allow 'Nginx Full'
# or manually:
ufw allow 80/tcp
ufw allow 443/tcp

# Check firewall status
ufw status
```

## Step 11: Update Frontend Configuration

Update your frontend `.env` or environment variables:

```bash
NEXT_PUBLIC_API_URL=https://api.gesalpai.ch
```

## Verification

After setup, test these endpoints:

```bash
# HTTP (should redirect to HTTPS)
curl -I http://api.gesalpai.ch/health

# HTTPS
curl https://api.gesalpai.ch/health

# Should return: {"ok":true}
```

## Troubleshooting

### Nginx won't start
```bash
# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test configuration
nginx -t
```

### SSL certificate issues
```bash
# Check certificate status
certbot certificates

# Renew certificate manually (if needed)
certbot renew
```

### DNS not resolving
```bash
# Check DNS propagation
nslookup api.gesalpai.ch
dig api.gesalpai.ch

# Wait for DNS propagation (can take up to 48 hours, usually much faster)
```

### 502 Bad Gateway
- Check if API service is running: `docker compose ps`
- Check API logs: `docker compose logs api`
- Verify API is accessible: `curl http://localhost:8000/health`

## Maintenance

### Renew SSL Certificate
Certbot automatically renews certificates, but you can manually renew:

```bash
certbot renew
systemctl reload nginx
```

### View Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Update Nginx Configuration
```bash
# Edit configuration
nano /etc/nginx/sites-available/gesalps-api

# Test configuration
nginx -t

# Reload Nginx (no downtime)
systemctl reload nginx
```

## Security Checklist

- [x] Nginx configured with proper proxy headers
- [x] SSL certificate installed and auto-renewal configured
- [x] Firewall allows only HTTP (80) and HTTPS (443)
- [x] HTTP redirects to HTTPS
- [x] Timeouts configured for long-running requests
- [x] File upload size limits configured

## Next Steps

1. Update your frontend to use `https://api.gesalpai.ch`
2. Test the full workflow (upload dataset, start run)
3. Monitor logs: `docker compose logs -f` and `tail -f /var/log/nginx/access.log`

Your API is now accessible securely via HTTPS! 🎉

