import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import type { WooCommerceProduct, WooCommerceCategory, WooCommerceSite } from '../types/woocommerce';

export class WooCommerceClient {
  private clients: Map<string, AxiosInstance> = new Map();

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    // Get WooCommerce sites from environment
    const sites = this.getWooCommerceSites();
    
    sites.forEach((site) => {
      const client = axios.create({
        baseURL: site.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username: site.consumerKey,
          password: site.consumerSecret,
        },
      });

      // Add request interceptor for logging
      client.interceptors.request.use(
        (config) => {
          logger.debug(`WooCommerce API Request: ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => {
          logger.error('WooCommerce API Request Error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor for error handling
      client.interceptors.response.use(
        (response) => response,
        (error) => {
          logger.error(`WooCommerce API Error: ${error.message}`, {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
          });
          return Promise.reject(error);
        }
      );

      this.clients.set(site.id, client);
    });
  }

  private getWooCommerceSites(): WooCommerceSite[] {
    const sites: WooCommerceSite[] = [];

    // Primary site from environment
    // Use WOOCOMMERCE_URL if present (Render style), otherwise WOOCOMMERCE_BASE_URL
    const baseUrl = process.env.WOOCOMMERCE_URL || process.env.WOOCOMMERCE_BASE_URL || 'https://techtitan-lb.com/wp-json/wc/v3';
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

    if (consumerKey && consumerSecret) {
      sites.push({
        id: 'site1',
        name: 'TechTitan Store',
        baseUrl,
        consumerKey,
        consumerSecret,
      });
    }

    return sites;
  }

  async fetchProducts(
    siteId: string = 'site1',
    params: {
      per_page?: number;
      page?: number;
      category?: number;
      search?: string;
      orderby?: string;
      order?: string;
      status?: string;
    } = {}
  ): Promise<{ products: WooCommerceProduct[]; total: number; totalPages: number }> {
    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(`WooCommerce client not found for site: ${siteId}`);
    }

    const {
      per_page = 100,
      page = 1,
      category,
      search,
      orderby = 'date',
      order = 'desc',
      status = 'publish',
    } = params;

    const queryParams: any = {
      per_page,
      page,
      orderby,
      order,
      status,
    };

    if (category) {
      queryParams.category = category;
    }

    if (search) {
      queryParams.search = search;
    }

    try {
      const response = await client.get('/products', { params: queryParams });
      const products: WooCommerceProduct[] = response.data;
      const total = parseInt(response.headers['x-wp-total'] || '0', 10);
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0', 10);

      return { products, total, totalPages };
    } catch (error: any) {
      logger.error(`Error fetching products from ${siteId}:`, error.message);
      throw error;
    }
  }

  async fetchProductById(siteId: string, productId: number): Promise<WooCommerceProduct> {
    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(`WooCommerce client not found for site: ${siteId}`);
    }

    try {
      const response = await client.get(`/products/${productId}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Error fetching product ${productId} from ${siteId}:`, error.message);
      throw error;
    }
  }

  async fetchCategories(siteId: string = 'site1'): Promise<WooCommerceCategory[]> {
    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(`WooCommerce client not found for site: ${siteId}`);
    }

    try {
      const response = await client.get('/products/categories', {
        params: { per_page: 100 },
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Error fetching categories from ${siteId}:`, error.message);
      throw error;
    }
  }

  async fetchAllProducts(
    siteId: string = 'site1',
    params: {
      category?: number;
      search?: string;
      status?: string;
    } = {}
  ): Promise<WooCommerceProduct[]> {
    const allProducts: WooCommerceProduct[] = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100;
    const maxPages = 100; // Safety limit

    while (hasMore && page <= maxPages) {
      try {
        const result = await this.fetchProducts(siteId, {
          ...params,
          page,
          per_page: perPage,
        });

        allProducts.push(...result.products);

        if (result.products.length < perPage || page >= result.totalPages) {
          hasMore = false;
        } else {
          page++;
        }

        // Small delay to avoid rate limiting
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        logger.error(`Error fetching page ${page} from ${siteId}:`, error);
        hasMore = false;
      }
    }

    return allProducts;
  }
}

// Singleton instance
export const wooCommerceClient = new WooCommerceClient();
