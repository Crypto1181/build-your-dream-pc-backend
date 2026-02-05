-- Database schema for Build Your Dream PC backend
-- Run this script to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    woo_commerce_id INTEGER UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_categories_slug (slug),
    INDEX idx_categories_parent (parent_id),
    INDEX idx_categories_woo_id (woo_commerce_id)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    woo_commerce_id INTEGER UNIQUE,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    permalink TEXT,
    type VARCHAR(50) DEFAULT 'simple',
    status VARCHAR(50) DEFAULT 'publish',
    featured BOOLEAN DEFAULT FALSE,
    catalog_visibility VARCHAR(50) DEFAULT 'visible',
    description TEXT,
    short_description TEXT,
    sku VARCHAR(255),
    price DECIMAL(10, 2),
    regular_price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2),
    on_sale BOOLEAN DEFAULT FALSE,
    purchasable BOOLEAN DEFAULT TRUE,
    stock_status VARCHAR(50) DEFAULT 'instock',
    stock_quantity INTEGER,
    manage_stock BOOLEAN DEFAULT FALSE,
    weight VARCHAR(50),
    dimensions JSONB,
    images JSONB, -- Array of image objects
    attributes JSONB, -- Product attributes
    categories JSONB, -- Array of category IDs
    tags JSONB, -- Array of tag IDs
    meta_data JSONB, -- Additional metadata
    pc_component_category VARCHAR(100), -- Mapped PC component category (cpu, gpu, etc.)
    site_id VARCHAR(100), -- Which WooCommerce site this came from
    site_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP,
    INDEX idx_products_slug (slug),
    INDEX idx_products_sku (sku),
    INDEX idx_products_status (status),
    INDEX idx_products_featured (featured),
    INDEX idx_products_pc_category (pc_component_category),
    INDEX idx_products_woo_id (woo_commerce_id),
    INDEX idx_products_price (price),
    INDEX idx_products_updated (updated_at)
);

-- Full-text search index for products
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(short_description, '') || ' ' ||
        COALESCE(sku, '')
    )
);

-- Product sync log table
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'categories'
    status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
    products_synced INTEGER DEFAULT 0,
    categories_synced INTEGER DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    INDEX idx_sync_logs_status (status),
    INDEX idx_sync_logs_started (started_at)
);

-- Cache metadata table (for cache invalidation)
CREATE TABLE IF NOT EXISTS cache_metadata (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_type VARCHAR(50) NOT NULL, -- 'products', 'categories', 'search'
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_cache_expires (expires_at)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_categories_gin ON products USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON products USING GIN (attributes);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default catalog URL if not exists
INSERT INTO site_settings (key, value)
VALUES ('catalog_url', '/catalogs/peripherals-october-2025.pdf')
ON CONFLICT (key) DO NOTHING;
