# 🚀 Backend API Guide

## 📍 Where is the Backend?

Your backend is located at:
```
build-your-dream-pc-main\build-your-dream-pc-main\backend\
```

## 🎯 How to Run the Backend

### Step 1: Navigate to Backend Directory

```cmd
cd "build-your-dream-pc-main\build-your-dream-pc-main\backend"
```

### Step 2: Start the Backend Server

```cmd
npm run dev
```

Or use the batch file:
```cmd
start-backend-cmd.bat
```

### Step 3: Verify It's Running

You should see:
```
✅ Server running on port 3001
✅ Database connected
✅ Routes registered
```

## 🌐 Backend API URL

**Local Development:**
```
http://localhost:3001/api
```

**Production:**
```
https://your-backend-domain.com/api
```
(You need to deploy the backend separately)

## 📋 Available API Endpoints

### Products
- `GET /api/products` - Get all products
  - Query params: `?page=1&per_page=20&category=123&search=laptop`
- `GET /api/products/:id` - Get single product by ID
- `GET /api/products/search?q=query` - Search products

### Categories
- `GET /api/categories` - Get all categories (flat list)
- `GET /api/categories/tree` - Get category tree (with subcategories) ⭐
- `GET /api/categories/:id` - Get single category

### Sync
- `POST /api/sync` - Trigger manual sync
- `GET /api/sync/status` - Check sync status

### Health
- `GET /health` - Health check

## 🧪 Test the API

### Test in Browser

1. **Health Check:**
   ```
   http://localhost:3001/health
   ```

2. **Get Categories:**
   ```
   http://localhost:3001/api/categories
   ```

3. **Get Category Tree:**
   ```
   http://localhost:3001/api/categories/tree
   ```

4. **Get Products:**
   ```
   http://localhost:3001/api/products?per_page=10
   ```

### Test with Command Line

```cmd
curl http://localhost:3001/health
curl http://localhost:3001/api/categories
curl http://localhost:3001/api/products?per_page=5
```

## 🔗 How Frontend Connects

The frontend uses this URL in `src/services/backendApi.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
```

**Local Development:**
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001/api`
- ✅ Works automatically!

**Production:**
- Create `.env.production` file:
  ```env
  VITE_BACKEND_API_URL=https://your-backend-domain.com/api
  ```

## 📊 Current Status

Your backend should already be:
- ✅ **Running** on port 3001
- ✅ **Connected** to PostgreSQL database
- ✅ **Synced** 5,412 products and 100 categories
- ✅ **Ready** to serve API requests

## 🎯 Quick Start

1. **Check if backend is running:**
   ```cmd
   curl http://localhost:3001/health
   ```

2. **If not running, start it:**
   ```cmd
   cd "build-your-dream-pc-main\build-your-dream-pc-main\backend"
   npm run dev
   ```

3. **Test API:**
   - Open browser: `http://localhost:3001/api/categories/tree`
   - Should see JSON with categories

## ⚠️ Important Notes

1. **Backend must be running** for frontend to work
2. **Database must be connected** (PostgreSQL)
3. **Products must be synced** (already done - 5,412 products)
4. **For production**, you need to deploy backend separately

## 🚀 Production Deployment

For production, you need to:
1. Deploy backend to a server (Railway, Render, Heroku, VPS)
2. Update `.env.production` with backend URL
3. Rebuild frontend
4. Upload frontend to Hostinger

The backend API is already set up and working! Just make sure it's running. 🎉
