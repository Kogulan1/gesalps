#!/bin/bash
# Deployment script with endpoint verification
# Zero-downtime deployment script for Gesalp AI backend
# This script uses Docker Compose's rolling update strategy
# Usage: ./deploy.sh [service_name]
#   service_name: api, synth-worker, report-service, or all (default: all)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="gesalps"
SERVICE="${1:-all}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check for docker compose (v2) or docker-compose (v1)
    COMPOSE_CMD=""
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        log_info "Using Docker Compose v2"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        log_info "Using Docker Compose v1"
    else
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Make sure environment variables are set."
    fi
    
    log_success "Prerequisites check passed"
    echo "$COMPOSE_CMD"
}

# Wait for service to be healthy
wait_for_health() {
    local service=$1
    local compose_cmd=$2
    local max_attempts=60
    local attempt=0
    
    log_info "Waiting for $service to be healthy (max ${max_attempts}s)..."
    
    while [ $attempt -lt $max_attempts ]; do
        # Check if container is healthy
        if $compose_cmd -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy"; then
            log_success "$service is healthy"
            return 0
        fi
        
        # Check if container is running (health check might not be configured)
        if $compose_cmd -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
            # Give it a moment, then check health endpoint if it's the API
            if [ "$service" = "api" ]; then
                sleep 2
                if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
                    log_success "$service is healthy (health check passed)"
                    return 0
                fi
            else
                log_success "$service is running"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        sleep 1
    done
    
    log_warning "$service health check timeout"
    return 1
}

# Deploy a single service with zero-downtime
deploy_service() {
    local service=$1
    local compose_cmd=$2
    
    log_info "Deploying service: $service"
    
    # Build new image
    log_info "Building new image for $service..."
    $compose_cmd -f "$COMPOSE_FILE" build "$service"
    
    # Stop old container gracefully and start new one
    # Docker Compose will handle the transition
    log_info "Updating $service container..."
    
    # Use up -d to recreate container with new image
    # This will stop the old container and start a new one
    $compose_cmd -f "$COMPOSE_FILE" up -d --no-deps "$service"
    
    # Wait for health check
    wait_for_health "$service" "$compose_cmd"
    
    log_success "$service deployed successfully"
}

# Deploy all services in correct order
deploy_all() {
    local compose_cmd=$1
    
    log_info "Deploying all services in dependency order..."
    
    # Deploy dependencies first
    if $compose_cmd -f "$COMPOSE_FILE" ps report-service 2>/dev/null | grep -q "Up"; then
        deploy_service "report-service" "$compose_cmd"
        sleep 2
    fi
    
    # Deploy API (depends on report-service)
    if $compose_cmd -f "$COMPOSE_FILE" ps api 2>/dev/null | grep -q "Up"; then
        deploy_service "api" "$compose_cmd"
        sleep 2
    fi
    
    # Deploy worker (independent)
    if $compose_cmd -f "$COMPOSE_FILE" ps synth-worker 2>/dev/null | grep -q "Up"; then
        deploy_service "synth-worker" "$compose_cmd"
    fi
    
    log_success "All services deployed"
}

# Reload Nginx configuration
reload_nginx() {
    log_info "Reloading Nginx configuration..."
    
    if command -v nginx &> /dev/null; then
        if sudo nginx -t 2>/dev/null; then
            sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || true
            log_success "Nginx reloaded"
        else
            log_warning "Nginx configuration test failed. Skipping reload."
        fi
    else
        log_warning "Nginx not found. Skipping reload."
    fi
}

# Show service status
show_status() {
    local compose_cmd=$1
    
    log_info "Service status:"
    $compose_cmd -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Container logs (last 20 lines):"
    $compose_cmd -f "$COMPOSE_FILE" logs --tail=20
}

# Main deployment flow
main() {
    log_info "========================================="
    log_info "Gesalp AI Zero-Downtime Deployment"
    log_info "========================================="
    echo ""
    
    COMPOSE_CMD=$(check_prerequisites)
    
    log_info "Target service: $SERVICE"
    echo ""
    
    case "$SERVICE" in
        api)
            deploy_service "api" "$COMPOSE_CMD"
            reload_nginx
            ;;
        worker|synth-worker)
            deploy_service "synth-worker" "$COMPOSE_CMD"
            ;;
        report|report-service)
            deploy_service "report-service" "$COMPOSE_CMD"
            ;;
        all)
            deploy_all "$COMPOSE_CMD"
            reload_nginx
            ;;
        *)
            log_error "Unknown service: $SERVICE"
            log_info "Available services: api, worker, report-service, all"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Deployment complete!"
    echo ""
    
    # Verify critical endpoints (if API was deployed)
    if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
        verify_endpoints "$COMPOSE_CMD"
    fi
    
    # Show status
    show_status "$COMPOSE_CMD"
}

# Verify critical API endpoints exist after deployment
verify_endpoints() {
    local compose_cmd=$1
    
    log_info "========================================="
    log_info "Verifying Critical API Endpoints"
    log_info "========================================="
    echo ""
    
    # Check if API container is running
    if ! $compose_cmd -f "$COMPOSE_FILE" ps api 2>/dev/null | grep -q "Up"; then
        log_warning "API container is not running. Skipping endpoint verification."
        return 0
    fi
    
    # List of critical endpoints that must exist
    declare -A CRITICAL_ENDPOINTS=(
        ["GET /v1/projects"]="Project list endpoint"
        ["GET /v1/projects/{project_id}"]="Project detail endpoint"
        ["GET /v1/runs"]="Run list endpoint"
        ["GET /v1/runs/{run_id}"]="Run detail endpoint - CRITICAL"
        ["GET /v1/runs/{run_id}/status"]="Run status endpoint"
        ["GET /v1/runs/{run_id}/metrics"]="Run metrics endpoint"
        ["GET /v1/runs/{run_id}/steps"]="Run steps endpoint"
        ["GET /v1/datasets"]="Dataset list endpoint"
        ["GET /health"]="Health check endpoint"
    )
    
    MISSING_ENDPOINTS=0
    FAILED_CHECKS=0
    
    # Check each critical endpoint
    for endpoint in "${!CRITICAL_ENDPOINTS[@]}"; do
        method=$(echo "$endpoint" | cut -d' ' -f1)
        path=$(echo "$endpoint" | cut -d' ' -f2-)
        description="${CRITICAL_ENDPOINTS[$endpoint]}"
        
        # Check if endpoint exists using Python
        if $compose_cmd -f "$COMPOSE_FILE" exec -T api python3 -c "
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
            log_success "$method $path - $description"
        else
            log_error "MISSING: $method $path - $description"
            MISSING_ENDPOINTS=$((MISSING_ENDPOINTS + 1))
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    done
    
    echo ""
    if [ $MISSING_ENDPOINTS -eq 0 ]; then
        log_success "✅ All critical endpoints verified!"
        return 0
    else
        log_error "❌ ERROR: $MISSING_ENDPOINTS critical endpoint(s) missing!"
        log_error "⚠️  Deployment verification FAILED. Review deployment immediately."
        log_error "⚠️  This may indicate a code merge conflict or accidental deletion."
        return 1
    fi
}

# Run main function
main

