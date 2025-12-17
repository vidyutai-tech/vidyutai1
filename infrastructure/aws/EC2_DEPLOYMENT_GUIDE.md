# VidyutAI EC2 Deployment Guide

Complete step-by-step guide to deploy VidyutAI on AWS EC2 with Docker and domain `spel.vidyutai.in`.

## 📋 Prerequisites

1. **AWS Account** with EC2 access
2. **Domain configured** (`spel.vidyutai.in`) with DNS access
3. **AWS CLI** installed and configured (optional, for automation)
4. **SSH key pair** for EC2 access

## 🚀 Step-by-Step Deployment

### Step 1: Launch EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance

2. **Configure Instance:**
   - **Name:** `vidyutai-production` (or `VidyutAI Server`)
   - **AMI:** 
     - **Recommended:** Ubuntu Server 22.04 LTS (HVM), SSD Volume Type (Free tier eligible)
     - **Alternative:** Amazon Linux 2023
   - **Instance Type:** 
     - **Recommended:** `m7i-flex.large` (8 GiB RAM) - Best for Docker with 4 services
     - **Alternative:** `c7i-flex.large` (4 GiB RAM) - Minimum recommended
     - **Budget option:** `t3.small` (2 GiB RAM) - Developer friendly, requires optimization
     - **Not recommended:** `t3.micro` (1 GiB RAM) - Too small for this stack
   - **Key Pair:** Select or create a new key pair (save the `.pem` file!)
   - **Network Settings:**
     - Create/select a security group
     - **Inbound Rules:**
       - SSH (22) - Your IP
       - HTTP (80) - 0.0.0.0/0
       - HTTPS (443) - 0.0.0.0/0
   - **Storage:** 20 GB minimum (gp3)
   - **Advanced Details (Optional):** You can paste the user-data script from `infrastructure/aws/ec2-user-data.sh` for automated setup

3. **Launch Instance**

### Step 2: Configure DNS

1. **Get EC2 Public IP** from EC2 Console

2. **Update DNS Records** (in your domain registrar):
   - **A Record:** `spel.vidyutai.in` → `YOUR_EC2_IP` (Frontend)
   - **A Record:** `api-be.vidyutai.in` → `YOUR_EC2_IP` (Backend API)
   - **A Record:** `api-python-be.vidyutai.in` → `YOUR_EC2_IP` (AI Service API)
   - **A Record:** `www.spel.vidyutai.in` → `YOUR_EC2_IP` (optional)

3. **Wait for DNS propagation** (5-30 minutes). Verify:
   ```bash
   dig spel.vidyutai.in
   nslookup spel.vidyutai.in
   ```

### Step 3: Connect to EC2 Instance

```bash
# For Ubuntu
ssh -i ~/path/to/your-key.pem ubuntu@YOUR_EC2_IP

# For Amazon Linux
ssh -i ~/path/to/your-key.pem ec2-user@YOUR_EC2_IP
```

### Step 4: Install Dependencies on EC2

#### For Ubuntu (Recommended):
```bash
# Run the optimized setup script for t3.small
curl -fsSL https://raw.githubusercontent.com/vidyutai-tech/vidyutai1/main/infrastructure/aws/setup-ubuntu-t3small.sh -o setup.sh
chmod +x setup.sh
./setup.sh

# OR manually:
cd ~/vidyutai1/infrastructure/aws
chmod +x setup-ubuntu-t3small.sh
./setup-ubuntu-t3small.sh

# Logout and login again for Docker group changes
exit
```

#### For Amazon Linux 2023:
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git

# Logout and login again for group changes to take effect
exit
```

**Important for t3.small:** The Ubuntu setup script automatically:
- Creates 2GB swap space
- Optimizes Docker memory settings
- Configures system for low memory usage
- Disables unnecessary services

### Step 5: Clone and Prepare Application

```bash
# Reconnect to EC2
ssh -i ~/path/to/your-key.pem ubuntu@YOUR_EC2_IP

# Create application directory
mkdir -p ~/vidyutai
cd ~/vidyutai

# Clone your repository (or upload files)
git clone https://github.com/vidyutai-tech/vidyutai1.git .

# OR: Upload files using SCP from your local machine:
# scp -i ~/path/to/your-key.pem -r /path/to/vidyutai1/* ubuntu@YOUR_EC2_IP:~/vidyutai/
```

### Step 6: Configure Environment Variables

```bash
cd ~/vidyutai

# Create .env file for production
cat > .env <<EOF
# Production Environment Variables
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
DOMAIN=spel.vidyutai.in
EOF

# Make it secure
chmod 600 .env
```

### Step 7: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot (if not already installed)
sudo apt-get install -y certbot python3-certbot-nginx  # Ubuntu
# OR
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux

# Create directories for SSL
mkdir -p ~/vidyutai/infrastructure/nginx/ssl
mkdir -p ~/vidyutai/infrastructure/nginx/logs

# Get SSL certificate for all subdomains (standalone mode)
sudo certbot certonly --standalone \
    -d spel.vidyutai.in \
    -d www.spel.vidyutai.in \
    -d api-be.vidyutai.in \
    -d api-python-be.vidyutai.in \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive

# Copy certificates to project directory
sudo cp /etc/letsencrypt/live/spel.vidyutai.in/fullchain.pem ~/vidyutai/infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/spel.vidyutai.in/privkey.pem ~/vidyutai/infrastructure/nginx/ssl/
sudo chown ubuntu:ubuntu ~/vidyutai/infrastructure/nginx/ssl/*.pem  # Ubuntu
# OR
sudo chown ec2-user:ec2-user ~/vidyutai/infrastructure/nginx/ssl/*.pem  # Amazon Linux
```

