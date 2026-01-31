# 🚀 Quick Start Using Command Prompt (CMD)

## Why CMD?
Command Prompt (CMD) doesn't have PowerShell's execution policy restrictions, so npm commands work immediately!

## Step-by-Step Setup

### Step 1: Open Command Prompt

**Option A: From File Explorer**
1. Navigate to the `backend` folder
2. Click in the address bar
3. Type `cmd` and press Enter

**Option B: From Start Menu**
1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to backend:
   ```cmd
   cd "C:\Users\Programmer\Documents\my flutter project\build-your-dream-pc-main\build-your-dream-pc-main\backend"
   ```

### Step 2: Install Dependencies

**Option A: Use the batch file (Easiest)**
```cmd
install-dependencies-cmd.bat
```

**Option B: Manual command**
```cmd
npm install
```

### Step 3: Create .env File

Create a `.env` file in the `backend` folder with:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/pc_builder_db
WOOCOMMERCE_BASE_URL=https://techtitanlb.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here
SYNC_INTERVAL_HOURS=6
SYNC_ENABLED=true
CORS_ORIGIN=http://localhost:8080
LOG_LEVEL=info
```

### Step 4: Run Migrations

**Option A: Use the batch file**
```cmd
run-migrate-cmd.bat
```

**Option B: Manual command**
```cmd
npm run migrate
```

### Step 5: Start Backend Server

**Option A: Use the batch file (Easiest)**
```cmd
start-backend-cmd.bat
```

**Option B: Manual command**
```cmd
npm run dev
```

## ✅ Verification

Once the server starts, you should see:
```
✅ Database connected successfully
✅ Sync scheduler started
🚀 Server running on port 3001
```

## 🎯 All Commands in CMD

```cmd
REM Navigate to backend
cd "C:\Users\Programmer\Documents\my flutter project\build-your-dream-pc-main\build-your-dream-pc-main\backend"

REM Install dependencies
npm install

REM Run migrations
npm run migrate

REM Start server
npm run dev
```

## 💡 Pro Tip

**Double-click these batch files in File Explorer:**
- `install-dependencies-cmd.bat` - Install packages
- `run-migrate-cmd.bat` - Setup database
- `start-backend-cmd.bat` - Start server

No need to open terminal at all!

## 🐛 Troubleshooting

**"npm is not recognized"**
- Node.js is not installed or not in PATH
- Install Node.js from nodejs.org

**"Database connection failed"**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env file

**"Port 3001 already in use"**
- Another process is using port 3001
- Close it or change PORT in .env

---

**CMD is much easier than PowerShell for this!** ✅
