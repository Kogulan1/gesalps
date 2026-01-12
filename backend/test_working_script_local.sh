#!/bin/bash

# Script to test the working standalone_ddpm_test.py in local Docker
# This will help identify the environment where it achieved KS Mean 0.0650

set -e

echo "=========================================="
echo "Testing Working Script in Local Docker"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

# Check if container exists
CONTAINER_NAME="gesalps_worker"
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container ${CONTAINER_NAME} not found. Starting containers..."
    cd "$(dirname "$0")"
    docker-compose up -d synth-worker
    echo "⏳ Waiting for container to be ready..."
    sleep 5
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container ${CONTAINER_NAME} is not running. Starting it..."
    docker start ${CONTAINER_NAME}
    sleep 3
fi

echo "✅ Container ${CONTAINER_NAME} is running"

# Copy the working script to container
echo "📋 Copying standalone_ddpm_test.py to container..."
docker cp standalone_ddpm_test.py ${CONTAINER_NAME}:/app/standalone_ddpm_test.py

# Copy heart.csv if it exists
if [ -f "heart.csv" ]; then
    echo "📋 Copying heart.csv to container..."
    docker cp heart.csv ${CONTAINER_NAME}:/app/heart.csv
else
    echo "⚠️  heart.csv not found in current directory"
fi

# Get environment info
echo ""
echo "=========================================="
echo "Environment Information"
echo "=========================================="
docker exec ${CONTAINER_NAME} python --version
docker exec ${CONTAINER_NAME} pip show synthcity | grep -E "Name|Version" || echo "SynthCity version not found"
docker exec ${CONTAINER_NAME} pip list | grep -E "synthcity|pandas|numpy" || echo "Package versions not found"

# Run the working script
echo ""
echo "=========================================="
echo "Running standalone_ddpm_test.py"
echo "=========================================="
docker exec -w /app ${CONTAINER_NAME} python standalone_ddpm_test.py

# Get the results
echo ""
echo "=========================================="
echo "Results Summary"
echo "=========================================="
docker exec ${CONTAINER_NAME} ls -lh /app/synthetic_ddpm_heart.csv 2>/dev/null && echo "✅ Synthetic data file created" || echo "❌ Synthetic data file not found"

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
