# Performance Optimization for Render Free Tier

## Why is the website slow on Render free tier?

Render's free tier has several limitations that can cause slowness:

1. **Cold Starts**: Services spin down after 15 minutes of inactivity
   - First request after spin-down takes 30-60 seconds
   - Subsequent requests are faster

2. **Limited Resources**: 
   - Shared CPU/memory
   - Limited database connections
   - No CDN for static assets

3. **No Persistent Connections**: 
   - Database connections may timeout
   - Need connection pooling

## Optimizations Implemented

### 1. **Response Caching** ✅
- Added HTTP cache headers to API responses
- Categories cached for 10 minutes
- Products cached for 5 minutes
- Search results cached for 1 minute

### 2. **In-Memory Caching** ✅
- Simple in-memory cache for frequently accessed data
- Reduces database queries
- Automatic cache expiration and cleanup

### 3. **Database Connection Pooling** ✅
- Optimized pool settings for free tier
- Reduced max connections from 20 to 10
- Added keep-alive settings
- Increased connection timeout

### 4. **Compression** ✅
- Already enabled (gzip compression)
- Reduces response sizes

## Additional Recommendations

### 1. **Prevent Cold Starts** (External Service Required)

Use a free service to ping your health endpoint every 14 minutes:

**Option A: UptimeRobot (Free)**
1. Sign up at https://uptimerobot.com
2. Add a new monitor:
   - Type: HTTP(s)
   - URL: `https://your-backend.onrender.com/health`
   - Interval: 5 minutes (free tier allows 5 min intervals)
   - Alert contacts: Optional

**Option B: Cron-Job.org (Free)**
1. Sign up at https://cron-job.org
2. Create a new cron job:
   - URL: `https://your-backend.onrender.com/health`
   - Schedule: Every 14 minutes
   - Method: GET

**Option C: GitHub Actions (Free)**
Create `.github/workflows/keep-alive.yml`:
```yaml
name: Keep Alive
on:
  schedule:
    - cron: '*/14 * * * *'  # Every 14 minutes
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping health endpoint
        run: curl https://your-backend.onrender.com/health
```

### 2. **Frontend Optimizations**

The frontend bundle is large (1.3MB). Consider:
- Code splitting
- Lazy loading routes
- Image optimization
- Using a CDN for static assets

### 3. **Database Optimizations**

If using Render's free PostgreSQL:
- Add indexes on frequently queried columns
- Use connection pooling (already implemented)
- Consider upgrading to paid tier for better performance

### 4. **Monitor Performance**

Check Render logs for:
- Response times
- Database query times
- Memory usage
- Error rates

## Expected Performance

**After optimizations:**
- First request (cold start): 30-60 seconds (unavoidable on free tier)
- Subsequent requests: 200-500ms (with caching)
- Cached responses: 50-100ms

**With keep-alive service:**
- Eliminates cold starts
- Consistent 200-500ms response times
- Cached responses: 50-100ms

## Testing Performance

1. **Check cache headers:**
   ```bash
   curl -I https://your-backend.onrender.com/api/categories
   ```
   Should see: `Cache-Control: public, max-age=600`

2. **Test response times:**
   ```bash
   time curl https://your-backend.onrender.com/api/products?page=1&per_page=20
   ```

3. **Monitor Render logs:**
   - Check for slow queries
   - Look for cache hits/misses
   - Monitor memory usage

## Environment Variables

Optional performance tuning:

```env
# Cache TTL (milliseconds)
CACHE_TTL=300000  # 5 minutes

# Database pool size (for free tier, keep at 10 or lower)
DB_POOL_MAX=10

# Rate limiting (already optimized)
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=900000
```

## Next Steps

1. ✅ **Deploy these optimizations** - Already done
2. ⏳ **Set up keep-alive service** - Use UptimeRobot or similar
3. ⏳ **Monitor performance** - Check Render logs regularly
4. ⏳ **Consider upgrading** - Paid tier ($7/month) removes cold starts and provides better resources
