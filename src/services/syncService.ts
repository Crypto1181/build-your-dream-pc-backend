import { getDatabasePool } from '../database/connection';
import { wooCommerceClient } from './woocommerceClient';
import { logger } from '../utils/logger';
import type { WooCommerceProduct, WooCommerceCategory } from '../types/woocommerce';
import { mapWooCommerceToPCComponent } from '../utils/productMapper';

interface SyncResult {
  productsSynced: number;
  categoriesSynced: number;
  errors: any[];
}

/**
 * Maps WooCommerce category to PC component category
 */
function mapCategoryToPCComponent(categorySlug: string, categoryName: string): string | null {
  const slug = categorySlug.toLowerCase();
  const name = categoryName.toLowerCase();

  // CPU
  if (slug.includes('cpu') || slug.includes('processor') || name.includes('cpu') || name.includes('processor')) {
    return 'cpu';
  }

  // GPU
  if (slug.includes('gpu') || slug.includes('graphics') || slug.includes('video-card') || 
      name.includes('gpu') || name.includes('graphics') || name.includes('video card')) {
    return 'gpu';
  }

  // Motherboard
  if (slug.includes('motherboard') || slug.includes('mainboard') || 
      name.includes('motherboard') || name.includes('mainboard')) {
    return 'motherboard';
  }

  // RAM
  if (slug.includes('ram') || slug.includes('memory') || 
      name.includes('ram') || name.includes('memory') || name.includes('ddr')) {
    return 'ram';
  }

  // Storage
  if (slug.includes('storage') || slug.includes('ssd') || slug.includes('hdd') || slug.includes('hard-drive') ||
      name.includes('storage') || name.includes('ssd') || name.includes('hdd') || name.includes('hard drive')) {
    return 'storage';
  }

  // PSU
  if (slug.includes('psu') || slug.includes('power-supply') || 
      name.includes('psu') || name.includes('power supply')) {
    return 'psu';
  }

  // Case
  if (slug.includes('case') || slug.includes('chassis') || 
      name.includes('case') || name.includes('chassis') || name.includes('tower')) {
    return 'case';
  }

  // Cooler
  if (slug.includes('cooler') || slug.includes('cooling') || 
      name.includes('cooler') || name.includes('cooling') || name.includes('fan')) {
    return 'cooler';
  }

  // Mouse
  if (slug.includes('mouse') || name.includes('mouse')) {
    return 'mouse';
  }

  // Keyboard
  if (slug.includes('keyboard') || name.includes('keyboard')) {
    return 'keyboard';
  }

  // Headset
  if (slug.includes('headset') || slug.includes('headphone') || 
      name.includes('headset') || name.includes('headphone')) {
    return 'headset';
  }

  return null;
}

/**
 * Sync categories from WooCommerce to database
 */
