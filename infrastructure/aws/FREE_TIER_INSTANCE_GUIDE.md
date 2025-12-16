# Free Tier Instance Selection Guide

## Available Free Tier Instances

Based on your AWS account, you have 4 free tier eligible options:

1. **`t3.micro`** - 2 vCPU, 1 GiB RAM
2. **`t3.small`** - 2 vCPU, 2 GiB RAM
3. **`c7i-flex.large`** - 2 vCPU, 4 GiB RAM
4. **`m7i-flex.large`** - 2 vCPU, 8 GiB RAM

## Recommendation for VidyutAI

### ✅ **Best Choice: `m7i-flex.large` (8 GiB RAM)**

**Why:**
- Your stack runs 4 Docker containers (Frontend, Backend, AI Service, Nginx)
- Python AI service with ML models needs memory
- Node.js backend with Socket.IO connections
- Room for growth and better performance

**Resource Breakdown:**
- Frontend (Nginx): ~50-100 MB
- Backend (Node.js): ~200-400 MB
- AI Service (Python/FastAPI): ~500-1000 MB (with ML models)
- Nginx Reverse Proxy: ~50-100 MB
- System overhead: ~500 MB
- **Total needed: ~2-3 GB minimum, 4-5 GB comfortable**

### ⚠️ **Alternative: `c7i-flex.large` (4 GiB RAM)**

**When to use:**
- If `m7i-flex.large` is not available
- For testing/development
- Light usage scenarios

**Considerations:**
- May need to optimize Docker memory limits
- Monitor swap usage
- May experience slowdowns under load

### ⚠️ **Budget Option: `t3.small` (2 GiB RAM)**

**When to use:**
- Very limited budget
- Development/testing only
- Very light usage

**Limitations:**
- Will likely need swap space
- May experience OOM (Out of Memory) errors
- Slow performance, especially for ML operations
- Not recommended for production

### ❌ **Not Recommended: `t3.micro` (1 GiB RAM)**

**Why avoid:**
- Too small for Docker with 4 services
- Will constantly hit memory limits
- Frequent crashes and restarts
- Very poor user experience

## Memory Optimization Tips (if using smaller instances)

If you must use `t3.small` or `c7i-flex.large`, add these optimizations:

### 1. Add Swap Space
```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Limit Docker Container Memory
Edit `docker-compose.prod.yml`:
```yaml
services:
  ai-service:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### 3. Optimize Python AI Service
```bash
# In Dockerfile.ai-service, add:
ENV PYTHONUNBUFFERED=1
ENV MALLOC_ARENA_MAX=2
```

## Performance Comparison

| Instance | RAM | Docker Containers | ML Performance | Recommended For |
|----------|-----|-------------------|----------------|-----------------|
| `m7i-flex.large` | 8 GB | ✅ Excellent | ✅ Fast | **Production** |
| `c7i-flex.large` | 4 GB | ✅ Good | ⚠️ Moderate | Development/Testing |
| `t3.small` | 2 GB | ⚠️ Tight | ❌ Slow | Development only |
| `t3.micro` | 1 GB | ❌ Insufficient | ❌ Very Slow | Not recommended |

## Cost Considerations

All listed instances are **free tier eligible**, meaning:
- You get 750 hours/month free for the first 12 months
- After free tier expires, you pay on-demand pricing
- `m7i-flex.large` costs more after free tier, but provides best value

## Final Recommendation

**For Production:** Use `m7i-flex.large` (8 GiB RAM)
- Best performance
- Room for growth
- Fewer issues to troubleshoot
- Better user experience

**For Development/Testing:** `c7i-flex.large` (4 GiB RAM) is acceptable
- Monitor memory usage
- Add swap space if needed
- Consider upgrading if you see issues

## Monitoring Memory Usage

After deployment, monitor memory:
```bash
# Check container memory usage
docker stats

# Check system memory
free -h

# Check swap usage
swapon --show
```

If you see high memory usage (>80%), consider:
1. Upgrading to `m7i-flex.large`
2. Adding swap space
3. Optimizing container memory limits

