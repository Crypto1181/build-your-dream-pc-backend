# ✅ Database Created! Next Steps

## ✅ Step 1: Database - DONE!
Database `pc_builder_db` exists and is ready!

## 📝 Step 2: Create .env File

Create a file named `.env` in the `backend` folder with this content:

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

## 🗄️ Step 3: Run Database Migration

This will create all the tables in your database.

**Option A: Use the batch file**
```cmd
run-migrate-cmd.bat
```

**Option B: Manual command**
```cmd
npm run migrate
```

You should see:
```
✅ Database migrations completed successfully
```

## 🚀 Step 4: Start Backend Server

**Option A: Use the batch file**
```cmd
start-backend-cmd.bat
```

**Option B: Manual command**
```cmd
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ Sync scheduler started
🚀 Server running on port 3001
```

## 🎯 Step 5: Start Frontend

Open a **new terminal/Command Prompt** and run:

```cmd
cd "Tecttian source"
npm run dev
```

## ✅ Verification

1. **Backend running?** Check: `http://localhost:3001/health`
2. **Products synced?** Wait 1 minute after starting backend (auto-sync)
3. **Frontend running?** Open: `http://localhost:8080`

## 📋 Quick Checklist

- [x] Database created ✅
- [ ] .env file created
- [ ] Migration run (`npm run migrate`)
- [ ] Backend started (`npm run dev`)
- [ ] Frontend started (`npm run dev` in frontend folder)

## 🐛 If Migration Fails

If you get connection errors:
1. Check `.env` file has correct password: `1234`
2. Make sure PostgreSQL service is running
3. Check database name is: `pc_builder_db`

---

**You're almost there! Just need to create .env file and run migration!** 🚀
