# 🚀 Quick Deploy Guide

## Step 1: Build

Run this in the `Tecttian source` folder:

```cmd
build-for-production.bat
```

Or manually:
```cmd
npm run build
```

## Step 2: Upload to Hostinger

### What to Upload:
Upload **EVERYTHING** inside the `dist` folder to `public_html`:

```
dist/
├── index.html          ← Upload this
├── assets/            ← Upload this entire folder
├── favicon.ico        ← Upload this
├── robots.txt         ← Upload this
├── placeholder.svg    ← Upload this
└── .htaccess         ← Upload this (for routing)
```

### How to Upload:
1. Open File Manager in Hostinger
2. Go to `public_html`
3. Select ALL files and folders from `dist` folder
4. Upload them to `public_html`

## Step 3: Configure Backend URL

Before building, set your backend API URL in `.env.production`:

```env
VITE_BACKEND_API_URL=https://your-backend-domain.com/api
```

**Important:** Your backend must be deployed separately!

## ⚠️ Backend Deployment

Your backend (Node.js + Express) needs to be deployed too!

**Options:**
1. **Same server** - Install Node.js on Hostinger and run backend
2. **Separate service** - Use Railway, Render, or Heroku for backend
3. **VPS** - Get a VPS and deploy both frontend and backend

## ✅ After Upload

1. Visit your website
2. Check browser console (F12) - should be no errors
3. Test if products load
4. Verify API calls work

## 🎯 Summary

**Upload these files from `dist` folder:**
- ✅ All files and folders
- ✅ Make sure `.htaccess` is included
- ✅ Upload to `public_html` directory

That's it! 🎉
