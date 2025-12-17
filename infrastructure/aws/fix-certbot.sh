#!/bin/bash

# Quick Certbot Troubleshooting Script

echo "🔍 Certbot Troubleshooting"
echo "=========================="

# Check DNS
echo ""
echo "1. Checking DNS configuration..."
echo "-----------------------------------"
dig +short spel.vidyutai.in
dig +short api-be.vidyutai.in
dig +short api-python-be.vidyutai.in

# Check port 80
echo ""
echo "2. Checking port 80..."
echo "-----------------------------------"
sudo lsof -i :80 || echo "Port 80 is free"

# Check network connectivity
echo ""
echo "3. Testing Let's Encrypt connectivity..."
echo "-----------------------------------"
curl -I https://acme-v02.api.letsencrypt.org/directory 2>&1 | head -5

# Check certbot logs
echo ""
echo "4. Recent Certbot errors..."
echo "-----------------------------------"
sudo tail -20 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || echo "No logs found"

echo ""
echo "✅ Troubleshooting complete!"
echo ""
echo "Next steps:"
echo "1. If DNS shows no IP, configure DNS records in your domain registrar"
echo "2. If port 80 is in use, stop the service: sudo systemctl stop nginx"
echo "3. Use your REAL email address (not your-email@example.com)"
echo "4. Wait 10-30 minutes after DNS changes for propagation"

