# Environment Variables Checklist

## Frontend (Netlify) - Required Variables

### ✅ Already Set (Based on what you mentioned):
- `VITE_API_BASE_URL` = `https://vidyutai-backend.onrender.com/api/v1`

### 🔍 Optional but Recommended:

**For Socket.IO real-time connections:**
- `VITE_SOCKET_URL` = `https://vidyutai-backend.onrender.com`
  - Used for WebSocket connections in `App.tsx`
  - If not set, defaults to `http://localhost:5001` (which won't work in production)
  - **Recommended to set this!**

**For direct AI service access (if needed):**
- `VITE_AI_BASE_URL` = `https://vidyutai-ai-service.onrender.com`
  - Only used if frontend needs to call AI service directly (rare)
  - Usually backend proxies these calls, so this is **optional**

## Frontend Environment Variables Summary

**Minimum Required (Already Set):**
```
VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
```

**Recommended (Add These):**
```
VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
VITE_SOCKET_URL=https://vidyutai-backend.onrender.com
```

**Optional:**
```
VITE_AI_BASE_URL=https://vidyutai-ai-service.onrender.com
```

---

## Backend (Render) - Required Variables

### ✅ Already Set (Based on what you mentioned):
- `FRONTEND_URL` = `https://vidyutai1.netlify.app`
- `CORS_ORIGIN` = `https://vidyutai1.netlify.app`

### 🔍 Also Required:
- `AI_SERVICE_URL` = `https://vidyutai-ai-service.onrender.com`
- `DATABASE_URL` = (Your Neon DB connection string)
- `JWT_SECRET` = (Random secret string for JWT tokens)
- `NODE_ENV` = `production` (usually set automatically)
- `PORT` = `10000` (usually set automatically by Render)

### Backend Environment Variables Summary

**Required:**
```
FRONTEND_URL=https://vidyutai1.netlify.app
CORS_ORIGIN=https://vidyutai1.netlify.app
AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
DATABASE_URL=<your-neon-db-connection-string>
JWT_SECRET=<your-random-secret-key>
NODE_ENV=production
PORT=10000
```

---

## AI Service (Render) - Required Variables

**Required:**
```
OPENAI_API_KEY=<your-openai-api-key>
SECRET_KEY=<your-random-secret-key>
PORT=10000
PYTHON_VERSION=3.11.11
```

---

## Quick Check: What You Might Be Missing

### Frontend (Netlify):
1. ✅ `VITE_API_BASE_URL` - **Already set**
2. ⚠️ `VITE_SOCKET_URL` - **Should add this** for Socket.IO to work properly

### Backend (Render):
1. ✅ `FRONTEND_URL` - **Already set**
2. ✅ `CORS_ORIGIN` - **Already set**
3. ⚠️ `AI_SERVICE_URL` - **Check if set**
4. ⚠️ `DATABASE_URL` - **Check if set** (Neon DB)
5. ⚠️ `JWT_SECRET` - **Check if set**

---

## How to Add Missing Variables

### Netlify (Frontend):
1. Go to https://app.netlify.com
2. Select site: **vidyutai1**
3. **Site settings** → **Environment variables**
4. Click **Add variable**
5. Add `VITE_SOCKET_URL` = `https://vidyutai-backend.onrender.com`
6. Click **Save**
7. **Trigger deploy** → **Deploy site**

### Render (Backend):
1. Go to https://dashboard.render.com
2. Select service: **vidyutai-backend**
3. **Environment** tab
4. Check/add:
   - `AI_SERVICE_URL` = `https://vidyutai-ai-service.onrender.com`
   - `DATABASE_URL` = (Your Neon DB connection string)
   - `JWT_SECRET` = (Generate a random secret, e.g., use: `openssl rand -hex 32`)
5. Click **Save Changes**

---

## Testing Checklist

After setting all variables:

1. ✅ Frontend loads without errors
2. ✅ Registration/Login works
3. ✅ API calls go to `vidyutai-backend.onrender.com`
4. ✅ Socket.IO connects (check browser console)
5. ✅ Data loads correctly
6. ✅ No CORS errors in console

