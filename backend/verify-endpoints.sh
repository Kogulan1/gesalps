#!/bin/bash
# Verify all critical API endpoints are registered after deployment
# This script checks that essential endpoints exist to prevent regressions
# Usage: ./verify-endpoints.sh [docker-compose-file]
#   docker-compose-file: Path to docker-compose file (default: docker-compose.yml)

set -e

COMPOSE_FILE="${1:-docker-compose.yml}"

echo "🔍 Verifying critical API endpoints..."

# Check if API container is running
if ! docker compose -f "$COMPOSE_FILE" ps api | grep -q "Up"; then
    echo "❌ API container is not running"
    exit 1
fi

# List of critical endpoints that must exist
declare -A CRITICAL_ENDPOINTS=(
    ["GET /v1/projects"]="Project list endpoint"
    ["GET /v1/projects/{project_id}"]="Project detail endpoint"
    ["GET /v1/runs"]="Run list endpoint"
    ["GET /v1/runs/{run_id}"]="Run detail endpoint"
    ["GET /v1/runs/{run_id}/status"]="Run status endpoint"
    ["GET /v1/runs/{run_id}/metrics"]="Run metrics endpoint"
    ["GET /v1/runs/{run_id}/steps"]="Run steps endpoint"
    ["GET /v1/datasets"]="Dataset list endpoint"
    ["GET /health"]="Health check endpoint"
)

MISSING_ENDPOINTS=0

# Check each critical endpoint
for endpoint in "${!CRITICAL_ENDPOINTS[@]}"; do
    method=$(echo "$endpoint" | cut -d' ' -f1)
    path=$(echo "$endpoint" | cut -d' ' -f2-)
    description="${CRITICAL_ENDPOINTS[$endpoint]}"
    
    # Check if endpoint exists
    if docker compose -f "$COMPOSE_FILE" exec -T api python3 -c "
from main import app
from fastapi.routing import APIRoute
routes = [r for r in app.routes if isinstance(r, APIRoute)]
found = False
for r in routes:
    if '$method' in r.methods and r.path == '$path':
        found = True
        break
exit(0 if found else 1)
" 2>/dev/null; then
        echo "✅ $method $path - $description"
    else
        echo "❌ MISSING: $method $path - $description"
        MISSING_ENDPOINTS=$((MISSING_ENDPOINTS + 1))
    fi
done

if [ $MISSING_ENDPOINTS -eq 0 ]; then
    echo ""
    echo "✅ All critical endpoints verified!"
    exit 0
else
    echo ""
    echo "❌ ERROR: $MISSING_ENDPOINTS critical endpoint(s) missing!"
    echo "⚠️  Deployment verification failed. Do not proceed with production use."
    exit 1
fi
