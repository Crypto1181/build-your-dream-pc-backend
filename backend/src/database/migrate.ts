import { readFileSync, existsSync } from 'fs';
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
    let schemaPath = join(__dirname, 'schema.sql');

    // If schema.sql is not found in current dir (e.g. dist/), try to find it in src
    if (!existsSync(schemaPath)) {
      const srcPath = join(process.cwd(), 'src', 'database', 'schema.sql');
      if (existsSync(srcPath)) {
        schemaPath = srcPath;
        logger.info(`Schema file found at: ${schemaPath}`);
      }
    }

    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute the entire schema as a single query
    // This avoids issues with splitting by semicolon which breaks function definitions
    await client.query(schema);

    // ---------------------------------------------------------
    // MANUAL MIGRATIONS (for existing tables)
    // ---------------------------------------------------------
    
    // Check if display_order column exists in categories table
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='categories' AND column_name='display_order'
    `);

    if (checkColumn.rows.length === 0) {
      logger.info('Adding missing column: display_order to categories table');
      await client.query(`
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);
      `);
    }

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
