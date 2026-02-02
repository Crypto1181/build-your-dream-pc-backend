# 🚀 Complete Deployment Guide - Frontend + Backend

## 📋 Overview

You have **TWO parts** to deploy:
1. **Frontend** (React/Vite) → Upload to **Hostinger**
2. **Backend** (Node.js/Express) → Deploy separately (Hostinger may not support Node.js)

---

## 🎯 Step 1: Deploy Backend First

### ⚠️ Important: Backend Must Be Deployed Before Frontend!

Your backend is a **Node.js server** that needs to run 24/7. Hostinger shared hosting typically **doesn't support Node.js**, so you have options:

### Option A: Deploy Backend to Cloud Service (Recommended)

**Best Options:**
1. **Railway** (https://railway.app) - Easy, free tier available
2. **Render** (https://render.com) - Free tier available
3. **Heroku** - Paid but reliable
4. **DigitalOcean App Platform** - Good pricing

**Steps:**
1. Create account on Railway/Render
2. Connect your GitHub repo (or upload backend folder)
3. Set environment variables (DATABASE_URL, WooCommerce keys, etc.)
4. Deploy!
5. Get your backend URL (e.g., `https://your-backend.railway.app`)

### Option B: Deploy Backend to VPS

If you have a VPS:
1. Install Node.js and PostgreSQL
2. Upload backend files
3. Run `npm install`
4. Set up PM2 to keep it running
5. Configure domain/subdomain

### Option C: Use Hostinger VPS (If Available)

If Hostinger offers VPS hosting:
1. Install Node.js
2. Upload backend files
3. Set up as service

---

## 🎯 Step 2: Configure Frontend for Production

### Step 2.1: Create `.env.production` File

**Location:** `Tecttian source/.env.production`

**Content:**
```env
VITE_BACKEND_API_URL=https://your-backend-url.com/api
```

**Replace with your actual backend URL:**
- If backend on Railway: `https://your-app.railway.app/api`
- If backend on Render: `https://your-app.onrender.com/api`
- If backend on subdomain: `https://api.yourdomain.com/api`

### Step 2.2: Build Frontend

```cmd
cd "build-your-dream-pc-main\build-your-dream-pc-main\Tecttian source"
npm run build
```

This creates the `dist` folder with production files.

### Step 2.3: Test Build Locally (Optional)

```cmd
npm run preview
```

Visit `http://localhost:4173` to test the production build.

---

## 🎯 Step 3: Upload to Hostinger

### Files to Upload:

**Upload ONLY the `dist` folder contents:**

```
Tecttian source/dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── .htaccess
```

### Upload Steps:

1. **Login to Hostinger** File Manager or use FTP
2. **Navigate to** `public_html` (or your domain folder)
3. **Delete old files** (if any)
4. **Upload all files** from `dist` folder
5. **Make sure `.htaccess` is uploaded** (it's hidden, enable "Show hidden files")

### Important Files:

- ✅ `index.html` - Main entry point
- ✅ `assets/` folder - All JS/CSS files
- ✅ `.htaccess` - For routing (must be in root)

---

## 🔧 Backend Configuration for Production

### Environment Variables Needed:

When deploying backend, set these:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/pc_builder_db

# WooCommerce API
WOOCOMMERCE_SITE1_URL=https://your-woocommerce-site.com
WOOCOMMERCE_SITE1_KEY=your-consumer-key
WOOCOMMERCE_SITE1_SECRET=your-consumer-secret

# Server
PORT=3001
NODE_ENV=production

# CORS (Important!)
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Update Backend CORS:

In `backend/src/index.ts`, make sure CORS allows your frontend domain:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  credentials: true
}));
```

---

## ✅ Deployment Checklist

### Backend:
- [ ] Backend deployed to cloud service/VPS
- [ ] Environment variables set
- [ ] Database connected
- [ ] Products synced
- [ ] CORS configured for frontend domain
- [ ] Backend URL obtained (e.g., `https://api.yourdomain.com`)

### Frontend:
- [ ] `.env.production` created with backend URL
- [ ] `npm run build` completed successfully
- [ ] `dist` folder contains all files
- [ ] `.htaccess` file in `dist` folder
- [ ] Files uploaded to Hostinger
- [ ] `.htaccess` uploaded (show hidden files)

### Testing:
- [ ] Frontend loads at your domain
- [ ] Backend API accessible (test: `https://your-backend.com/health`)
- [ ] Products load on frontend
- [ ] Categories work
- [ ] No CORS errors in browser console

---

## 🐛 Troubleshooting

### Problem: Frontend shows "Failed to fetch"

**Solution:**
- Check backend is running
- Check `.env.production` has correct backend URL
- Check CORS settings in backend

### Problem: Products not loading

**Solution:**
- Check backend logs
- Verify database connection
- Check if products are synced

### Problem: CORS errors

**Solution:**
- Update backend CORS to allow your frontend domain
- Check `ALLOWED_ORIGINS` environment variable

### Problem: 404 errors on page refresh

**Solution:**
- Make sure `.htaccess` is uploaded
- Check `.htaccess` content is correct

---

## 📝 Quick Summary

1. **Deploy backend** to Railway/Render/VPS → Get backend URL
2. **Create `.env.production`** with backend URL
3. **Run `npm run build`** in frontend
4. **Upload `dist` folder** to Hostinger
5. **Test** your website!

---

## 🎯 Next Steps

1. Choose backend hosting (Railway recommended)
2. Deploy backend
3. Get backend URL
4. Update `.env.production`
5. Build and upload frontend

Good luck! 🚀
