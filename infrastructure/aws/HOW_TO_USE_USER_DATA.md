# How to Use User Data Script in AWS Console

## 📋 Step-by-Step Guide

### Step 1: Open "Advanced details" Section

When launching an EC2 instance in the console:

1. Scroll down past all the basic configuration sections
2. Find and expand **"Advanced details"** section (usually at the bottom)
3. Look for **"User data"** field

### Step 2: Copy the Script Content

You have two options:

#### Option A: Use the Setup Script (Recommended)

Since you're using Ubuntu, copy the content from `setup-ubuntu-t3micro.sh`:

```bash
# On your local machine, view the script:
cat infrastructure/aws/setup-ubuntu-t3micro.sh
```

Then copy the entire content (without the shebang `#!/bin/bash` line - AWS adds it automatically).

#### Option B: Use the Basic User Data Script

Or use the simpler `ec2-user-data.sh`:

```bash
# View the script:
cat infrastructure/aws/ec2-user-data.sh
```

### Step 3: Paste in Console

1. In the **"User data"** text box in AWS Console
2. Select **"As text"** (not "As file")
3. Paste the entire script content
4. **Important:** Remove the first line `#!/bin/bash` if it's there (AWS adds it automatically)

---

## 🎯 Recommended: Use setup-ubuntu-t3micro.sh Content

Since you're using **Ubuntu** and **t3.micro**, here's what to paste:

```bash
# Copy this entire content (without #!/bin/bash line):

set -e

echo "🚀 VidyutAI EC2 Setup for Ubuntu (t3.micro - 1GB RAM)"
echo "⚠️  WARNING: This instance type is extremely tight!"
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

# Optimize swap
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
echo 'vm.overcommit_memory=1' >> /etc/sysctl.conf
sudo sysctl -p

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install utilities
apt-get install -y git curl wget certbot python3-certbot-nginx htop unzip

# Disable unnecessary services
systemctl stop snapd 2>/dev/null || true
systemctl disable snapd 2>/dev/null || true
systemctl stop unattended-upgrades 2>/dev/null || true
systemctl disable unattended-upgrades 2>/dev/null || true

# Create application directory
mkdir -p /home/ubuntu/vidyutai

echo "✅ Setup complete! Logout and login again for Docker group changes."
```

**Note:** Remove `sudo` commands - user-data runs as root automatically.

---

## 📍 Where to Find "Advanced details" in Console

1. **Launch Instance** page
2. Scroll down past:
   - Application and OS Images
   - Instance type
   - Key pair
   - Network settings
   - Storage
3. Find **"Advanced details"** section (expandable)
4. Expand it
5. Scroll to **"User data"** field

---

## ⚠️ Important Notes

1. **No shebang needed:** Don't include `#!/bin/bash` - AWS adds it
2. **Runs as root:** All commands run as root, so no `sudo` needed
3. **Runs once:** User data runs only on first boot
4. **Check logs:** After instance starts, check:
   ```bash
   sudo cat /var/log/cloud-init-output.log
   ```

---

## 🔍 Alternative: Manual Setup (If User Data Fails)

If user data doesn't work, you can manually run the setup script after connecting:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
cd ~/vidyutai1/infrastructure/aws
chmod +x setup-ubuntu-t3micro.sh
./setup-ubuntu-t3micro.sh
```

---

## ✅ Quick Checklist

- [ ] Expanded "Advanced details" section
- [ ] Found "User data" field
- [ ] Selected "As text"
- [ ] Pasted script content (without `#!/bin/bash`)
- [ ] Removed any `sudo` commands
- [ ] Clicked "Launch instance"

---

## 🆘 Troubleshooting

**User data not running?**
- Check logs: `sudo cat /var/log/cloud-init-output.log`
- Verify script syntax (no errors)
- Make sure it's in "As text" mode, not "As file"

**Script errors?**
- Remove `#!/bin/bash` line
- Remove all `sudo` commands
- Make sure commands are valid for Ubuntu

