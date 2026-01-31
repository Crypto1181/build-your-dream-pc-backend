# Check Render Logs for Database Error

## Steps:

1. Go to Render Dashboard
2. Click on your backend service
3. Click "Logs" tab
4. Look for errors like:
   - "Database connection failed"
   - "relation 'categories' does not exist"
   - "relation 'products' does not exist"
   - Any PostgreSQL errors

## Common Issues:

### Issue 1: Tables Don't Exist
**Error:** `relation "categories" does not exist`

**Fix:** Run database migration on Render:
- Go to Render → Your backend → Shell
- Run: `npm run migrate`
- Or manually run the SQL from `schema.sql`

### Issue 2: Database Connection Failed
**Error:** `password authentication failed` or `connection refused`

**Fix:** 
- Check DATABASE_URL is correct in Render environment
- Make sure database is running
- Check password is correct

### Issue 3: SSL Required
**Error:** `SSL connection required`

**Fix:** DATABASE_URL should include `?sslmode=require` or backend code should enable SSL

## Quick Fix:

If tables don't exist, you need to run migration on Render. The migration needs to run ONCE on the Render database.
