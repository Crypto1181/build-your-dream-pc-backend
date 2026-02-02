# 📝 Create .env.production File Manually

## ✅ Easy Way: Use Batch Script

Run this in `Tecttian source` folder:
```cmd
create-env-production.bat
```

It will ask for your backend URL and create the file automatically!

## 📝 Manual Way: Create It Yourself

### Step 1: Create the File

1. Go to `Tecttian source` folder
2. Create a new file named: `.env.production`
   - **Important:** The file name must start with a dot (`.`)
   - **Important:** No extension (not `.txt`)

### Step 2: Add This Content

Open the file in Notepad and paste:

```env
VITE_BACKEND_API_URL=/api
```

### Step 3: Replace the URL

Change `/api` to your actual backend URL:

**Option 1: Backend on Same Domain**
```env
VITE_BACKEND_API_URL=/api
```

**Option 2: Backend on Different Domain**
```env
VITE_BACKEND_API_URL=https://your-backend-domain.com/api
```

**Option 3: Backend on Subdomain**
```env
VITE_BACKEND_API_URL=https://api.yourdomain.com/api
```

### Step 4: Save

Save the file as `.env.production` (make sure it's not `.env.production.txt`!)

## ✅ Verify

After creating, check the file exists:
```cmd
dir .env.production
```

## 🚀 Next Steps

1. ✅ Create `.env.production` file
2. ✅ Set correct backend URL
3. Run: `npm run build`
4. Test: `npm run preview`
5. Upload `dist` folder to Hostinger

## 💡 Tip

I've also created `ENV_PRODUCTION_TEMPLATE.txt` - you can copy its content!
