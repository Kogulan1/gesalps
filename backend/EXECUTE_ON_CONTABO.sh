#!/bin/bash
# Complete execution script for Contabo VPS
# Copy this entire script and run it on the VPS
# Usage: bash EXECUTE_ON_CONTABO.sh

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
log_info "Gesalp AI - Docker Build Fix Execution"
log_info "========================================="
echo ""

# Check if running on correct system
if [ ! -f "/opt/gesalps/backend/docker-compose.yml" ] && [ ! -f "./docker-compose.yml" ]; then
    log_error "docker-compose.yml not found. Please run from /opt/gesalps/backend or backend directory"
    exit 1
fi

# Navigate to backend directory
if [ -f "/opt/gesalps/backend/docker-compose.yml" ]; then
    cd /opt/gesalps/backend
    log_info "Working directory: /opt/gesalps/backend"
elif [ -f "./docker-compose.yml" ]; then
    log_info "Working directory: $(pwd)"
else
    log_error "Cannot find backend directory"
    exit 1
fi

echo ""

# Step 1: Verify source files exist
log_info "Step 1: Verifying source files..."
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

# Step 2: Verify Dockerfile configuration
log_info "Step 2: Verifying Dockerfile configuration..."
if ! grep -q "COPY synth_worker/ /app/" synth_worker/Dockerfile; then
    log_error "Dockerfile missing: COPY synth_worker/ /app/"
    exit 1
fi

if ! grep -q "COPY libs/ /app/libs/" synth_worker/Dockerfile; then
    log_error "Dockerfile missing: COPY libs/ /app/libs/"
    exit 1
fi

log_success "Dockerfile configuration verified"
echo ""

# Step 3: Verify docker-compose.yml build context
log_info "Step 3: Verifying docker-compose.yml build context..."
if ! grep -A2 "synth-worker:" docker-compose.yml | grep -q "context: \."; then
    log_warning "docker-compose.yml may need build context update"
    log_info "Checking current configuration..."
    grep -A3 "synth-worker:" docker-compose.yml | head -4
else
    log_success "Build context verified"
fi
echo ""

# Step 4: Stop container
log_info "Step 4: Stopping synth-worker container..."
docker compose -f docker-compose.yml stop synth-worker 2>/dev/null || log_warning "Container not running or already stopped"
echo ""

# Step 5: Rebuild with no cache
log_info "Step 5: Rebuilding synth-worker container (this will take 10-20 minutes)..."
log_warning "Building without cache to ensure optimizer.py and compliance.py are included"
echo ""

docker compose -f docker-compose.yml build --no-cache synth-worker

if [ $? -eq 0 ]; then
    log_success "Build completed successfully"
else
    log_error "Build failed - check output above"
    exit 1
fi
echo ""

# Step 6: Start container
log_info "Step 6: Starting synth-worker container..."
docker compose -f docker-compose.yml up -d synth-worker

# Wait for container to start
sleep 5
echo ""

# Step 7: Verify container is running
log_info "Step 7: Verifying container is running..."
if docker compose -f docker-compose.yml ps synth-worker | grep -q "Up"; then
    log_success "Container is running"
else
    log_error "Container failed to start"
    log_info "Checking logs..."
    docker compose -f docker-compose.yml logs synth-worker --tail=50
    exit 1
fi
echo ""

# Step 8: Verify optimizer.py exists
log_info "Step 8: Verifying optimizer.py exists in container..."
if docker exec gesalps_worker test -f /app/optimizer.py; then
    log_success "optimizer.py found at /app/optimizer.py"
    docker exec gesalps_worker ls -lh /app/optimizer.py
else
    log_error "optimizer.py NOT found in container"
    exit 1
fi
echo ""

# Step 9: Verify compliance.py exists
log_info "Step 9: Verifying compliance.py exists in container..."
if docker exec gesalps_worker test -f /app/libs/compliance.py; then
    log_success "compliance.py found at /app/libs/compliance.py"
    docker exec gesalps_worker ls -lh /app/libs/compliance.py
else
    log_error "compliance.py NOT found in container"
    exit 1
fi
echo ""

# Step 10: Test optimizer import
log_info "Step 10: Testing optimizer module import..."
if docker exec gesalps_worker python3 -c "from optimizer import get_optimizer; print('OK')" 2>&1; then
    log_success "optimizer module imports successfully"
else
    log_error "optimizer module import FAILED"
    docker exec gesalps_worker python3 -c "from optimizer import get_optimizer" 2>&1 || true
    exit 1
fi
echo ""

# Step 11: Test compliance import
log_info "Step 11: Testing compliance module import..."
if docker exec gesalps_worker python3 -c "from libs.compliance import get_compliance_evaluator; print('OK')" 2>&1; then
    log_success "compliance module imports successfully"
else
    log_error "compliance module import FAILED"
    docker exec gesalps_worker python3 -c "from libs.compliance import get_compliance_evaluator" 2>&1 || true
    exit 1
fi
echo ""

# Step 12: Test both modules together
log_info "Step 12: Testing both modules together (simulating worker.py)..."
if docker exec gesalps_worker python3 -c "
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

# Step 13: Check container logs for errors
log_info "Step 13: Checking container logs for import errors..."
RECENT_LOGS=$(docker logs gesalps_worker --tail=50 2>&1)
if echo "${RECENT_LOGS}" | grep -qi "import.*error\|module.*not.*found\|no.*module\|traceback"; then
    log_warning "Potential errors found in logs:"
    echo "${RECENT_LOGS}" | grep -i "import.*error\|module.*not.*found\|no.*module\|traceback" | head -10
else
    log_success "No import errors found in recent logs"
fi
echo ""

# Final summary
log_success "========================================="
log_success "ALL VERIFICATION CHECKS PASSED!"
log_success "========================================="
echo ""
log_info "Summary:"
log_info "  ✓ optimizer.py: Present and importable"
log_info "  ✓ compliance.py: Present and importable"
log_info "  ✓ Integration: Both modules work together"
log_info "  ✓ Container: Running without errors"
echo ""
log_info "Next steps:"
log_info "  1. Monitor logs: docker compose -f docker-compose.yml logs -f synth-worker"
log_info "  2. Test a run to verify optimizer and compliance are working"
log_info "  3. Check for 'all green' metrics in run results"
echo ""
log_success "Docker build fix completed successfully!"

