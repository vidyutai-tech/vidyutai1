#!/bin/bash

# DNS Check Script for VidyutAI Deployment

echo "🔍 Checking DNS Configuration"
echo "=============================="
echo ""

echo "Expected EC2 IP: 13.212.228.109"
echo ""

echo "1. spel.vidyutai.in:"
dig +short spel.vidyutai.in
echo ""

echo "2. www.spel.vidyutai.in:"
dig +short www.spel.vidyutai.in || echo "❌ No DNS record (optional)"
echo ""

echo "3. api-be.vidyutai.in:"
dig +short api-be.vidyutai.in
echo ""

echo "4. api-python-be.vidyutai.in:"
dig +short api-python-be.vidyutai.in
echo ""

echo "=============================="
echo "✅ All domains should point to: 13.212.228.109"
echo ""

