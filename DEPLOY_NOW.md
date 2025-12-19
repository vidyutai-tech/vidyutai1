# 🚀 Deploy VidyutAI in 15 Minutes - Simple Guide

Follow these steps **in order**. Copy and paste where needed.

---

## 📋 BEFORE YOU START - Get These Ready

1. **OpenAI API Key** (for AI features):
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy it (starts with `sk-`)

2. **Generate 2 Random Secrets**:
   - Open: https://www.lastpass.com/features/password-generator
   - Generate 2 passwords (32+ characters each)
   - Save them somewhere (you'll need them)

---

## Step 1: Deploy Backend to Render (5 min)

1. **Go to**: https://dashboard.render.com

2. **Click**: "New +" button (top right) → "Web Service"

3. **Connect GitHub**:
   - Click "Connect account" if needed
   - Find your repository → Click "Connect"

4. **Fill in these EXACT values**:
   ```
   Name: vidyutai-backend
   Region: Oregon (or closest to you)
   Branch: main (or your main branch name)
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && node server.js
   Plan: Free
   ```

5. **Click "Advanced" → Add Environment Variables**:
   - Click "Add Environment Variable" for each:
   
   ```
   Key: NODE_ENV
   Value: production
   
   Key: PORT
   Value: 10000
   
   Key: JWT_SECRET
   Value: <paste your first random secret from step 1>
   ```

6. **Click "Create Web Service"**

7. **Wait 2-3 minutes** for deployment to finish

8. **Copy your backend URL** (looks like: `https://vidyutai-backend-xxxx.onrender.com`)
   - Save it somewhere, you'll need it!

✅ **Done with Backend!** Check it works: Click the URL you copied → Should see `{"message":"VidyutAI Backend API"...}`

---

## Step 2: Deploy AI Service to Render (5 min)

1. **Still on Render dashboard**, Click "New +" → "Web Service"

2. **Connect same GitHub repo** (if not already connected, select it)

3. **Fill in these EXACT values**:
   ```
   Name: vidyutai-ai-service
   Region: Oregon (same as backend)
   Branch: main (or your main branch name)
   Root Directory: (leave empty)
   Runtime: Python 3
   Build Command: cd ai-service && pip install -r requirements.txt
   Start Command: cd ai-service && uvicorn main:app --host 0.0.0.0 --port $PORT
   Plan: Free
   ```

4. **Click "Advanced" → Add Environment Variables**:
   ```
   Key: PORT
   Value: 10000
   
   Key: OPENAI_API_KEY
   Value: <paste your OpenAI API key from step 1>
   
   Key: SECRET_KEY
   Value: <paste your second random secret from step 1>
   ```

5. **Click "Create Web Service"**

6. **Wait 3-5 minutes** for deployment to finish

7. **Copy your AI service URL** (looks like: `https://vidyutai-ai-service-xxxx.onrender.com`)
   - Save it!

✅ **Done with AI Service!** Check it works: Click the URL → Add `/health` at the end → Should see `{"status":"healthy"}`

---

## Step 3: Update Backend with AI Service URL (1 min)

1. **Go back to Render dashboard** → Click on "vidyutai-backend" service

2. **Click "Environment" tab** (left sidebar)

3. **Add new environment variable**:
   ```
   Key: AI_SERVICE_URL
   Value: <paste your AI service URL from Step 2>
   ```
   (Replace `<paste your AI service URL>` with the actual URL you copied)

4. **Click "Save Changes"**

5. **Service will auto-redeploy** (wait 1-2 minutes)

✅ **Backend and AI Service are now connected!**

---

## Step 4: Deploy Frontend to Vercel (5 min)

1. **Go to**: https://vercel.com/dashboard

2. **Click**: "Add New..." button → "Project"

3. **Import your GitHub repo**:
   - Find your repository → Click "Import"

4. **Configure Project**:
   ```
   Project Name: vidyutai-frontend (or any name)
   Framework Preset: Vite (should auto-detect)
   Root Directory: frontend
   Build Command: npm run build (should be auto-filled)
   Output Directory: dist (should be auto-filled)
   Install Command: npm install (should be auto-filled)
   ```

5. **Click "Environment Variables"** (before clicking Deploy)

6. **Add these 2 environment variables**:
   
   Variable 1:
   ```
   Name: VITE_API_BASE_URL
   Value: <your-backend-url>/api/v1
   ```
   (Example: `https://vidyutai-backend-xxxx.onrender.com/api/v1`)
   
   Variable 2:
   ```
   Name: VITE_AI_BASE_URL
   Value: <your-ai-service-url>
   ```
   (Example: `https://vidyutai-ai-service-xxxx.onrender.com`)

   **Important**: Make sure both are set for "Production" environment (should be by default)

7. **Click "Deploy"**

8. **Wait 2-3 minutes** for deployment

9. **Copy your frontend URL** (looks like: `https://vidyutai-frontend.vercel.app`)
   - This is your main app URL! 🎉

✅ **Frontend is deployed!** But we need to connect it to backend...

---

## Step 5: Connect Frontend to Backend (2 min)

1. **Go back to Render dashboard** → Click on "vidyutai-backend" service

2. **Click "Environment" tab**

3. **Add these 2 environment variables**:
   ```
   Key: FRONTEND_URL
   Value: <paste your Vercel frontend URL from Step 4>
   
   Key: CORS_ORIGIN
   Value: <paste the same Vercel frontend URL>
   ```
   (Use the exact URL you copied, example: `https://vidyutai-frontend.vercel.app`)

4. **Click "Save Changes"**

5. **Wait 1-2 minutes** for redeployment

✅ **Everything is connected!**

---

## Step 6: Test Your Deployment 🎉

1. **Open your frontend URL** (the Vercel one) in a browser

2. **Check the browser console** (Press F12 → Console tab):
   - Should see no red errors
   - May see some warnings, that's OK

3. **Try logging in or navigating**:
   - If login page appears → Good!
   - If dashboard loads → Perfect! ✅

4. **If you see errors**:
   - Check that all URLs are correct (no typos)
   - Make sure all services are "Live" in Render/Vercel
   - Wait 1-2 more minutes (services might be starting)

---

## 🎯 Quick Checklist

- [ ] Backend deployed on Render
- [ ] AI Service deployed on Render  
- [ ] Backend has AI_SERVICE_URL set
- [ ] Frontend deployed on Vercel
- [ ] Frontend has VITE_API_BASE_URL and VITE_AI_BASE_URL set
- [ ] Backend has FRONTEND_URL and CORS_ORIGIN set
- [ ] All services show "Live" status
- [ ] Frontend loads without errors

---

## 🆘 Common Issues & Quick Fixes

### "Service is sleeping" message on Render
- **This is normal** for free tier
- Just wait 30-60 seconds, then refresh
- First request after sleep is slow (free tier limitation)

### CORS errors in browser console
- Check FRONTEND_URL and CORS_ORIGIN in backend match your Vercel URL exactly
- Make sure backend service is "Live"
- Wait 2 minutes and try again

### "Cannot connect" errors
- Check all URLs are correct (no typos, include https://)
- Make sure all environment variables are saved
- Wait a few minutes for services to fully start

### Frontend shows blank page
- Check browser console for errors
- Verify VITE_API_BASE_URL is correct format: `https://xxx.onrender.com/api/v1`
- Make sure frontend deployment completed successfully

---

## 📝 Your Deployment URLs (Save These!)

- **Frontend**: `https://your-frontend.vercel.app` ← **This is your main app URL!**
- **Backend**: `https://vidyutai-backend-xxxx.onrender.com`
- **AI Service**: `https://vidyutai-ai-service-xxxx.onrender.com`

---

## ✅ You're Done!

Your app is now live! Share your frontend URL with others.

**Remember**: Free tier services sleep after 15 minutes of inactivity. First request after sleep takes 30-60 seconds (this is normal).

---

**Need help?** Check the deployment logs in Render/Vercel dashboards for specific error messages.

