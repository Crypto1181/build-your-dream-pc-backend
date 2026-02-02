# 🔧 Production Build Not Working - Fix Guide

## Problem

Your website works locally but not in production build because:
- ❌ Backend API URL is hardcoded to `localhost:3001`
- ❌ Production build doesn't know where your backend is

## ✅ Solution

### Step 1: Create Production Environment File

Run this script:
```cmd
setup-production-env.bat
```

Or manually create `.env.production` file in `Tecttian source` folder:

```env
VITE_BACKEND_API_URL=https://your-backend-domain.com/api
```

**Important:** Replace with your actual backend URL!

### Step 2: Rebuild

After creating `.env.production`:
```cmd
npm run build
```

### Step 3: Test Build Locally

Before uploading, test the build:
```cmd
npm run preview
```

This will serve the production build locally so you can test it.

## 🎯 Backend URL Options

### Option 1: Backend on Same Domain
```env
VITE_BACKEND_API_URL=/api
```
Your backend would be at: `https://yourdomain.com/api`

### Option 2: Backend on Different Domain
```env
VITE_BACKEND_API_URL=https://api.yourdomain.com/api
```
Or:
```env
VITE_BACKEND_API_URL=https://your-backend-server.com/api
```

### Option 3: Backend on Subdomain
```env
VITE_BACKEND_API_URL=https://backend.yourdomain.com/api
```

## ⚠️ Important: Backend Must Be Deployed!

Your backend (Node.js server) must be deployed and accessible from the internet!

**Backend Deployment Options:**
1. **Same server** - Install Node.js on Hostinger
2. **Separate service** - Railway, Render, Heroku, etc.
3. **VPS** - Deploy both frontend and backend

## 🔍 Debugging

### Check Browser Console (F12)
Look for errors like:
- `Failed to fetch`
- `CORS error`
- `Network error`

### Check Network Tab
See what URL the frontend is trying to call.

### Common Issues

1. **Backend not deployed** → Deploy backend first
2. **Wrong URL** → Check `.env.production` file
3. **CORS error** → Update backend CORS settings
4. **404 errors** → Check backend is running

## ✅ After Fix

1. Create `.env.production` with correct backend URL
2. Rebuild: `npm run build`
3. Test locally: `npm run preview`
4. Upload `dist` folder to Hostinger
5. Verify website works!

Run `setup-production-env.bat` to get started! 🚀
