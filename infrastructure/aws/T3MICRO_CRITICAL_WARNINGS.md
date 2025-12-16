# ⚠️ CRITICAL: t3.micro (1GB RAM) Deployment Warnings

## 🚨 Important Notice

You're using **t3.micro with only 1GB RAM**. This is **extremely tight** for running 4 Docker containers (Frontend, Backend, AI Service, Nginx).

**Recommended:** Upgrade to `t3.small` (2GB) or `c7i-flex.large` (4GB) for better performance.

---

## 📊 Memory Requirements

| Service | Memory Needed | Your Limit |
|---------|---------------|------------|
| Frontend | 50-100MB | ✅ OK |
| Backend | 200-400MB | ⚠️ Tight |
| AI Service | 500-1000MB | ❌ **CRITICAL** |
| Nginx | 50-100MB | ✅ OK |
| System | 200-300MB | ⚠️ Tight |
| **Total Needed** | **~1.5-2GB** | **You have: 1GB** |

---

## ⚠️ Required Optimizations for t3.micro

### 1. **MANDATORY: Increase Swap Space**

You **MUST** create at least 2GB swap space:

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize swap usage
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. **Reduce Container Memory Limits**

Edit `docker-compose.prod.yml` and reduce limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 300M  # Reduced from 512M
        reservations:
          memory: 150M  # Reduced from 256M

  ai-service:
    deploy:
      resources:
        limits:
          memory: 500M  # Reduced from 800M
        reservations:
          memory: 250M  # Reduced from 400M
```

### 3. **Disable Unnecessary Services**

```bash
# Stop and disable snapd (saves ~100MB)
sudo systemctl stop snapd
sudo systemctl disable snapd
sudo systemctl stop snapd.socket
sudo systemctl disable snapd.socket

# Stop unattended-upgrades
sudo systemctl stop unattended-upgrades
sudo systemctl disable unattended-upgrades
```

### 4. **Optimize Docker**

```bash
# Configure Docker to use less memory
sudo mkdir -p /etc/docker
cat > /tmp/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "5m",
    "max-file": "2"
  },
  "storage-driver": "overlay2"
}
EOF
sudo mv /tmp/daemon.json /etc/docker/daemon.json
sudo systemctl restart docker
```

---

## 🔧 Network Configuration - Your Current Setup ✅

Your security group is **correct**:

- ✅ **SSH (22)** - My IP only - **Correct**
- ✅ **HTTP (80)** - Anywhere (0.0.0.0/0) - **Required for SSL**
- ✅ **HTTPS (443)** - Anywhere (0.0.0.0/0) - **Required for website**

**No additional network changes needed!** ✅

---

## 📝 Modified docker-compose.prod.yml for t3.micro

I'll create an optimized version. Here's what needs to change:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 300M  # Reduced
        reservations:
          memory: 150M

  ai-service:
    deploy:
      resources:
        limits:
          memory: 500M  # Reduced
        reservations:
          memory: 250M
```

---

## 🚨 Expected Issues with t3.micro

1. **Out of Memory (OOM) Errors**
   - Containers may crash frequently
   - System may become unresponsive
   - Swap will be heavily used (slow performance)

2. **Slow Performance**
   - High swap usage = very slow
   - ML operations will be extremely slow
   - API responses may timeout

3. **Build Failures**
   - Docker build may fail due to memory
   - May need to build images one at a time

---

## ✅ Recommended Actions

### Option 1: Upgrade Instance (BEST)
- Change to `t3.small` (2GB) - Still free tier eligible
- Much better performance
- Less troubleshooting

### Option 2: Optimize for t3.micro (If you must)
1. Create 2GB swap space (mandatory)
2. Reduce container memory limits
3. Disable unnecessary services
4. Monitor closely with `docker stats`
5. Be prepared for slow performance

---

## 📊 Monitoring Commands

```bash
# Check memory usage
free -h

# Check swap
swapon --show

# Monitor containers
docker stats

# Check for OOM errors
dmesg | grep -i "out of memory"
journalctl -k | grep -i "out of memory"
```

---

## ⚠️ Final Warning

**t3.micro (1GB RAM) is NOT recommended for production.**

- ❌ Too small for 4 Docker containers
- ❌ Will experience frequent OOM errors
- ❌ Very slow performance
- ❌ Poor user experience

**Strongly recommend upgrading to t3.small (2GB) or larger.**

