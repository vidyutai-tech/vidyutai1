# Environment Variables Template

Copy these templates and fill in the values when setting up your deployment.

## 🔵 Backend (Render) - Environment Variables

Set these in Render dashboard → Your Backend Service → Environment:

```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# Security
JWT_SECRET=your-random-secret-here-generate-with-openssl-rand-base64-32
JWT_EXPIRE=24h

# Service URLs (set after deploying other services)
AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
FRONTEND_URL=https://your-frontend-name.vercel.app

# CORS (should match FRONTEND_URL)
CORS_ORIGIN=https://your-frontend-name.vercel.app
```

### How to Generate JWT_SECRET:
```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# Visit: https://www.lastpass.com/features/password-generator
# Generate a 32+ character random string
```

---

## 🐍 AI Service (Render) - Environment Variables

Set these in Render dashboard → Your AI Service → Environment:

```bash
# Server Configuration
PORT=10000
PYTHON_ENV=production
API_HOST=0.0.0.0

# AI API Key (REQUIRED for AI insights)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Security
SECRET_KEY=your-random-secret-here-generate-with-openssl-rand-base64-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=INFO
DEBUG=False

# Optional: Model Settings
MODEL_PATH=./app/ml-models
```

### How to Get OpenAI API Key:
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important**: Save it immediately, you can't view it again!

---

## 🎨 Frontend (Vercel) - Environment Variables

Set these in Vercel dashboard → Your Project → Settings → Environment Variables:

```bash
# Backend API URL (replace with your Render backend URL)
VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1

# AI Service URL (replace with your Render AI service URL)
VITE_AI_BASE_URL=https://vidyutai-ai-service.onrender.com
```

### Important Notes:
- These variables must start with `VITE_` to be accessible in the frontend
- After setting, you need to **redeploy** for changes to take effect
- Use the exact URLs from your Render services (without trailing slash)

---

## ✅ Verification Checklist

After setting all environment variables:

### Backend (Render)
- [ ] NODE_ENV is set to `production`
- [ ] PORT is set to `10000`
- [ ] JWT_SECRET is set (32+ character random string)
- [ ] AI_SERVICE_URL points to your AI service URL
- [ ] FRONTEND_URL points to your Vercel frontend URL
- [ ] CORS_ORIGIN matches FRONTEND_URL

### AI Service (Render)
- [ ] PORT is set to `10000`
- [ ] OPENAI_API_KEY is set (starts with `sk-`)
- [ ] SECRET_KEY is set (32+ character random string)
- [ ] PYTHON_ENV is set to `production`

### Frontend (Vercel)
- [ ] VITE_API_BASE_URL points to your backend URL (with `/api/v1`)
- [ ] VITE_AI_BASE_URL points to your AI service URL
- [ ] Both variables are set for "Production" environment
- [ ] Frontend has been redeployed after setting variables

---

## 🔍 Testing Environment Variables

### Test Backend:
```bash
curl https://your-backend.onrender.com/health
# Should return: {"status":"healthy",...}
```

### Test AI Service:
```bash
curl https://your-ai-service.onrender.com/health
# Should return: {"status":"ok"} or similar
```

### Test Frontend:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `console.log(import.meta.env)`
4. Check that `VITE_API_BASE_URL` and `VITE_AI_BASE_URL` are present

---

## 🔒 Security Notes

1. **Never commit secrets to Git**
   - All secrets should be set in hosting platform dashboards
   - Use `.env` files locally (and add them to `.gitignore`)

2. **Use strong, random secrets**
   - JWT_SECRET: 32+ characters
   - SECRET_KEY: 32+ characters
   - Don't reuse secrets across services

3. **Rotate secrets regularly**
   - Especially if compromised
   - Update in hosting dashboard and redeploy

4. **Protect OpenAI API Key**
   - Has billing access to your OpenAI account
   - Never share or expose in client-side code
   - Monitor usage in OpenAI dashboard

---

## 📝 Quick Reference

| Service | Platform | Default URL Pattern |
|---------|----------|---------------------|
| Frontend | Vercel | `https://project-name.vercel.app` |
| Backend | Render | `https://service-name.onrender.com` |
| AI Service | Render | `https://service-name.onrender.com` |

**Note**: Free tier Render services may have longer URLs with unique IDs.

