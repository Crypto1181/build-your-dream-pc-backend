import { Express } from 'express';
import productRoutes from './productRoutes';
import settingsRoutes from './settingsRoutes';
import { logger } from '../utils/logger';

export function setupRoutes(app: Express): void {
    logger.info('Setting up API routes...');

    // Mount product routes
    app.use('/api', productRoutes);
    
    // Mount settings routes
    app.use('/api/settings', settingsRoutes);

    logger.info('✅ API routes configured');
}
