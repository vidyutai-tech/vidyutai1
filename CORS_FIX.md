# CORS Error Fix

## Current Error

```
Access to fetch at 'https://vidyutai-backend.onrender.com/api/v1/auth/register' 
from origin 'https://vidyutai1.netlify.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present
```

## Problem

The backend CORS configuration is not allowing requests from `https://vidyutai1.netlify.app`.

## Solution

### Step 1: Verify Environment Variables in Render

Go to Render dashboard → `vidyutai-backend` → **Environment** tab

**Make sure these are set:**
```
FRONTEND_URL = https://vidyutai1.netlify.app
CORS_ORIGIN = https://vidyutai1.netlify.app
```

⚠️ **Important:**
- Use exact URL: `https://vidyutai1.netlify.app` (with `https://`, no trailing slash)
- Make sure there are NO extra spaces
- Case-sensitive (lowercase)

### Step 2: Check Backend CORS Code

The backend code in `backend/server.js` should handle CORS like this:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      "http://localhost:5173",
      "http://localhost:3000"
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
```

### Step 3: Restart Backend Service

After setting environment variables:
1. Go to Render dashboard
2. Click on `vidyutai-backend` service
3. Click **Manual Deploy** → **Deploy latest commit** (or just save env vars - it auto-restarts)

### Step 4: Verify CORS is Working

Test with curl:
```bash
curl -X OPTIONS https://vidyutai-backend.onrender.com/api/v1/auth/register \
  -H "Origin: https://vidyutai1.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Should return headers like:
```
Access-Control-Allow-Origin: https://vidyutai1.netlify.app
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Credentials: true
```

### Step 5: Check Render Logs

1. Go to Render dashboard → `vidyutai-backend` → **Logs** tab
2. Look for CORS-related errors
3. Check if environment variables are being read correctly

## Common Issues

### Issue 1: Environment variable not set
**Fix:** Set `FRONTEND_URL` and `CORS_ORIGIN` in Render dashboard

### Issue 2: Wrong URL format
**Fix:** Use exact URL: `https://vidyutai1.netlify.app` (no trailing slash, no http://)

### Issue 3: Service not restarted
**Fix:** Save environment variables (auto-restarts) or manually restart service

### Issue 4: Preflight requests failing
**Fix:** Make sure CORS middleware handles OPTIONS requests (usually automatic with `cors` package)

## Quick Fix Checklist

- [ ] `FRONTEND_URL` = `https://vidyutai1.netlify.app` (in Render)
- [ ] `CORS_ORIGIN` = `https://vidyutai1.netlify.app` (in Render)
- [ ] Backend service restarted after setting variables
- [ ] Check Render logs for any errors
- [ ] Test with curl to verify CORS headers

