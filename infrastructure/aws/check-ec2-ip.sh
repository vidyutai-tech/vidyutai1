#!/bin/bash

# Check EC2 Public IP Address
# Run this script on your EC2 instance

echo "🔍 Checking EC2 Public IP Address"
echo "=================================="
echo ""

echo "Method 1: AWS Metadata Service (Recommended)"
echo "--------------------------------------------"
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
echo ""
echo ""

echo "Method 2: AWS Instance Metadata (Full Info)"
echo "--------------------------------------------"
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
echo ""
echo ""

echo "Method 3: Using hostname"
echo "--------------------------------------------"
curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip
echo ""
echo ""

echo "Method 4: All Network Info"
echo "--------------------------------------------"
echo "Public IPv4:"
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
echo ""
echo "Private IPv4:"
curl -s http://169.254.169.254/latest/meta-data/local-ipv4
echo ""
echo "Instance ID:"
curl -s http://169.254.169.254/latest/meta-data/instance-id
echo ""
echo ""

