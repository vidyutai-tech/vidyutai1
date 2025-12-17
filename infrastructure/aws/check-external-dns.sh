#!/bin/bash

# Check DNS from external servers (what Let's Encrypt sees)

echo "🔍 Checking DNS from External Servers"
echo "========================================"
echo "This is what Let's Encrypt sees..."
echo ""

echo "1. From Google DNS (8.8.8.8):"
dig @8.8.8.8 +short spel.vidyutai.in
dig @8.8.8.8 +short api-be.vidyutai.in
dig @8.8.8.8 +short api-python-be.vidyutai.in
echo ""

echo "2. From Cloudflare DNS (1.1.1.1):"
dig @1.1.1.1 +short spel.vidyutai.in
dig @1.1.1.1 +short api-be.vidyutai.in
dig @1.1.1.1 +short api-python-be.vidyutai.in
echo ""

echo "3. From local resolver:"
dig +short spel.vidyutai.in
dig +short api-be.vidyutai.in
dig +short api-python-be.vidyutai.in
echo ""

echo "Expected: All should show 13.212.228.109"
echo ""
echo "If external DNS shows wrong IP, wait 10-30 minutes for propagation"


