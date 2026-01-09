# Deployment Environment Variables - Quick Reference

## Your Deployment URLs

- **Frontend**: https://vidyutai.netlify.app/
- **Backend**: https://vidyutai-backend.onrender.com
- **AI Service**: https://vidyutai-ai-service.onrender.com

---

## Netlify Environment Variables

**Location**: Netlify Dashboard → Your Site → Site settings → Environment variables

### Required Variables

```
VITE_API_BASE_URL = https://vidyutai-backend.onrender.com/api/v1
```

**Important Notes:**
- ✅ Must include `/api/v1` at the end
- ✅ No trailing slash
- ⚠️ **Must redeploy** after setting (Vite env vars are embedded at build time)
- 🔄 To redeploy: Deploys tab → Trigger deploy → Deploy site

---

## Render Backend Environment Variables

**Location**: Render Dashboard → `vidyutai-backend` service → Environment tab

### Required Variables

```
FRONTEND_URL = https://vidyutai.netlify.app
AI_SERVICE_URL = https://vidyutai-ai-service.onrender.com
```

**Optional Variables** (if using database):
```
DATABASE_URL = your-neon-postgres-url
POSTGRES_URL = your-neon-postgres-url
JWT_SECRET = your-jwt-secret
NODE_ENV = production
```

**Important Notes:**
- ✅ No trailing slashes
- 🔄 Service will auto-restart after saving, or manually deploy

---

## Render AI Service Environment Variables

**Location**: Render Dashboard → `vidyutai-ai-service` service → Environment tab

### Optional Variables (CORS already allows all origins)

```
FRONTEND_URL = https://vidyutai.netlify.app
```

**Note**: The AI service already has CORS configured to allow all origins, so this is optional.

---

## Verification Steps

1. **Check Backend Health**:
   ```
   https://vidyutai-backend.onrender.com/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Check AI Service Health**:
   ```
   https://vidyutai-ai-service.onrender.com
   ```
   Should return: `{"service":"VidyutAI AI Service","status":"running",...}`

3. **Check Frontend API Calls**:
   - Open https://vidyutai.netlify.app/
   - Open Browser DevTools (F12) → Network tab
   - Try logging in or any POST action
   - ✅ Should see requests to: `vidyutai-backend.onrender.com/api/v1/...`
   - ❌ Wrong if seeing: `vidyutai.netlify.app/api/v1/...` (404)

---

## Common Issues & Fixes

### Issue: 404 on all POST requests
**Cause**: `VITE_API_BASE_URL` not set or incorrect on Netlify  
**Fix**: Set `VITE_API_BASE_URL = https://vidyutai-backend.onrender.com/api/v1` and redeploy Netlify

### Issue: CORS errors
**Cause**: `FRONTEND_URL` not set on Render backend  
**Fix**: Set `FRONTEND_URL = https://vidyutai.netlify.app` on Render backend and restart

### Issue: AI service calls failing
**Cause**: `AI_SERVICE_URL` not set on Render backend  
**Fix**: Set `AI_SERVICE_URL = https://vidyutai-ai-service.onrender.com` on Render backend

### Issue: Environment variable not working after setting
**Cause**: 
- Netlify: Must redeploy (Vite vars are build-time)
- Render: Service may need manual restart
**Fix**: 
- Netlify: Trigger new deploy
- Render: Click "Manual Deploy" or wait for auto-restart

---

## Quick Checklist

### Netlify
- [ ] `VITE_API_BASE_URL` = `https://vidyutai-backend.onrender.com/api/v1`
- [ ] Site redeployed after setting variable
- [ ] Build successful

### Render Backend
- [ ] `FRONTEND_URL` = `https://vidyutai.netlify.app`
- [ ] `AI_SERVICE_URL` = `https://vidyutai-ai-service.onrender.com`
- [ ] Service running and healthy

### Render AI Service
- [ ] Service running and healthy
- [ ] (Optional) `FRONTEND_URL` set if needed

### Testing
- [ ] Backend health check works
- [ ] AI service health check works
- [ ] Frontend can make API calls (check Network tab)
- [ ] POST requests work (login, forms, etc.)
- [ ] No CORS errors in console

