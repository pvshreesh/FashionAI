const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const wardrobeRoutes = require('./routes/wardrobeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (relax for dev: allow cross-origin fetch from prototype)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rate limiting (skip try-on: image gen is slow, don't rate limit it)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', (req, res, next) => {
  if (req.method === 'POST' && req.originalUrl.includes('/try-on')) return next();
  return limiter(req, res, next);
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Connect to database (optional for MVP; set DATABASE_URL in .env to persist wardrobe)
connectDB();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fashion App API is running',
    timestamp: new Date().toISOString(),
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected'
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
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fashion App API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI: Gemini (all features)`);
  if (process.env.GEMINI_API_KEY) console.log(`🔑 Gemini API key configured`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`\n🔐 Authentication:`);
  console.log(`  POST /api/auth/register`);
  console.log(`  POST /api/auth/login`);
  console.log(`  GET  /api/auth/me`);
  console.log(`\n👤 Profile:`);
  console.log(`  GET    /api/profile`);
  console.log(`  POST   /api/profile/photo`);
  console.log(`  DELETE /api/profile/photo`);
  console.log(`\n🤖 AI Services:`);
  console.log(`  POST /api/ai/chat`);
  console.log(`  POST /api/ai/try-on (virtual try-on: garment image + profile photo)`);
  console.log(`  POST /api/ai/analyze-image`);
  console.log(`  POST /api/ai/recommendations`);
  console.log(`  POST /api/ai/rate-item`);
  console.log(`\n👔 Wardrobe:`);
  console.log(`  GET    /api/wardrobe`);
  console.log(`  POST   /api/wardrobe`);
  console.log(`  GET    /api/wardrobe/:id`);
  console.log(`  PUT    /api/wardrobe/:id`);
  console.log(`  DELETE /api/wardrobe/:id`);
});

module.exports = app;
