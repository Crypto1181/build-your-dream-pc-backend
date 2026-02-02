-- Debug script to find "cooler" category and its products
-- Run this in psql to debug the cooler category issue

-- 1. Find the cooler category
SELECT 
  id,
  woo_commerce_id,
  name,
  slug,
  parent_id,
  count
FROM categories
WHERE slug LIKE '%cooler%' OR name ILIKE '%cooler%'
ORDER BY count DESC;

-- 2. Check if products have this category
-- Replace XXX with the woo_commerce_id from step 1
SELECT 
  p.id,
  p.name,
  p.categories,
  jsonb_array_elements(p.categories) AS cat
FROM products p
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(p.categories) AS cat
  WHERE cat->>'slug' ILIKE '%cooler%' OR cat->>'name' ILIKE '%cooler%'
)
LIMIT 10;

-- 3. Count products with cooler category
-- Replace XXX with the woo_commerce_id from step 1
SELECT COUNT(*) as product_count
FROM products p
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(p.categories) AS cat
  WHERE cat->>'slug' ILIKE '%cooler%' OR cat->>'name' ILIKE '%cooler%'
);

-- 4. Show sample product categories for cooler
SELECT 
  p.id,
  p.name,
  p.categories
FROM products p
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(p.categories) AS cat
  WHERE cat->>'slug' ILIKE '%cooler%' OR cat->>'name' ILIKE '%cooler%'
)
LIMIT 5;
