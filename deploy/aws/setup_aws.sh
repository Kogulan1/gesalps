#!/bin/bash
# Gesalps AWS Node Setup Script
# Works on Ubuntu 22.04 LTS
# Usage: sudo ./setup_aws.sh

set -e

echo "🚀 Starting Gesalps Node Initialization..."

# 1. Update System
echo "[1/5] Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release git htop unzip python3-pip

# 2. Install Docker & Compose
echo "[2/5] Installing Docker..."
if ! command -v docker &> /dev/null; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    # Setup user permissions (optional if running as root)
    # usermod -aG docker ubuntu
    echo "Docker installed successfully."
else
    echo "Docker already installed."
fi

# 3. NVIDIA Drivers (Only if GPU hardware detected)
echo "[3/5] Checking for GPU hardware..."
if lspci | grep -i nvidia &> /dev/null; then
    echo "✅ NVIDIA GPU detected. Installing drivers and toolkit..."
    # Install standard drivers
    # ubuntu-drivers autoinstall
    # Install NVIDIA Container Toolkit
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | apt-key add -
    curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    apt-get update
    apt-get install -y nvidia-container-toolkit
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker
    echo "NVIDIA setup complete."
else
    echo "ℹ️ No GPU detected. Skipping NVIDIA driver installation. (CPU Mode)"
fi

# 4. Create Project Directory
echo "[4/5] Setting up project directory..."
mkdir -p /opt/gesalps/backend
mkdir -p /opt/gesalps/database
mkdir -p /opt/gesalps/storage

# 5. Swap File (Safety net for RAM spikes)
echo "[5/5] Configuring Swap (8GB)..."
if [ ! -f /swapfile ]; then
    fallocate -l 8G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo "Swap enabled."
else
    echo "Swap already exists."
fi

echo "✅ Setup Complete! Ready for deployment."
echo "Next steps:"
echo "1. Clone your repo or SCP your docker-compose.yml"
echo "2. Run: docker compose up -d"
