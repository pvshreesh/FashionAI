const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
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
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WardrobeItem',
    required: true
  }],
  occasion: {
    type: String,
    trim: true
  },
  bodyShape: {
    type: String,
    enum: ['Rectangle', 'Apple', 'Pear', 'Hourglass', 'Inverted Triangle', null]
  },
  weather: String,
  stylingTips: String,
  confidenceScore: Number, // AI-generated confidence (0-100)
  isSaved: {
    type: Boolean,
    default: false
  },
  wornDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

outfitSchema.index({ userId: 1, createdAt: -1 });
outfitSchema.index({ userId: 1, occasion: 1 });

module.exports = mongoose.models.Outfit || mongoose.model('Outfit', outfitSchema);
