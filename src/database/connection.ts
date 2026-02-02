import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (pool) {
    return pool;
  }

  // Always use individual connection parameters to avoid password parsing issues
  let config: PoolConfig;
  
  if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL manually to extract components
    // Format: postgresql://user:password@host:port/database
    const dbUrl = process.env.DATABASE_URL.trim();
    try {
      const url = new URL(dbUrl);
      const password = url.password || '';
      
      // Debug logging (without password)
      logger.info('Parsing DATABASE_URL:', {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1),
        user: url.username,
        passwordLength: password.length,
      });
      
      // Ensure password is a non-empty string
      if (!password || password.length === 0) {
        throw new Error('Password is empty in DATABASE_URL');
      }
      
      config = {
        host: url.hostname || 'localhost',
        port: parseInt(url.port || '5432', 10),
        database: url.pathname.slice(1) || 'pc_builder_db', // Remove leading /
        user: url.username || 'postgres',
        password: String(password), // Ensure password is always a string
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      };
    } catch (error) {
      logger.error('Failed to parse DATABASE_URL, using individual variables:', error);
      // Fallback to individual variables
      const password = process.env.DB_PASSWORD || '';
      config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'pc_builder_db',
        user: process.env.DB_USER || 'postgres',
        password: String(password), // Ensure password is always a string
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    }
  } else {
    // Use individual variables - ensure password is a string
    const password = process.env.DB_PASSWORD || '';
    config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'pc_builder_db',
      user: process.env.DB_USER || 'postgres',
      password: String(password), // Ensure password is always a string
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err: Error) => {
    logger.error('Unexpected error on idle client', err);
  });

  return pool;
}

export async function connectDatabase(): Promise<void> {
  const dbPool = getDatabasePool();
  
  try {
    // Test connection
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful:', result.rows[0]);
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}
