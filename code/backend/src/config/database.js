const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // For MVP, use MongoDB Atlas (cloud) or local MongoDB
    // If no DATABASE_URL, use local MongoDB
    const mongoURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/fashion-app';
    
    const conn = await mongoose.connect(mongoURI, {
      // Remove deprecated options for newer mongoose versions
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
