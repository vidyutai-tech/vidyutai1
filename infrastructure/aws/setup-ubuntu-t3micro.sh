#!/bin/bash

# VidyutAI EC2 Setup Script for Ubuntu on t3.micro (1GB RAM)
# EXTREMELY OPTIMIZED for minimal memory usage
# WARNING: t3.micro is NOT recommended - upgrade to t3.small if possible

set -e

echo "🚀 VidyutAI EC2 Setup for Ubuntu (t3.micro - 1GB RAM)"
echo "⚠️  WARNING: This instance type is extremely tight!"
echo "====================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run as root. Use ubuntu user with sudo access.${NC}"
   exit 1
fi

echo -e "${YELLOW}📦 Step 1: Updating system packages...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

echo -e "${YELLOW}💾 Step 2: Setting up swap space (2GB) - MANDATORY for t3.micro...${NC}"
# Check if swap already exists
if [ -f /swapfile ]; then
    echo -e "${BLUE}Swap file already exists, skipping...${NC}"
else
    # Create 2GB swap file (MANDATORY for 1GB RAM)
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    
    # Optimize swap usage (more aggressive for t3.micro)
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
    echo 'vm.overcommit_memory=1' | sudo tee -a /etc/sysctl.conf
    echo 'vm.dirty_ratio=15' | sudo tee -a /etc/sysctl.conf
    echo 'vm.dirty_background_ratio=5' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    
    echo -e "${GREEN}✅ Swap space configured (2GB)${NC}"
fi

echo -e "${YELLOW}🐳 Step 3: Installing Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${BLUE}Docker already installed${NC}"
else
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add ubuntu user to docker group
    sudo usermod -aG docker ubuntu
    
    # Configure Docker to use minimal memory
    sudo mkdir -p /etc/docker
    echo '{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "5m",
    "max-file": "2"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}' | sudo tee /etc/docker/daemon.json
    
    sudo systemctl restart docker
    sudo systemctl enable docker
    
    echo -e "${GREEN}✅ Docker installed and configured${NC}"
fi

echo -e "${YELLOW}📦 Step 4: Installing Docker Compose...${NC}"
if command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}Docker Compose already installed${NC}"
else
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
fi

echo -e "${YELLOW}📚 Step 5: Installing additional utilities...${NC}"
sudo apt-get install -y \
    git \
    curl \
    wget \
    certbot \
    python3-certbot-nginx \
    htop \
    unzip

echo -e "${YELLOW}🔧 Step 6: Disabling unnecessary services to free memory...${NC}"
# Stop and disable services that consume memory
sudo systemctl stop snapd 2>/dev/null || true
sudo systemctl disable snapd 2>/dev/null || true
sudo systemctl stop snapd.socket 2>/dev/null || true
sudo systemctl disable snapd.socket 2>/dev/null || true
sudo systemctl stop snapd.seeded 2>/dev/null || true
sudo systemctl disable snapd.seeded 2>/dev/null || true

sudo systemctl stop unattended-upgrades 2>/dev/null || true
sudo systemctl disable unattended-upgrades 2>/dev/null || true

# Optimize kernel parameters for low memory
cat <<EOF | sudo tee -a /etc/sysctl.conf
# Memory optimization for t3.micro (1GB RAM)
vm.overcommit_memory=1
vm.dirty_ratio=15
vm.dirty_background_ratio=5
EOF

sudo sysctl -p

echo -e "${YELLOW}📁 Step 7: Creating application directory...${NC}"
mkdir -p ~/vidyutai
cd ~/vidyutai

echo -e "${GREEN}✅ System setup complete!${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT WARNINGS FOR t3.micro:${NC}"
echo "  1. Use docker-compose.prod.t3micro.yml (optimized for 1GB)"
echo "  2. Monitor memory closely: docker stats"
echo "  3. Expect slower performance due to swap usage"
echo "  4. Consider upgrading to t3.small (2GB) for better experience"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "  1. Upload your application files to ~/vidyutai"
echo "  2. Configure DNS: spel.vidyutai.in → $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "  3. Run: cd ~/vidyutai && ./infrastructure/aws/deploy-ec2.sh"
echo "     OR use: docker-compose -f docker-compose.prod.t3micro.yml up -d"
echo ""
echo -e "${YELLOW}⚠️  Important: Logout and login again for Docker group changes to take effect${NC}"
echo -e "${YELLOW}⚠️  Current memory status:${NC}"
free -h

