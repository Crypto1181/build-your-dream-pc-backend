import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
import { getDatabasePool } from '../database/connection';
import { requireAdmin, loginHandler, AuthRequest } from '../middleware/adminAuth';
import { uploadImage, deleteImage, isCloudinaryConfigured } from '../services/cloudinaryService';
import { cache } from '../utils/cache';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// ==========================================
// AUTH
// ==========================================

router.post('/login', loginHandler);

// ==========================================
// DASHBOARD STATS
// ==========================================

router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const [totalProducts, publishedProducts, outOfStock, categories, featured] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM products'),
            pool.query("SELECT COUNT(*) FROM products WHERE status = 'publish'"),
            pool.query("SELECT COUNT(*) FROM products WHERE stock_status = 'outofstock'"),
            pool.query('SELECT COUNT(*) FROM categories'),
            pool.query("SELECT COUNT(*) FROM products WHERE featured = true"),
        ]);

        res.json({
            totalProducts: parseInt(totalProducts.rows[0].count),
            publishedProducts: parseInt(publishedProducts.rows[0].count),
            outOfStock: parseInt(outOfStock.rows[0].count),
            inStock: parseInt(publishedProducts.rows[0].count) - parseInt(outOfStock.rows[0].count),
            totalCategories: parseInt(categories.rows[0].count),
            featuredProducts: parseInt(featured.rows[0].count),
            cloudinaryConfigured: isCloudinaryConfigured(),
        });
    } catch (error: any) {
        logger.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
    }
});

// ==========================================
// PRODUCTS CRUD
// ==========================================

/**
 * GET /api/admin/products - List all products (including hidden/draft)
 */
router.get('/products', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const {
            page = '1',
            per_page = '25',
            search,
            category,
            status,
            stock_status,
            orderby = 'updated_at',
            order = 'desc',
        } = req.query;

        const pool = getDatabasePool();
        const limit = Math.min(parseInt(per_page as string) || 25, 100);
        const offset = (Math.max(parseInt(page as string) || 1, 1) - 1) * limit;

        let query = 'SELECT * FROM products WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        // Filter by status (admin can see all statuses)
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Filter by stock status
        if (stock_status) {
            query += ` AND stock_status = $${paramIndex}`;
            params.push(stock_status);
            paramIndex++;
        }

        // Search
        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR short_description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Category filter
        if (category) {
            const categoryId = parseInt(category as string, 10);
            if (!isNaN(categoryId)) {
                query += ` AND (
                    categories @> ('[{"id": ' || $${paramIndex} || '}]')::jsonb
                    OR categories::text LIKE '%"id":' || $${paramIndex}::text || '%'
                )`;
                params.push(categoryId);
                paramIndex++;
            }
        }

        // Count query
        const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) FROM');
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Ordering
        const validOrderBy: Record<string, string> = {
            name: 'name',
            price: 'price',
            date: 'created_at',
            updated_at: 'updated_at',
            id: 'id',
            stock_status: 'stock_status',
        };
        const sortCol = validOrderBy[orderby as string] || 'updated_at';
        const sortDir = (order as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortCol} ${sortDir}`;

        // Pagination
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            products: result.rows,
            pagination: {
                page: parseInt(page as string) || 1,
                per_page: limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        logger.error('Error fetching admin products:', error);
        res.status(500).json({ error: 'Failed to fetch products', message: error.message });
    }
});

/**
 * GET /api/admin/products/:id - Get single product
 */
router.get('/products/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product', message: error.message });
    }
});

/**
 * POST /api/admin/products - Create new product
 */
router.post('/products', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const {
            name, slug, type = 'simple', status = 'publish', featured = false,
            catalog_visibility = 'visible', description, short_description, sku,
            price, regular_price, sale_price, on_sale = false,
            stock_status = 'instock', stock_quantity, manage_stock = false,
            weight, dimensions, images, attributes, categories, tags,
            pc_component_category
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Product name is required' });
        }

        const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const result = await pool.query(
            `INSERT INTO products (
                name, slug, type, status, featured, catalog_visibility,
                description, short_description, sku, price, regular_price,
                sale_price, on_sale, stock_status, stock_quantity, manage_stock,
                weight, dimensions, images, attributes, categories, tags,
                pc_component_category
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
            RETURNING *`,
            [
                name, productSlug, type, status, featured, catalog_visibility,
                description, short_description, sku,
                price || null, regular_price || null, sale_price || null,
                on_sale, stock_status, stock_quantity || null, manage_stock,
                weight, JSON.stringify(dimensions || null),
                JSON.stringify(images || []), JSON.stringify(attributes || []),
                JSON.stringify(categories || []), JSON.stringify(tags || []),
                pc_component_category
            ]
        );

        // Clear cache
        cache.clear();

        logger.info(`Admin created product: ${name} (ID: ${result.rows[0].id})`);
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product', message: error.message });
    }
});

/**
 * PUT /api/admin/products/:id - Update product
 */
router.put('/products/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const productId = parseInt(req.params.id);

        // Build dynamic update query from provided fields
        const allowedFields = [
            'name', 'slug', 'type', 'status', 'featured', 'catalog_visibility',
            'description', 'short_description', 'sku', 'price', 'regular_price',
            'sale_price', 'on_sale', 'stock_status', 'stock_quantity', 'manage_stock',
            'weight', 'pc_component_category', 'permalink'
        ];
        const jsonFields = ['dimensions', 'images', 'attributes', 'categories', 'tags', 'meta_data'];

        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex}`);
                params.push(req.body[field]);
                paramIndex++;
            }
        }

        for (const field of jsonFields) {
            if (req.body[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex}`);
                params.push(JSON.stringify(req.body[field]));
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(productId);
        const query = `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        cache.clear();
        logger.info(`Admin updated product ID: ${productId}`);
        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product', message: error.message });
    }
});

