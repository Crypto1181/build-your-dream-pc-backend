import { Request, Response } from 'express';
import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const { parent_id, all } = req.query;
    const pool = getDatabasePool();

    let query = 'SELECT * FROM categories';
    const params: any[] = [];

    // If 'all=true' is specified, return all categories (including subcategories)
    // Otherwise, filter by parent_id if provided, or return root categories
    if (all === 'true' || all === '1') {
      // Return all categories
      query += ' ORDER BY parent_id NULLS FIRST, name ASC';
    } else if (parent_id) {
      query += ' WHERE parent_id = $1';
      params.push(parseInt(parent_id as string, 10));
      query += ' ORDER BY name ASC';
    } else {
      // Default: return root categories only (for backward compatibility)
      query += ' WHERE parent_id IS NULL';
      query += ' ORDER BY name ASC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', message: error.message });
  }
}

export async function getCategoryById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pool = getDatabasePool();

    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1 OR woo_commerce_id = $1',
      [parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category', message: error.message });
  }
}

export async function getCategoryTree(req: Request, res: Response): Promise<void> {
  try {
    const pool = getDatabasePool();

    // Get all categories
    const allCategories = await pool.query('SELECT * FROM categories ORDER BY parent_id NULLS FIRST, name ASC');

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map
    allCategories.rows.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    allCategories.rows.forEach((cat) => {
      const category = categoryMap.get(cat.id);
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(category);
        } else {
          rootCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    res.json(rootCategories);
  } catch (error: any) {
    logger.error('Error fetching category tree:', error);
    res.status(500).json({ error: 'Failed to fetch category tree', message: error.message });
  }
}
