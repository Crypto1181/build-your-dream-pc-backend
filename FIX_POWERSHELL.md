# Fix PowerShell Execution Policy Issue

## Problem
PowerShell is blocking npm commands due to execution policy restrictions.

## Solutions (Choose One)

### Option 1: Use Command Prompt (CMD) - EASIEST ✅

**Just use Command Prompt instead of PowerShell:**

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to backend folder:
   ```cmd
   cd "C:\Users\Programmer\Documents\my flutter project\build-your-dream-pc-main\build-your-dream-pc-main\backend"
   ```
4. Run commands normally:
   ```cmd
   npm install
   npm run migrate
   npm run dev
   ```

**Command Prompt doesn't have this restriction!**

---

### Option 2: Fix PowerShell Execution Policy

**Run PowerShell as Administrator:**

1. Right-click on PowerShell icon
2. Select "Run as Administrator"
3. Run this command:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
4. Type `Y` when prompted
5. Close and reopen PowerShell
6. Now npm commands will work!

---

### Option 3: Use Git Bash (If Installed)

If you have Git installed, you can use Git Bash:

1. Right-click in the backend folder
2. Select "Git Bash Here"
3. Run npm commands normally

---

### Option 4: Bypass for Single Session

**Run this in PowerShell before npm commands:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

This only affects the current PowerShell session.

---

## Recommended: Use Command Prompt (CMD)

**CMD is the easiest solution - no configuration needed!**

Just open CMD instead of PowerShell and run your commands.
