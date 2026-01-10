#!/bin/bash
# VPS Update Script - Pull latest code and rebuild containers
# Usage: ./update-vps.sh [service]
#   service: api, synth-worker, report-service, or all (default: all)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE="${1:-all}"
BACKEND_DIR="${BACKEND_DIR:-/opt/gesalps/backend}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "$BACKEND_DIR/docker-compose.yml" ] && [ ! -f "$BACKEND_DIR/docker-compose.prod.yml" ]; then
    log_error "Docker compose file not found. Are you in the backend directory?"
    log_info "Expected location: $BACKEND_DIR"
    exit 1
fi

# Determine which compose file to use
if [ -f "$BACKEND_DIR/docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    log_info "Using production compose file: $COMPOSE_FILE"
else
    COMPOSE_FILE="docker-compose.yml"
    log_info "Using compose file: $COMPOSE_FILE"
fi

# Check for docker compose (v2) or docker-compose (v1)
COMPOSE_CMD=""
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    log_error "Neither 'docker compose' nor 'docker-compose' is available"
    exit 1
fi

log_info "Using: $COMPOSE_CMD"

# Step 1: Pull latest code
log_info "Step 1: Pulling latest code from git..."
cd "$BACKEND_DIR"

# Check git status
if [ -d ".git" ]; then
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Uncommitted changes detected. Stashing them..."
        git stash
        STASHED=true
    else
        STASHED=false
    fi
    
    # Pull latest code
    log_info "Pulling from origin main..."
    if git pull origin main; then
        log_success "Code pulled successfully"
    else
        log_error "Failed to pull code"
        if [ "$STASHED" = true ]; then
            log_info "Restoring stashed changes..."
            git stash pop
        fi
        exit 1
    fi
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        log_info "Restoring stashed changes..."
        git stash pop || true
    fi
else
    log_warning "Not a git repository. Skipping git pull."
fi

# Step 2: Rebuild containers
log_info "Step 2: Rebuilding Docker containers..."

if [ "$SERVICE" = "all" ]; then
    log_info "Rebuilding all services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache
else
    log_info "Rebuilding service: $SERVICE"
    $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache "$SERVICE"
fi

log_success "Containers rebuilt successfully"

# Step 3: Restart services
log_info "Step 3: Restarting services..."

if [ "$SERVICE" = "all" ]; then
    log_info "Restarting all services..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d
else
    log_info "Restarting service: $SERVICE"
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d "$SERVICE"
fi

log_success "Services restarted"

# Step 4: Wait for services to be healthy
log_info "Step 4: Waiting for services to be healthy..."
sleep 5

# Step 5: Verify services
log_info "Step 5: Verifying services..."

if [ "$SERVICE" = "all" ]; then
    log_info "Container status:"
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps
else
    log_info "Container status for $SERVICE:"
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps "$SERVICE"
fi

# Step 6: Check logs for errors
log_info "Step 6: Checking logs for errors (last 20 lines)..."

if [ "$SERVICE" = "all" ]; then
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs --tail=20
else
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs --tail=20 "$SERVICE"
fi

# Step 7: Test API health (if API service was updated)
if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "api" ]; then
    log_info "Step 7: Testing API health endpoint..."
    sleep 3
    
    # Try to get API URL from environment or use default
    API_URL="${API_URL:-http://localhost:8000}"
    
    if curl -f -s "${API_URL}/health" > /dev/null; then
        log_success "API health check passed"
        curl -s "${API_URL}/health" | head -1
    else
        log_warning "API health check failed (service may still be starting)"
    fi
fi

log_success "========================================="
log_success "VPS update completed successfully!"
log_success "========================================="
log_info "To view logs: $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
log_info "To check status: $COMPOSE_CMD -f $COMPOSE_FILE ps"
