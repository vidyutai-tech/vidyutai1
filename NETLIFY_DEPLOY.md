# Netlify Deployment Guide for VidyutAI Frontend

This guide will help you deploy the VidyutAI frontend to Netlify.

## Prerequisites

1. A GitHub account with your repository pushed
2. A Netlify account (sign up at https://app.netlify.com if you don't have one)
3. Your frontend code committed and pushed to GitHub

## Step 1: Prepare Your Repository

Make sure you have:
- ✅ `netlify.toml` in the root directory (already created)
- ✅ Frontend code in the `frontend/` directory
- ✅ Code committed and pushed to GitHub

## Step 2: Connect Your Repository to Netlify

1. **Login to Netlify**
   - Go to https://app.netlify.com
   - Sign in with your GitHub account

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your GitHub repositories

3. **Select Your Repository**
   - Search for `vidyutai-tech/vidyutai1` (or your repository name)
   - Select the repository

4. **Configure Build Settings**
   Netlify should auto-detect the settings from `netlify.toml`, but verify:
   - **Base directory:** `frontend`
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `frontend/dist`

   If auto-detection doesn't work, manually set:
   ```
   Base directory: frontend
   Build command: npm install && npm run build
   Publish directory: dist
   ```

5. **Environment Variables (if needed)**
   - Go to "Site settings" → "Environment variables"
   - Add any required environment variables (e.g., `VITE_API_BASE_URL` if you use it)
   - For now, you can leave this empty if your API URLs are hardcoded

6. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete (usually 2-3 minutes)

## Step 3: Configure Site Settings

1. **Site Name**
   - Go to "Site settings" → "General" → "Site details"
   - Change the site name to something like `vidyutai-frontend` (or your preferred name)
   - Your site will be available at `https://your-site-name.netlify.app`

2. **Branch to Deploy**
   - Go to "Site settings" → "Build & deploy" → "Continuous Deployment"
   - Select the branch you want to deploy (usually `main` or `temp_deploy`)

## Step 4: Update Environment Variables (If Needed)

If your frontend needs environment variables (like API URLs):

1. Go to "Site settings" → "Environment variables"
2. Add variables:
   ```
   VITE_API_BASE_URL=https://vidyutai-backend.onrender.com
   ```
   (Replace with your actual backend URL)

## Step 5: Verify Deployment

1. Once deployment is complete, click on the site URL
2. You should see your VidyutAI frontend
3. Test navigation to ensure routing works correctly

## Troubleshooting

### 404 Errors on Routes
- Make sure `netlify.toml` has the redirect rule: `from = "/*" to = "/index.html" status = 200`
- This is already configured in the provided `netlify.toml`

### Build Fails
- Check build logs in Netlify dashboard
- Ensure Node.js version is correct (Netlify uses Node 18 by default)
- Make sure all dependencies are in `package.json`

### Cannot Find Module Errors
- Clear Netlify build cache: "Site settings" → "Build & deploy" → "Clear cache and retry deploy"

### API Connection Issues
- Make sure your backend URL is correct
- Check CORS settings on your backend to allow Netlify domain

## Next Steps

After successful deployment:
1. Update your backend CORS settings to include your Netlify URL
2. Test all features to ensure everything works
3. (Optional) Set up a custom domain if desired

## Support

If you encounter issues:
- Check Netlify build logs for error messages
- Verify `netlify.toml` syntax is correct
- Ensure all file paths in the configuration are correct

