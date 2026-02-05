import { getDatabasePool, closeDatabase } from './connection';
import dotenv from 'dotenv';

dotenv.config();

async function createSettingsTable() {
  const pool = getDatabasePool();
  
  try {
    console.log('Creating site_settings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default catalog URL if not exists
    await pool.query(`
      INSERT INTO site_settings (key, value)
      VALUES ('catalog_url', '/catalogs/peripherals-october-2025.pdf')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log('site_settings table created and default value inserted.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await closeDatabase();
  }
}

createSettingsTable();
