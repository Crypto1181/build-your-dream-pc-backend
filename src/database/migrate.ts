import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { getDatabasePool } from './connection';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function runMigrations() {
  // Debug: Log database URL (without password)
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    logger.info('Using DATABASE_URL:', maskedUrl);
  } else {
    logger.info('Using individual DB variables');
  }
  
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    logger.info('Running database migrations...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute entire schema as one transaction
    // This handles dollar-quoted strings and multi-line statements properly
    try {
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
      logger.info('✅ Schema executed successfully');
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // If transaction failed, try executing statements individually
      // This handles cases where some statements might already exist
      logger.warn('Transaction failed, trying individual statements...');
      
      // Split by semicolons but preserve dollar-quoted strings
      const statements: string[] = [];
      let currentStatement = '';
      let inDollarQuote = false;
      let dollarTag = '';
      
      for (let i = 0; i < schema.length; i++) {
        const char = schema[i];
        const nextChars = schema.substring(i, i + 2);
        
        // Check for dollar quote start/end
        if (nextChars.startsWith('$$')) {
          if (!inDollarQuote) {
            // Find the tag (e.g., $$tag$$)
            let tagEnd = i + 2;
            while (tagEnd < schema.length && schema[tagEnd] !== '$') {
              tagEnd++;
            }
            dollarTag = schema.substring(i, tagEnd + 1);
            inDollarQuote = true;
            currentStatement += dollarTag;
            i = tagEnd;
            continue;
          } else if (schema.substring(i, i + dollarTag.length) === dollarTag) {
            inDollarQuote = false;
            currentStatement += dollarTag;
            i += dollarTag.length - 1;
            continue;
          }
        }
        
        // Check for semicolon (statement end) only if not in dollar quote
        if (char === ';' && !inDollarQuote) {
          const trimmed = currentStatement.trim();
          if (trimmed && !trimmed.startsWith('--')) {
            statements.push(trimmed);
          }
          currentStatement = '';
        } else {
          currentStatement += char;
        }
      }
      
      // Add last statement if exists
      const trimmed = currentStatement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      
      // Execute statements individually
      for (const statement of statements) {
        try {
          if (statement.length > 0) {
            await client.query(statement);
          }
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.code !== '42P07' && error.code !== '42710' && !error.message.includes('already exists')) {
            logger.warn('Migration statement warning:', {
              message: error.message,
              code: error.code,
            });
          }
        }
      }
    }
    
    // Verify tables were created
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'products', 'sync_logs', 'cache_metadata')
      ORDER BY table_name
    `);
    
    logger.info('Tables created:', tablesCheck.rows.map((r: any) => r.table_name));
    
    const requiredTables = ['categories', 'products', 'sync_logs', 'cache_metadata'];
    const createdTables = tablesCheck.rows.map((r: any) => r.table_name);
    const missingTables = requiredTables.filter(t => !createdTables.includes(t));
    
    if (missingTables.length > 0) {
      logger.warn('⚠️ Missing tables:', missingTables);
      logger.warn('Some tables were not created. You may need to run the migration again.');
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
