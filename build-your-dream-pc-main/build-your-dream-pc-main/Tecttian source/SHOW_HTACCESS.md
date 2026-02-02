# 🔍 How to See .htaccess File

## Why You Can't See It

`.htaccess` files are **hidden files** in Windows. They don't show up by default in File Explorer.

## ✅ Solution: Show Hidden Files

### Method 1: File Explorer Settings

1. Open File Explorer
2. Click **View** tab at the top
3. Check the box **"Hidden items"** in the Show/hide section
4. The `.htaccess` file should now appear!

### Method 2: Command Prompt

Open Command Prompt in the `dist` folder and run:
```cmd
dir /a
```

This shows all files including hidden ones.

## 📁 File Location

The `.htaccess` file should be in:
```
Tecttian source\dist\.htaccess
```

## 🚀 Alternative: Create on Server

If you still can't see it, you can create it directly on Hostinger:

1. Log into Hostinger File Manager
2. Go to `public_html` directory
3. Click **"New File"**
4. Name it: `.htaccess` (with the dot at the beginning!)
5. Copy and paste this content:

```apache
# Enable Rewrite Engine
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Handle React Router - redirect all requests to index.html
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>

# Enable Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

6. Save the file

## ✅ Quick Check

To verify the file exists, run this in Command Prompt:
```cmd
cd "build-your-dream-pc-main\build-your-dream-pc-main\Tecttian source\dist"
dir /a .htaccess
```

If it shows the file, it exists! Just enable "Show hidden files" to see it.
