import { Router } from 'express';
import { logger } from '../utils/logger';
import { wooCommerceClient } from '../services/woocommerceClient';
import { getDatabasePool } from '../database/connection';

const router = Router();

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

        const pool = getDatabasePool();

        // Build query based on filters
        let query = 'SELECT * FROM products WHERE status = $1';
        const params: any[] = ['publish'];
        let paramIndex = 2;

        if (pc_category) {
            query += ` AND pc_component_category = $${paramIndex}`;
            params.push(pc_category);
            paramIndex++;
        }

        // Filter by WooCommerce category ID if provided
        // Categories are stored as JSONB array in the database
        if (category) {
            const categoryId = parseInt(category as string, 10);
            if (!isNaN(categoryId)) {
                // Check if the categories JSONB array contains an object with this ID
                query += ` AND categories::jsonb @> '[{"id": ${categoryId}}]'::jsonb`;
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

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM products WHERE status = $1';
        const countParams: any[] = ['publish'];
        let countParamIndex = 2;

        if (pc_category) {
            countQuery += ` AND pc_component_category = $${countParamIndex}`;
            countParams.push(pc_category);
            countParamIndex++;
        }

        // Filter by WooCommerce category ID for count query too
        if (category) {
            const categoryId = parseInt(category as string, 10);
            if (!isNaN(categoryId)) {
                countQuery += ` AND categories::jsonb @> '[{"id": ${categoryId}}]'::jsonb`;
            }
        }

        if (search) {
            countQuery += ` AND (name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex} OR sku ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(total / limit);

        // Return in a format compatible with frontend expectations
        res.json({
            products: result.rows,
            pagination: {
                page: parseInt(page as string, 10),
                per_page: limit,
                total: total,
                total_pages: totalPages,
            },
        });
    } catch (error: any) {
        logger.error('Error fetching products:', error);
        res.status(500).json({
            error: 'Failed to fetch products',
            message: error.message,
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
 * GET /api/categories
 * Fetch all categories
 */
router.get('/categories', async (req, res) => {
    try {
        const pool = getDatabasePool();

        const result = await pool.query(
            'SELECT * FROM categories ORDER BY name ASC'
        );

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
