const mongoose = require('mongoose');

const wardrobeItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  images: [{
    url: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  // Tags by category
  itemType: String, // tshirt, dress, pants, etc.
  style: String, // casual, formal, streetwear, etc.
  occasion: [String], // casual, work, party, date, etc.
  season: String, // spring, summer, fall, winter, all-season
  color: String,
  pattern: String, // solid, striped, floral, plaid, etc.
  fit: String, // loose, fitted, oversized, etc.
  
  // Size information
  size: {
    type: String, // S, M, L, XL or specific measurements
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  
  // AI-generated data
  styleScore: {
    versatility: Number, // 1-10
    trendiness: Number, // 1-10
    quality: Number, // 1-10
    bodyShapeCompatibility: Number // 1-10
  },
  bodyShapeCompatibility: [{
    type: String,
    enum: ['Rectangle', 'Apple', 'Pear', 'Hourglass', 'Inverted Triangle']
  }],
  aiDescription: String,
  
  // Metadata
  purchaseDate: Date,
  lastWorn: Date,
  wearCount: {
    type: Number,
    default: 0
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
wardrobeItemSchema.index({ userId: 1, createdAt: -1 });
wardrobeItemSchema.index({ userId: 1, tags: 1 });
wardrobeItemSchema.index({ userId: 1, itemType: 1 });
wardrobeItemSchema.index({ userId: 1, color: 1 });

module.exports = mongoose.models.WardrobeItem || mongoose.model('WardrobeItem', wardrobeItemSchema);
