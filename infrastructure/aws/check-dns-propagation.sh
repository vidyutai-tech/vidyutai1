#!/bin/bash

# Check DNS propagation from multiple DNS servers

EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "EC2 Instance IP: $EC2_IP"
echo ""

DOMAINS=("spel.vidyutai.in" "api-be.vidyutai.in" "api-python-be.vidyutai.in")
DNS_SERVERS=("8.8.8.8" "1.1.1.1" "8.8.4.4")

for domain in "${DOMAINS[@]}"; do
    echo "Checking $domain:"
    for dns in "${DNS_SERVERS[@]}"; do
        IP=$(dig @$dns +short $domain | head -1)
        if [ "$IP" = "$EC2_IP" ]; then
            echo "  ✅ $dns: $IP (correct)"
        else
            echo "  ⚠️  $dns: $IP (waiting for propagation)"
        fi
    done
    echo ""
done

echo "If all show correct IP, you can proceed with certbot."
echo "If some show wrong IP, wait 10-30 minutes and try again."

