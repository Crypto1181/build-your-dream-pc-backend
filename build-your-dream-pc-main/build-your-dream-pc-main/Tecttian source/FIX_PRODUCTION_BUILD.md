# 🔧 Fix Production Build Issues

## Problem

The production build is using `localhost:3001` for the backend API, which won't work on the live server.

## Solution

You need to create a `.env.production` file with your production backend URL.

## Step 1: Create .env.production File

Create a file named `.env.production` in the `Tecttian source` folder with:

```env
VITE_BACKEND_API_URL=https://your-backend-domain.com/api
```

**Replace `your-backend-domain.com` with:**
- Your actual backend server URL, OR
- If backend is on same domain: `/api`

## Step 2: Rebuild

After creating `.env.production`, rebuild:

```cmd
npm run build
```

## Step 3: Verify

Check the built files in `dist/assets/` - the API URL should now point to your production backend.

## Common Issues

### Issue 1: Backend Not Deployed
- **Problem**: Frontend works but can't connect to backend
- **Solution**: Deploy your backend server first

### Issue 2: CORS Errors
- **Problem**: Browser blocks API requests
- **Solution**: Update backend CORS to allow your frontend domain

### Issue 3: Wrong API URL
- **Problem**: API calls go to wrong URL
- **Solution**: Check `.env.production` file has correct URL

## Quick Fix Script

I'll create a script to help you set this up!
