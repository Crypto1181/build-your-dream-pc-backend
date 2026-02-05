import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { getDatabasePool } from './connection';
import { logger } from '../utils/logger';

// Load environment variables when running standalone
dotenv.config();

async function runMigrations() {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Running database migrations...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute the entire schema as a single query
    // This avoids issues with splitting by semicolon which breaks function definitions
    await client.query(schema);

    logger.info('✅ Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    // Do not close the pool here as it's a singleton used by the app
    // await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(async () => {
      // Only close pool if running as a standalone script
      const { closeDatabase } = await import('./connection');
      await closeDatabase();
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}

export { runMigrations };
