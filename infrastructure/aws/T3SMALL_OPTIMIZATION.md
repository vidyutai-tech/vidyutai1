# t3.small (2GB RAM) Optimization Guide

## Overview

This guide provides specific optimizations for running VidyutAI on a `t3.small` EC2 instance (2GB RAM). The deployment has been optimized with memory limits and swap space configuration.

## Memory Allocation

### Docker Container Limits (Total: ~1.5GB)

| Service | Memory Limit | Reservation | Notes |
|---------|--------------|-------------|-------|
| Frontend | 100MB | 50MB | Static files, minimal memory |
| Backend | 512MB | 256MB | Node.js with `--max-old-space-size=384` |
| AI Service | 800MB | 400MB | Python with `MALLOC_ARENA_MAX=2` |
| Nginx | 100MB | 50MB | Reverse proxy, minimal memory |
| **Total** | **~1.5GB** | **~750MB** | Leaves ~500MB for system |

### System Memory

- **Total RAM:** 2GB
- **Docker Containers:** ~1.5GB
- **System + Swap:** ~500MB + 2GB swap
- **Swap Space:** 2GB (automatically configured)

## Automatic Optimizations

The `setup-ubuntu-t3small.sh` script automatically:

1. ✅ Creates 2GB swap space
2. ✅ Configures Docker memory limits
3. ✅ Optimizes kernel parameters
4. ✅ Disables unnecessary services (snapd)
5. ✅ Sets up proper logging rotation

## Manual Optimizations

### 1. Verify Swap is Active

```bash
# Check swap
free -h
swapon --show

# Should show 2GB swap
```

### 2. Monitor Memory Usage

```bash
# Real-time container stats
docker stats

# System memory
watch -n 1 free -h

# Check for OOM events
dmesg | grep -i "out of memory"
```

### 3. If Memory Issues Occur

#### Option A: Increase Swap
```bash
# Disable current swap
sudo swapoff /swapfile

# Create larger swap (4GB)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### Option B: Reduce Container Limits

Edit `docker-compose.prod.yml`:
```yaml
services:
  ai-service:
    deploy:
      resources:
        limits:
          memory: 600M  # Reduced from 800M
```

#### Option C: Disable Unused Services
```bash
# Stop unnecessary services
sudo systemctl stop snapd
sudo systemctl disable snapd
sudo systemctl stop unattended-upgrades
sudo systemctl disable unattended-upgrades
```

### 4. Optimize Application Code

#### Backend (Node.js)
- Already optimized with `NODE_OPTIONS=--max-old-space-size=384`
- Uses ~384MB heap maximum

#### AI Service (Python)
- Already optimized with `MALLOC_ARENA_MAX=2`
- Single worker (`--workers 1`)
- Limited concurrency (`--limit-concurrency 10`)

## Performance Expectations

### Normal Operation
- ✅ All services running smoothly
- ✅ Response times: < 2 seconds
- ✅ Memory usage: 70-80% of 2GB
- ✅ Swap usage: 0-20% (normal)

### Under Load
- ⚠️ Response times: 2-5 seconds
- ⚠️ Memory usage: 85-95% of 2GB
- ⚠️ Swap usage: 30-50% (acceptable)
- ⚠️ May experience occasional slowdowns

### Warning Signs
- ❌ Memory usage: > 95%
- ❌ Swap usage: > 70%
- ❌ Frequent OOM errors
- ❌ Response times: > 10 seconds

**Action:** Consider upgrading to `c7i-flex.large` (4GB) or `m7i-flex.large` (8GB)

## Monitoring Commands

### Quick Health Check
```bash
#!/bin/bash
echo "=== Memory Status ==="
free -h
echo ""
echo "=== Swap Status ==="
swapon --show
echo ""
echo "=== Container Stats ==="
docker stats --no-stream
echo ""
echo "=== Disk Usage ==="
df -h
```

### Set Up Monitoring Script
```bash
# Create monitoring script
cat > ~/monitor.sh <<'EOF'
#!/bin/bash
echo "=== $(date) ==="
echo "Memory:"
free -h | grep Mem
echo "Swap:"
free -h | grep Swap
echo "Containers:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
EOF

chmod +x ~/monitor.sh

# Run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/monitor.sh >> /home/ubuntu/monitor.log 2>&1") | crontab -
```

## Troubleshooting

### Issue: Containers Keep Restarting

**Cause:** Out of Memory (OOM)

**Solution:**
```bash
# Check OOM logs
dmesg | grep -i "out of memory"
journalctl -k | grep -i "out of memory"

# Increase swap or reduce container limits
```

### Issue: Slow Response Times

**Cause:** High swap usage

**Solution:**
```bash
# Check swap usage
free -h
swapon --show

# If swap usage > 50%, consider:
# 1. Upgrading instance
# 2. Reducing container memory limits
# 3. Optimizing application code
```

### Issue: Build Fails

**Cause:** Insufficient memory during build

**Solution:**
```bash
# Build with swap active
free -h  # Verify swap is active

# Build one service at a time
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml build ai-service
```

## Best Practices

1. **Monitor Regularly**
   - Check `docker stats` daily
   - Monitor swap usage
   - Watch for OOM errors

2. **Optimize Early**
   - Don't wait for issues
   - Set up monitoring from day 1
   - Keep swap active

3. **Plan for Growth**
   - t3.small is fine for development/testing
   - Consider upgrading for production
   - Monitor costs vs. performance

4. **Backup Strategy**
   - Regular database backups
   - Configuration backups
   - Test restore procedures

## When to Upgrade

Consider upgrading to `c7i-flex.large` (4GB) or `m7i-flex.large` (8GB) if:

- ✅ Frequent OOM errors
- ✅ Swap usage consistently > 50%
- ✅ Response times consistently > 5 seconds
- ✅ Planning for production use
- ✅ Expecting high traffic

## Cost Comparison

| Instance | RAM | Free Tier | After Free Tier (approx) |
|----------|-----|-----------|--------------------------|
| t3.small | 2GB | ✅ Free | ~$15/month |
| c7i-flex.large | 4GB | ✅ Free | ~$30/month |
| m7i-flex.large | 8GB | ✅ Free | ~$60/month |

**Note:** All are free tier eligible for first 12 months (750 hours/month)

