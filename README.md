# Build Your Dream PC - Backend API

Node.js + Express + PostgreSQL backend for the Build Your Dream PC application.

## Features

- 🚀 Fast REST API with Express
- 💾 PostgreSQL database for product storage
- 🔄 Automatic WooCommerce sync (every 6 hours)
- ⚡ Response caching for improved performance
- 🔒 Security middleware (Helmet, CORS, Rate Limiting)
- 📊 Comprehensive logging

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` or individual DB credentials
- `WOOCOMMERCE_CONSUMER_KEY`
- `WOOCOMMERCE_CONSUMER_SECRET`
- `CORS_ORIGIN` (your frontend URL)

### 3. Set Up Database

Make sure PostgreSQL is running, then run migrations:

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

- `GET /health` - Health check
- `GET /api/products` - Get products (with pagination, filtering, search)
- `GET /api/products/:id` - Get single product
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/sync` - Trigger manual sync (admin only)

## Background Sync

The sync service automatically fetches products from WooCommerce every 6 hours and updates the database. You can also trigger a manual sync via the API.

## Production Deployment

1. Build the project: `npm run build`
2. Set production environment variables
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

Recommended hosting: Railway, Render, DigitalOcean, or AWS.
