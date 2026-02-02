# 🚀 Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ installed and running
- WooCommerce API credentials

## Step 1: Set Up Backend

```bash
cd backend
npm install

# Create .env file
copy .env.example .env
# Edit .env with your database and WooCommerce credentials

# Create database
psql -U postgres
CREATE DATABASE pc_builder_db;
\q

# Run migrations
npm run migrate

# Start backend (in one terminal)
npm run dev
```

Backend will run on `http://localhost:3001`

## Step 2: Set Up Frontend

```bash
cd "Tecttian source"

# Create .env file
echo VITE_BACKEND_API_URL=http://localhost:3001/api > .env

# Install dependencies (if not already done)
npm install

# Start frontend (in another terminal)
npm run dev
```

Frontend will run on `http://localhost:5173`

## Step 3: Initial Sync

The backend will automatically sync products after 1 minute. Or trigger manually:

```bash
# In backend directory
npm run sync
```

Or via API:
```bash
curl -X POST http://localhost:3001/api/sync
```

## Step 4: Open Your Browser

Navigate to: `http://localhost:5173`

## 🎯 What Changed

- ✅ Frontend now uses backend API instead of direct WooCommerce calls
- ✅ No more CORS issues
- ✅ Faster product loading (from PostgreSQL)
- ✅ Automatic background sync every 6 hours

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Check port 3001 is not in use

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check `VITE_BACKEND_API_URL` in frontend `.env`
- Restart frontend after changing `.env`

### No products showing
- Check backend has synced: `GET http://localhost:3001/api/products`
- Trigger sync: `POST http://localhost:3001/api/sync`
- Check browser console for errors

## 📝 Environment Variables

### Backend (.env in `backend/` directory)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/pc_builder_db
WOOCOMMERCE_BASE_URL=https://techtitanlb.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_your_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env in `Tecttian source/` directory)
```env
VITE_BACKEND_API_URL=http://localhost:3001/api
```

## 🎉 You're Ready!

Your application is now using the fast Node.js backend!
