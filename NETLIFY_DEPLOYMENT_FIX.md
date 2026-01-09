# Netlify Deployment Fix - 404 on POST API Calls

## Your Deployment URLs

- **Frontend**: https://vidyutai.netlify.app/
- **Backend**: https://vidyutai-backend.onrender.com
- **AI Service**: https://vidyutai-ai-service.onrender.com

## Problem
When deploying on Netlify (different account), POST API calls return 404 errors even though `FRONTEND_URL` is set on Render.

## Root Cause
The frontend defaults to relative paths (`/api/v1`) when `VITE_API_BASE_URL` is not set, causing API calls to go to Netlify instead of your Render backend.

## Solution

### Step 1: Set Environment Variables on Netlify

Go to **Netlify Dashboard** → Your site → **Site settings** → **Environment variables** → **Add variable**:

```
VITE_API_BASE_URL = https://vidyutai-backend.onrender.com/api/v1
```

**Important:** 
- No trailing slash
- Must include `/api/v1` at the end
- After adding, you **MUST redeploy** (Vite env vars are embedded at build time)

### Step 2: Set Environment Variables on Render (Backend Service)

Go to **Render Dashboard** → `vidyutai-backend` service → **Environment** tab and set:

```
FRONTEND_URL = https://vidyutai.netlify.app
AI_SERVICE_URL = https://vidyutai-ai-service.onrender.com
```

**Note:** Remove trailing slashes from URLs.

### Step 3: Set Environment Variables on Render (AI Service)

Go to **Render Dashboard** → `vidyutai-ai-service` service → **Environment** tab and set (if needed for CORS):

```
FRONTEND_URL = https://vidyutai.netlify.app
```

### Step 4: Redeploy

1. **Netlify**: 
   - After setting `VITE_API_BASE_URL`, go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site** (or push a commit)
   - Wait for build to complete

2. **Render Backend**: 
   - After setting environment variables, click **Manual Deploy** → **Deploy latest commit**
   - Or the service will auto-restart

3. **Render AI Service**: 
   - Restart if you added environment variables

## Verification

After deployment, open your site and check:

1. **Browser Console (F12)** → **Network tab**:
   - ✅ **Success**: API calls should go to `https://vidyutai-backend.onrender.com/api/v1/...`
   - ❌ **Failure**: API calls going to `https://vidyutai.netlify.app/api/v1/...` (404)

2. **Test a POST request**:
   - Try logging in or any POST action
   - Check Network tab to see the actual request URL

## Additional Notes

1. **CORS is now flexible**: The backend allows any `*.netlify.app` domain in production, so multiple Netlify accounts work without CORS issues.

2. **Environment Variable Naming**:
   - Netlify uses `VITE_` prefix for Vite environment variables
   - These are embedded at **build time**, so you **MUST rebuild** after changing them

3. **If still getting 404**:
   - Check browser Network tab to see the actual URL being called
   - Verify `VITE_API_BASE_URL` is set correctly (no trailing slash, includes `/api/v1`)
   - Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - Check Render backend logs to see if requests are reaching it
   - Verify backend service is running: https://vidyutai-backend.onrender.com/health

## Quick Checklist

### Netlify Configuration
- [ ] `VITE_API_BASE_URL` = `https://vidyutai-backend.onrender.com/api/v1` (no trailing slash)
- [ ] Site redeployed after setting environment variable
- [ ] Build completed successfully

### Render Backend Configuration
- [ ] `FRONTEND_URL` = `https://vidyutai.netlify.app` (no trailing slash)
- [ ] `AI_SERVICE_URL` = `https://vidyutai-ai-service.onrender.com` (no trailing slash)
- [ ] Service restarted after setting environment variables

### Render AI Service Configuration
- [ ] `FRONTEND_URL` = `https://vidyutai.netlify.app` (if needed for CORS)
- [ ] Service is running (check: https://vidyutai-ai-service.onrender.com)

### Verification
- [ ] Browser console shows API calls going to `vidyutai-backend.onrender.com` (not Netlify)
- [ ] POST requests are working (login, forms, etc.)
- [ ] No CORS errors in console

