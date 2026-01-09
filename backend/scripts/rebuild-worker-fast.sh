#!/bin/bash
# Fast rebuild script for synth-worker
# Uses base image - only rebuilds if base is missing or code changed
# Build time: 2-5 minutes (instead of 1+ hour)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_IMAGE_NAME="gesalps-worker-base"
BASE_IMAGE_TAG="latest"
REGISTRY="${REGISTRY:-}"  # Set if using registry
USE_REGISTRY="${USE_REGISTRY:-false}"  # Set to "true" to pull from registry

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
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.yml not found. Please run from backend directory."
    exit 1
fi

# Determine which compose file to use
COMPOSE_FILE="docker-compose.yml"
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

# Check if base image exists
if [ "$USE_REGISTRY" = "true" ] && [ -n "$REGISTRY" ]; then
    REGISTRY_IMAGE="${REGISTRY}/${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}"
    log_info "Checking for base image in registry: ${REGISTRY_IMAGE}"
    
    if docker pull "${REGISTRY_IMAGE}" 2>/dev/null; then
        log_success "Base image pulled from registry"
        docker tag "${REGISTRY_IMAGE}" "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}"
    else
        log_error "Base image not found in registry: ${REGISTRY_IMAGE}"
        log_info "Please build and push base image first:"
        echo "  REGISTRY=${REGISTRY} PUSH_TO_REGISTRY=true ./scripts/build-base-image.sh"
        exit 1
    fi
else
    log_info "Checking for local base image: ${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}"
    
    if ! docker images | grep -q "${BASE_IMAGE_NAME}.*${BASE_IMAGE_TAG}"; then
        log_warning "Base image not found locally"
        log_info "Building base image (this will take 30-60 minutes, but only once)..."
        
        if [ -f "scripts/build-base-image.sh" ]; then
            ./scripts/build-base-image.sh
        else
            log_error "build-base-image.sh not found. Building manually..."
            docker build -f synth_worker/Dockerfile.base -t "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}" .
        fi
        
        if [ $? -ne 0 ]; then
            log_error "Failed to build base image"
            exit 1
        fi
    else
        log_success "Base image found locally"
    fi
fi

# Check if Dockerfile.optimized exists, if not use regular Dockerfile
if [ -f "synth_worker/Dockerfile.optimized" ]; then
    log_info "Using optimized Dockerfile"
    # Temporarily rename Dockerfile and use optimized version
    if [ -f "synth_worker/Dockerfile" ]; then
        mv synth_worker/Dockerfile synth_worker/Dockerfile.original
    fi
    cp synth_worker/Dockerfile.optimized synth_worker/Dockerfile
    USE_OPTIMIZED=true
else
    log_warning "Dockerfile.optimized not found, using regular Dockerfile"
    log_warning "Consider creating Dockerfile.optimized for faster builds"
    USE_OPTIMIZED=false
fi

# Stop container if running
log_info "Stopping synth-worker container..."
docker compose -f "${COMPOSE_FILE}" stop synth-worker 2>/dev/null || log_warning "Container not running"

# Rebuild worker (fast - just copies code, uses base image)
log_info "Rebuilding synth-worker (2-5 minutes, using base image)..."
docker compose -f "${COMPOSE_FILE}" build synth-worker

if [ $? -eq 0 ]; then
    log_success "Build completed successfully!"
    
    # Restore original Dockerfile if we used optimized version
    if [ "$USE_OPTIMIZED" = "true" ]; then
        rm synth_worker/Dockerfile
        if [ -f "synth_worker/Dockerfile.original" ]; then
            mv synth_worker/Dockerfile.original synth_worker/Dockerfile
        fi
    fi
    
    # Start container
    log_info "Starting synth-worker container..."
    docker compose -f "${COMPOSE_FILE}" up -d synth-worker
    
    # Wait a moment
    sleep 3
    
    # Verify container is running
    if docker compose -f "${COMPOSE_FILE}" ps synth-worker | grep -q "Up"; then
        log_success "Container is running"
        log_info "Check logs: docker compose -f ${COMPOSE_FILE} logs synth-worker --tail=50"
    else
        log_error "Container failed to start"
        log_info "Checking logs..."
        docker compose -f "${COMPOSE_FILE}" logs synth-worker --tail=50
        exit 1
    fi
else
    log_error "Build failed"
    
    # Restore original Dockerfile if we used optimized version
    if [ "$USE_OPTIMIZED" = "true" ]; then
        rm synth_worker/Dockerfile
        if [ -f "synth_worker/Dockerfile.original" ]; then
            mv synth_worker/Dockerfile.original synth_worker/Dockerfile
        fi
    fi
    
    exit 1
fi

log_success "Fast rebuild complete!"
log_info "Build time: 2-5 minutes (instead of 1+ hour)"
