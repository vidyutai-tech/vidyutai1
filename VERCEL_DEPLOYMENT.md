# Vercel Deployment Guide for VidyutAI Frontend

This guide will help you deploy the VidyutAI frontend to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Git repository with your code
3. Backend API URL (for environment variables)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Your Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository (GitHub, GitLab, or Bitbucket)

2. **Configure Project Settings**
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: Leave as root (`.`) - Vercel will use the `vercel.json` config
   - **Build Command**: `cd frontend && npm install && npm run build` (already in vercel.json)
   - **Output Directory**: `frontend/dist` (already in vercel.json)
   - **Install Command**: `cd frontend && npm install` (already in vercel.json)

3. **Set Environment Variables**
   Go to Project Settings → Environment Variables and add:

   ```
   VITE_API_BASE_URL=https://your-backend-url.com/api/v1
   VITE_SOCKET_URL=https://your-backend-url.com
   VITE_AI_BASE_URL=https://your-ai-service-url.com (optional)
   GEMINI_API_KEY=your-gemini-api-key (optional, for AI features)
   ```

   **Important**: 
   - Replace `your-backend-url.com` with your actual backend URL (e.g., Render, Railway, etc.)
   - Replace `your-ai-service-url.com` with your AI service URL if different from backend
   - Set these for **Production**, **Preview**, and **Development** environments as needed

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your frontend
   - You'll get a URL like `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Project Root**
   ```bash
   cd /path/to/vidyutai1
   ```

4. **Set Environment Variables** (create `.env.local` or use Vercel dashboard)
   ```bash
   # In project root
   vercel env add VITE_API_BASE_URL
   vercel env add VITE_SOCKET_URL
   vercel env add VITE_AI_BASE_URL  # optional
   vercel env add GEMINI_API_KEY    # optional
   ```

5. **Deploy**
   ```bash
   vercel --prod
   ```

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | Yes | `https://vidyutai-backend.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | WebSocket server URL | Yes | `https://vidyutai-backend.onrender.com` |
| `VITE_AI_BASE_URL` | AI service URL (if separate) | No | `https://vidyutai-ai.onrender.com` |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | No | `your-api-key-here` |

## Project Structure

Vercel is configured to:
- Build from the `frontend/` directory
- Output to `frontend/dist/`
- Serve the SPA with proper routing (all routes → `/index.html`)
- Cache static assets for optimal performance

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificates

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Every push to your main/master branch
- **Preview**: Every push to other branches (creates preview URLs)
- **Development**: Pull requests get preview deployments

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `frontend/package.json` has correct build script
- Check Vercel build logs for specific errors

### API Calls Fail
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings on your backend
- Ensure backend is accessible from Vercel's servers

### Routing Issues (404 on refresh)
- The `vercel.json` already includes SPA rewrites
- If issues persist, check that rewrites are working in Vercel dashboard

### Environment Variables Not Working
- Vercel requires environment variables to be set in the dashboard
- Variables prefixed with `VITE_` are exposed to the client
- Restart deployment after adding new variables

## Performance Optimization

Vercel automatically:
- ✅ CDN distribution globally
- ✅ Asset optimization and compression
- ✅ HTTP/2 and HTTP/3 support
- ✅ Automatic SSL certificates
- ✅ Edge caching for static assets

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)

