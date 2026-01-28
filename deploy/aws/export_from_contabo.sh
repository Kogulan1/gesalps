#!/bin/bash
# Gesalps Data Export Script
# Run this LOCALLY (on your Mac) to pull data from Contabo
# Usage: ./export_from_contabo.sh

VPS_IP="194.34.232.76"
REMOTE_DIR="/opt/gesalps"
LOCAL_BACKUP_DIR="./backup_data"

echo "📦 Starting Backup from Contabo ($VPS_IP)..."
mkdir -p $LOCAL_BACKUP_DIR

# 1. Stop Services (Optional but safer for DB)
echo "[1/3] Stopping remote containers to ensure consistency..."
ssh root@$VPS_IP "cd $REMOTE_DIR && docker compose stop"

# 2. Sync Data
echo "[2/3] Downloading Volumes (Supabase DB + Storage)..."
# Exclude heavy temporary files, keep persistent data
rsync -avz --progress \
    --exclude 'backend/omop_engine/src/__pycache__' \
    --exclude 'backend/omop_engine/src/*.pyc' \
    root@$VPS_IP:$REMOTE_DIR/volumes $LOCAL_BACKUP_DIR/

echo "[2/3] Downloading OMOP Models (Indices)..."
rsync -avz --progress \
    root@$VPS_IP:$REMOTE_DIR/backend/services/omop_engine/models $LOCAL_BACKUP_DIR/omop_models/

# 3. Restart Services
echo "[3/3] Restarting remote services..."
ssh root@$VPS_IP "cd $REMOTE_DIR && docker compose up -d"

echo "✅ Backup Complete! Data saved to: $PWD/$LOCAL_BACKUP_DIR"
echo "You can now SCP this folder to your new AWS instance."
