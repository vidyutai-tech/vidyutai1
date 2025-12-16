#!/bin/bash

# VidyutAI EC2 Deployment Script
# This script automates the deployment process on EC2

set -e

echo "🚀 VidyutAI EC2 Deployment Script"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAINS="spel.vidyutai.in api-be.vidyutai.in api-python-be.vidyutai.in"
DOMAIN="spel.vidyutai.in"
EMAIL="${SSL_EMAIL:-admin@vidyutai.in}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run as root. Use a regular user with sudo access.${NC}"
   exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p infrastructure/nginx/ssl
mkdir -p infrastructure/nginx/logs
mkdir -p backend/uploads
mkdir -p backups

# Setup SSL Certificate
echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
if [ ! -f "infrastructure/nginx/ssl/fullchain.pem" ]; then
    echo -e "${BLUE}Installing Certbot...${NC}"
    if command -v yum &> /dev/null; then
        sudo yum install -y certbot
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y certbot
    fi

    echo -e "${BLUE}Obtaining SSL certificate for all subdomains...${NC}"
    echo -e "${YELLOW}Note: Make sure port 80 is accessible and DNS is configured!${NC}"
    sudo certbot certonly --standalone \
        -d spel.vidyutai.in \
        -d www.spel.vidyutai.in \
        -d api-be.vidyutai.in \
        -d api-python-be.vidyutai.in \
        --email ${EMAIL} \
        --agree-tos \
        --non-interactive || {
        echo -e "${RED}❌ Failed to obtain SSL certificate.${NC}"
        echo -e "${YELLOW}Make sure:${NC}"
        echo "  1. DNS is configured correctly for all subdomains:"
        echo "     - spel.vidyutai.in"
        echo "     - api-be.vidyutai.in"
        echo "     - api-python-be.vidyutai.in"
        echo "  2. Port 80 is open in security group"
        echo "  3. All domains point to this server's IP"
        exit 1
    }

    # Copy certificates (certbot creates one cert for all domains)
    sudo cp /etc/letsencrypt/live/spel.vidyutai.in/fullchain.pem infrastructure/nginx/ssl/
    sudo cp /etc/letsencrypt/live/spel.vidyutai.in/privkey.pem infrastructure/nginx/ssl/
    sudo chown $USER:$USER infrastructure/nginx/ssl/*.pem
    echo -e "${GREEN}✅ SSL certificates obtained for all subdomains${NC}"
else
    echo -e "${GREEN}✅ SSL certificates already exist${NC}"
fi

# Generate JWT secret if not exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}🔐 Generating environment variables...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    cat > .env <<EOF
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DOMAIN=${DOMAIN}
EOF
    chmod 600 .env
    echo -e "${GREEN}✅ Environment file created${NC}"
fi

# Build Docker images
echo -e "${YELLOW}📦 Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Check backend
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check AI service
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AI Service is healthy${NC}"
else
    echo -e "${RED}❌ AI Service health check failed${NC}"
fi

# Check frontend
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Show container status
echo -e "\n${BLUE}📊 Container Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "  1. Visit https://${DOMAIN} in your browser"
echo "  2. Check logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  3. Setup SSL auto-renewal (see EC2_DEPLOYMENT_GUIDE.md)"

