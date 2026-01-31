import cron from 'node-cron';
import { performFullSync } from './syncService';
import { logger } from '../utils/logger';

let syncJob: cron.ScheduledTask | null = null;

/**
 * Start the sync scheduler
 * Runs full sync every 6 hours by default
 */
export function startSyncScheduler(): void {
  const intervalHours = parseInt(process.env.SYNC_INTERVAL_HOURS || '6', 10);
  const cronExpression = `0 */${intervalHours} * * *`; // Every X hours

  logger.info(`Setting up sync scheduler: every ${intervalHours} hours`);

  // Stop existing job if any
  if (syncJob) {
    syncJob.stop();
  }

  // Create new cron job
  syncJob = cron.schedule(cronExpression, async () => {
    logger.info('⏰ Scheduled sync triggered');
    try {
      await performFullSync();
    } catch (error) {
      logger.error('Scheduled sync failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  logger.info('✅ Sync scheduler started');

  // Run initial sync after 1 minute (to let server start up)
  setTimeout(async () => {
    logger.info('Running initial sync...');
    try {
      await performFullSync();
    } catch (error) {
      logger.error('Initial sync failed:', error);
    }
  }, 60000); // 1 minute delay
}

/**
 * Stop the sync scheduler
 */
export function stopSyncScheduler(): void {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    logger.info('Sync scheduler stopped');
  }
}
