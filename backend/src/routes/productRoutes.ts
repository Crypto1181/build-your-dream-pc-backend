import { Router } from 'express';
import { logger } from '../utils/logger';
import { wooCommerceClient } from '../services/woocommerceClient';
import { getDatabasePool } from '../database/connection';
import { cache } from '../utils/cache';

const router = Router();

// Helper function to set cache headers
const setCacheHeaders = (res: any, maxAge: number = 300) => {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=60`);
  res.set('Vary', 'Accept-Encoding');
};

/**
 * GET /api/products
 * Fetch products from database (cached) or WooCommerce API
 */
router.get('/products', async (req, res) => {
    try {
        const {
            page = '1',
            per_page = '20',
            category,
            search,
            pc_category,
            orderby = 'date',
            order = 'desc',
        } = req.query;

        // Create cache key from query params
        const cacheKey = `products:${JSON.stringify({ page, per_page, category, search, pc_category, orderby, order })}`;
        
        // Check cache first (only for non-search queries to avoid stale results)
        // IMPORTANT: Don't use cache for category queries that returned 0 results (likely stale/fixed query)
        if (!search) {
            const cached = cache.get<any>(cacheKey);
            if (cached) {
                // If this is a category query and we got 0 results, don't use cache (might be stale from old broken query)
                if (category && cached && typeof cached === 'object' && 'products' in cached) {
                    if (Array.isArray(cached.products) && cached.products.length === 0) {
                        // Clear this cache entry - might be a stale empty result from old broken query
                        logger.warn(`Clearing stale cache for category ${category} (had 0 products)`);
                        cache.delete(cacheKey);
                        // Continue to fetch fresh data
                    } else {
                        setCacheHeaders(res, 300); // 5 minutes cache
                        return res.json(cached);
                    }
                } else {
                    setCacheHeaders(res, 300); // 5 minutes cache
                    return res.json(cached);
                }
            }
        }

        const pool = getDatabasePool();

        // Build query based on filters
        let query = 'SELECT * FROM products WHERE status = $1';
        const params: any[] = ['publish'];
        let paramIndex = 2;

        // IMPORTANT: If filtering by WooCommerce category ID, don't also filter by pc_component_category
        // The category ID is more specific and reliable - pc_component_category might not be set for all products
        // Only use pc_component_category filter if NO category ID is provided
        if (pc_category && !category) {
            query += ` AND pc_component_category = $${paramIndex}`;
            params.push(pc_category);
            paramIndex++;
        }

        // Filter by WooCommerce category ID if provided
        // Categories are stored as JSONB array in the database
        // WooCommerce format: [{"id": 118, "name": "Graphic Cards", ...}]
        // Use multiple methods to ensure we catch the category regardless of format
        if (category) {
            const categoryId = parseInt(category as string, 10);
            if (!isNaN(categoryId)) {
                // Safely query JSONB categories array
                // We handle two cases:
                // 1. Array of objects with 'id' property: [{"id": 118, "name": "..."}, ...]
                // 2. Array of integers (legacy/simple): [118, 119, ...]
                // We use @> operator which is safe and efficient for both cases
                query += ` AND (
                    -- Check if it contains an object with this id
                    categories @> ('[{"id": ' || $${paramIndex} || '}]')::jsonb
                    OR
                    -- Check if it contains the integer directly (for simple array format)
                    categories @> ('[' || $${paramIndex} || ']')::jsonb
                    OR
                    -- Fallback string search for robustness (safe for any text)
                    categories::text LIKE '%"id":' || $${paramIndex} || ',%' OR
                    categories::text LIKE '%"id":' || $${paramIndex} || '}%' OR
                    categories::text LIKE '%"id": ' || $${paramIndex} || ',%'
                )`;
                params.push(categoryId);
                paramIndex++;
            }
        }

        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Add ordering
        const validOrderBy = ['date', 'price', 'name'];
        const validOrder = ['asc', 'desc'];
        const orderByColumn = validOrderBy.includes(orderby as string) ? orderby : 'created_at';
        const orderDirection = validOrder.includes((order as string).toLowerCase()) ? order : 'desc';

        query += ` ORDER BY ${orderByColumn === 'date' ? 'created_at' : orderByColumn} ${orderDirection}`;

        // Add pagination
        const limit = parseInt(per_page as string, 10);
        const offset = (parseInt(page as string, 10) - 1) * limit;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        // Log the query for debugging (only in development or when category is specified)
        if (category || process.env.NODE_ENV === 'development') {
            logger.info(`Querying products with category filter: ${category}`);
            logger.info(`Query: ${query}`);
            logger.info(`Params: ${JSON.stringify(params)}`);
        }

        let result = await pool.query(query, params);

        // Log results for debugging
        if (category) {
            logger.info(`Found ${result.rows.length} products for category ${category}`);
            
            // If no products found, try fallback: query WooCommerce directly
            if (result.rows.length === 0) {
                logger.warn(`No products found in database for category ${category}, trying WooCommerce direct...`);
                try {
                    const { wooCommerceClient } = await import('../services/woocommerceClient');
                    const wooCommerceResult = await wooCommerceClient.fetchProducts('site1', {
                        category: parseInt(category as string, 10),
                        per_page: limit,
                        page: parseInt(page as string, 10),
                        orderby: orderby as string,
                        order: order as string,
                    });
                    
                    if (wooCommerceResult.products.length > 0) {
                        logger.info(`Found ${wooCommerceResult.products.length} products from WooCommerce direct for category ${category}`);
                        // Return WooCommerce products directly (bypass database)
                        const response = {
                            products: wooCommerceResult.products.map((p: any) => ({
                                ...p,
                                woo_commerce_id: p.id,
                            })),
                            pagination: {
                                page: parseInt(page as string, 10),
                                per_page: limit,
                                total: wooCommerceResult.total || wooCommerceResult.products.length,
                                total_pages: wooCommerceResult.totalPages || 1,
                            },
                        };
                        // Don't cache this fallback result
                        setCacheHeaders(res, 0); // No cache for fallback
                        return res.json(response);
                    }
                } catch (wooError: any) {
                    logger.error(`WooCommerce fallback failed for category ${category}:`, wooError.message);
                }
                
                // Debug: Check if any products exist with this category in a different format
                const debugQuery = `SELECT id, name, categories FROM products WHERE status = 'publish' AND categories IS NOT NULL LIMIT 3`;
                const debugResult = await pool.query(debugQuery);
                logger.warn(`Debug: Sample products with categories: ${JSON.stringify(debugResult.rows.map((r: any) => ({ id: r.id, name: r.name, categories: r.categories })))}`);
            }
        }

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM products WHERE status = $1';
        const countParams: any[] = ['publish'];
        let countParamIndex = 2;

        // IMPORTANT: If filtering by WooCommerce category ID, don't also filter by pc_component_category
        // Only use pc_component_category filter if NO category ID is provided
        if (pc_category && !category) {
            countQuery += ` AND pc_component_category = $${countParamIndex}`;
            countParams.push(pc_category);
            countParamIndex++;
        }

        // Filter by WooCommerce category ID for count query too
        // Use same multiple methods as main query for consistency
        if (category) {
            const categoryId = parseInt(category as string, 10);
            if (!isNaN(categoryId)) {
                countQuery += ` AND (
                    categories @> ('[{"id": ' || $${countParamIndex} || '}]')::jsonb
                    OR
                    categories @> ('[' || $${countParamIndex} || ']')::jsonb
                    OR
                    categories::text LIKE '%"id":' || $${countParamIndex} || ',%' OR
                    categories::text LIKE '%"id":' || $${countParamIndex} || '}%' OR
                    categories::text LIKE '%"id": ' || $${countParamIndex} || ',%'
                )`;
                countParams.push(categoryId);
                countParamIndex++;
            }
        }

        if (search) {
            countQuery += ` AND (name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex} OR sku ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(total / limit);

        // Prepare response
        const response = {
            products: result.rows,
            pagination: {
                page: parseInt(page as string, 10),
                per_page: limit,
                total: total,
                total_pages: totalPages,
            },
        };

        // Cache the response (only for non-search queries)
        // But don't cache empty results for category queries (might indicate a problem)
        if (!search) {
            if (category && response.products.length === 0) {
                // Don't cache empty category results - might be a query issue
                logger.warn(`Not caching empty result for category ${category} - query might need fixing`);
            } else {
                cache.set(cacheKey, response, 5 * 60 * 1000); // 5 minutes
            }
        }

        // Set cache headers
        setCacheHeaders(res, search ? 60 : 300); // Shorter cache for search results

        res.json(response);
    } catch (error: any) {
        logger.error('Error fetching products:', error);
        
        // Return detailed error in response for debugging (remove in production later if needed)
        res.status(500).json({
            error: 'Failed to fetch products',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            details: error.response?.data || error.code // Include database or API error details
        });
    }
});

