import { Request, Response } from 'express';
import { performFullSync } from '../services/syncService';
import { logger } from '../utils/logger';

export async function triggerSync(req: Request, res: Response): Promise<void> {
  try {
    // In production, you might want to add authentication here
    // For now, we'll allow manual sync triggers

    logger.info('Manual sync triggered via API');

    // Run sync in background (don't wait for it to complete)
    performFullSync()
      .then((result) => {
        logger.info('Manual sync completed:', result);
      })
      .catch((error) => {
        logger.error('Manual sync failed:', error);
      });

    res.json({
      message: 'Sync started',
      status: 'running',
    });
  } catch (error: any) {
    logger.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync', message: error.message });
  }
}

export async function getSyncStatus(req: Request, res: Response): Promise<void> {
  try {
    const { getDatabasePool } = require('../database/connection');
    const pool = getDatabasePool();

    const result = await pool.query(
      'SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10'
    );

    res.json(result.rows);
  } catch (error: any) {
    logger.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status', message: error.message });
  }
}
