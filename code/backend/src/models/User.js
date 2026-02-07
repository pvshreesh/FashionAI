const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    trim: true
  },
  // Body measurements (stored encrypted in backend, NEVER in UI)
  bodyMeasurements: {
    height: Number,
    weight: Number,
    chest: Number,
    waist: Number,
    hips: Number,
    bodyShape: {
      type: String,
      enum: ['Rectangle', 'Apple', 'Pear', 'Hourglass', 'Inverted Triangle', null],
      default: null
    }
  },
  // Style preferences (public, can be displayed)
  stylePreferences: {
    favoriteColors: [String],
    preferredStyles: [String], // e.g., ['casual', 'streetwear', 'minimalist']
    sizePreferences: {
      top: String,
      bottom: String,
      shoes: String
    }
  },
  // Optional: user photo for "keep the dress on you" / virtual try-on (base64 or URL)
  profileImage: {
    type: String,
    default: null
  },
  // Subscription info
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    wardrobeItemLimit: {
      type: Number,
      default: 20 // Free tier limit
    },
    recommendationLimit: {
      type: Number,
      default: 5 // Per month for free tier
    },
    recommendationCount: {
      type: Number,
      default: 0
    },
    recommendationResetDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user can add more wardrobe items
userSchema.methods.canAddWardrobeItem = function() {
  if (this.subscription.tier === 'premium') return true;
  
  // This will be checked against actual count in WardrobeItem model
  return true; // Actual check done in service layer
};

// Check if user can get recommendation
userSchema.methods.canGetRecommendation = function() {
  if (this.subscription.tier === 'premium') return true;
  
  // Reset count if reset date passed
  if (new Date() > this.subscription.recommendationResetDate) {
    this.subscription.recommendationCount = 0;
    this.subscription.recommendationResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.save();
    return true;
  }
  
  return this.subscription.recommendationCount < this.subscription.recommendationLimit;
};

// Increment recommendation count
userSchema.methods.incrementRecommendationCount = async function() {
  if (this.subscription.tier === 'premium') return;
  
  this.subscription.recommendationCount += 1;
  await this.save();
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
