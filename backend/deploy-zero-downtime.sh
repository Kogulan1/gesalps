#!/bin/bash
# Zero-downtime deployment script for Gesalp AI backend
# Usage: ./deploy-zero-downtime.sh [service_name]
#   service_name: api, worker, report-service, or all (default: all)

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
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
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
}

# Get Docker Compose command
get_compose_cmd() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# Wait for service to be healthy
wait_for_health() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    log_info "Waiting for $service to be healthy..."
    
    COMPOSE_CMD=$(get_compose_cmd)
    
    while [ $attempt -lt $max_attempts ]; do
        if $COMPOSE_CMD -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
            log_success "$service is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_warning "$service health check timeout (may still be starting)"
    return 1
}

# Deploy a single service with zero-downtime
deploy_service() {
    local service=$1
    local old_container
    local new_container
    
    log_info "Deploying service: $service"
    
    COMPOSE_CMD=$(get_compose_cmd)
    
    # Check if service is running
    if ! $COMPOSE_CMD -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        log_warning "$service is not running. Starting it..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" up -d "$service"
        wait_for_health "$service"
        log_success "$service deployed"
        return 0
    fi
    
    # Get current container name
    old_container=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps -q "$service" | head -n1)
    
    if [ -z "$old_container" ]; then
        log_error "Could not find running container for $service"
        return 1
    fi
    
    log_info "Current container: $old_container"
    
    # Build new image
    log_info "Building new image for $service..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache "$service"
    
    # Create new container with temporary name
    log_info "Creating new container for $service..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d --no-deps --scale "${service}=2" --no-recreate "$service" 2>/dev/null || true
    
    # Wait for new container to be healthy
    wait_for_health "$service"
    
    # Get new container
    new_container=$($COMPOSE_CMD -f "$COMPOSE_FILE" ps -q "$service" | grep -v "$old_container" | head -n1)
    
    if [ -z "$new_container" ]; then
        log_error "Could not find new container for $service"
        log_warning "Rolling back..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" up -d "$service"
        return 1
    fi
    
    log_info "New container: $new_container"
    
    # Stop old container gracefully
    log_info "Stopping old container gracefully..."
    docker stop -t 30 "$old_container" || true
    
    # Remove old container
    log_info "Removing old container..."
    docker rm "$old_container" || true
    
    # Scale back to 1 instance
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d --scale "${service}=1" --no-recreate "$service" 2>/dev/null || true
    
    log_success "$service deployed successfully with zero downtime"
}

# Deploy all services
deploy_all() {
    log_info "Deploying all services..."
    
    # Deploy in order: dependencies first
    deploy_service "report-service"
    sleep 2
    
    deploy_service "api"
    sleep 2
    
    deploy_service "synth-worker"
    
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

# Main deployment flow
main() {
    log_info "Starting zero-downtime deployment..."
    log_info "Service: $SERVICE"
    
    check_prerequisites
    
    case "$SERVICE" in
        api|worker|report-service|synth-worker)
            deploy_service "$SERVICE"
            ;;
        all)
            deploy_all
            ;;
        *)
            log_error "Unknown service: $SERVICE"
            log_info "Available services: api, worker, report-service, synth-worker, all"
            exit 1
            ;;
    esac
    
    # Reload Nginx if API was deployed
    if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
        reload_nginx
    fi
    
    log_success "Deployment complete!"
    
    # Show status
    log_info "Service status:"
    COMPOSE_CMD=$(get_compose_cmd)
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps
}

# Run main function
main