async function syncCategories(siteId: string = 'site1'): Promise<number> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Starting category sync...');
    const categories = await wooCommerceClient.fetchCategories(siteId);
    logger.info(`Fetched ${categories.length} categories from WooCommerce`);

    // Separate categories into parents and children
    const parentCategories = categories.filter(cat => !cat.parent || cat.parent === 0);
    const childCategories = categories.filter(cat => cat.parent && cat.parent !== 0);
    
    // Create a map of WooCommerce ID to database ID for parent lookup
    const wooIdToDbId = new Map<number, number>();
    let synced = 0;

    // First, sync all parent categories (no parent)
    for (const wcCategory of parentCategories) {
      try {
        const result = await client.query(
          `INSERT INTO categories (
            woo_commerce_id, name, slug, description, parent_id, count, image_url, updated_at
          ) VALUES ($1, $2, $3, $4, NULL, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT (woo_commerce_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            parent_id = NULL,
            count = EXCLUDED.count,
            image_url = EXCLUDED.image_url,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id`,
          [
            wcCategory.id,
            wcCategory.name,
            wcCategory.slug,
            wcCategory.description || null,
            wcCategory.count || 0,
            wcCategory.image?.src || null,
          ]
        );
        
        // Store the mapping
        if (result.rows.length > 0) {
          wooIdToDbId.set(wcCategory.id, result.rows[0].id);
        }
        synced++;
      } catch (error: any) {
        logger.error(`Error syncing parent category ${wcCategory.id}:`, {
          message: error.message,
          code: error.code,
        });
      }
    }

    // Now sync child categories, but we need to map parent WooCommerce ID to database ID
    // We'll need to query the database to get the parent's database ID
    for (const wcCategory of childCategories) {
      try {
        // Get the parent's database ID from our map or query
        let parentDbId: number | null = null;
        
        if (wooIdToDbId.has(wcCategory.parent)) {
          parentDbId = wooIdToDbId.get(wcCategory.parent)!;
        } else {
          // Query database for parent's database ID
          const parentResult = await client.query(
            'SELECT id FROM categories WHERE woo_commerce_id = $1',
            [wcCategory.parent]
          );
          if (parentResult.rows.length > 0) {
            parentDbId = parentResult.rows[0].id;
            wooIdToDbId.set(wcCategory.parent, parentDbId);
          }
        }

        const result = await client.query(
          `INSERT INTO categories (
            woo_commerce_id, name, slug, description, parent_id, count, image_url, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          ON CONFLICT (woo_commerce_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            parent_id = EXCLUDED.parent_id,
            count = EXCLUDED.count,
            image_url = EXCLUDED.image_url,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id`,
          [
            wcCategory.id,
            wcCategory.name,
            wcCategory.slug,
            wcCategory.description || null,
            parentDbId,
            wcCategory.count || 0,
            wcCategory.image?.src || null,
          ]
        );
        
        // Store the mapping for potential grandchildren
        if (result.rows.length > 0) {
          wooIdToDbId.set(wcCategory.id, result.rows[0].id);
        }
        synced++;
      } catch (error: any) {
        logger.error(`Error syncing child category ${wcCategory.id} (parent: ${wcCategory.parent}):`, {
          message: error.message,
          code: error.code,
        });
      }
    }

    logger.info(`✅ Synced ${synced} categories`);
    return synced;
  } finally {
    client.release();
  }
}

/**
 * Sync products from WooCommerce to database
 */
async function syncProducts(siteId: string = 'site1', limit?: number): Promise<number> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Starting product sync...');
    
    // Fetch all products (or limited amount)
    const products = limit 
      ? (await wooCommerceClient.fetchProducts(siteId, { per_page: limit })).products
      : await wooCommerceClient.fetchAllProducts(siteId);
    
    logger.info(`Fetched ${products.length} products from WooCommerce`);

    let synced = 0;
    const errors: any[] = [];

    for (const wcProduct of products) {
      try {
        // Determine PC component category
        let pcComponentCategory: string | null = null;
        if (wcProduct.categories && wcProduct.categories.length > 0) {
          for (const cat of wcProduct.categories) {
            const mapped = mapCategoryToPCComponent(cat.slug, cat.name);
            if (mapped) {
              pcComponentCategory = mapped;
              break;
            }
          }
        }

        // Parse prices
        const price = wcProduct.price ? parseFloat(wcProduct.price) : null;
        const regularPrice = wcProduct.regular_price ? parseFloat(wcProduct.regular_price) : null;
        const salePrice = wcProduct.sale_price ? parseFloat(wcProduct.sale_price) : null;

        await client.query(
          `INSERT INTO products (
            woo_commerce_id, name, slug, permalink, type, status, featured, catalog_visibility,
            description, short_description, sku, price, regular_price, sale_price,
            on_sale, purchasable, stock_status, stock_quantity, manage_stock, weight,
            dimensions, images, attributes, categories, tags, meta_data,
            pc_component_category, site_id, site_name, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, CURRENT_TIMESTAMP)
          ON CONFLICT (woo_commerce_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            permalink = EXCLUDED.permalink,
            status = EXCLUDED.status,
            featured = EXCLUDED.featured,
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
            weight = EXCLUDED.weight,
            dimensions = EXCLUDED.dimensions,
            images = EXCLUDED.images,
            attributes = EXCLUDED.attributes,
            categories = EXCLUDED.categories,
            tags = EXCLUDED.tags,
            meta_data = EXCLUDED.meta_data,
            pc_component_category = EXCLUDED.pc_component_category,
            updated_at = CURRENT_TIMESTAMP,
            synced_at = CURRENT_TIMESTAMP`,
          [
            wcProduct.id,
            wcProduct.name,
            wcProduct.slug,
            wcProduct.permalink,
            wcProduct.type,
            wcProduct.status,
            wcProduct.featured,
            wcProduct.catalog_visibility,
            wcProduct.description || null,
            wcProduct.short_description || null,
            wcProduct.sku || null,
            price,
            regularPrice,
            salePrice,
            wcProduct.on_sale,
            wcProduct.purchasable,
            wcProduct.stock_status,
            wcProduct.stock_quantity,
            wcProduct.manage_stock,
            wcProduct.weight || null,
            wcProduct.dimensions || null,
            JSON.stringify(wcProduct.images || []),
            JSON.stringify(wcProduct.attributes || []),
            JSON.stringify(wcProduct.categories || []),
            JSON.stringify(wcProduct.tags || []),
            JSON.stringify(wcProduct.meta_data || []),
            pcComponentCategory,
            siteId,
            'TechTitan Store',
          ]
        );
        synced++;
      } catch (error: any) {
        logger.error(`Error syncing product ${wcProduct.id} (${wcProduct.name}):`, error.message);
        errors.push({ productId: wcProduct.id, productName: wcProduct.name, error: error.message });
      }
    }

    logger.info(`✅ Synced ${synced} products (${errors.length} errors)`);
    return synced;
  } finally {
    client.release();
  }
}

