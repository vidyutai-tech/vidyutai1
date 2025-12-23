# Quick Fix: Netlify 404 Errors

## Problem
Frontend is calling `vidyutai1.netlify.app/api/v1/...` instead of `vidyutai-backend.onrender.com/api/v1/...`

## Solution (2 Steps)

### Step 1: Set Environment Variable in Netlify (5 minutes)

1. Go to https://app.netlify.com
2. Click on your site: **vidyutai1**
3. Go to **Site settings** → **Environment variables** (left sidebar)
4. Click **Add variable** button
5. Fill in:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://vidyutai-backend.onrender.com/api/v1`
   - **Scopes:** Select "All scopes" (or just "Production")
6. Click **Save**

7. **Trigger a new deploy:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Wait 2-3 minutes for rebuild

### Step 2: Configure CORS on Render Backend (5 minutes)

1. Go to https://dashboard.render.com
2. Click on **vidyutai-backend** service
3. Go to **Environment** tab (left sidebar)
4. Add/Update these environment variables:

   **Variable 1:**
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://vidyutai1.netlify.app`
   
   **Variable 2:**
   - **Key:** `CORS_ORIGIN`
   - **Value:** `https://vidyutai1.netlify.app`

5. Click **Save Changes**
6. Render will automatically restart the service

### Step 3: Verify (2 minutes)

1. Wait for Netlify deploy to finish (check Deploys tab)
2. Visit your site: https://vidyutai1.netlify.app
3. Open browser DevTools (F12) → Console tab
4. Try to register/login
5. Check console - should now show requests to:
   ```
   https://vidyutai-backend.onrender.com/api/v1/auth/register ✅
   ```
   Instead of:
   ```
   https://vidyutai1.netlify.app/api/v1/auth/register ❌
   ```

## Optional: Verify Backend is Working

Test your backend directly:
- Health check: https://vidyutai-backend.onrender.com/health
- Should return: `{"status": "healthy", ...}`

## Troubleshooting

### Still getting 404?
- ✅ Check Netlify environment variable is set correctly
- ✅ Make sure you triggered a new deploy after adding the variable
- ✅ Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Getting CORS errors?
- ✅ Check Render backend has `FRONTEND_URL` and `CORS_ORIGIN` set
- ✅ Verify backend service restarted (check Render logs)
- ✅ Make sure URLs match exactly (https://, no trailing slashes)

### Backend not responding?
- ✅ Check Render dashboard - service should show "Live"
- ✅ Check Render logs for any errors
- ✅ Verify `/health` endpoint works: https://vidyutai-backend.onrender.com/health

## Summary

**Netlify Environment Variable:**
```
VITE_API_BASE_URL = https://vidyutai-backend.onrender.com/api/v1
```

**Render Backend Environment Variables:**
```
FRONTEND_URL = https://vidyutai1.netlify.app
CORS_ORIGIN = https://vidyutai1.netlify.app
AI_SERVICE_URL = https://vidyutai-ai-service.onrender.com
DATABASE_URL = (your Neon DB connection string)
JWT_SECRET = (your secret key)
```

After these steps, your frontend will correctly communicate with your Render backend! 🎉

