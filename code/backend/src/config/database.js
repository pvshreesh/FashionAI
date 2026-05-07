const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const mongoURI = process.env.DATABASE_URL || (!isProduction ? 'mongodb://localhost:27017/fashion-app' : null);

    if (!mongoURI) {
      console.log('⚠️  DATABASE_URL is not set. Skipping MongoDB connection in production.');
      return null;
    }
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // For MVP, continue without DB (some features won't work)
    console.log('⚠️  Continuing without database (some features disabled)');
    return null;
  }
};

module.exports = connectDB;
