const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { validateStartupEnvironment } = require('./config/environment');
const { getStorageProvider } = require('./config/storage');
const { getWardrobeMode, SHARED_WARDROBE_USER_ID } = require('./config/wardrobeMode');
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const wardrobeRoutes = require('./routes/wardrobeRoutes');

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const appDirectory = path.join(__dirname, '../../app');

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const amplifyOriginPattern = /^https:\/\/[a-z0-9-]+\.[a-z0-9]+\.amplifyapp\.com$/i;
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security middleware (relax for dev: allow cross-origin fetch from prototype)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rate limit all API calls, especially expensive AI generation endpoints.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) {
    next();
    return;
  }

  const forwardedProto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const requestHostOrigin = `${forwardedProto}://${req.get('host')}`;
  const allowedOrigins = new Set(configuredOrigins);

  if (process.env.APP_ORIGIN) {
    allowedOrigins.add(process.env.APP_ORIGIN);
  }

  const isAllowed =
    allowedOrigins.has(requestOrigin) ||
    requestOrigin === requestHostOrigin ||
    amplifyOriginPattern.test(requestOrigin) ||
    (process.env.NODE_ENV !== 'production' && localOriginPattern.test(requestOrigin));

  if (!isAllowed) {
    const error = new Error(`CORS blocked for origin: ${requestOrigin}`);
    error.statusCode = 403;
    next(error);
    return;
  }

  cors({
    origin: requestOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })(req, res, next);
});
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/app', express.static(appDirectory));
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(appDirectory, 'index.html'));
});

// Initialize data access
let server;

async function startServer() {
  const startupConfig = validateStartupEnvironment();

  if (startupConfig.isProduction && !startupConfig.hasExplicitCorsOrigin) {
    console.log('Warning: no explicit frontend origin configured. Same-origin requests will still work, but set CORS_ORIGINS or FRONTEND_URL for cross-origin deployments.');
  }

  server = app.listen(PORT, () => {
    console.log(`Fashion App API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('AI: Gemini (all features)');
    console.log('Auth: Cognito');
    console.log('Database: DynamoDB');
    console.log(`Storage: ${getStorageProvider()}`);
    console.log(`Wardrobe mode: ${getWardrobeMode()}${getWardrobeMode() === 'shared' ? ` (${SHARED_WARDROBE_USER_ID})` : ''}`);
    console.log(`Frontend: http://localhost:${PORT}/app`);
    if (process.env.GEMINI_API_KEY) console.log('Gemini API key configured');
    console.log('\nAvailable endpoints:');
    console.log('\nAuthentication:');
    console.log(`  POST /api/auth/register`);
    console.log(`  POST /api/auth/confirm`);
    console.log(`  POST /api/auth/login`);
    console.log(`  POST /api/auth/refresh`);
    console.log(`  GET  /api/auth/me`);
    console.log('\nProfile:');
    console.log(`  GET    /api/profile`);
    console.log(`  POST   /api/profile/photo`);
    console.log(`  DELETE /api/profile/photo`);
    console.log('\nAI Services:');
    console.log(`  POST /api/ai/chat`);
    console.log(`  POST /api/ai/generate-image`);
    console.log(`  POST /api/ai/try-on (virtual try-on: garment image + profile photo)`);
    console.log(`  POST /api/ai/analyze-image`);
    console.log(`  POST /api/ai/recommendations`);
    console.log(`  POST /api/ai/rate-item`);
    console.log('\nWardrobe:');
    console.log(`  GET    /api/wardrobe`);
    console.log(`  POST   /api/wardrobe`);
    console.log(`  GET    /api/wardrobe/:id`);
    console.log(`  PUT    /api/wardrobe/:id`);
    console.log(`  DELETE /api/wardrobe/:id`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    process.exit(0);
  };

  process.once('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      console.error('Graceful shutdown failed:', error);
      process.exit(1);
    });
  });

  process.once('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      console.error('Graceful shutdown failed:', error);
      process.exit(1);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error.message || error);
    process.exit(1);
  });
}

// Health check
app.get('/health', (req, res) => {
  const databaseConfigured = Boolean(process.env.DYNAMODB_USERS_TABLE && process.env.DYNAMODB_WARDROBE_TABLE);
  res.json({
    status: 'ok',
    message: 'Fashion App API is running',
    timestamp: new Date().toISOString(),
    database: databaseConfigured ? 'configured' : 'unconfigured',
    databaseProvider: 'dynamodb',
    auth: 'cognito',
    storage: getStorageProvider(),
    wardrobeMode: getWardrobeMode(),
    capabilities: {
      analyze: Boolean(process.env.GEMINI_API_KEY),
      auth: Boolean(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_APP_CLIENT_ID),
      chat: Boolean(process.env.GEMINI_API_KEY),
      recommendations: Boolean(process.env.GEMINI_API_KEY && databaseConfigured),
      tryOn: Boolean(process.env.GEMINI_API_KEY),
      imageGeneration: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN)
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wardrobe', wardrobeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fashion App API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      chat: 'POST /api/ai/chat',
      generateImage: 'POST /api/ai/generate-image',
      tryOn: 'POST /api/ai/try-on (image + auth for profile photo)',
      analyzeImage: 'POST /api/ai/analyze-image',
      recommendations: 'POST /api/ai/recommendations',
      rateItem: 'POST /api/ai/rate-item'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || err.status || (String(err.message || '').startsWith('CORS blocked for origin:') ? 403 : 500);
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
