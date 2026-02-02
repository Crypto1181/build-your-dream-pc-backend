import { Express } from 'express';
import productRoutes from './productRoutes';
import { logger } from '../utils/logger';

export function setupRoutes(app: Express): void {
    logger.info('Setting up API routes...');

    // Mount product routes
    app.use('/api', productRoutes);

    logger.info('✅ API routes configured');
}
