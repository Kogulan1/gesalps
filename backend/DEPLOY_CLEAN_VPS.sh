#!/bin/bash
# DEPLOY_CLEAN_VPS.sh
# Automates a clean deployment on the Contabo VPS.
# Usage: bash DEPLOY_CLEAN_VPS.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

log_info "========================================="
log_info "Gesalp AI - Clean Production Deployment"
log_info "========================================="
echo ""

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"

# Check location
if [ ! -f "$COMPOSE_FILE" ]; then
    if [ -f "backend/$COMPOSE_FILE" ]; then
        cd backend
        log_info "Changed directory to backend"
    else
        log_error "$COMPOSE_FILE not found. Please run from project root or backend directory."
        exit 1
    fi
fi

# Step 1: Git Pull (if git exists)
log_info "Step 1: Updating codebase..."
if [ -d ".git" ]; then
    git pull origin main || log_warning "Git pull failed, proceeding with current code..."
else
    log_warning "Not a git repository, skipping update."
fi
echo ""

# Step 2: Stop and Clean
log_info "Step 2: Stopping and cleaning..."
docker compose -f $COMPOSE_FILE down --remove-orphans
log_info "Pruning unused builder cache to free space..."
docker builder prune -f > /dev/null
echo ""

# Step 3: Rebuild everything
log_info "Step 3: Rebuilding all services (No Cache)..."
log_info "This may take 10-20 minutes depending on VPS speed."
docker compose -f $COMPOSE_FILE build --no-cache

if [ $? -eq 0 ]; then
    log_success "Build completed successfully"
else
    log_error "Build failed"
    exit 1
fi
echo ""

# Step 4: Start Services
log_info "Step 4: Starting services..."
docker compose -f $COMPOSE_FILE up -d

# Wait for healthy
log_info "Waiting 30s for services to initialize..."
sleep 30
echo ""

# Step 5: Verification (Integrated from EXECUTE_ON_CONTABO.sh)
log_info "Step 5: Verifying deployment..."

# Verify Containers Running
if docker compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    log_success "Containers are running"
    docker compose -f $COMPOSE_FILE ps
else
    log_error "Containers failed to start"
    docker compose -f $COMPOSE_FILE logs --tail=50
    exit 1
fi
echo ""

# Verify Worker Modules
log_info "Verifying Worker Modules..."
WORKER_CONTAINER=$(docker compose -f $COMPOSE_FILE ps -q synth-worker)
if [ -z "$WORKER_CONTAINER" ]; then
    log_error "Worker container not found!"
else
    # Test Imports
    if docker exec "$WORKER_CONTAINER" python3 -c "from optimizer import get_optimizer; from libs.compliance import get_compliance_evaluator; print('Modules verified')" 2>&1; then
        log_success "Worker modules (optimizer, compliance) verified successfully."
    else
        log_error "Worker module verification FAILED."
        docker exec "$WORKER_CONTAINER" pip list | grep -E "sdv|synthcity" || true
    fi
fi
echo ""

# Verify API Health
log_info "Verifying API Health..."
if curl -s -f http://localhost:8000/health > /dev/null; then
    log_success "API is healthy (http://localhost:8000/health)"
else
    log_warning "API health check failed (might still be starting). Checking logs..."
    docker compose -f $COMPOSE_FILE logs api --tail=20
fi
echo ""

log_success "========================================="
log_success "Deployment and Verification Complete!"
log_success "========================================="
log_info "Please check the frontend to ensure full functionality."
