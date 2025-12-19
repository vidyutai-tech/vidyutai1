# Free Tier Deployment: Vercel + Render

This directory contains configuration files and guides for deploying VidyutAI on free tier hosting platforms.

## 📁 Files in this Directory

- **`render.yaml`** - Render.com configuration for backend and AI service
- **`DEPLOYMENT_GUIDE.md`** - Complete step-by-step deployment instructions
- **`QUICK_START.md`** - Condensed quick deployment guide
- **`ENV_TEMPLATE.md`** - Environment variable templates and examples
- **`README.md`** - This file

## 🚀 Quick Start

1. **Read the guides**:
   - New to deployment? Start with [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - Experienced? Jump to [QUICK_START.md](./QUICK_START.md)

2. **Set up environment variables**:
   - Use [ENV_TEMPLATE.md](./ENV_TEMPLATE.md) as reference
   - Fill in all required values

3. **Deploy**:
   - Backend & AI Service → Render (use `render.yaml` or manual setup)
   - Frontend → Vercel (manual setup via dashboard)

## 📋 Deployment Architecture

```
┌─────────────────┐
│   Frontend      │  Vercel (free tier)
│   (React/Vite)  │  https://your-app.vercel.app
└────────┬────────┘
         │
         │ VITE_API_BASE_URL
         │
┌────────▼────────┐
│   Backend       │  Render (free tier)
│   (Node.js)     │  https://backend.onrender.com
└────────┬────────┘
         │
         │ AI_SERVICE_URL
         │
┌────────▼────────┐
│   AI Service    │  Render (free tier)
│   (FastAPI)     │  https://ai-service.onrender.com
└─────────────────┘
```

## 🔧 Platforms

### Frontend: Vercel
- **Why**: Excellent free tier, automatic deployments, fast CDN
- **Free Tier**: Unlimited projects, 100GB bandwidth/month
- **Setup**: Manual via dashboard (see DEPLOYMENT_GUIDE.md)

### Backend: Render
- **Why**: Free tier web services, easy Python/Node.js support
- **Free Tier**: 750 hours/month (enough for 1-2 always-on services)
- **Setup**: Use `render.yaml` or manual via dashboard

### AI Service: Render
- **Why**: Same platform as backend, easy to connect
- **Free Tier**: 750 hours/month (shared with backend)
- **Setup**: Use `render.yaml` or manual via dashboard

## ⚠️ Free Tier Limitations

### Render Free Tier
- **Sleep Mode**: Services sleep after 15 minutes of inactivity
- **Cold Start**: First request after sleep takes 30-60 seconds
- **Build Time**: Limited build time (may timeout on large builds)
- **Bandwidth**: Shared across services

### Vercel Free Tier
- **Bandwidth**: 100GB/month
- **Build Time**: 45 minutes/month
- **Function Execution**: 100GB-hours/month

### Recommendations
- For production, consider paid tiers for always-on services
- Monitor usage to avoid hitting limits
- Consider upgrading if you need:
  - Always-on services (no sleep)
  - More bandwidth
  - Faster cold starts

## 📝 Next Steps

1. **Before deploying**:
   - [ ] Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - [ ] Prepare environment variables (see [ENV_TEMPLATE.md](./ENV_TEMPLATE.md))
   - [ ] Get OpenAI API key (for AI features)
   - [ ] Have GitHub repository ready

2. **Deploy**:
   - [ ] Deploy backend to Render
   - [ ] Deploy AI service to Render
   - [ ] Deploy frontend to Vercel
   - [ ] Update all environment variables
   - [ ] Verify all services are running

3. **After deployment**:
   - [ ] Test all endpoints
   - [ ] Monitor logs for errors
   - [ ] Set up monitoring/alerts (optional)
   - [ ] Document your URLs for reference

## 🆘 Need Help?

- **Deployment Issues**: Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section
- **Environment Variables**: See [ENV_TEMPLATE.md](./ENV_TEMPLATE.md)
- **Quick Reference**: See [QUICK_START.md](./QUICK_START.md)

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

