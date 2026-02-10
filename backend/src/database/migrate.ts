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
        logger.info(`Schema file found at: ${srcPath}`);
      } else {
         // Try one more location: root level database/schema.sql (sometimes useful)
         const rootPath = join(process.cwd(), 'database', 'schema.sql');
         if (existsSync(rootPath)) {
           schemaPath = rootPath;
         } else {
           logger.warn(`⚠️ Schema file NOT found at ${schemaPath} or ${srcPath}. Skipping full schema run.`);
           // We do NOT return here, because we still want to try the manual migrations below
           // This prevents the app from crashing if schema.sql is missing but the DB is already set up
           schemaPath = '';
         }
      }
    }

    // ---------------------------------------------------------
    // PRE-FLIGHT CHECKS (Before running full schema)
    // ---------------------------------------------------------
    // This fixes the issue where schema.sql tries to create an index on a column 
    // that doesn't exist yet because the table already exists (skipping CREATE TABLE)
    // but the column is missing (because it's new).

    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      );
    `);

    if (checkTable.rows[0].exists) {
      // Check if display_order column exists in categories table
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='categories' AND column_name='display_order'
      `);

      if (checkColumn.rows.length === 0) {
        logger.info('Adding missing column: display_order to categories table (Pre-flight)');
        await client.query(`
          ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
        `);
      }
    }

    if (schemaPath) {
      const schema = readFileSync(schemaPath, 'utf-8');
      // Execute the entire schema as a single query
      await client.query(schema);
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
