// Database types
export interface Product {
  id: number;
  woo_commerce_id: number | null;
  name: string;
  slug: string;
  permalink: string | null;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number | null;
  regular_price: number | null;
  sale_price: number | null;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  weight: string | null;
  dimensions: any;
  images: any;
  attributes: any;
  categories: any;
  tags: any;
  meta_data: any;
  pc_component_category: string | null;
  site_id: string | null;
  site_name: string | null;
  created_at: Date;
  updated_at: Date;
  synced_at: Date | null;
}

export interface Category {
  id: number;
  woo_commerce_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  image_url: string | null;
  count: number;
  created_at: Date;
  updated_at: Date;
}

export interface SyncLog {
  id: number;
  sync_type: string;
  status: string;
  products_synced: number;
  categories_synced: number;
  errors: any;
  started_at: Date;
  completed_at: Date | null;
  duration_seconds: number | null;
}
