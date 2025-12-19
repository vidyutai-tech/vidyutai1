# 🎯 Deployment Cheat Sheet - Quick Reference

**Follow `DEPLOY_NOW.md` for detailed steps. This is just a quick reference.**

---

## 🔑 Things You Need First

1. **OpenAI API Key**: https://platform.openai.com/api-keys → Create key → Copy it
2. **2 Random Secrets**: https://www.lastpass.com/features/password-generator → Generate 2 passwords → Save them

---

## 🚀 Deployment Order

### 1️⃣ Backend (Render)
```
URL: https://dashboard.render.com
→ New + → Web Service
→ Connect GitHub repo

Settings:
Name: vidyutai-backend
Build: cd backend && npm install
Start: cd backend && node server.js
Plan: Free

Env Vars:
NODE_ENV=production
PORT=10000
JWT_SECRET=<your-random-secret-1>
```

**Save Backend URL:** `https://vidyutai-backend-xxxx.onrender.com`

---

### 2️⃣ AI Service (Render)
```
Same dashboard → New + → Web Service
→ Same GitHub repo

Settings:
Name: vidyutai-ai-service
Build: cd ai-service && pip install -r requirements.txt
Start: cd ai-service && uvicorn main:app --host 0.0.0.0 --port $PORT
Plan: Free

Env Vars:
PORT=10000
OPENAI_API_KEY=<your-openai-key>
SECRET_KEY=<your-random-secret-2>
```

**Save AI Service URL:** `https://vidyutai-ai-service-xxxx.onrender.com`

---

### 3️⃣ Connect Backend → AI Service
```
Render Dashboard → vidyutai-backend → Environment
→ Add: AI_SERVICE_URL=<ai-service-url>
→ Save (auto-redeploys)
```

---

### 4️⃣ Frontend (Vercel)
```
URL: https://vercel.com/dashboard
→ Add New → Project
→ Import GitHub repo

Settings:
Root Directory: frontend
Framework: Vite (auto)

Env Vars (BEFORE deploying):
VITE_API_BASE_URL=<backend-url>/api/v1
VITE_AI_BASE_URL=<ai-service-url>
```

**Save Frontend URL:** `https://your-app.vercel.app`

---

### 5️⃣ Connect Frontend → Backend
```
Render Dashboard → vidyutai-backend → Environment
→ Add:
FRONTEND_URL=<frontend-url>
CORS_ORIGIN=<frontend-url>
→ Save (auto-redeploys)
```

---

## ✅ Done! Your app is at: `<frontend-url>`

---

## 🔗 URL Format Reference

**Backend URL format:**
```
https://vidyutai-backend-xxxx.onrender.com
```

**AI Service URL format:**
```
https://vidyutai-ai-service-xxxx.onrender.com
```

**Frontend URL format:**
```
https://your-app.vercel.app
```

**Environment Variable Examples:**
```bash
# In Vercel (Frontend):
VITE_API_BASE_URL=https://vidyutai-backend-xxxx.onrender.com/api/v1
VITE_AI_BASE_URL=https://vidyutai-ai-service-xxxx.onrender.com

# In Render (Backend):
AI_SERVICE_URL=https://vidyutai-ai-service-xxxx.onrender.com
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app
```

---

## ⚠️ Important Notes

- Replace `xxxx` with your actual service ID
- Always include `https://` in URLs
- Wait 2-3 minutes between steps for deployments
- Free tier services sleep after 15 min (slow first request is normal)

