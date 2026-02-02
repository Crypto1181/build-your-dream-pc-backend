import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabasePool } from './connection';
import { logger } from '../utils/logger';

async function runMigrations() {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Running database migrations...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code !== '42P07' && error.code !== '42710') {
          logger.warn('Migration statement warning:', error.message);
        }
      }
    }

    logger.info('✅ Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}

export { runMigrations };
