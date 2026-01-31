# 📡 Backend API Endpoints

## Base URL

**Local:** `http://localhost:3001/api`  
**Production:** `https://your-backend-domain.com/api`

## 🔍 Available Endpoints

### Health Check
```
GET /health
```
Returns server status

### Products

#### Get All Products
```
GET /api/products
```
**Query Parameters:**
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20)
- `category` - Filter by category ID
- `search` - Search term
- `pc_component_category` - Filter by component type (cpu, gpu, etc.)
- `featured` - Filter featured products (true/false)
- `min_price` - Minimum price
- `max_price` - Maximum price
- `orderby` - Sort field (price, date, name)
- `order` - Sort direction (asc, desc)

**Example:**
```
GET /api/products?page=1&per_page=20&category=123
```

#### Get Single Product
```
GET /api/products/:id
```
**Example:**
```
GET /api/products/12345
```

#### Search Products
```
GET /api/products/search?q=laptop&limit=50
```

### Categories

#### Get All Categories (Flat List)
```
GET /api/categories
```
**Query Parameters:**
- `parent_id` - Filter by parent category ID

**Example:**
```
GET /api/categories
GET /api/categories?parent_id=10
```

#### Get Category Tree ⭐
```
GET /api/categories/tree
```
Returns categories with parent-child relationships (for subcategories)

**Example:**
```
GET /api/categories/tree
```

**Response Format:**
```json
[
  {
    "id": 1,
    "name": "Laptops",
    "slug": "laptops",
    "children": [
      {
        "id": 2,
        "name": "Gaming Laptops",
        "slug": "gaming-laptops"
      },
      {
        "id": 3,
        "name": "Desktops",
        "slug": "desktops"
      }
    ]
  }
]
```

#### Get Single Category
```
GET /api/categories/:id
```

### Sync

#### Trigger Manual Sync
```
POST /api/sync
```
Manually trigger product/category sync from WooCommerce

#### Get Sync Status
```
GET /api/sync/status
```
Check current sync status

## 🧪 Test Examples

### Using Browser
1. Health: `http://localhost:3001/health`
2. Categories: `http://localhost:3001/api/categories`
3. Category Tree: `http://localhost:3001/api/categories/tree`
4. Products: `http://localhost:3001/api/products?per_page=10`

### Using curl
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/categories/tree
curl "http://localhost:3001/api/products?per_page=5"
```

### Using JavaScript (Frontend)
```javascript
// Fetch categories tree
const response = await fetch('http://localhost:3001/api/categories/tree');
const categories = await response.json();

// Fetch products
const products = await fetch('http://localhost:3001/api/products?per_page=20');
const data = await products.json();
```

## ✅ Response Format

All endpoints return JSON:

**Success:**
```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 5412,
    "total_pages": 271
  }
}
```

**Error:**
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## 🔐 Authentication

Currently, the API is open (no authentication required).  
For production, consider adding API keys or authentication.

## 📊 Current Data

- ✅ **5,412 products** synced
- ✅ **100 categories** synced
- ✅ **Category tree** with parent-child relationships
- ✅ **Fast queries** from PostgreSQL (<100ms)
