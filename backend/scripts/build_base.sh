#!/bin/bash
# Gesalp Architecture V2: Base Image Builder
# This builds the heavy ML stack once. 

set -e
echo "🚀 Building Gesalp ML Base Image..."
cd "$(dirname "$0")/.."

docker build -t gesalps-ml-base:latest -f synth_worker/Dockerfile.base .

echo "✅ Base image built. You can now run 'docker-compose up --build synth-worker'"
