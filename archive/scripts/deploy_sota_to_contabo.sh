#!/bin/bash
# Deploy SOTA SynthCity + TabDDPM upgrade to Contabo production
# Run on Contabo VPS after SSH and cd to backend folder

set -e  # Exit on error

echo "🚀 Deploying SOTA TabDDPM upgrade to Contabo production..."

# Pull latest code from sota-upgrade branch
echo "📥 Pulling latest code..."
git pull origin sota-upgrade-jan2026 || git pull origin main

# Check if using Docker or direct Python
if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
    echo "🐳 Detected Docker setup - updating requirements in containers..."
    # Get service names from docker-compose
    WORKER_SERVICE=$(docker compose config --services 2>/dev/null | grep -i worker || echo "synth-worker")
    
    echo "📝 Found worker service: $WORKER_SERVICE"
    echo "🔨 Rebuilding Docker containers with new dependencies..."
    echo "⏳ This may take 10-20 minutes (installing PyTorch, SynthCity, etc.)..."
    
    # Rebuild only the worker service (which needs the new dependencies)
    docker compose build --no-cache $WORKER_SERVICE
    
    # Restart the worker container
    docker compose up -d $WORKER_SERVICE
    
    echo "✅ Docker worker container rebuilt and restarted"
    
    # Check container status
    echo "📊 Container status:"
    docker compose ps $WORKER_SERVICE
else
    # Direct Python installation (with virtual environment or --break-system-packages)
    echo "📦 Installing Python dependencies..."
    
    # Try to use existing virtual environment or create one
    if [ -d "venv" ] || [ -d ".venv" ]; then
        VENV_PATH="${VENV_PATH:-venv}"
        [ -d ".venv" ] && VENV_PATH=".venv"
        echo "Using existing virtual environment: $VENV_PATH"
        source $VENV_PATH/bin/activate
        pip install -r requirements.txt
        pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
        pip install opacus==1.5.4
        pip install synthcity
    else
        # Use --break-system-packages for system-wide install (required for PM2)
        echo "Installing system-wide (required for PM2 services)..."
        pip install --break-system-packages -r requirements.txt
        pip install --break-system-packages torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 --extra-index-url https://download.pytorch.org/whl/cpu
        pip install --break-system-packages opacus==1.5.4
        pip install --break-system-packages synthcity
    fi
fi

# Restart PM2 services
echo "🔄 Restarting services..."
pm2 restart synth_worker
pm2 restart fastapi_app
pm2 save

echo "✅ Deployment complete! TabDDPM is now live on gesalpai.ch"
echo "📊 Check logs: pm2 logs synth_worker"
echo "🌐 Frontend should show TabDDPM as default option"

