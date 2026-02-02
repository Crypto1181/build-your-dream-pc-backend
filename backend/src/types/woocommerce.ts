// WooCommerce API types
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string | number | boolean | object;
  }>;
  date_created: string;
  date_modified: string;
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image?: {
    id: number;
    src: string;
  };
}

export interface WooCommerceSite {
  id: string;
  name: string;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}
