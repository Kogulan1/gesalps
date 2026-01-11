#!/bin/bash
# Phase 2 Deployment and Testing Script
# SyntheticDataSpecialist taking DevOps control per user request

set -e  # Exit on error

VPS_HOST="194.34.232.76"
VPS_USER="root"
BACKEND_DIR="/opt/gesalps/backend"
CONTAINER_NAME="gesalps_worker"

echo "=========================================="
echo "Phase 2 Deployment and Testing"
echo "=========================================="
echo ""

# Step 1: Pull latest code
echo "Step 1: Pulling latest code from git..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${BACKEND_DIR} && git pull origin main"
echo "✅ Code pulled"
echo ""

# Step 2: Rebuild container
echo "Step 2: Rebuilding synth-worker container..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${BACKEND_DIR} && docker compose -f docker-compose.prod.yml build --no-cache synth-worker"
echo "✅ Container rebuilt"
echo ""

# Step 3: Restart container
echo "Step 3: Restarting synth-worker container..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${BACKEND_DIR} && docker compose -f docker-compose.prod.yml restart synth-worker"
echo "✅ Container restarted"
echo ""

# Step 4: Verify preprocessing_agent.py
echo "Step 4: Verifying preprocessing_agent.py is present..."
ssh ${VPS_USER}@${VPS_HOST} "docker exec ${CONTAINER_NAME} ls -la /app/preprocessing_agent.py"
echo "✅ Preprocessing agent verified"
echo ""

# Step 5: Verify import
echo "Step 5: Verifying preprocessing agent import..."
ssh ${VPS_USER}@${VPS_HOST} "docker exec ${CONTAINER_NAME} python -c 'from preprocessing_agent import get_preprocessing_plan; print(\"✅ Preprocessing OK\")'"
echo "✅ Import verified"
echo ""

# Step 6: Copy test files to container
echo "Step 6: Copying test files to container..."
ssh ${VPS_USER}@${VPS_HOST} "docker cp ${BACKEND_DIR}/standalone_quality_test.py ${CONTAINER_NAME}:/app/standalone_quality_test.py"
ssh ${VPS_USER}@${VPS_HOST} "docker cp ${BACKEND_DIR}/heart.csv ${CONTAINER_NAME}:/app/heart.csv 2>/dev/null || echo 'heart.csv not in backend dir, will use default path'"
echo "✅ Test files copied"
echo ""

# Step 7: Run quality test
echo "Step 7: Running quality test (this may take 5-10 minutes)..."
echo "=========================================="
ssh ${VPS_USER}@${VPS_HOST} "docker exec ${CONTAINER_NAME} python standalone_quality_test.py"
echo "=========================================="
echo ""

echo "✅ Phase 2 deployment and testing complete!"
echo ""
echo "Next steps:"
echo "1. Review test results above"
echo "2. Check if KS Mean improved (target: <0.5, ideally <0.3)"
echo "3. Verify all metrics compute (corr_delta, dup_rate not N/A)"
echo "4. If KS still high, proceed to Phase 3 optimizations"
