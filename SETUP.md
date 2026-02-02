# Backend Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ installed and running
- WooCommerce API credentials

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the `backend` directory with the following:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/pc_builder_db
# OR use individual variables:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=pc_builder_db
# DB_USER=postgres
# DB_PASSWORD=your_password

# WooCommerce API Configuration
WOOCOMMERCE_BASE_URL=https://techtitanlb.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here

# Sync Configuration
SYNC_INTERVAL_HOURS=6
SYNC_ENABLED=true

# CORS Configuration (your frontend URL)
CORS_ORIGIN=http://localhost:8080

# Logging
LOG_LEVEL=info
```

## Step 3: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pc_builder_db;

# Exit psql
\q
```

## Step 4: Run Migrations

```bash
npm run migrate
```

This will create all necessary tables in your database.

## Step 5: Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Step 6: Initial Sync

The sync will run automatically after 1 minute of server startup. You can also trigger it manually:

```bash
npm run sync
```

Or via API:
```bash
curl -X POST http://localhost:3001/api/sync
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/products` - Get products (with pagination, filtering)
- `GET /api/products/:id` - Get single product
- `GET /api/products/search?q=query` - Search products
- `GET /api/categories` - Get all categories
- `GET /api/categories/tree` - Get category tree
- `GET /api/categories/:id` - Get single category
- `POST /api/sync` - Trigger manual sync
- `GET /api/sync/status` - Get sync status

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Build the project: `npm run build`
3. Start server: `npm start`

Recommended hosting platforms:
- Railway
- Render
- DigitalOcean
- AWS
