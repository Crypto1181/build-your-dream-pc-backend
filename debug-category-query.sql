-- Debug script to test category filtering
-- Run this in psql to see how categories are stored in products

-- 1. Check how categories are stored in products
SELECT 
  id,
  name,
  categories,
  jsonb_array_length(categories) as category_count
FROM products 
WHERE categories IS NOT NULL 
LIMIT 5;

-- 2. Find a product with "Pens" category
SELECT 
  p.id,
  p.name,
  p.categories,
  c.name as category_name,
  c.woo_commerce_id
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(p.categories) AS cat
JOIN categories c ON (cat->>'id')::int = c.woo_commerce_id
WHERE c.slug LIKE '%pen%' OR c.name LIKE '%Pen%'
LIMIT 10;

-- 3. Test category filter query
-- Replace 123 with actual Pens category WooCommerce ID
SELECT 
  p.id,
  p.name,
  p.categories
FROM products p
WHERE p.categories @> '[{"id": 123}]'::jsonb
LIMIT 10;

-- 4. Get Pens category info
SELECT id, woo_commerce_id, name, slug, count
FROM categories
WHERE slug LIKE '%pen%' OR name LIKE '%Pen%'
ORDER BY count DESC;
