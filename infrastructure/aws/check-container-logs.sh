#!/bin/bash

# Check container logs to diagnose restart issues

echo "🔍 Checking container logs..."
echo ""

echo "=== Nginx Logs ==="
docker logs vidyutai-nginx --tail 50 2>&1
echo ""

echo "=== Frontend Logs ==="
docker logs vidyutai-frontend --tail 50 2>&1
echo ""

echo "=== AI Service Logs ==="
docker logs vidyutai-ai-service --tail 50 2>&1
echo ""

echo "=== Backend Logs ==="
docker logs vidyutai-backend --tail 50 2>&1
echo ""

echo "=== Container Status ==="
docker ps -a

