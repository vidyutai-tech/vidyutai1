# Free Tier Deployment Guide: Vercel + Render

This guide walks you through deploying VidyutAI on free tier hosting:
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)
- **AI Service**: Render (free tier)

## 📋 Prerequisites

1. **GitHub Account** (to host your code)
2. **Vercel Account** (sign up at https://vercel.com)
3. **Render Account** (sign up at https://render.com)
4. **OpenAI API Key** (for AI insights - get from https://platform.openai.com/api-keys)

## 🚀 Step-by-Step Deployment

### Part 1: Deploy Backend to Render

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to Render Dashboard**: https://dashboard.render.com

3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your code

4. **Configure Backend Service**:
   - **Name**: `vidyutai-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
   - **Plan**: `Free`

5. **Set Environment Variables** (in Render dashboard):
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=<generate-a-random-secret-here>
   ```
   - Generate JWT_SECRET: `openssl rand -base64 32` or use an online generator
   - **Don't set AI_SERVICE_URL yet** - we'll set it after deploying AI service
   - **Don't set FRONTEND_URL yet** - we'll set it after deploying frontend

6. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the service URL (e.g., `https://vidyutai-backend.onrender.com`)

7. **Update Health Check**:
   - In Render dashboard, go to Settings → Health Check
   - Set Path: `/health`
   - Save

---

### Part 2: Deploy AI Service to Render

1. **Create Another Web Service in Render**:
   - Click "New +" → "Web Service"
   - Select the same GitHub repository

2. **Configure AI Service**:
   - **Name**: `vidyutai-ai-service`
   - **Environment**: `Python 3`
   - **Build Command**: `cd ai-service && pip install -r requirements.txt`
   - **Start Command**: `cd ai-service && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`

3. **Set Environment Variables**:
   ```
   PORT=10000
   OPENAI_API_KEY=<your-openai-api-key>
   SECRET_KEY=<generate-a-random-secret-here>
   PYTHON_ENV=production
   ```

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the service URL (e.g., `https://vidyutai-ai-service.onrender.com`)

5. **Update Health Check**:
   - Set Path: `/health`
   - Save

6. **Update Backend AI_SERVICE_URL**:
   - Go back to `vidyutai-backend` service in Render
   - Settings → Environment → Add:
     ```
     AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
     ```
   - Save and Redeploy

---

### Part 3: Deploy Frontend to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (if your frontend is in a subdirectory)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)

4. **Set Environment Variables** (in Vercel dashboard):
   ```
   VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
   VITE_AI_BASE_URL=https://vidyutai-ai-service.onrender.com
   ```
   - Go to Project Settings → Environment Variables
   - Add both variables
   - Make sure they're set for "Production"

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your frontend URL (e.g., `https://vidyutai-frontend.vercel.app`)

---

### Part 4: Update Backend CORS Settings

1. **Update Backend Environment Variables** (in Render):
   - Go to `vidyutai-backend` → Settings → Environment
   - Add/Update:
     ```
     FRONTEND_URL=https://your-frontend-url.vercel.app
     CORS_ORIGIN=https://your-frontend-url.vercel.app
     ```
   - Replace with your actual Vercel frontend URL
   - Save and Redeploy

2. **Verify CORS in Backend Code** (if needed):
   - The backend should already have CORS middleware
   - If you see CORS errors, check `backend/server.js` and update the CORS origins

---

### Part 5: Verify Deployment

1. **Test Backend Health**:
   ```bash
   curl https://vidyutai-backend.onrender.com/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Test AI Service Health**:
   ```bash
   curl https://vidyutai-ai-service.onrender.com/health
   ```
   Should return: `{"status":"ok"}` or similar

3. **Test Frontend**:
   - Visit your Vercel frontend URL
   - Check browser console for any errors
   - Try logging in or viewing dashboard

---

## 🔧 Troubleshooting

### Backend Issues

**Service keeps restarting:**
- Check logs in Render dashboard
- Verify PORT is set to 10000
- Check that database initialization isn't blocking

**CORS errors:**
- Verify FRONTEND_URL and CORS_ORIGIN are set correctly
- Check that they match your Vercel frontend URL exactly
- Include protocol (https://)

**AI Service connection failed:**
- Verify AI_SERVICE_URL in backend environment variables
- Check that AI service URL is accessible (test with curl)
- Ensure AI service is deployed and running

### AI Service Issues

**Import errors:**
- Check that all dependencies are in `requirements.txt`
- Verify Python version (Render should auto-detect, but check if needed)

**Health check failing:**
- Verify `/health` endpoint exists in `ai-service/main.py`
- Check logs for startup errors

**OpenAI API errors:**
- Verify OPENAI_API_KEY is set correctly
- Check OpenAI API key has credits/quota
- Review logs for specific error messages

### Frontend Issues

**404 on page refresh:**
- Vercel should handle this with the `vercel.json` rewrites
- Verify `vercel.json` exists in frontend directory

**API connection errors:**
- Check VITE_API_BASE_URL is set correctly
- Verify backend URL is accessible
- Check browser console for CORS errors

**Build errors:**
- Check Vercel build logs
- Verify all environment variables are set
- Try building locally first: `cd frontend && npm run build`

### Render Free Tier Limitations

**Services spin down after inactivity:**
- Free tier services on Render sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Consider upgrading to paid tier for always-on services

**Build timeouts:**
- Free tier has limited build time
- If builds timeout, optimize dependencies or consider paid tier

---

## 📝 Environment Variables Summary

### Backend (Render)
```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=<random-secret>
AI_SERVICE_URL=https://vidyutai-ai-service.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app
```

### AI Service (Render)
```bash
PORT=10000
OPENAI_API_KEY=<your-openai-key>
SECRET_KEY=<random-secret>
PYTHON_ENV=production
```

### Frontend (Vercel)
```bash
VITE_API_BASE_URL=https://vidyutai-backend.onrender.com/api/v1
VITE_AI_BASE_URL=https://vidyutai-ai-service.onrender.com
```

---

## 🔄 Updating Deployments

### Backend/AI Service Updates
1. Push changes to GitHub
2. Render automatically detects changes and redeploys
3. Check deployment logs in Render dashboard

### Frontend Updates
1. Push changes to GitHub
2. Vercel automatically detects changes and redeploys
3. Check deployment logs in Vercel dashboard

---

## 🎉 You're Done!

Your application should now be live:
- Frontend: `https://your-frontend.vercel.app`
- Backend: `https://vidyutai-backend.onrender.com`
- AI Service: `https://vidyutai-ai-service.onrender.com`

Remember:
- Free tier services may sleep after inactivity
- First request after sleep will be slow
- Monitor usage to avoid hitting free tier limits

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

