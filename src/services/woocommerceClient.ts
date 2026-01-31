import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import type { WooCommerceProduct, WooCommerceCategory, WooCommerceSite } from '../types/woocommerce';

// Load environment variables
dotenv.config();

export class WooCommerceClient {
  private clients: Map<string, AxiosInstance> = new Map();
  private initialized: boolean = false;

  constructor() {
    // Don't initialize immediately - wait until first use
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initializeClients();
      this.initialized = true;
    }
  }

  private initializeClients() {
    // Get WooCommerce sites from environment
    const sites = this.getWooCommerceSites();
    
    if (sites.length === 0) {
      logger.warn('⚠️ No WooCommerce sites configured. Check WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET in .env file');
      return;
    }
    
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

    // Primary site from environment - support both naming conventions
    const baseUrl = process.env.WOOCOMMERCE_SITE1_URL || 
                    process.env.WOOCOMMERCE_BASE_URL || 
                    'https://techtitanlb.com/wp-json/wc/v3';
    
    // Support both WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_SITE1_KEY
    const consumerKey = process.env.WOOCOMMERCE_SITE1_KEY || 
                        process.env.WOOCOMMERCE_CONSUMER_KEY || 
                        '';
    
    // Support both WOOCOMMERCE_CONSUMER_SECRET and WOOCOMMERCE_SITE1_SECRET
    const consumerSecret = process.env.WOOCOMMERCE_SITE1_SECRET || 
                           process.env.WOOCOMMERCE_CONSUMER_SECRET || 
                           '';

    logger.info('WooCommerce configuration check:', {
      baseUrl,
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      consumerKeyLength: consumerKey.length,
      consumerSecretLength: consumerSecret.length,
      envVarsUsed: {
        url: process.env.WOOCOMMERCE_SITE1_URL ? 'WOOCOMMERCE_SITE1_URL' : 
             process.env.WOOCOMMERCE_BASE_URL ? 'WOOCOMMERCE_BASE_URL' : 'default',
        key: process.env.WOOCOMMERCE_SITE1_KEY ? 'WOOCOMMERCE_SITE1_KEY' : 
             process.env.WOOCOMMERCE_CONSUMER_KEY ? 'WOOCOMMERCE_CONSUMER_KEY' : 'none',
        secret: process.env.WOOCOMMERCE_SITE1_SECRET ? 'WOOCOMMERCE_SITE1_SECRET' : 
                process.env.WOOCOMMERCE_CONSUMER_SECRET ? 'WOOCOMMERCE_CONSUMER_SECRET' : 'none',
      },
    });

    if (consumerKey && consumerSecret) {
      sites.push({
        id: 'site1',
        name: 'TechTitan Store',
        baseUrl,
        consumerKey,
        consumerSecret,
      });
      logger.info(`✅ WooCommerce client configured for ${sites[0].name}`);
    } else {
      logger.error('❌ WooCommerce credentials missing!', {
        consumerKey: consumerKey ? 'present' : 'missing',
        consumerSecret: consumerSecret ? 'present' : 'missing',
        checkedEnvVars: [
          'WOOCOMMERCE_SITE1_KEY',
          'WOOCOMMERCE_CONSUMER_KEY',
          'WOOCOMMERCE_SITE1_SECRET',
          'WOOCOMMERCE_CONSUMER_SECRET',
        ],
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
    this.ensureInitialized();
    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(`WooCommerce client not found for site: ${siteId}. Check WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET in .env file`);
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
    this.ensureInitialized();
    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(`WooCommerce client not found for site: ${siteId}. Check WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET in .env file`);
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
    this.ensureInitialized();
    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(`WooCommerce client not found for site: ${siteId}. Check WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET in .env file`);
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
