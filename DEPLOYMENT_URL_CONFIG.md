# Deployment URL Configuration Fix

## Problem
After deploying to Netlify/Render, the frontend was trying to connect to `localhost:8000` and `localhost:5001` instead of the production URLs, causing `ERR_CONNECTION_REFUSED` errors when accessing from other PCs.

## Root Cause
The code was using environment variables with `localhost` as fallback defaults. When environment variables weren't set in the deployment, it defaulted to localhost URLs.

## Solution Applied
Updated all API URL detection logic to:
1. **First check environment variables** (if set)
2. **Detect if running on localhost** → use localhost URLs
3. **Otherwise use production Render.com URLs**:
   - Backend: `https://vidyutai-backend.onrender.com/api/v1`
   - AI Service: `https://vidyutai-ai-service.onrender.com`

## Files Updated
1. `frontend/services/api.ts` - Updated `getApiBaseUrl()` and `getAiServiceUrl()`
2. `frontend/pages/PlanningWizardPageEnhanced.tsx` - Fixed AI service URL
3. `frontend/components/shared/MLAlertCard.tsx` - Fixed API base URL
4. `frontend/pages/PostLoginWizardPage.tsx` - Fixed API base URL

## Environment Variables (Optional)
While not required (code now auto-detects production), you can optionally set these in Netlify for explicit control:

### Netlify Environment Variables
Go to: **Site settings → Environment variables**

```
VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
VITE_AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
```

### Why Optional?
The code now automatically detects:
- **localhost** → Uses localhost URLs
- **Production (vidyutai1.netlify.app)** → Uses Render.com URLs

So environment variables are **optional** but can be used to override the defaults.

## Testing
After deployment:
1. ✅ Frontend should connect to `https://vidyutai-backend.onrender.com`
2. ✅ Planning wizard should connect to `https://vidyutai-ai-service.onrender.com`
3. ✅ No more `ERR_CONNECTION_REFUSED` errors
4. ✅ Works from any PC accessing the deployed site

## Current Production URLs
- **Frontend**: `https://vidyutai1.netlify.app`
- **Backend**: `https://vidyutai-backend.onrender.com`
- **AI Service**: `https://vidyutai-ai-service.onrender.com`

