# 🔧 Fix Database Connection Error (ECONNREFUSED)

## ❌ Error You're Seeing

```
"code": "ECONNREFUSED"
```

This means the backend **cannot connect to PostgreSQL database**.

## 🔍 Possible Causes

1. **PostgreSQL is not installed**
2. **PostgreSQL service is not running**
3. **Wrong database credentials in .env file**
4. **Database doesn't exist yet**

## ✅ Solutions

### Step 1: Check if PostgreSQL is Installed

**Option A: Check in Services**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Look for "PostgreSQL" service
4. If not found, PostgreSQL is not installed

**Option B: Check in Command Prompt**
```cmd
psql --version
```

If you see "psql is not recognized", PostgreSQL is not installed.

### Step 2: Install PostgreSQL (If Not Installed)

1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for `postgres` user
4. Default port is `5432` (keep this)

### Step 3: Start PostgreSQL Service

**Option A: From Services**
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "PostgreSQL" service
4. Right-click → Start (if stopped)

**Option B: From Command Prompt (as Administrator)**
```cmd
net start postgresql-x64-XX
```
(Replace XX with your PostgreSQL version number)

### Step 4: Create Database

**Open Command Prompt and run:**

```cmd
psql -U postgres
```

Enter your PostgreSQL password when prompted.

Then run:
```sql
CREATE DATABASE pc_builder_db;
\q
```

### Step 5: Update .env File

Make sure your `backend/.env` file has correct database connection:

**Option 1: Using DATABASE_URL (Recommended)**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pc_builder_db
```

**Option 2: Using Individual Variables**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pc_builder_db
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
```

**Replace `YOUR_PASSWORD` with your actual PostgreSQL password!**

### Step 6: Test Connection

**Try connecting manually:**
```cmd
psql -U postgres -d pc_builder_db
```

If this works, your credentials are correct.

### Step 7: Run Migration Again

```cmd
cd backend
npm run migrate
```

## 🚀 Quick Setup Script

If you have PostgreSQL installed, here's a quick setup:

```cmd
REM 1. Start PostgreSQL (if not running)
net start postgresql-x64-16

REM 2. Create database
psql -U postgres -c "CREATE DATABASE pc_builder_db;"

REM 3. Update .env file with your password
REM Edit backend/.env and set DATABASE_URL

REM 4. Run migration
cd backend
npm run migrate
```

## 🐛 Alternative: Use Supabase PostgreSQL (Cloud)

If you don't want to install PostgreSQL locally, you can use Supabase's free PostgreSQL:

1. Go to https://supabase.com
2. Create a free account
3. Create a new project
4. Get the connection string from Settings → Database
5. Use that in your `.env` file as `DATABASE_URL`

## ✅ Verification

Once fixed, you should see:
```
✅ Database migrations completed successfully
```

Instead of:
```
❌ Migration error: ECONNREFUSED
```

## 📝 Common Issues

**"psql is not recognized"**
- PostgreSQL is not installed or not in PATH
- Install PostgreSQL or add it to PATH

**"Password authentication failed"**
- Wrong password in .env file
- Check your PostgreSQL password

**"Database does not exist"**
- Run: `CREATE DATABASE pc_builder_db;`

**"Connection refused"**
- PostgreSQL service is not running
- Start it from Services or: `net start postgresql-x64-XX`

---

**The error is NOT working - it's a connection problem that needs to be fixed!** 🔧
