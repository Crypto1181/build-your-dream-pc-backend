import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { get as httpGet } from 'http';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
import { setupRoutes } from './routes';
import { startSyncScheduler } from './services/syncScheduler';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Prevent unhandled rejections and uncaught exceptions from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection (non-fatal):', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Only exit on truly fatal errors, not on network/API timeouts
  if (error.message?.includes('EADDRINUSE') || error.message?.includes('out of memory')) {
    process.exit(1);
  }
});

// Check for required environment variables
const hasWooCommerce = (process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET) ||
  (process.env.WOOCOMMERCE_SITE1_KEY && process.env.WOOCOMMERCE_SITE1_SECRET);

if (!process.env.DATABASE_URL) {
  logger.warn('⚠️  WARNING: Missing DATABASE_URL environment variable');
}

if (!hasWooCommerce) {
  logger.warn('⚠️  WARNING: Missing WooCommerce credentials (WOOCOMMERCE_CONSUMER_KEY/SECRET or WOOCOMMERCE_SITE1_KEY/SECRET)');
  logger.warn('⚠️  WooCommerce integration will not work.');
}

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow the frontend to frame this API (needed for the PDF proxy)
      frameAncestors: ["'self'", process.env.CORS_ORIGIN || "*", "https://techtitan-lb.com", "http://localhost:8080"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://techtitan-lb.com',
  'https://www.techtitan-lb.com',
  'http://techtitan-lb.com',
  'http://www.techtitan-lb.com',
];

// Add CORS_ORIGIN env var if set (can be comma-separated for multiple origins)
if (process.env.CORS_ORIGIN) {
  const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
  envOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (NODE_ENV === 'development') {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
// Increased limit to support catalog browsing which triggers many requests
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced window)
  max: 500, // limit each IP to 500 requests per windowMs (increased limit)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api/', limiter);

// Health check endpoint (also used as keep-alive for Render free tier)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// Keep-alive mechanism to prevent cold starts on Render free tier
// Note: This should be set up externally (e.g., using a service like UptimeRobot)
// Render free tier spins down after 15 minutes of inactivity
// You can use a free service like UptimeRobot to ping /health every 14 minutes

// API routes
setupRoutes(app);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Run migrations
    const { runMigrations } = await import('./database/migrate');
    await runMigrations();

    // Start sync scheduler if enabled
    if (process.env.SYNC_ENABLED !== 'false') {
      startSyncScheduler();
      logger.info('✅ Sync scheduler started');
    } else {
      logger.info('⚠️ Sync scheduler disabled');
    }

    // Start HTTP server
    const server = createServer(app);
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${NODE_ENV}`);
      logger.info(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('CRITICAL ERROR: Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
