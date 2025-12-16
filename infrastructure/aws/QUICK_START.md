# Quick Start: Deploy VidyutAI on EC2

## 🚀 Fastest Path to Deployment

### 1. Launch EC2 Instance
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04
- **Type:** 
  - **Best:** `m7i-flex.large` (8 GiB RAM) - Recommended
  - **Good:** `c7i-flex.large` (4 GiB RAM) - Minimum recommended
  - **Budget:** `t3.small` (2 GiB RAM) - May be slow
- **Security Group:** Open ports 22, 80, 443
- **Storage:** 20 GB

### 2. Connect to EC2
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

### 3. Run One-Command Setup
```bash
# Install Docker & Dependencies
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again
exit
```

### 4. Upload Application
```bash
# From your local machine
scp -i your-key.pem -r /path/to/vidyutai1 ec2-user@YOUR_EC2_IP:~/

# Or clone from Git
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
cd ~
git clone YOUR_REPO_URL vidyutai
cd vidyutai
```

### 5. Configure DNS
- Add A record: `spel.vidyutai.in` → `YOUR_EC2_IP`
- Wait 5-10 minutes for propagation

### 6. Deploy
```bash
cd ~/vidyutai
export SSL_EMAIL=your-email@example.com
./infrastructure/aws/deploy-ec2.sh
```

### 7. Access
Visit: `https://spel.vidyutai.in`

---

## 📋 Manual Steps (If Script Fails)

### Install Dependencies
```bash
# Amazon Linux
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Get SSL Certificate
```bash
sudo yum install -y certbot
sudo certbot certonly --standalone -d spel.vidyutai.in -d www.spel.vidyutai.in --email your-email@example.com --agree-tos --non-interactive
sudo cp /etc/letsencrypt/live/spel.vidyutai.in/fullchain.pem ~/vidyutai/infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/spel.vidyutai.in/privkey.pem ~/vidyutai/infrastructure/nginx/ssl/
sudo chown ec2-user:ec2-user ~/vidyutai/infrastructure/nginx/ssl/*.pem
```

### Build and Start
```bash
cd ~/vidyutai
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔍 Verify Deployment

```bash
# Check containers
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:8000/health
```

---

## 🆘 Common Issues

**DNS not resolving?**
- Wait 10-30 minutes
- Check DNS records: `dig spel.vidyutai.in`

**SSL certificate fails?**
- Ensure port 80 is open
- Verify DNS points to EC2 IP
- Check security group rules

**Containers not starting?**
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Verify Docker is running: `sudo systemctl status docker`

---

For detailed instructions, see: `infrastructure/aws/EC2_DEPLOYMENT_GUIDE.md`

