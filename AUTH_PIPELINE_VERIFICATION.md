# Authentication Pipeline Verification

## Complete Flow: Frontend → Backend → Database

### Step 1: Frontend (Netlify) ✅
**Location:** `vidyutai1.netlify.app`

**What it does:**
- User fills registration/login form
- Frontend calls API endpoint

**Required Environment Variable:**
```
VITE_API_BASE_URL = https://vidyutai-backend.onrender.com/api/v1
```

**Expected API Call:**
```
POST https://vidyutai-backend.onrender.com/api/v1/auth/register
POST https://vidyutai-backend.onrender.com/api/v1/auth/token
```

**Current Issue:**
- Console shows: `POST https://vidyutai1.netlify.app/api/v1/auth/register 404`
- This means `VITE_API_BASE_URL` is NOT being used (or site wasn't redeployed)

---

### Step 2: Backend (Render) ✅
**Location:** `vidyutai-backend.onrender.com`

**What it does:**
- Receives auth requests at `/api/v1/auth/register` and `/api/v1/auth/token`
- Routes defined in: `backend/routes/auth.js`
- Mounted in: `backend/server.js` line 123: `app.use('/api/v1/auth', authRoutes)`

**Required Environment Variables:**
```
DATABASE_URL = <your-neon-db-connection-string>
FRONTEND_URL = https://vidyutai1.netlify.app
CORS_ORIGIN = https://vidyutai1.netlify.app
AI_SERVICE_URL = https://vidyutai-ai-service.onrender.com
JWT_SECRET = <random-secret>
NODE_ENV = production
PORT = 10000
```

**Backend Endpoints:**
- `POST /api/v1/auth/register` - Creates new user
- `POST /api/v1/auth/token` - Login (returns JWT token)
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

---

### Step 3: Database (Neon PostgreSQL) ✅
**Location:** Your Neon database

**What it does:**
- Stores user data in `users` table
- Backend uses `db-adapter.js` which auto-detects PostgreSQL if `DATABASE_URL` is set

**Database Schema:**
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Connection:**
- Backend checks for `DATABASE_URL` environment variable
- If set, uses PostgreSQL (Neon)
- If not set, falls back to SQLite (won't work on Render)

---

## Troubleshooting Steps

### Issue: Still getting 404 on Netlify domain

**Problem:** Frontend is calling `vidyutai1.netlify.app/api/v1/...` instead of `vidyutai-backend.onrender.com/api/v1/...`

**Solution:**

1. **Verify Environment Variable in Netlify:**
   - Go to: https://app.netlify.com
   - Select site: **vidyutai1**
   - **Site settings** → **Environment variables**
   - Check that `VITE_API_BASE_URL` exists and value is:
     ```
     https://vidyutai-backend.onrender.com/api/v1
     ```
   - ⚠️ **Important:** Make sure there are NO trailing slashes
   - ⚠️ **Important:** Make sure it starts with `https://` (not `http://`)

2. **Clear Build Cache and Redeploy:**
   - In Netlify, go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for build to complete (2-3 minutes)

3. **Verify Build Logs:**
   - Check Netlify build logs
   - Look for environment variables being loaded
   - Should see: `VITE_API_BASE_URL` in the build

4. **Test in Browser:**
   - Open DevTools (F12) → Console
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Try registration again
   - Check Network tab - should see requests to `vidyutai-backend.onrender.com`

---

### Issue: Backend not responding

**Problem:** Backend returns 500 or connection errors

**Solution:**

1. **Check Backend Health:**
   ```
   https://vidyutai-backend.onrender.com/health
   ```
   Should return: `{"status": "healthy", ...}`

2. **Verify Environment Variables in Render:**
   - Go to: https://dashboard.render.com
   - Select: **vidyutai-backend** service
   - **Environment** tab
   - Verify all required variables are set (see list above)

3. **Check Render Logs:**
   - In Render dashboard → **Logs** tab
   - Look for database connection errors
   - Look for CORS errors
   - Look for missing environment variable errors

4. **Test Backend Directly:**
   ```bash
   curl -X POST https://vidyutai-backend.onrender.com/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
   ```
   Should return JSON response (not 404)

---

### Issue: Database connection errors

**Problem:** Backend can't connect to Neon database

**Solution:**

1. **Verify DATABASE_URL in Render:**
   - Format should be:
     ```
     postgresql://user:password@host.neon.tech/dbname?sslmode=require
     ```
   - Get connection string from Neon dashboard

2. **Check Neon Database:**
   - Go to Neon dashboard
   - Verify database is active
   - Check connection string is correct
   - Test connection from Neon dashboard

3. **Check Render Logs:**
   - Look for PostgreSQL connection errors
   - Common errors:
     - "Connection timeout" → Check DATABASE_URL
     - "SSL required" → Add `?sslmode=require` to connection string
     - "Authentication failed" → Check username/password

---

## Complete Checklist

### Frontend (Netlify):
- [ ] `VITE_API_BASE_URL` = `https://vidyutai-backend.onrender.com/api/v1`
- [ ] `VITE_SOCKET_URL` = `https://vidyutai-backend.onrender.com` (optional but recommended)
- [ ] Site redeployed after setting variables
- [ ] Build cache cleared
- [ ] Browser cache cleared (hard refresh)

### Backend (Render):
- [ ] `DATABASE_URL` = (Neon DB connection string)
- [ ] `FRONTEND_URL` = `https://vidyutai1.netlify.app`
- [ ] `CORS_ORIGIN` = `https://vidyutai1.netlify.app`
- [ ] `AI_SERVICE_URL` = `https://vidyutai-ai-service.onrender.com`
- [ ] `JWT_SECRET` = (random secret string)
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] Service is "Live" in Render dashboard
- [ ] `/health` endpoint returns 200

### Database (Neon):
- [ ] Database is active
- [ ] Connection string is correct
- [ ] `users` table exists (created automatically on first request)
- [ ] Can connect from Neon dashboard

---

## Quick Test Commands

### Test Backend Health:
```bash
curl https://vidyutai-backend.onrender.com/health
```

### Test Registration Endpoint:
```bash
curl -X POST https://vidyutai-backend.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### Test Login Endpoint:
```bash
curl -X POST https://vidyutai-backend.onrender.com/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"test123"}'
```

---

## Expected Flow

1. **User fills form** → Frontend (Netlify)
2. **Frontend calls API** → `POST https://vidyutai-backend.onrender.com/api/v1/auth/register`
3. **Backend receives request** → `backend/routes/auth.js` → `router.post('/register')`
4. **Backend connects to DB** → `db-adapter.js` → Uses `DATABASE_URL` → Connects to Neon PostgreSQL
5. **Backend creates user** → `UserModel.create()` → Inserts into `users` table
6. **Backend returns response** → JSON with `access_token` and `user` object
7. **Frontend receives response** → Stores token in localStorage → Redirects to dashboard

---

## Common Issues & Fixes

### Issue: "404 Not Found" on Netlify domain
**Fix:** Set `VITE_API_BASE_URL` in Netlify and redeploy

### Issue: "CORS error" in browser
**Fix:** Set `FRONTEND_URL` and `CORS_ORIGIN` in Render backend

### Issue: "Database connection failed"
**Fix:** Set `DATABASE_URL` in Render backend with correct Neon connection string

### Issue: "500 Internal Server Error"
**Fix:** Check Render logs for specific error, usually missing environment variable

