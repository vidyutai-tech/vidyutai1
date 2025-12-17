# Git Workflow for EC2 Deployment

## On Your Local Machine

### 1. Commit and Push Changes

```bash
# Navigate to project root
cd ~/Documents/IITGN/vidyutai1

# Check what files changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Fix: Update Dockerfiles and requirements for production deployment"

# Push to GitHub
git push origin main
# OR if your branch is master:
# git push origin master
```

## On EC2 Instance

### 2. Pull Latest Changes

```bash
# Navigate to project directory
cd ~/vidyutai

# Pull latest changes from GitHub
git pull origin main
# OR if your branch is master:
# git pull origin master

# Verify changes were pulled
git log -1

# Rebuild Docker containers with new changes
docker-compose -f docker-compose.prod.yml build --no-cache

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Quick One-Liner for EC2

```bash
cd ~/vidyutai && git pull origin main && docker-compose -f docker-compose.prod.yml build --no-cache && docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

If you get merge conflicts on EC2:
```bash
cd ~/vidyutai
git stash
git pull origin main
git stash pop
```

If you need to reset to match remote:
```bash
cd ~/vidyutai
git fetch origin
git reset --hard origin/main
```

