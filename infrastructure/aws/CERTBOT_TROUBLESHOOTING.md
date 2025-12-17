# Certbot SSL Certificate Troubleshooting

## Error: "Unable to register an account with ACME server"

This error can occur for several reasons. Follow these steps to diagnose and fix:

## 🔍 Step 1: Check DNS Configuration

**Most common issue:** DNS not pointing to your EC2 IP.

```bash
# Check if DNS is configured correctly
dig spel.vidyutai.in
dig api-be.vidyutai.in
dig api-python-be.vidyutai.in

# Or use nslookup
nslookup spel.vidyutai.in
```

**Expected:** All should return your EC2 instance's public IP address.

**If DNS is not configured:**
1. Go to your domain registrar (where you bought vidyutai.in)
2. Add A records:
   - `spel.vidyutai.in` → `YOUR_EC2_IP`
   - `api-be.vidyutai.in` → `YOUR_EC2_IP`
   - `api-python-be.vidyutai.in` → `YOUR_EC2_IP`
3. Wait 5-30 minutes for DNS propagation
4. Verify again with `dig` or `nslookup`

## 🔍 Step 2: Check Network Connectivity

```bash
# Test if port 80 is accessible
sudo netstat -tlnp | grep :80

# Check if anything is using port 80
sudo lsof -i :80

# Test connectivity to Let's Encrypt
curl -I https://acme-v02.api.letsencrypt.org/directory
```

**If port 80 is in use:**
```bash
# Stop any service using port 80
sudo systemctl stop apache2  # If Apache is running
sudo systemctl stop nginx    # If Nginx is running
```

## 🔍 Step 3: Check Security Group

**In AWS Console:**
1. Go to EC2 → Security Groups
2. Select your instance's security group
3. **Inbound Rules** must allow:
   - Port 80 (HTTP) from 0.0.0.0/0
   - Port 443 (HTTPS) from 0.0.0.0/0
   - Port 22 (SSH) from your IP

## 🔍 Step 4: Use Real Email Address

**Important:** Replace `your-email@example.com` with your actual email:

```bash
sudo certbot certonly --standalone \
    -d spel.vidyutai.in \
    -d www.spel.vidyutai.in \
    -d api-be.vidyutai.in \
    -d api-python-be.vidyutai.in \
    --email YOUR-REAL-EMAIL@example.com \
    --agree-tos \
    --non-interactive
```

## 🔍 Step 5: Check Certbot Logs

```bash
# View detailed error logs
sudo cat /var/log/letsencrypt/letsencrypt.log | tail -50

# Or run with verbose mode
sudo certbot certonly --standalone \
    -d spel.vidyutai.in \
    -d api-be.vidyutai.in \
    -d api-python-be.vidyutai.in \
    --email YOUR-EMAIL@example.com \
    --agree-tos \
    --non-interactive \
    -v
```

## 🔍 Step 6: Check Rate Limits

Let's Encrypt has rate limits. If you've tried too many times:

```bash
# Check rate limit status
curl https://letsencrypt.org/docs/rate-limits/

# Wait 1 hour if you hit rate limits
```

## ✅ Quick Fix: Try One Domain First

Test with just one domain to isolate the issue:

```bash
# Test with just one domain
sudo certbot certonly --standalone \
    -d spel.vidyutai.in \
    --email YOUR-REAL-EMAIL@example.com \
    --agree-tos \
    --non-interactive \
    -v
```

If this works, then add other domains.

## ✅ Alternative: Use Deployment Script

The deployment script handles this automatically:

```bash
cd ~/vidyutai
export SSL_EMAIL=your-real-email@example.com
./infrastructure/aws/deploy-ec2.sh
```

## 🔧 Common Solutions

### Solution 1: DNS Not Ready
**Problem:** DNS hasn't propagated yet  
**Fix:** Wait 10-30 minutes, then retry

### Solution 2: Port 80 Blocked
**Problem:** Another service is using port 80  
**Fix:** 
```bash
sudo systemctl stop apache2
sudo systemctl stop nginx
# Then retry certbot
```

### Solution 3: Security Group
**Problem:** Port 80 not open in AWS Security Group  
**Fix:** Add inbound rule for port 80 (HTTP) from 0.0.0.0/0

### Solution 4: Network Issues
**Problem:** EC2 instance can't reach Let's Encrypt  
**Fix:** Check VPC settings, ensure instance has internet access

### Solution 5: Invalid Email
**Problem:** Using placeholder email  
**Fix:** Use your real email address

## 📝 Correct Command Template

```bash
# Replace YOUR-REAL-EMAIL with your actual email
sudo certbot certonly --standalone \
    -d spel.vidyutai.in \
    -d www.spel.vidyutai.in \
    -d api-be.vidyutai.in \
    -d api-python-be.vidyutai.in \
    --email YOUR-REAL-EMAIL@example.com \
    --agree-tos \
    --non-interactive
```

## 🆘 Still Having Issues?

1. **Check DNS:** `dig spel.vidyutai.in` - must return EC2 IP
2. **Check Port 80:** `sudo lsof -i :80` - should be empty or certbot
3. **Check Security Group:** Port 80 must be open
4. **Use Real Email:** Replace placeholder email
5. **Check Logs:** `sudo tail -50 /var/log/letsencrypt/letsencrypt.log`

---

**Most Common Issue:** DNS not configured or not propagated yet. Wait 10-30 minutes after adding DNS records.

