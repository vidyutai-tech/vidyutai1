#!/bin/bash

# Fix port 80 already in use issue

echo "🔍 Checking what's using port 80..."

# Check what's using port 80
sudo lsof -i :80 || sudo netstat -tlnp | grep :80

echo ""
echo "🛑 Stopping services that might be using port 80..."

# Stop Certbot standalone if running
sudo pkill -f certbot || echo "No certbot process found"

# Stop any existing nginx (system nginx, not Docker)
sudo systemctl stop nginx 2>/dev/null || echo "No system nginx found"
sudo systemctl stop apache2 2>/dev/null || echo "No apache2 found"

# Stop any Docker containers using port 80
docker ps -a | grep -E "80|443" | awk '{print $1}' | xargs -r docker stop 2>/dev/null || echo "No Docker containers to stop"

echo ""
echo "✅ Port 80 should now be free"
echo "Now try: docker-compose -f docker-compose.prod.yml up -d"

