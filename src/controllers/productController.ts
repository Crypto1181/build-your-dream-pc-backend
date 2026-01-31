import { Request, Response } from 'express';
import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = '1',
      per_page = '20',
      category,
      search,
      pc_component_category,
      featured,
      min_price,
      max_price,
      orderby = 'updated_at',
      order = 'desc',
    } = req.query;

    const pool = getDatabasePool();
    const pageNum = parseInt(page as string, 10);
    const perPage = Math.min(parseInt(per_page as string, 10), 100); // Max 100 per page
    const offset = (pageNum - 1) * perPage;

    // Build WHERE clause
    const conditions: string[] = ["status = 'publish'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      // Filter by category ID - check if categories JSONB array contains the category ID
      // Categories are stored as: [{"id": 123, "name": "Pens", "slug": "pens"}, ...]
      // The category parameter can be either:
      // 1. WooCommerce ID (from frontend category lookup)
      // 2. Internal database ID
      // We need to check both possibilities
      const categoryId = parseInt(category as string, 10);
      
      // First, try to find the category in the database to get its WooCommerce ID and slug
      const categoryResult = await pool.query(
        'SELECT id, woo_commerce_id, slug, name FROM categories WHERE id = $1 OR woo_commerce_id = $1',
        [categoryId]
      );
      
      let wooCommerceId = categoryId; // Default to the provided ID
      let categorySlug: string | null = null;
      let categoryName: string | null = null;
      
      if (categoryResult.rows.length > 0) {
        // If we found the category, use its WooCommerce ID
        const cat = categoryResult.rows[0];
        wooCommerceId = cat.woo_commerce_id;
        categorySlug = cat.slug;
        categoryName = cat.name;
        logger.info(`Category lookup: ID ${categoryId} → WooCommerce ID ${wooCommerceId || 'NULL'}, Slug: "${categorySlug}", Name: "${categoryName}"`);
      } else {
        logger.warn(`Category not found in database for ID: ${categoryId}`);
      }
      
      // Check if products have this category in their categories JSONB
      // Products store categories as: [{"id": 123, "name": "...", "slug": "..."}]
      // The 'id' field in the JSONB is the WooCommerce category ID
      // We'll try matching by ID first, then by slug as fallback
      
      if (wooCommerceId && categoryResult.rows.length > 0) {
        // Use WooCommerce ID if we found it and it's not null
        conditions.push(`EXISTS (
          SELECT 1 FROM jsonb_array_elements(categories) AS cat
          WHERE (cat->>'id')::int = $${paramIndex}
        )`);
        params.push(wooCommerceId);
        paramIndex++;
        logger.info(`Filtering products by WooCommerce category ID: ${wooCommerceId}`);
      } else if (categorySlug && categoryResult.rows.length > 0) {
        // Fallback: match by slug if WooCommerce ID is null
        // This handles cases where woo_commerce_id might be null
        conditions.push(`EXISTS (
          SELECT 1 FROM jsonb_array_elements(categories) AS cat
          WHERE LOWER(cat->>'slug') = LOWER($${paramIndex})
             OR LOWER(cat->>'name') = LOWER($${paramIndex + 1})
        )`);
        params.push(categorySlug, categoryName || categorySlug);
        paramIndex += 2;
        logger.info(`Filtering products by category slug: "${categorySlug}" (WooCommerce ID was null)`);
      } else {
        // Last resort: try the original ID (might be a WooCommerce ID already)
        conditions.push(`EXISTS (
          SELECT 1 FROM jsonb_array_elements(categories) AS cat
          WHERE (cat->>'id')::int = $${paramIndex}
        )`);
        params.push(categoryId);
        paramIndex++;
        logger.warn(`Using original category ID ${categoryId} (no category found in database or WooCommerce ID is null)`);
      }
    }

    if (pc_component_category) {
      conditions.push(`pc_component_category = $${paramIndex}`);
      params.push(pc_component_category);
      paramIndex++;
    }

    if (featured === 'true') {
      conditions.push('featured = true');
    }

    if (min_price) {
      conditions.push(`price >= $${paramIndex}`);
      params.push(parseFloat(min_price as string));
      paramIndex++;
    }

    if (max_price) {
      conditions.push(`price <= $${paramIndex}`);
      params.push(parseFloat(max_price as string));
      paramIndex++;
    }

    if (search) {
      conditions.push(`to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(short_description, '') || ' ' ||
        COALESCE(sku, '')
      ) @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(search);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get products
    const validOrderBy = ['name', 'price', 'updated_at', 'created_at', 'featured'].includes(orderby as string)
      ? orderby
      : 'updated_at';
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';

    const productsResult = await pool.query(
      `SELECT * FROM products 
       ${whereClause}
       ORDER BY ${validOrderBy} ${validOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, perPage, offset]
    );

    const totalPages = Math.ceil(total / perPage);

    res.json({
      products: productsResult.rows,
      pagination: {
        page: pageNum,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pool = getDatabasePool();

    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 OR woo_commerce_id = $1',
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product', message: error.message });
  }
}

export async function searchProducts(req: Request, res: Response): Promise<void> {
  try {
    const { q, limit = '20' } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const pool = getDatabasePool();
    const limitNum = Math.min(parseInt(limit as string, 10), 50);

    const result = await pool.query(
      `SELECT * FROM products 
       WHERE status = 'publish' 
       AND to_tsvector('english', 
         COALESCE(name, '') || ' ' || 
         COALESCE(description, '') || ' ' || 
         COALESCE(short_description, '') || ' ' ||
         COALESCE(sku, '')
       ) @@ plainto_tsquery('english', $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
      [q, limitNum]
    );

    res.json({
      products: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    logger.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products', message: error.message });
  }
}
