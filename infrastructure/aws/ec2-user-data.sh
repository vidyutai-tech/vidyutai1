#!/bin/bash

# EC2 User Data Script for VidyutAI Dashboard
# This script runs on first boot to setup the EC2 instance

set -e

echo "🚀 Setting up VidyutAI Dashboard on EC2..."

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
yum install -y git

# Create application directory
mkdir -p /home/ec2-user/vidyutai
cd /home/ec2-user/vidyutai

# Clone the repository
echo "📥 Cloning VidyutAI repository..."
git clone https://github.com/vidyutai-tech/vidyutai1.git .
# Note: If repository is private, you'll need to configure SSH keys or use a token

# Set permissions
chown -R ec2-user:ec2-user /home/ec2-user/vidyutai

echo "✅ EC2 instance setup complete!"
echo "Next steps:"
echo "  1. SSH into the instance"
echo "  2. cd ~/vidyutai"
echo "  3. export SSL_EMAIL=your-email@example.com"
echo "  4. ./infrastructure/aws/deploy-ec2.sh"

