# Quick Start: Free Tier Deployment

This is a condensed version of the deployment guide. For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 🚀 Quick Deployment Steps

### 1. Backend on Render (5 minutes)

1. Go to https://dashboard.render.com → "New +" → "Web Service"
2. Connect GitHub repo
3. Configure:
   - **Name**: `vidyutai-backend`
   - **Environment**: `Node`
   - **Build**: `cd backend && npm install`
   - **Start**: `cd backend && node server.js`
   - **Plan**: `Free`
4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=<generate-random-32-char-string>
   ```
5. Deploy & copy URL: `https://vidyutai-backend.onrender.com`

---

### 2. AI Service on Render (5 minutes)

1. Render Dashboard → "New +" → "Web Service"
2. Same GitHub repo
3. Configure:
   - **Name**: `vidyutai-ai-service`
   - **Environment**: `Python 3`
   - **Build**: `cd ai-service && pip install -r requirements.txt`
   - **Start**: `cd ai-service && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Add Environment Variables:
   ```
   PORT=10000
   OPENAI_API_KEY=sk-your-key-here
   SECRET_KEY=<generate-random-32-char-string>
   ```
5. Deploy & copy URL: `https://vidyutai-ai-service.onrender.com`

6. **Update Backend**: Add to backend env vars:
   ```
   AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
   ```
   Redeploy backend.

---

### 3. Frontend on Vercel (5 minutes)

1. Go to https://vercel.com/dashboard → "Add New..." → "Project"
2. Import GitHub repo
3. Configure:
   - **Framework**: `Vite`
   - **Root Directory**: `frontend`
4. Add Environment Variables:
   ```
   VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
   VITE_AI_BASE_URL=https://vidyutai-ai-service.onrender.com
   ```
5. Deploy & copy URL: `https://your-project.vercel.app`

6. **Update Backend**: Add to backend env vars:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   CORS_ORIGIN=https://your-project.vercel.app
   ```
   Redeploy backend.

---

## ✅ Verify

1. **Backend**: `curl https://vidyutai-backend.onrender.com/health`
2. **AI Service**: `curl https://vidyutai-ai-service.onrender.com/health`
3. **Frontend**: Visit your Vercel URL in browser

---

## 📝 Environment Variables Cheat Sheet

### Backend (Render)
```
NODE_ENV=production
PORT=10000
JWT_SECRET=<random-secret>
AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app
```

### AI Service (Render)
```
PORT=10000
OPENAI_API_KEY=sk-your-key
SECRET_KEY=<random-secret>
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
VITE_AI_BASE_URL=https://vidyutai-ai-service.onrender.com
```

---

## ⚠️ Important Notes

1. **Generate Secrets**: Use `openssl rand -base64 32` or online generator
2. **Get OpenAI Key**: https://platform.openai.com/api-keys
3. **Free Tier**: Services sleep after 15min inactivity (slow first request)
4. **Order Matters**: Deploy backend → AI service → frontend → update URLs

---

## 🆘 Issues?

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed troubleshooting.