/**
 * Full sync: categories and products
 */
export async function performFullSync(): Promise<SyncResult> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  const syncLogId = await createSyncLog('full', 'running');
  const startTime = Date.now();
  const errors: any[] = [];

  try {
    logger.info('🚀 Starting full sync...');

    // Sync categories first
    let categoriesSynced = 0;
    try {
      categoriesSynced = await syncCategories('site1');
    } catch (error: any) {
      logger.error('Category sync failed:', error);
      errors.push({ type: 'categories', error: error.message });
    }

    // Sync products
    let productsSynced = 0;
    try {
      productsSynced = await syncProducts('site1');
    } catch (error: any) {
      logger.error('Product sync failed:', error);
      errors.push({ type: 'products', error: error.message });
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Update sync log
    await updateSyncLog(syncLogId, 'completed', productsSynced, categoriesSynced, errors, duration);

    logger.info(`✅ Full sync completed in ${duration}s (${productsSynced} products, ${categoriesSynced} categories)`);

    return {
      productsSynced,
      categoriesSynced,
      errors,
    };
  } catch (error: any) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    await updateSyncLog(syncLogId, 'failed', 0, 0, [{ error: error.message }], duration);
    logger.error('Full sync failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create sync log entry
 */
async function createSyncLog(syncType: string, status: string): Promise<number> {
  const pool = getDatabasePool();
  const result = await pool.query(
    'INSERT INTO sync_logs (sync_type, status) VALUES ($1, $2) RETURNING id',
    [syncType, status]
  );
  return result.rows[0].id;
}

/**
 * Update sync log entry
 */
async function updateSyncLog(
  id: number,
  status: string,
  productsSynced: number,
  categoriesSynced: number,
  errors: any[],
  durationSeconds: number
): Promise<void> {
  const pool = getDatabasePool();
  await pool.query(
    `UPDATE sync_logs 
     SET status = $1, products_synced = $2, categories_synced = $3, 
         errors = $4, completed_at = CURRENT_TIMESTAMP, duration_seconds = $5
     WHERE id = $6`,
    [status, productsSynced, categoriesSynced, JSON.stringify(errors), durationSeconds, id]
  );
}

// Export for direct execution
if (require.main === module) {
  performFullSync()
    .then((result) => {
      logger.info('Sync completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Sync failed:', error);
      process.exit(1);
    });
}
