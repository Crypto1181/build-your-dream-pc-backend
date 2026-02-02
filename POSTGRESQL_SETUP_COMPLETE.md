# ✅ PostgreSQL Setup Complete!

## Stack Builder - What to Do

**You can click "Cancel"** - Stack Builder is optional and not needed for the backend.

Stack Builder is for installing additional PostgreSQL tools, but you only need PostgreSQL itself, which is already installed!

## Next Steps

### Step 1: Add PostgreSQL to PATH (If psql command doesn't work)

PostgreSQL is installed, but `psql` might not be in your PATH. 

**Find PostgreSQL installation:**
- Usually at: `C:\Program Files\PostgreSQL\18\bin\`
- Or: `C:\Program Files\PostgreSQL\16\bin\`

**Add to PATH:**
1. Press `Win + X` → System → Advanced system settings
2. Click "Environment Variables"
3. Under "System variables", find "Path" and click "Edit"
4. Click "New" and add: `C:\Program Files\PostgreSQL\18\bin`
5. Click OK on all windows
6. **Restart your terminal/PowerShell**

### Step 2: Create Database

Open **Command Prompt** (not PowerShell) and run:

```cmd
psql -U postgres
```

Enter password: `1234`

Then run:
```sql
CREATE DATABASE pc_builder_db;
\q
```

### Step 3: Update .env File

Create or update `backend/.env` file with:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:1234@localhost:5432/pc_builder_db
WOOCOMMERCE_BASE_URL=https://techtitanlb.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here
SYNC_INTERVAL_HOURS=6
SYNC_ENABLED=true
CORS_ORIGIN=http://localhost:8080
LOG_LEVEL=info
```

**Important:** Replace `ck_your_key_here` and `cs_your_secret_here` with your actual WooCommerce API keys!

### Step 4: Run Migration

```cmd
cd backend
npm run migrate
```

You should see:
```
✅ Database migrations completed successfully
```

### Step 5: Start Backend

```cmd
npm run dev
```

## ✅ Quick Test

After starting backend, test it:

```cmd
curl http://localhost:3001/health
```

Should return: `{"status":"ok",...}`

## 🎯 Summary

1. ✅ PostgreSQL installed
2. ⏭️ Cancel Stack Builder (not needed)
3. 📝 Create database: `CREATE DATABASE pc_builder_db;`
4. 📝 Update `.env` with password `1234`
5. 🚀 Run migration: `npm run migrate`
6. 🚀 Start backend: `npm run dev`

You're almost there! 🎉
