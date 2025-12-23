# 🚨 Quick Fix: 503 Service Unavailable Errors

## Problem
All three prediction dashboard endpoints returning **503 Service Unavailable**:
- `/api/v1/predictions/battery-rul/dashboard`
- `/api/v1/predictions/solar-degradation/dashboard`  
- `/api/v1/predictions/energy-loss/dashboard`

## Root Cause
**Model files are in `.gitignore`** → Not committed → Not deployed to Render → 503 errors

## Solution (3 Steps)

### Step 1: Add Models to Git

Run the provided script:
```bash
./add_models_to_git.sh
```

Or manually:
```bash
git add ai-service/app/ml-models/battery_rul*.joblib
git add ai-service/app/ml-models/battery_rul*.json
git add ai-service/app/ml-models/solar_degradation*.joblib
git add ai-service/app/ml-models/solar_degradation*.json
git add ai-service/app/ml-models/energy_loss*.joblib
git add ai-service/app/ml-models/energy_loss*.json
```

### Step 2: Commit & Push

```bash
git commit -m "Add ML model files for production deployment"
git push
```

### Step 3: Wait for Render Deployment

1. Go to Render dashboard
2. Watch deployment logs
3. Look for: `✅ Battery RUL Model loaded`
4. Look for: `✅ Solar Degradation Model loaded`
5. Look for: `✅ Energy Loss Model loaded`

## Verification

After deployment completes, test:
```bash
curl https://vidyutai-ai-service.onrender.com/api/v1/predictions/battery-rul/dashboard
```

Should return JSON with `"success": true` (not 503).

## What Was Fixed

1. ✅ Updated `.gitignore` to allow model files in `ai-service/app/ml-models/`
2. ✅ Created script to easily add models to Git
3. ✅ Models will now be deployed to Render

## File Sizes
- Total: ~14MB (safe for Git, no LFS needed)
- Largest: battery_rul_model.joblib (12MB)
- Smallest: scalers (~4KB each)

## Expected Timeline
- Add to Git: 30 seconds
- Commit & Push: 1 minute
- Render Deployment: 5-10 minutes
- **Total: ~10 minutes**