**Note:** For the initial certificate, you may need to temporarily stop nginx or use standalone mode. After getting the certificate, we'll configure nginx to auto-renew.

### Step 8: Build and Start Docker Containers

```bash
cd ~/vidyutai

# Build images (this may take 10-15 minutes on t3.small)
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

**For t3.small users:** The docker-compose.prod.yml is already optimized with memory limits:
- Frontend: 100MB limit
- Backend: 512MB limit (with Node.js memory optimization)
- AI Service: 800MB limit (with Python memory optimization)
- Nginx: 100MB limit
- Total: ~1.5GB, leaving ~500MB for system

### Step 9: Verify Deployment

1. **Check containers are running:**
   ```bash
   docker ps
   ```

2. **Check memory usage:**
   ```bash
   docker stats --no-stream
   free -h
   ```

3. **Test locally on EC2:**
   ```bash
   curl http://localhost/api/v1/health
   curl http://localhost:8000/health
   ```

4. **Test from browser:**
   - Visit: `https://spel.vidyutai.in`
   - Check browser console for errors

### Step 10: Setup Auto-Renewal for SSL

```bash
# Create renewal script (for all subdomains)
cat > ~/renew-ssl.sh <<'EOF'
#!/bin/bash
certbot renew --quiet --deploy-hook "docker cp /etc/letsencrypt/live/spel.vidyutai.in/fullchain.pem vidyutai-nginx:/etc/nginx/ssl/fullchain.pem && docker cp /etc/letsencrypt/live/spel.vidyutai.in/privkey.pem vidyutai-nginx:/etc/nginx/ssl/privkey.pem && docker exec vidyutai-nginx nginx -s reload"
EOF

chmod +x ~/renew-ssl.sh

# Add to crontab (runs twice daily)
(crontab -l 2>/dev/null; echo "0 0,12 * * * /home/ubuntu/renew-ssl.sh") | crontab -  # Ubuntu
# OR
(crontab -l 2>/dev/null; echo "0 0,12 * * * /home/ec2-user/renew-ssl.sh") | crontab -  # Amazon Linux
```

### Step 11: Setup Automatic Startup (Optional)

```bash
# Create systemd service for docker-compose
sudo tee /etc/systemd/system/vidyutai.service > /dev/null <<EOF
[Unit]
Description=VidyutAI Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/vidyutai
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable vidyutai
sudo systemctl start vidyutai
```

## 🔧 Maintenance Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f ai-service
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Monitor Resources (Important for t3.small)
```bash
# Container stats
docker stats

# System memory
free -h

# Disk usage
df -h
docker system df
```

### Update Application
```bash
cd ~/vidyutai

# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Or for zero-downtime (if using multiple instances):
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend
```

### Backup Database
```bash
# Create backup
docker exec vidyutai-backend tar czf /tmp/backup-$(date +%Y%m%d).tar.gz /app/database
docker cp vidyutai-backend:/tmp/backup-$(date +%Y%m%d).tar.gz ~/backups/

# Restore backup
docker cp ~/backups/backup-YYYYMMDD.tar.gz vidyutai-backend:/tmp/
docker exec vidyutai-backend tar xzf /tmp/backup-YYYYMMDD.tar.gz -C /
```

## 🐛 Troubleshooting

### Containers not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker ps -a

# Check memory
free -h
docker stats

# Restart Docker daemon
sudo systemctl restart docker
```

### Out of Memory (OOM) Issues on t3.small
```bash
# Check if swap is active
free -h
swapon --show

# If swap is not active, create it:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Check OOM killer logs
dmesg | grep -i "out of memory"
journalctl -k | grep -i "out of memory"
```

### SSL Certificate Issues
```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --dry-run
```

### Port Already in Use
```bash
# Check what's using port 80/443
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop httpd  # Apache (if installed)
sudo systemctl stop nginx  # System nginx (if installed)
```

### Database Issues
```bash
# Check database volume
docker volume inspect vidyutai_vidyutai-db

# Access database
docker exec -it vidyutai-backend sh
cd /app/database
ls -la
```

## 📊 Monitoring

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# System load
htop  # If installed
top
```

### Health Checks
```bash
# Backend health
curl http://localhost:3000/health

# AI Service health
curl http://localhost:8000/health

# Frontend
curl http://localhost:8080
```

## 🔒 Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y  # Ubuntu
   sudo yum update -y  # Amazon Linux
   ```

2. **Configure firewall (if not using security groups):**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Regular backups:**
   - Set up automated database backups
   - Backup SSL certificates
   - Backup configuration files

4. **Monitor logs:**
   ```bash
   # Set up log rotation
   sudo logrotate -d /etc/logrotate.conf
   ```

## 📝 Notes

- **Domain:** Make sure DNS is properly configured before starting
- **SSL:** Let's Encrypt certificates expire every 90 days, auto-renewal is essential
- **Database:** Consider using RDS for production instead of SQLite
- **Scaling:** For high traffic, consider using ECS/EKS or multiple EC2 instances with load balancer
- **t3.small:** This instance type works but requires careful memory management. Monitor regularly and consider upgrading if you experience frequent OOM issues.

## 🆘 Support

If you encounter issues:
1. Check container logs
2. Verify DNS resolution
3. Check security group rules
4. Verify SSL certificate status
5. Check EC2 instance health in AWS Console
6. For t3.small: Monitor memory usage with `docker stats` and `free -h`
