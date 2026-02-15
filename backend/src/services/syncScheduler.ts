import cron from 'node-cron';
import { logger } from '../utils/logger';
import { wooCommerceClient } from './woocommerceClient';
import { getDatabasePool } from '../database/connection';

const hasWooCommerce =
    (process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET) ||
    (process.env.WOOCOMMERCE_SITE1_KEY && process.env.WOOCOMMERCE_SITE1_SECRET);

/**
 * Sync products from WooCommerce to PostgreSQL
 */
export async function syncProducts(): Promise<{ success: boolean; synced: number; errors: number }> {
    if (!hasWooCommerce) {
        logger.warn('Skipping product sync: WooCommerce credentials are not configured');
        return {
            success: false,
            synced: 0,
            errors: 1,
        };
    }

    logger.info('Starting product sync...');

    const pool = getDatabasePool();
    let syncedCount = 0;
    let errorCount = 0;

    try {
        // Fetch all products from WooCommerce
        const products = await wooCommerceClient.fetchAllProducts('site1', {
            status: 'publish',
        });

        logger.info(`Fetched ${products.length} products from WooCommerce`);

        // Upsert each product into database
        for (const product of products) {
            try {
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
            } catch (error: any) {
                logger.error(`Error syncing product ${product.id}:`, error.message);
                errorCount++;
            }
        }

        logger.info(`✅ Product sync completed: ${syncedCount} synced, ${errorCount} errors`);

        return {
            success: true,
            synced: syncedCount,
            errors: errorCount,
        };
    } catch (error: any) {
        logger.error('Product sync failed:', error);
        return {
            success: false,
            synced: syncedCount,
            errors: errorCount + 1,
        };
    }
}

/**
 * Sync categories from WooCommerce to PostgreSQL
 */
export async function syncCategories(): Promise<{ success: boolean; synced: number }> {
    if (!hasWooCommerce) {
        logger.warn('Skipping category sync: WooCommerce credentials are not configured');
        return {
            success: false,
            synced: 0,
        };
    }

    logger.info('Starting category sync...');

    const pool = getDatabasePool();
    let syncedCount = 0;

    try {
        // Fetch categories from WooCommerce
        const categories = await wooCommerceClient.fetchCategories('site1');

        logger.info(`Fetched ${categories.length} categories from WooCommerce`);

        // Upsert each category into database
        for (const category of categories) {
            try {
                await pool.query(
                    `INSERT INTO categories (
            woo_commerce_id, name, slug, description, image_url, count
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (woo_commerce_id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            count = EXCLUDED.count`,
                    [
                        category.id,
                        category.name,
                        category.slug,
                        category.description || '',
                        category.image?.src || null,
                        category.count || 0,
                    ]
                );
                syncedCount++;
            } catch (error: any) {
                logger.error(`Error syncing category ${category.id}:`, error.message);
            }
        }

        logger.info(`✅ Category sync completed: ${syncedCount} synced`);

        return {
            success: true,
            synced: syncedCount,
        };
    } catch (error: any) {
        logger.error('Category sync failed:', error);
        return {
            success: false,
            synced: syncedCount,
        };
    }
}

/**
 * Start scheduled sync jobs
 */
export function startSyncScheduler(): void {
    const syncSchedule = process.env.SYNC_SCHEDULE || '0 */6 * * *'; // Every 6 hours by default

    if (!hasWooCommerce) {
        logger.warn('Sync scheduler not started: WooCommerce credentials are not configured');
        return;
    }

    logger.info(`Scheduling product sync with cron: ${syncSchedule}`);

    cron.schedule(syncSchedule, async () => {
        logger.info('🔄 Running scheduled product sync...');
        await syncProducts();
        await syncCategories();
    });

    // Run initial sync on startup if enabled
    if (process.env.SYNC_ON_STARTUP !== 'false') {
        setTimeout(async () => {
            if (!hasWooCommerce) {
                logger.warn('Initial sync skipped: WooCommerce credentials are not configured');
                return;
            }
            logger.info('🔄 Running initial product sync...');
            await syncProducts();
            await syncCategories();
        }, 5000); // Wait 5 seconds after startup
    }
}
