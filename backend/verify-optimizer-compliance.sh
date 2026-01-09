#!/bin/bash
# Verification script for optimizer.py and compliance.py modules in synth-worker container
# Run this on the Contabo VPS after rebuilding the container

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="gesalps_worker"
COMPOSE_FILE="docker-compose.yml"

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

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container ${CONTAINER_NAME} not found"
    exit 1
fi

log_info "Verifying modules in container: ${CONTAINER_NAME}"
echo ""

# 1. Check optimizer.py
log_info "1. Checking optimizer.py..."
if docker exec "${CONTAINER_NAME}" test -f /app/optimizer.py; then
    log_success "optimizer.py found at /app/optimizer.py"
    docker exec "${CONTAINER_NAME}" ls -lh /app/optimizer.py
else
    log_error "optimizer.py NOT found at /app/optimizer.py"
    exit 1
fi
echo ""

# 2. Check compliance.py
log_info "2. Checking compliance.py..."
if docker exec "${CONTAINER_NAME}" test -f /app/libs/compliance.py; then
    log_success "compliance.py found at /app/libs/compliance.py"
    docker exec "${CONTAINER_NAME}" ls -lh /app/libs/compliance.py
else
    log_error "compliance.py NOT found at /app/libs/compliance.py"
    exit 1
fi
echo ""

# 3. Check other libs files
log_info "3. Checking other libs files..."
for file in db_connector.py experiments.py model_selector.py; do
    if docker exec "${CONTAINER_NAME}" test -f "/app/libs/${file}"; then
        log_success "${file} found"
    else
        log_warning "${file} not found (may be optional)"
    fi
done
echo ""

# 4. Test optimizer import
log_info "4. Testing optimizer module import..."
if docker exec "${CONTAINER_NAME}" python3 -c "from optimizer import get_optimizer; print('OK')" 2>&1; then
    log_success "optimizer module imports successfully"
else
    log_error "optimizer module import FAILED"
    exit 1
fi
echo ""

# 5. Test compliance import
log_info "5. Testing compliance module import..."
if docker exec "${CONTAINER_NAME}" python3 -c "from libs.compliance import get_compliance_evaluator; print('OK')" 2>&1; then
    log_success "compliance module imports successfully"
else
    log_error "compliance module import FAILED"
    exit 1
fi
echo ""

# 6. Test both modules together (as worker.py does)
log_info "6. Testing both modules together (simulating worker.py imports)..."
if docker exec "${CONTAINER_NAME}" python3 -c "
from optimizer import get_optimizer, FailureType
from libs.compliance import get_compliance_evaluator
print('Both modules imported successfully')
optimizer = get_optimizer()
evaluator = get_compliance_evaluator('hipaa_like')
print('Both modules instantiated successfully')
" 2>&1; then
    log_success "Both modules work together correctly"
else
    log_error "Module integration test FAILED"
    exit 1
fi
echo ""

# 7. Check container logs for import errors
log_info "7. Checking container logs for import errors..."
RECENT_LOGS=$(docker logs "${CONTAINER_NAME}" --tail=50 2>&1)
if echo "${RECENT_LOGS}" | grep -qi "import.*error\|module.*not.*found\|no.*module"; then
    log_warning "Potential import errors found in logs:"
    echo "${RECENT_LOGS}" | grep -i "import.*error\|module.*not.*found\|no.*module" | head -5
else
    log_success "No import errors found in recent logs"
fi
echo ""

# Summary
log_success "========================================="
log_success "All verification checks passed!"
log_success "========================================="
log_info "optimizer.py: ✓ Present and importable"
log_info "compliance.py: ✓ Present and importable"
log_info "Integration: ✓ Both modules work together"
log_info ""
log_info "Container is ready for use with optimizer and compliance modules"

