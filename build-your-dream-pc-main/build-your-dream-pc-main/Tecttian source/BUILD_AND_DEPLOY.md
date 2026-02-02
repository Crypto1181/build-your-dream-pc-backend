# 🚀 Build and Deploy Guide

## Step 1: Build for Production

Navigate to the frontend directory and build:

```cmd
cd "Tecttian source"
npm run build
```

This will create a `dist` folder with all production files.

## Step 2: Configure Backend API URL

Before building, create a `.env.production` file in `Tecttian source` folder:

```env
VITE_BACKEND_API_URL=https://your-backend-domain.com/api
```

**Important:** Replace `your-backend-domain.com` with your actual backend server URL.

If your backend is on the same domain:
```env
VITE_BACKEND_API_URL=/api
```

## Step 3: Files to Upload to Hostinger

Upload **ALL contents** from the `dist` folder to your `public_html` directory:

### Files/Folders to Upload:
- ✅ `index.html`
- ✅ `assets/` folder (contains all JS, CSS, images)
- ✅ `favicon.ico`
- ✅ `robots.txt`
- ✅ `placeholder.svg`
- ✅ Any other files in `dist/`

### What NOT to Upload:
- ❌ `node_modules/` folder
- ❌ `src/` folder
- ❌ `package.json`
- ❌ Any `.ts` or `.tsx` files
- ❌ `vite.config.ts`

## Step 4: Upload Process

1. **Build the project:**
   ```cmd
   npm run build
   ```

2. **Open the `dist` folder**

3. **Select ALL files and folders inside `dist`**

4. **Upload to Hostinger `public_html` directory**

5. **Make sure `.htaccess` is uploaded** (for routing)

## Step 5: Verify Deployment

After uploading:
1. Visit your website URL
2. Check browser console (F12) for errors
3. Test product loading
4. Verify API calls are working

## ⚠️ Important Notes

### Backend Deployment

Your backend needs to be deployed separately! The frontend is just the UI.

**Backend Options:**
1. **Same server** - Deploy backend on same domain (e.g., `yourdomain.com/api`)
2. **Separate server** - Deploy backend on different domain/subdomain
3. **Cloud hosting** - Use services like Railway, Render, or Heroku

### Environment Variables

Make sure your backend `.env` file has:
- Database connection
- WooCommerce API keys
- CORS origin set to your frontend domain

## 🎯 Quick Build Script

I'll create a batch file to automate this!
