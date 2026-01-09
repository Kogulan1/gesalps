#!/bin/bash
# Build and optionally push base image with all dependencies
# Run this once, or when dependencies change

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_IMAGE_NAME="gesalps-worker-base"
BASE_IMAGE_TAG="latest"
REGISTRY="${REGISTRY:-}"  # Set via environment variable, e.g., "docker.io/yourusername" or "ghcr.io/yourusername"
PUSH_TO_REGISTRY="${PUSH_TO_REGISTRY:-false}"  # Set to "true" to push after building

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
if [ ! -f "synth_worker/Dockerfile.base" ]; then
    log_error "Dockerfile.base not found. Please run from backend directory."
    exit 1
fi

log_info "Building base image: ${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}"
log_warning "This will take 30-60 minutes (downloads PyTorch, SynthCity, etc.)"
log_info "Building..."

# Build base image
docker build \
    -f synth_worker/Dockerfile.base \
    -t "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}" \
    .

if [ $? -eq 0 ]; then
    log_success "Base image built successfully!"
    
    # Show image size
    log_info "Base image size:"
    docker images "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # Tag for registry if registry is specified
    if [ -n "$REGISTRY" ]; then
        REGISTRY_IMAGE="${REGISTRY}/${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}"
        log_info "Tagging for registry: ${REGISTRY_IMAGE}"
        docker tag "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}" "${REGISTRY_IMAGE}"
        
        if [ "$PUSH_TO_REGISTRY" = "true" ]; then
            log_info "Pushing to registry..."
            docker push "${REGISTRY_IMAGE}"
            
            if [ $? -eq 0 ]; then
                log_success "Base image pushed to registry: ${REGISTRY_IMAGE}"
                log_info "Update Dockerfile.optimized to use: FROM ${REGISTRY_IMAGE}"
            else
                log_error "Failed to push to registry"
                exit 1
            fi
        else
            log_info "To push to registry, run:"
            echo "  docker push ${REGISTRY_IMAGE}"
        fi
    fi
    
    log_success "Base image ready!"
    log_info "You can now use it in Dockerfile.optimized"
    log_info "Build time for code changes will be 2-5 minutes instead of 1+ hour!"
else
    log_error "Base image build failed"
    exit 1
fi
