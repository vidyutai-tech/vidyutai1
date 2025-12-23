# Netlify Environment Variables Setup

The frontend needs to know where your backend API is located. You need to set the `VITE_API_BASE_URL` environment variable in Netlify.

## The Problem

Currently, when `VITE_API_BASE_URL` is not set, the frontend defaults to `/api/v1`, which means it tries to call:
- `https://vidyutai1.netlify.app/api/v1/auth/register` ❌ (doesn't exist)

Instead, it should call:
- `https://vidyutai-backend.onrender.com/api/v1/auth/register` ✅ (your Render backend)

## Solution: Set Environment Variable in Netlify

### Step 1: Get Your Backend URL

Your backend should be deployed on Render. The URL format is:
```
https://vidyutai-backend.onrender.com
```

**Important:** Make sure your backend is actually deployed and running on Render first!

### Step 2: Set Environment Variable in Netlify

1. Go to https://app.netlify.com
2. Select your site (`vidyutai1`)
3. Go to **Site settings** → **Environment variables**
4. Click **Add variable**
5. Add the following:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://vidyutai-backend.onrender.com/api/v1`
   - **Scopes:** Select "All scopes" (or "Production" if you only want it for production)

6. Click **Save**

### Step 3: Redeploy

After adding the environment variable:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Or wait for the next automatic deploy after you push a commit

### Step 4: Verify Backend is Deployed

Make sure your backend is deployed on Render:
1. Check Render dashboard: https://dashboard.render.com
2. Verify `vidyutai-backend` service is deployed and running
3. Test the backend health endpoint: `https://vidyutai-backend.onrender.com/health`

## Step 5: Configure CORS on Backend

Your backend needs to allow requests from your Netlify domain. Update environment variables in Render:

1. Go to Render dashboard → `vidyutai-backend` service
2. Go to **Environment** tab
3. Add/Update these environment variables:
   - `FRONTEND_URL`: `https://vidyutai1.netlify.app`
   - `CORS_ORIGIN`: `https://vidyutai1.netlify.app`
4. Restart the service if needed

## Step 6: Test

After setting everything up:
1. Visit your Netlify site: `https://vidyutai1.netlify.app`
2. Try to register a new account
3. Check browser console (F12) for any errors
4. The API calls should now go to: `https://vidyutai-backend.onrender.com/api/v1/auth/register`

## Troubleshooting

### Still getting 404 errors?

1. **Check environment variable is set:**
   - In Netlify, go to **Site settings** → **Environment variables**
   - Verify `VITE_API_BASE_URL` is there and correct
   - Make sure you've redeployed after adding it

2. **Check backend is running:**
   - Visit `https://vidyutai-backend.onrender.com/health`
   - Should return `{"status": "healthy", ...}`

3. **Check CORS:**
   - Open browser DevTools (F12) → Console
   - Look for CORS errors (like "Access to fetch at '...' from origin '...' has been blocked")
   - If you see CORS errors, update backend CORS settings in Render

4. **Check backend logs:**
   - In Render dashboard → `vidyutai-backend` → **Logs**
   - See if requests are arriving

### Environment Variable Not Working?

- Make sure variable name starts with `VITE_` (required for Vite)
- Redeploy the site after adding the variable
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Complete Environment Variables Checklist

### Netlify (Frontend):
- ✅ `VITE_API_BASE_URL`: `https://vidyutai-backend.onrender.com/api/v1`

### Render - Backend Service:
- ✅ `FRONTEND_URL`: `https://vidyutai1.netlify.app`
- ✅ `CORS_ORIGIN`: `https://vidyutai1.netlify.app`
- ✅ `AI_SERVICE_URL`: `https://vidyutai-ai-service.onrender.com`
- ✅ `DATABASE_URL`: (Your Neon DB connection string)
- ✅ `JWT_SECRET`: (Generate a random secret)

### Render - AI Service:
- ✅ `OPENAI_API_KEY`: (Your OpenAI API key)
- ✅ `SECRET_KEY`: (Generate a random secret)

