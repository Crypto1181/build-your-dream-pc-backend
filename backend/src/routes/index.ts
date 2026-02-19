import { Express } from 'express';
import path from 'path';
import productRoutes from './productRoutes';
import settingsRoutes from './settingsRoutes';
import adminRoutes from './adminRoutes';
import { logger } from '../utils/logger';

export function setupRoutes(app: Express): void {
    logger.info('Setting up API routes...');

    // Mount product routes
    app.use('/api', productRoutes);

    // Mount settings routes
    app.use('/api/settings', settingsRoutes);

    // Mount admin API routes
    app.use('/api/admin', adminRoutes);

    // Serve admin panel static files
    const adminDistPath = path.join(__dirname, '../../admin-dist');
    app.use('/admin', require('express').static(adminDistPath));

    // SPA fallback for admin panel routes
    app.get('/admin/*', (req: any, res: any) => {
        res.sendFile(path.join(adminDistPath, 'index.html'));
    });

    logger.info('✅ API routes configured (including admin panel)');
}
