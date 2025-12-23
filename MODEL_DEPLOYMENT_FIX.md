# 503 Error Fix: Model Files Not Deployed

## Problem Identified

**Root Cause:** Model files (`.joblib`, `.keras`) are in `.gitignore`, so they're not committed to Git and therefore not deployed to Render.

**Evidence:**
- `.gitignore` line 278: `*.joblib` ignores all joblib files
- Endpoints return 503 when models don't exist:
  - Line 284: `raise HTTPException(status_code=503, detail="Battery RUL model not available")`
  - Line 323: `raise HTTPException(status_code=503, detail="Solar degradation model not available")`
  - Line 356: `raise HTTPException(status_code=503, detail="Energy loss model not available")`

**Render Logs Show:**
- Response time: 2-3ms (too fast = immediate failure)
- Status: 503 Service Unavailable
- Models missing in production

## Solution Applied

Updated `.gitignore` to allow model files in `ai-service/app/ml-models/`:

```gitignore
# Machine Learning Models
*.joblib  # Ignore all joblib files by default

# BUT allow models needed for production deployment
!ai-service/app/ml-models/*.joblib
!ai-service/app/ml-models/*.keras
!ai-service/app/ml-models/*.json
!ai-service/app/ml-models/*.txt
```

## Deployment Steps

### Step 1: Verify Files Are Now Trackable

```bash
git status ai-service/app/ml-models/
```

Should show model files as untracked (new files to add).

### Step 2: Add Model Files to Git

```bash
# Add all model files
git add ai-service/app/ml-models/*.joblib
git add ai-service/app/ml-models/*.keras
git add ai-service/app/ml-models/*.json
git add ai-service/app/ml-models/*.txt

# Or add entire directory (respects .gitignore)
git add ai-service/app/ml-models/
```

### Step 3: Commit and Push

```bash
git commit -m "Add ML model files for production deployment"
git push
```

### Step 4: Render Will Auto-Deploy

Render will automatically:
1. Pull the latest code
2. Include model files in deployment
3. Models will be available at runtime

### Step 5: Verify Deployment

After deployment, check Render logs:
- Should see: `✅ Battery RUL Model loaded`
- Should see: `✅ Solar Degradation Model loaded`
- Should see: `✅ Energy Loss Model loaded`

## Files That Need to Be Committed

Based on the project structure, these files should be in Git:

### Required Model Files:
- `ai-service/app/ml-models/battery_rul_model.joblib`
- `ai-service/app/ml-models/battery_rul_scaler.joblib`
- `ai-service/app/ml-models/battery_rul_metadata.json`
- `ai-service/app/ml-models/solar_degradation_model.joblib`
- `ai-service/app/ml-models/solar_degradation_scaler.joblib`
- `ai-service/app/ml-models/solar_degradation_metadata.json`
- `ai-service/app/ml-models/energy_loss_model.joblib`
- `ai-service/app/ml-models/energy_loss_scaler.joblib`
- `ai-service/app/ml-models/energy_loss_metadata.json`

### Optional (but recommended):
- `ai-service/app/ml-models/lstm_solar_forecast_model.keras`
- `ai-service/app/ml-models/lstm_solar_scaler.joblib`
- `ai-service/app/ml-models/*.json` (metadata files)
- `ai-service/app/ml-models/*.txt` (usage guides)

## Alternative: Git LFS (For Large Files)

If model files are very large (>100MB), consider using Git LFS:

```bash
# Install Git LFS
git lfs install

# Track large model files
git lfs track "*.joblib"
git lfs track "*.keras"

# Commit .gitattributes
git add .gitattributes

# Add models
git add ai-service/app/ml-models/*.joblib
git add ai-service/app/ml-models/*.keras
```

**Note:** Render supports Git LFS, but it requires additional configuration.

## Verify After Deployment

Test endpoints:
```bash
# Battery RUL
curl https://vidyutai-ai-service.onrender.com/api/v1/predictions/battery-rul/dashboard

# Solar Degradation
curl https://vidyutai-ai-service.onrender.com/api/v1/predictions/solar-degradation/dashboard

# Energy Loss
curl https://vidyutai-ai-service.onrender.com/api/v1/predictions/energy-loss/dashboard
```

Should return JSON with `"success": true` instead of 503 errors.

## Why This Happens

1. **Development vs Production:**
   - Local: Models exist in `ai-service/app/ml-models/`
   - Git: Models ignored by `.gitignore`
   - Render: Deploys from Git → No models → 503 errors

2. **Best Practice:**
   - Small models (<50MB): Commit to Git ✅
   - Large models (>50MB): Use Git LFS or external storage
   - Very large (>500MB): Store in S3/GCS, download on deploy

## File Size Considerations

Check model file sizes:
```bash
du -sh ai-service/app/ml-models/*.joblib
du -sh ai-service/app/ml-models/*.keras
```

If total size >100MB:
- Consider Git LFS
- Or external storage (S3, GCS)
- Or download models during Render build/deploy

## Expected Results

After deploying models:
- ✅ 503 errors → 200 OK
- ✅ Endpoints return prediction data
- ✅ Dashboard visualizations work
- ✅ Frontend can display results

## Troubleshooting

### If models still not found after deployment:

1. **Check Render build logs:**
   - Look for `ls -la ai-service/app/ml-models/`
   - Verify files are present

2. **Check Render runtime logs:**
   - Look for model loading messages
   - Check for FileNotFoundError

3. **Verify file paths:**
   - Models should be at: `app/ml-models/*.joblib`
   - Code expects: `_base_path / "ml-models"`

4. **Check file permissions:**
   - Render should have read access
   - Models should be readable by Python process

