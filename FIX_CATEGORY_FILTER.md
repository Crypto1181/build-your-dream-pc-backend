# 🔧 Fix Category Filter Issue

## Problem

When selecting a subcategory (like "Pens"), wrong products are shown. This is because:
1. The category filter query might not be matching correctly
2. Category IDs might be mismatched (WooCommerce ID vs Database ID)

## What I Fixed

### Updated Product Controller

Changed the category filter query to use a more reliable method:
- **Before:** Used `categories @> [{id: X}]` which might not match correctly
- **After:** Uses `EXISTS` with `jsonb_array_elements` to check if any category in the array matches

### New Query Logic

```sql
EXISTS (
  SELECT 1 FROM jsonb_array_elements(categories) AS cat
  WHERE (cat->>'id')::int = $1
)
```

This checks if the product's categories array contains a category with the matching ID.

## 🧪 Test the Fix

### Step 1: Restart Backend

```cmd
cd backend
npm run dev
```

### Step 2: Test Category Filter

Run the test script:
```cmd
test-category-query.bat
```

Or test manually:
1. Get Pens category ID:
   ```
   http://localhost:3001/api/categories
   ```
   Look for "Pens" and note its `woo_commerce_id`

2. Test products with Pens category:
   ```
   http://localhost:3001/api/products?category=XXXX&per_page=5
   ```
   Replace XXXX with the Pens category WooCommerce ID

### Step 3: Check Frontend

1. Open your website
2. Click on "Pens" category
3. Products should now be correct!

## 🔍 Debugging

If it still doesn't work:

1. **Check what ID frontend is sending:**
   - Open browser console (F12)
   - Look for: `🔵 Fetching products from backend: ...`
   - Check the `category=` parameter

2. **Check what backend receives:**
   - Look at backend logs
   - Should see: `Filtering products by category ID: XXXX`

3. **Verify category exists:**
   ```
   http://localhost:3001/api/categories
   ```

## ⚠️ Important

The frontend must pass the **WooCommerce category ID** (not database ID) because products store WooCommerce IDs in their categories JSONB field.

## ✅ Expected Result

After fix:
- ✅ Selecting "Pens" shows only pen products
- ✅ Selecting subcategories shows correct products
- ✅ Category filter works correctly

Restart the backend and test! 🚀
