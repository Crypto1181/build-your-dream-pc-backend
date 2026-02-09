import { Request, Response } from 'express';
import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';
import axios from 'axios';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const pool = getDatabasePool();
    const result = await pool.query('SELECT key, value FROM site_settings');
    
    // Convert array of rows to object
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    res.json(settings);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSetting = async (req: Request, res: Response) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  try {
    const pool = getDatabasePool();
    
    // Update or insert
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );

    res.json({ message: 'Setting updated successfully', key, value });
  } catch (error) {
    logger.error(`Error updating setting ${key}:`, error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

export const getCatalogFile = async (req: Request, res: Response) => {
  try {
    const pool = getDatabasePool();
    const result = await pool.query("SELECT value FROM site_settings WHERE key = 'catalog_url'");
    
    let catalogUrl = result.rows[0]?.value;

    if (!catalogUrl) {
      return res.status(404).send('Catalog URL not configured');
    }

    // Handle "Short Filename" case if GITHUB_REPO is configured
    // If the user just typed "catalog.pdf" and we have a repo configured
    if (!catalogUrl.startsWith('http') && !catalogUrl.startsWith('/') && process.env.GITHUB_REPO) {
      catalogUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPO}/main/${catalogUrl}`;
    }

    // If it's a local path, redirect to it (let the frontend handle it)
    if (catalogUrl.startsWith('/')) {
      // If we are running on same domain, this works. 
      // If dev (port 3001 vs 8080), we might need to be careful, but 302 to relative path is browser-relative.
      // Since the API is at localhost:3001/api/..., a redirect to /catalogs/... goes to localhost:3001/catalogs/...
      // which is WRONG for dev (frontend is 8080).
      // But in production, they are same origin.
      // For dev support, we should probably just return the URL in JSON and let frontend decide, 
      // BUT this endpoint is meant to be the "Source" of the PDF.
      // Let's assume for now the user is using GitHub or External URL as requested.
      return res.redirect(catalogUrl);
    }

    // Convert GitHub Blob to Raw if needed
    if (catalogUrl.includes('github.com') && catalogUrl.includes('/blob/')) {
      catalogUrl = catalogUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    // Convert Google Drive "View" links to "Preview" links (embeddable)
    // From: https://drive.google.com/file/d/ID/view?usp=...
    // To:   https://drive.google.com/file/d/ID/preview
    if (catalogUrl.includes('drive.google.com') && (catalogUrl.includes('/view') || catalogUrl.endsWith('/view'))) {
      const match = catalogUrl.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        const fileId = match[1];
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        logger.info(`Converting Google Drive link to preview URL: ${previewUrl}`);
        // For Google Drive, we redirect the browser to the preview URL
        // because Google blocks server-side proxying without complex auth
        // and 'preview' URL is designed for iframe embedding.
        return res.redirect(previewUrl);
      }
    }

    logger.info(`Proxying catalog from: ${catalogUrl}`);

    const headers: Record<string, string> = {};
    if (process.env.GITHUB_TOKEN && catalogUrl.includes('github')) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get(catalogUrl, {
      responseType: 'stream',
      headers
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="catalog.pdf"');
    
    response.data.pipe(res);

  } catch (error: any) {
    logger.error('Error proxying catalog:', error.message);
    res.status(500).send('Failed to load catalog file');
  }
};
