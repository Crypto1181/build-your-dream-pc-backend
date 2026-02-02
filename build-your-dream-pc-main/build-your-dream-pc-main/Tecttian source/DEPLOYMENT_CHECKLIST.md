# ✅ Deployment Checklist

## Before Building

- [ ] Backend is deployed and running
- [ ] Backend API URL is known
- [ ] Backend CORS is configured for your domain

## Build Process

- [ ] Run `build-for-production.bat` or `npm run build`
- [ ] Check `dist` folder was created
- [ ] Verify no build errors

## Files to Upload

Upload **ALL contents** from `dist` folder to `public_html`:

- [ ] `index.html`
- [ ] `assets/` folder (entire folder)
- [ ] `favicon.ico`
- [ ] `robots.txt`
- [ ] `placeholder.svg`
- [ ] Any other files in `dist/`

## After Upload

- [ ] Visit your website
- [ ] Check browser console (F12) - no errors
- [ ] Test product loading
- [ ] Test category navigation
- [ ] Verify API calls work (check Network tab)

## Backend Configuration

Your backend `.env` should have:
- [ ] `CORS_ORIGIN=https://yourdomain.com`
- [ ] Database connection configured
- [ ] WooCommerce API keys set
- [ ] Backend is accessible from internet

## Common Issues

### Products not loading?
- Check backend API URL in `.env.production`
- Verify backend is running
- Check CORS settings

### 404 errors?
- Make sure `.htaccess` is uploaded
- Check file permissions

### API errors?
- Verify backend is deployed
- Check backend logs
- Verify CORS origin matches your domain
