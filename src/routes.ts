// Routes file - moved from routes/index.ts to fix module resolution
import { Express } from 'express';
import { getProducts, getProductById, searchProducts } from './controllers/productController';
import { getCategories, getCategoryById, getCategoryTree } from './controllers/categoryController';
import { triggerSync, getSyncStatus } from './controllers/syncController';

export function setupRoutes(app: Express): void {
  // Product routes
  app.get('/api/products', getProducts);
  app.get('/api/products/search', searchProducts);
  app.get('/api/products/:id', getProductById);

  // Category routes
  app.get('/api/categories', getCategories);
  app.get('/api/categories/tree', getCategoryTree);
  app.get('/api/categories/:id', getCategoryById);

  // Sync routes
  app.post('/api/sync', triggerSync);
  app.get('/api/sync/status', getSyncStatus);
}
