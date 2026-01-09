#!/bin/bash
# Rebuild synth-worker container with optimizer and compliance modules
# Run this on the Contabo VPS

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.yml"
SERVICE="synth-worker"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "${COMPOSE_FILE}" ]; then
    log_error "docker-compose.yml not found. Please run from backend directory."
    exit 1
fi

if [ ! -f "synth_worker/Dockerfile" ]; then
    log_error "synth_worker/Dockerfile not found. Please run from backend directory."
    exit 1
fi

# Verify Dockerfile has correct COPY commands
log_info "Verifying Dockerfile configuration..."
if grep -q "COPY synth_worker/ /app/" synth_worker/Dockerfile && \
   grep -q "COPY libs/ /app/libs/" synth_worker/Dockerfile; then
    log_success "Dockerfile configuration looks correct"
else
    log_error "Dockerfile missing required COPY commands"
    exit 1
fi

# Verify source files exist
log_info "Verifying source files exist..."
if [ ! -f "synth_worker/optimizer.py" ]; then
    log_error "synth_worker/optimizer.py not found"
    exit 1
fi

if [ ! -f "libs/compliance.py" ]; then
    log_error "libs/compliance.py not found"
    exit 1
fi

log_success "Source files verified"
echo ""

# Stop container if running
log_info "Stopping ${SERVICE} container..."
docker compose -f "${COMPOSE_FILE}" stop "${SERVICE}" || true
echo ""

# Rebuild with no cache
log_info "Rebuilding ${SERVICE} container (this may take 10-20 minutes)..."
log_warning "Building without cache to ensure new files are included"
docker compose -f "${COMPOSE_FILE}" build --no-cache "${SERVICE}"

if [ $? -eq 0 ]; then
    log_success "Build completed successfully"
else
    log_error "Build failed"
    exit 1
fi
echo ""

# Start container
log_info "Starting ${SERVICE} container..."
docker compose -f "${COMPOSE_FILE}" up -d "${SERVICE}"

# Wait for container to start
sleep 5

# Check container status
log_info "Checking container status..."
if docker compose -f "${COMPOSE_FILE}" ps "${SERVICE}" | grep -q "Up"; then
    log_success "Container is running"
else
    log_error "Container failed to start"
    docker compose -f "${COMPOSE_FILE}" logs "${SERVICE}" --tail=50
    exit 1
fi
echo ""

# Run verification script
log_info "Running verification checks..."
if [ -f "verify-optimizer-compliance.sh" ]; then
    ./verify-optimizer-compliance.sh
else
    log_warning "Verification script not found, skipping automated checks"
    log_info "Please manually verify:"
    log_info "  docker exec gesalps_worker ls -la /app/optimizer.py"
    log_info "  docker exec gesalps_worker ls -la /app/libs/compliance.py"
    log_info "  docker exec gesalps_worker python3 -c 'from optimizer import get_optimizer; print(\"OK\")'"
    log_info "  docker exec gesalps_worker python3 -c 'from libs.compliance import get_compliance_evaluator; print(\"OK\")'"
fi

log_success "========================================="
log_success "Rebuild complete!"
log_success "========================================="
log_info "Next steps:"
log_info "1. Check logs: docker compose -f ${COMPOSE_FILE} logs ${SERVICE} --tail=50"
log_info "2. Test a run to verify optimizer and compliance are working"
log_info "3. Monitor for 'all green' metrics"

