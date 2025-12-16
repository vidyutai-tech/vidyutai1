# 🚀 VidyutAI EC2 Deployment Summary

## Quick Reference

**Domains:** 
- `spel.vidyutai.in` (Frontend)
- `api-be.vidyutai.in` (Backend API)
- `api-python-be.vidyutai.in` (AI Service API)

**Architecture:** Docker Compose with 4 services (Frontend, Backend, AI Service, Nginx)  
**SSL:** Let's Encrypt (single certificate for all subdomains, auto-renewal configured)

## 📁 Files Created/Modified

### New Files:
1. `docker-compose.prod.yml` - Production Docker Compose configuration
2. `infrastructure/nginx/nginx.prod.conf` - Production Nginx reverse proxy config
3. `infrastructure/aws/EC2_DEPLOYMENT_GUIDE.md` - Complete deployment guide
4. `infrastructure/aws/deploy-ec2.sh` - Automated deployment script
5. `infrastructure/aws/QUICK_START.md` - Quick reference guide

### Modified Files:
1. `Dockerfile.frontend` - Updated to use build args for environment variables

## 🎯 Deployment Steps (TL;DR)

### 1. Launch EC2 Instance
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04
- **Type:** 
  - **Best:** `m7i-flex.large` (8 GiB RAM) - Recommended for Docker stack
  - **Good:** `c7i-flex.large` (4 GiB RAM) - Minimum recommended
  - **Budget:** `t3.small` (2 GiB RAM) - May struggle under load
- **Ports:** 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. Configure DNS
```
A Record: spel.vidyutai.in → YOUR_EC2_IP (Frontend)
A Record: api-be.vidyutai.in → YOUR_EC2_IP (Backend)
A Record: api-python-be.vidyutai.in → YOUR_EC2_IP (AI Service)
```

### 3. Connect & Setup
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

### 4. Install Dependencies
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login
exit
```

### 5. Upload Application
```bash
# From local machine
scp -i your-key.pem -r /path/to/vidyutai1 ec2-user@YOUR_EC2_IP:~/
```

### 6. Deploy
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
cd ~/vidyutai1
export SSL_EMAIL=your-email@example.com
./infrastructure/aws/deploy-ec2.sh
```

### 7. Access
Visit: `https://spel.vidyutai.in`

## 📊 Service Architecture

```
Internet
   ↓
Nginx (Port 80/443) - SSL Termination & Reverse Proxy
   ├── Frontend (Port 8080) - React App
   ├── Backend (Port 3000) - Node.js API
   └── AI Service (Port 8000) - Python FastAPI
```

## 🔧 Key Configuration

### Environment Variables
- `JWT_SECRET` - Auto-generated secure secret
- `AI_SERVICE_URL` - Internal Docker network URL
- `CORS_ORIGIN` - Set to `https://spel.vidyutai.in`

### Ports
- **80/443** - Nginx (public)
- **8080** - Frontend (internal)
- **3000** - Backend (internal)
- **8000** - AI Service (internal)

### Volumes
- `vidyutai-db` - SQLite database persistence
- `backend/uploads` - File uploads
- `ai-service/app/ml-models` - ML model files

## 🔒 Security Features

1. **SSL/TLS** - Let's Encrypt certificates
2. **Security Headers** - HSTS, XSS Protection, etc.
3. **Rate Limiting** - API rate limits configured
4. **Firewall** - Security group rules
5. **Auto-renewal** - SSL certificate renewal

## 📝 Maintenance Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update application
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Backup database
docker exec vidyutai-backend tar czf /tmp/backup.tar.gz /app/database
```

## 🆘 Troubleshooting

**DNS Issues:**
```bash
dig spel.vidyutai.in
nslookup spel.vidyutai.in
```

**Container Issues:**
```bash
docker ps -a
docker-compose -f docker-compose.prod.yml logs
```

**SSL Issues:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## 📚 Documentation

- **Full Guide:** `infrastructure/aws/EC2_DEPLOYMENT_GUIDE.md`
- **Quick Start:** `infrastructure/aws/QUICK_START.md`
- **Deployment Script:** `infrastructure/aws/deploy-ec2.sh`

## ✅ Checklist

- [ ] EC2 instance launched
- [ ] DNS configured and propagated
- [ ] Docker installed on EC2
- [ ] Application files uploaded
- [ ] SSL certificate obtained
- [ ] Containers running
- [ ] Domain accessible via HTTPS
- [ ] SSL auto-renewal configured
- [ ] Backups configured (optional)

---

**Need Help?** Check the detailed guide in `infrastructure/aws/EC2_DEPLOYMENT_GUIDE.md`

