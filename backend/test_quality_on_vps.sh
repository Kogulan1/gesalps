#!/bin/bash
# Script to test standalone quality test on VPS
# Run this on the VPS: bash test_quality_on_vps.sh

set -e

echo "=========================================="
echo "Testing Standalone Quality Test on VPS"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "standalone_quality_test.py" ]; then
    echo "❌ Error: standalone_quality_test.py not found"
    echo "Please run this script from /opt/gesalps/backend"
    exit 1
fi

# Check if heart.csv exists
if [ ! -f "heart.csv" ]; then
    echo "⚠️  Warning: heart.csv not found in current directory"
    echo "Looking for heart.csv in backend directory..."
    if [ -f "../heart.csv" ]; then
        echo "✅ Found heart.csv in parent directory"
        cp ../heart.csv .
    else
        echo "❌ Error: heart.csv not found"
        echo "Please ensure heart.csv is available"
        exit 1
    fi
fi

echo "✅ Found standalone_quality_test.py"
echo "✅ Found heart.csv"
echo ""

# Check if Docker containers are running
echo "Checking Docker containers..."
if ! docker compose ps | grep -q "gesalps_worker"; then
    echo "⚠️  Warning: synth-worker container not running"
    echo "Starting containers..."
    docker compose up -d synth-worker
    sleep 5
fi

echo "✅ Containers are running"
echo ""

# Copy test script to container
echo "Copying test script to container..."
docker cp standalone_quality_test.py gesalps_worker:/app/standalone_quality_test.py
docker cp heart.csv gesalps_worker:/app/heart.csv 2>/dev/null || echo "heart.csv might already be in container"

echo "✅ Files copied to container"
echo ""

# Run the test
echo "=========================================="
echo "Running Quality Test..."
echo "=========================================="
echo ""

docker compose exec -T synth-worker python standalone_quality_test.py

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
