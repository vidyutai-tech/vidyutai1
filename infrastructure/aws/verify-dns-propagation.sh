#!/bin/bash

# Verify DNS Propagation Script
# Run this on EC2 to check if DNS has updated

EC2_IP="13.212.228.109"

echo "🔍 Verifying DNS Propagation"
echo "=============================="
echo "Expected IP: $EC2_IP"
echo ""

check_domain() {
    domain=$1
    current_ip=$(dig +short $domain | head -1)
    echo "Domain: $domain"
    echo "Current IP: $current_ip"
    
    if [ "$current_ip" = "$EC2_IP" ]; then
        echo "✅ Correct!"
    else
        echo "❌ Wrong IP! Should be $EC2_IP"
    fi
    echo ""
}

check_domain "spel.vidyutai.in"
check_domain "api-be.vidyutai.in"
check_domain "api-python-be.vidyutai.in"
check_domain "www.spel.vidyutai.in"

echo "=============================="
echo "If any show wrong IP:"
echo "1. Check DNS records in BigRock"
echo "2. Wait 10-30 minutes for propagation"
echo "3. Clear DNS cache: sudo systemd-resolve --flush-caches"
echo ""

