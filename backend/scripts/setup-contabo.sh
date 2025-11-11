#!/bin/bash

# Gesalps Backend - Contabo VPS Setup Script
# This script automates the initial setup of the backend on a Contabo VPS

set -e  # Exit on error

echo "========================================="
echo "Gesalps Backend - Contabo VPS Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Warning: Not running as root. Some commands may require sudo.${NC}"
    SUDO="sudo"
else
    SUDO=""
fi

# Step 1: Update System
echo -e "${GREEN}[1/7] Updating system packages...${NC}"
$SUDO apt update && $SUDO apt upgrade -y

# Step 2: Install Docker
echo -e "${GREEN}[2/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    $SUDO sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${YELLOW}Docker is already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${GREEN}[3/7] Installing Docker Compose...${NC}"
if ! command -v docker compose &> /dev/null; then
    $SUDO apt install docker-compose-plugin -y
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo -e "${YELLOW}Docker Compose is already installed${NC}"
fi

# Step 4: Install Git and utilities
echo -e "${GREEN}[4/7] Installing utilities...${NC}"
$SUDO apt install -y git curl wget nano htop ufw

# Step 5: Add user to docker group (if not root)
if [ "$EUID" -ne 0 ]; then
    echo -e "${GREEN}[5/7] Adding user to docker group...${NC}"
    $SUDO usermod -aG docker $USER
    echo -e "${YELLOW}Note: You may need to log out and back in for docker group changes to take effect${NC}"
else
    echo -e "${GREEN}[5/7] Running as root, skipping user group addition${NC}"
fi

# Step 6: Configure Firewall
echo -e "${GREEN}[6/7] Configuring firewall...${NC}"
$SUDO ufw --force enable
$SUDO ufw allow 22/tcp  # SSH
$SUDO ufw allow 80/tcp  # HTTP
$SUDO ufw allow 443/tcp # HTTPS
echo -e "${GREEN}Firewall configured${NC}"

# Step 7: Verify installations
echo -e "${GREEN}[7/7] Verifying installations...${NC}"
echo ""
echo "Docker version:"
docker --version
echo ""
echo "Docker Compose version:"
docker compose version
echo ""

# Optional: Configure swap
read -p "Do you want to configure a 4GB swap file? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Configuring swap file...${NC}"
    if [ ! -f /swapfile ]; then
        $SUDO fallocate -l 4G /swapfile
        $SUDO chmod 600 /swapfile
        $SUDO mkswap /swapfile
        $SUDO swapon /swapfile
        echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab
        echo -e "${GREEN}Swap file configured successfully${NC}"
    else
        echo -e "${YELLOW}Swap file already exists${NC}"
    fi
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Clone or upload your backend code to /opt/gesalps/backend"
echo "2. Create .env file with your configuration (see .env.example)"
echo "3. Run: docker compose -f docker-compose.prod.yml build"
echo "4. Run: docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "For detailed instructions, see CONTABO_DEPLOYMENT.md"

