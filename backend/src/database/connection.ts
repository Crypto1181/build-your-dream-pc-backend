import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (pool) {
    return pool;
  }

  // Use DATABASE_URL if available, otherwise construct from individual variables
  const config: PoolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'pc_builder_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 10, // Reduced for free tier (Render free tier has limited connections)
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000, // Increased timeout for slower connections
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000, // Keep connections alive
      };

  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
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
