#!/bin/bash
# User data script for Ubuntu t3.micro
# This script runs automatically on first boot
# NO sudo needed - runs as root

set -e

echo "🚀 VidyutAI EC2 Setup for Ubuntu (t3.micro - 1GB RAM)"
echo "====================================================="

# Update system
apt-get update -y
apt-get upgrade -y

# Create 2GB swap space (MANDATORY for t3.micro)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Optimize swap usage
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
echo 'vm.overcommit_memory=1' >> /etc/sysctl.conf
echo 'vm.dirty_ratio=15' >> /etc/sysctl.conf
echo 'vm.dirty_background_ratio=5' >> /etc/sysctl.conf
sysctl -p

# Install Docker
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh
rm /tmp/get-docker.sh
usermod -aG docker ubuntu

# Configure Docker for minimal memory
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "5m",
    "max-file": "2"
  },
  "storage-driver": "overlay2"
}
EOF

systemctl restart docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install utilities
apt-get install -y git curl wget certbot python3-certbot-nginx htop unzip

# Disable unnecessary services to free memory
systemctl stop snapd 2>/dev/null || true
systemctl disable snapd 2>/dev/null || true
systemctl stop snapd.socket 2>/dev/null || true
systemctl disable snapd.socket 2>/dev/null || true
systemctl stop snapd.seeded 2>/dev/null || true
systemctl disable snapd.seeded 2>/dev/null || true
systemctl stop unattended-upgrades 2>/dev/null || true
systemctl disable unattended-upgrades 2>/dev/null || true

# Create application directory
mkdir -p /home/ubuntu/vidyutai
chown ubuntu:ubuntu /home/ubuntu/vidyutai

echo "✅ EC2 instance setup complete!"
echo "⚠️  Important: Logout and login again for Docker group changes to take effect"
echo "Next: Upload application files and run deployment script"