/**
 * DELETE /api/admin/products/:id - Delete product
 */
router.delete('/products/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id, name', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        cache.clear();
        logger.info(`Admin deleted product: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
        res.json({ success: true, deleted: result.rows[0] });
    } catch (error: any) {
        logger.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product', message: error.message });
    }
});

/**
 * POST /api/admin/products/bulk-action - Bulk operations
 */
router.post('/products/bulk-action', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { ids, action, value } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Product IDs required' });
        }

        const pool = getDatabasePool();
        let result;

        switch (action) {
            case 'delete':
                result = await pool.query('DELETE FROM products WHERE id = ANY($1) RETURNING id', [ids]);
                break;
            case 'publish':
                result = await pool.query("UPDATE products SET status = 'publish' WHERE id = ANY($1) RETURNING id", [ids]);
                break;
            case 'draft':
                result = await pool.query("UPDATE products SET status = 'draft' WHERE id = ANY($1) RETURNING id", [ids]);
                break;
            case 'instock':
                result = await pool.query("UPDATE products SET stock_status = 'instock' WHERE id = ANY($1) RETURNING id", [ids]);
                break;
            case 'outofstock':
                result = await pool.query("UPDATE products SET stock_status = 'outofstock' WHERE id = ANY($1) RETURNING id", [ids]);
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        cache.clear();
        logger.info(`Admin bulk ${action}: ${result.rowCount} products`);
        res.json({ success: true, affected: result.rowCount });
    } catch (error: any) {
        logger.error('Error bulk action:', error);
        res.status(500).json({ error: 'Failed to perform bulk action', message: error.message });
    }
});

// ==========================================
// IMAGE UPLOAD
// ==========================================

router.post('/upload/image', requireAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        if (!isCloudinaryConfigured()) {
            return res.status(503).json({
                error: 'Cloudinary not configured',
                message: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables',
            });
        }

        const result = await uploadImage(req.file.buffer, req.file.originalname);
        logger.info(`Image uploaded: ${result.url}`);

        res.json({
            success: true,
            image: {
                src: result.url,
                name: req.file.originalname,
                alt: req.file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            },
        });
    } catch (error: any) {
        logger.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image', message: error.message });
    }
});

// ==========================================
// CSV IMPORT
// ==========================================

// Track import progress in memory
let importProgress = { running: false, total: 0, processed: 0, errors: 0, status: 'idle' as string };

router.get('/import/status', requireAdmin, (req: AuthRequest, res: Response) => {
    res.json(importProgress);
});

router.post('/import/csv', requireAdmin, upload.single('csv'), async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file provided' });
    }

    if (importProgress.running) {
        return res.status(409).json({ error: 'Import already in progress' });
    }

    // Start import in background
    importProgress = { running: true, total: 0, processed: 0, errors: 0, status: 'parsing' };

    // Return immediately
    res.json({ success: true, message: 'Import started' });

    // Process CSV in background
    try {
        const pool = getDatabasePool();
        const csvContent = req.file.buffer.toString('utf8');

        const records: any[] = [];
        const parser = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            quote: '"',
            escape: '"',
            trim: true,
        });

        for await (const record of parser) {
            records.push(record);
        }

        importProgress.total = records.length;
        importProgress.status = 'importing';
        logger.info(`CSV parsed: ${records.length} records found`);

        // Process records in batches
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            for (const record of batch) {
                try {
                    // Skip variation rows (they have a Parent value)
                    if (record['Parent'] && record['Parent'].trim() !== '') {
                        importProgress.processed++;
                        continue;
                    }

                    const wooId = parseInt(record['ID']);
                    if (isNaN(wooId)) {
                        importProgress.processed++;
                        importProgress.errors++;
                        continue;
                    }

                    // Parse categories from "Category1 > SubCategory, Category2" format
                    const categoriesRaw = record['Categories'] || '';
                    const categoryPaths = categoriesRaw.split(',').map((c: string) => c.trim()).filter(Boolean);
                    const categoriesJson = categoryPaths.map((path: string) => {
                        const parts = path.split('>').map((p: string) => p.trim());
                        return { name: parts[parts.length - 1], path };
                    });

                    // Parse images
                    const imagesRaw = record['Images'] || '';
                    const imageUrls = imagesRaw.split(',').map((u: string) => u.trim()).filter(Boolean);
                    const imagesJson = imageUrls.map((url: string, idx: number) => ({
                        id: idx,
                        src: url,
                        name: url.split('/').pop() || '',
                        alt: record['Name'] || '',
                    }));

                    // Parse tags
                    const tagsRaw = record['Tags'] || '';
                    const tagsJson = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean).map((name: string) => ({ name }));

                    // Parse attributes
                    const attributesJson: any[] = [];
                    for (let attrIdx = 1; attrIdx <= 3; attrIdx++) {
                        const attrName = record[`Attribute ${attrIdx} name`];
                        const attrValues = record[`Attribute ${attrIdx} value(s)`];
                        if (attrName && attrValues) {
                            attributesJson.push({
                                name: attrName,
                                options: attrValues.split(',').map((v: string) => v.trim()),
                                visible: record[`Attribute ${attrIdx} visible`] === '1',
                            });
                        }
                    }

                    // Determine prices
                    const regularPrice = parseFloat(record['Regular price']) || null;
                    const salePrice = parseFloat(record['Sale price']) || null;
                    const price = salePrice || regularPrice;

                    await pool.query(
                        `INSERT INTO products (
                            woo_commerce_id, name, slug, type, status, featured,
                            catalog_visibility, description, short_description, sku,
                            price, regular_price, sale_price, on_sale,
                            stock_status, stock_quantity, manage_stock,
                            weight, images, attributes, categories, tags,
                            site_id, site_name, synced_at
                        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW())
                        ON CONFLICT (woo_commerce_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            slug = EXCLUDED.slug,
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
                            stock_status = EXCLUDED.stock_status,
                            stock_quantity = EXCLUDED.stock_quantity,
                            images = EXCLUDED.images,
                            attributes = EXCLUDED.attributes,
                            categories = EXCLUDED.categories,
                            tags = EXCLUDED.tags,
                            synced_at = NOW()`,
                        [
                            wooId,
                            record['Name'] || 'Untitled',
                            (record['Name'] || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                            record['Type'] || 'simple',
                            record['Published'] === '1' ? 'publish' : 'draft',
                            record['Is featured?'] === '1',
                            record['Visibility in catalog'] || 'visible',
                            record['Description'] || '',
                            record['Short description'] || '',
                            record['SKU'] || null,
                            price,
                            regularPrice,
                            salePrice,
                            salePrice ? true : false,
                            record['In stock?'] === '1' ? 'instock' : 'outofstock',
                            parseInt(record['Stock']) || null,
                            record['Stock'] ? true : false,
                            record['Weight (kg)'] || null,
                            JSON.stringify(imagesJson),
                            JSON.stringify(attributesJson),
                            JSON.stringify(categoriesJson),
                            JSON.stringify(tagsJson),
                            'csv-import',
                            'CSV Import',
                        ]
                    );

                    importProgress.processed++;
                } catch (recordError: any) {
                    importProgress.processed++;
                    importProgress.errors++;
                    logger.error(`CSV import error on record: ${recordError.message}`);
                }
            }
        }

        cache.clear();
        importProgress.status = 'completed';
        importProgress.running = false;
        logger.info(`CSV import completed: ${importProgress.processed} processed, ${importProgress.errors} errors`);
    } catch (error: any) {
        importProgress.status = 'failed';
        importProgress.running = false;
        logger.error('CSV import failed:', error);
    }
});

// ==========================================
// CATEGORIES CRUD
// ==========================================

router.get('/categories', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const result = await pool.query('SELECT * FROM categories ORDER BY display_order ASC, name ASC');
        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories', message: error.message });
    }
});

router.post('/categories', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { name, slug, description, parent_id, image_url } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        const pool = getDatabasePool();
        const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const result = await pool.query(
            'INSERT INTO categories (name, slug, description, parent_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, catSlug, description || '', parent_id || null, image_url || null]
        );

        cache.clear();
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category', message: error.message });
    }
});

router.put('/categories/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { name, slug, description, parent_id, image_url, display_order } = req.body;

        const pool = getDatabasePool();
        const result = await pool.query(
            `UPDATE categories SET 
                name = COALESCE($1, name), 
                slug = COALESCE($2, slug), 
                description = COALESCE($3, description), 
                parent_id = $4, 
                image_url = $5,
                display_order = COALESCE($6, display_order)
            WHERE id = $7 RETURNING *`,
            [name, slug, description, parent_id || null, image_url || null, display_order, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        cache.clear();
        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category', message: error.message });
    }
});

router.delete('/categories/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const pool = getDatabasePool();
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id, name', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        cache.clear();
        res.json({ success: true, deleted: result.rows[0] });
    } catch (error: any) {
        logger.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category', message: error.message });
    }
});

export default router;
