import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
import { setupRoutes } from './routes';
import { startSyncScheduler } from './services/syncScheduler';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());

// CORS configuration
let corsOptions: any = {
  credentials: true,
  optionsSuccessStatus: 200,
};

// Allow all origins in development for easier testing
if (NODE_ENV === 'development') {
  corsOptions.origin = true; // Allow all origins in dev
} else {
  // In production, allow specific origins
  // Check both CORS_ORIGIN and ALLOWED_ORIGINS for compatibility
  const corsOriginEnv = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
  const allowedOrigins = corsOriginEnv 
    ? corsOriginEnv.split(',').map(origin => origin.trim())
    : ['https://techtitan-lb.com', 'http://localhost:8080'];
  
  corsOptions.origin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };
}

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

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
app.use((req: express.Request, res: express.Response) => {
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
      logger.info(`🌐 CORS enabled for: ${corsOptions.origin}`);
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
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