/**
 * GET /api/products/:id
 * Fetch a specific product by ID
 */
router.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check cache first
        const cacheKey = `product:${id}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            setCacheHeaders(res, 300); // 5 minutes cache
            return res.json(cached);
        }

        const pool = getDatabasePool();

        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1 OR woo_commerce_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Product not found',
            });
        }

        // Cache the result
        cache.set(cacheKey, result.rows[0], 5 * 60 * 1000); // 5 minutes

        // Set cache headers
        setCacheHeaders(res, 300); // 5 minutes

        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error fetching product:', error);
        res.status(500).json({
            error: 'Failed to fetch product',
            message: error.message,
        });
    }
});

/**
 * GET /api/categories/tree
 * Fetch categories as a hierarchical tree
 */
router.get('/categories/tree', async (req, res) => {
    try {
        const cacheKey = 'categories:tree';
        const cached = cache.get(cacheKey);
        if (cached) {
            setCacheHeaders(res, 600);
            return res.json(cached);
        }

        const pool = getDatabasePool();
        const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
        const categories = result.rows;

        // Build tree
        const categoryMap = new Map();
        const rootCategories: any[] = [];

        // Initialize map
        categories.forEach(cat => {
            categoryMap.set(cat.id, { ...cat, children: [] });
        });

        // Build hierarchy
        categories.forEach(cat => {
            if (cat.parent_id) {
                const parent = categoryMap.get(cat.parent_id);
                if (parent) {
                    parent.children.push(categoryMap.get(cat.id));
                } else {
                    // Parent not found (orphan), treat as root
                    rootCategories.push(categoryMap.get(cat.id));
                }
            } else {
                rootCategories.push(categoryMap.get(cat.id));
            }
        });

        cache.set(cacheKey, rootCategories, 10 * 60 * 1000);
        setCacheHeaders(res, 600);
        res.json(rootCategories);
    } catch (error: any) {
        logger.error('Error fetching category tree:', error);
        res.status(500).json({ error: 'Failed to fetch category tree' });
    }
});

/**
 * GET /api/categories
 * Fetch all categories
 */
router.get('/categories', async (req, res) => {
    try {
        // Check cache first (categories change rarely)
        const cacheKey = 'categories:all';
        const cached = cache.get(cacheKey);
        if (cached) {
            setCacheHeaders(res, 600); // 10 minutes cache for categories
            return res.json(cached);
        }

        const pool = getDatabasePool();

        const result = await pool.query(
            'SELECT * FROM categories ORDER BY name ASC'
        );

        // Cache the result
        cache.set(cacheKey, result.rows, 10 * 60 * 1000); // 10 minutes

        // Set cache headers
        setCacheHeaders(res, 600); // 10 minutes

        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({
            error: 'Failed to fetch categories',
            message: error.message,
        });
    }
});

/**
 * POST /api/sync/products
 * Manually trigger product sync from WooCommerce
 */
router.post('/sync/products', async (req, res) => {
    try {
        logger.info('Manual product sync triggered');

        // Fetch products from WooCommerce
        const { products } = await wooCommerceClient.fetchProducts('site1', {
            per_page: 100,
            page: 1,
        });

        const pool = getDatabasePool();
        let syncedCount = 0;

        // Upsert products into database
        for (const product of products) {
            await pool.query(
                `INSERT INTO products (
          woo_commerce_id, name, slug, permalink, type, status, featured,
          catalog_visibility, description, short_description, sku,
          price, regular_price, sale_price, on_sale, purchasable,
          stock_status, stock_quantity, manage_stock, weight, dimensions,
          images, attributes, categories, tags, meta_data,
          site_id, site_name, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW())
        ON CONFLICT (woo_commerce_id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          permalink = EXCLUDED.permalink,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          featured = EXCLUDED.featured,
          catalog_visibility = EXCLUDED.catalog_visibility,
          description = EXCLUDED.description,
          short_description = EXCLUDED.short_description,
          sku = EXCLUDED.sku,
          price = EXCLUDED.price,
          regular_price = EXCLUDED.regular_price,
          sale_price = EXCLUDED.sale_price,
          on_sale = EXCLUDED.on_sale,
          purchasable = EXCLUDED.purchasable,
          stock_status = EXCLUDED.stock_status,
          stock_quantity = EXCLUDED.stock_quantity,
          manage_stock = EXCLUDED.manage_stock,
          weight = EXCLUDED.weight,
          dimensions = EXCLUDED.dimensions,
          images = EXCLUDED.images,
          attributes = EXCLUDED.attributes,
          categories = EXCLUDED.categories,
          tags = EXCLUDED.tags,
          meta_data = EXCLUDED.meta_data,
          synced_at = NOW()`,
                [
                    product.id,
                    product.name,
                    product.slug,
                    product.permalink,
                    product.type,
                    product.status,
                    product.featured,
                    product.catalog_visibility,
                    product.description,
                    product.short_description,
                    product.sku,
                    product.price,
                    product.regular_price,
                    product.sale_price,
                    product.on_sale,
                    product.purchasable,
                    product.stock_status,
                    product.stock_quantity,
                    product.manage_stock,
                    product.weight,
                    JSON.stringify(product.dimensions),
                    JSON.stringify(product.images),
                    JSON.stringify(product.attributes),
                    JSON.stringify(product.categories),
                    JSON.stringify(product.tags),
                    JSON.stringify(product.meta_data),
                    'site1',
                    'TechTitan Store',
                ]
            );
            syncedCount++;
        }

        logger.info(`Synced ${syncedCount} products`);

        res.json({
            success: true,
            synced: syncedCount,
            message: `Successfully synced ${syncedCount} products`,
        });
    } catch (error: any) {
        logger.error('Error syncing products:', error);
        res.status(500).json({
            error: 'Failed to sync products',
            message: error.message,
        });
    }
});

/**
 * POST /api/cache/clear
 * Clear product cache (useful for debugging category issues)
 */
router.post('/cache/clear', async (req, res) => {
    try {
        const { category } = req.body;
        
        if (category) {
            // Clear cache for specific category
            const categoryId = parseInt(category, 10);
            if (!isNaN(categoryId)) {
                // Clear all cache entries that might contain this category
                const cacheKeys = ['products:' + JSON.stringify({ category: categoryId })];
                cacheKeys.forEach(key => cache.delete(key));
                logger.info(`Cleared cache for category ${categoryId}`);
                res.json({ success: true, message: `Cache cleared for category ${categoryId}` });
            } else {
                res.status(400).json({ error: 'Invalid category ID' });
            }
        } else {
            // Clear all cache
            cache.clear();
            logger.info('Cleared all product cache');
            res.json({ success: true, message: 'All cache cleared' });
        }
    } catch (error: any) {
        logger.error('Error clearing cache:', error);
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error.message,
        });
    }
});

/**
 * GET /api/debug/category/:id
 * Debug endpoint to check category format in database
 */
router.get('/debug/category/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id, 10);
        if (isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        const pool = getDatabasePool();
        
        // Get a sample product with this category to see the format
        const sampleQuery = `
            SELECT id, name, categories 
            FROM products 
            WHERE categories IS NOT NULL 
            AND categories::text != 'null'
            AND categories::text != '[]'
            LIMIT 5
        `;
        
        const sampleResult = await pool.query(sampleQuery);
        
        // Try to find products with this category using different query methods
        const testQueries = [
            {
                name: 'Method 1: jsonb_array_elements with id extraction',
                query: `
                    SELECT COUNT(*) as count
                    FROM products 
                    WHERE status = 'publish'
                    AND EXISTS (
                        SELECT 1 
                        FROM jsonb_array_elements(categories) AS cat
                        WHERE (cat->>'id')::int = $1
                    )
                `,
                params: [categoryId]
            },
            {
                name: 'Method 2: Direct jsonb containment',
                query: `
                    SELECT COUNT(*) as count
                    FROM products 
                    WHERE status = 'publish'
                    AND categories::jsonb @> '[{"id": $1}]'::jsonb
                `,
                params: [categoryId]
            },
            {
                name: 'Method 3: Text search in jsonb',
                query: `
                    SELECT COUNT(*) as count
                    FROM products 
                    WHERE status = 'publish'
                    AND categories::text LIKE '%"id":' || $1 || '%'
                `,
                params: [categoryId]
            }
        ];

        const results: any = {
            categoryId,
            sampleProducts: sampleResult.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                categoriesFormat: typeof row.categories,
                categoriesSample: row.categories
            })),
            testResults: []
        };

        for (const testQuery of testQueries) {
            try {
                const result = await pool.query(testQuery.query, testQuery.params);
                results.testResults.push({
                    method: testQuery.name,
                    count: parseInt(result.rows[0].count, 10),
                    success: true
                });
            } catch (error: any) {
                results.testResults.push({
                    method: testQuery.name,
                    error: error.message,
                    success: false
                });
            }
        }

        res.json(results);
    } catch (error: any) {
        logger.error('Error debugging category:', error);
        res.status(500).json({
            error: 'Failed to debug category',
            message: error.message,
        });
    }
});

/**
 * GET /api/woocommerce/products
 * Direct proxy to WooCommerce API (bypasses database)
 */
router.get('/woocommerce/products', async (req, res) => {
    try {
        const {
            page = 1,
            per_page = 20,
            category,
            search,
            orderby = 'date',
            order = 'desc',
        } = req.query;

        const result = await wooCommerceClient.fetchProducts('site1', {
            page: parseInt(page as string, 10),
            per_page: parseInt(per_page as string, 10),
            category: category ? parseInt(category as string, 10) : undefined,
            search: search as string,
            orderby: orderby as string,
            order: order as string,
        });

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching from WooCommerce:', error);
        res.status(500).json({
            error: 'Failed to fetch from WooCommerce',
            message: error.message,
        });
    }
});

/**
 * GET /api/woocommerce/products/:id
 * Direct proxy to fetch single product from WooCommerce
 */
router.get('/woocommerce/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await wooCommerceClient.fetchProductById('site1', parseInt(id, 10));

        res.json(product);
    } catch (error: any) {
        logger.error('Error fetching product from WooCommerce:', error);
        res.status(500).json({
            error: 'Failed to fetch product from WooCommerce',
            message: error.message,
        });
    }
});

/**
 * GET /api/woocommerce/categories
 * Direct proxy to WooCommerce categories
 */
router.get('/woocommerce/categories', async (req, res) => {
    try {
        const categories = await wooCommerceClient.fetchCategories('site1');
        res.json(categories);
    } catch (error: any) {
        logger.error('Error fetching categories from WooCommerce:', error);
        res.status(500).json({
            error: 'Failed to fetch categories from WooCommerce',
            message: error.message,
        });
    }
});

export default router;
