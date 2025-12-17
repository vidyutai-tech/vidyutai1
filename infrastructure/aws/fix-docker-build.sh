#!/bin/bash

# Fix Docker build issues on EC2
# This script updates the repo and rebuilds without cache

set -e

echo "🔄 Updating repository..."
cd ~/vidyutai
git pull origin main || git pull origin master

echo "🧹 Cleaning Docker cache..."
docker system prune -f

echo "🔨 Rebuilding without cache..."
docker-compose -f docker-compose.prod.yml build --no-cache backend

echo "✅ Backend build complete!"
echo "Now build all services:"
echo "  docker-compose -f docker-compose.prod.yml build"

