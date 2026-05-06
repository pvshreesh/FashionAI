const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  chatWithAI,
  analyzeClothingImage,
  getOutfitRecommendations,
  rateClothingItem,
  virtualTryOn
} = require('../services/aiService');

// Configure multer for image uploads (try-on sends 2 images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * POST /api/ai/chat
 * Chat with AI fashion assistant
 * Optional: authenticate for personalized responses with wardrobe context
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, wardrobeContext, conversationHistory, profileImage } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Fetch wardrobe for context (for MVP: allow without auth)
    let contextToUse = wardrobeContext;
    if (!wardrobeContext) {
      try {
        const WardrobeItem = require('../models/WardrobeItem');
        const mongoose = require('mongoose');
        
        // For MVP: Try to fetch items even without auth (use temp userId)
        let query = {};
        if (req.user) {
          query.userId = req.user._id;
        } else {
          // For MVP: Use temp userId if database is connected
          if (mongoose.connection.readyState === 1) {
            query.userId = new mongoose.Types.ObjectId('000000000000000000000000');
          }
        }
        
        // Only fetch if database is connected
        if (mongoose.connection.readyState === 1) {
          const items = await WardrobeItem.find(query).limit(20);
          contextToUse = items.map(item => ({
            name: item.name,
            itemType: item.itemType,
            color: item.color,
            style: item.style,
            tags: item.tags || []
          }));
        }
      } catch (error) {
        // If database fetch fails, continue without context
        console.log('Could not fetch wardrobe context:', error.message);
      }
    }

    const resolvedProfileImage = profileImage || req.user?.profileImage || null;
    const result = await chatWithAI(message, contextToUse, conversationHistory || [], resolvedProfileImage);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        usage: result.usage,
        ...(process.env.NODE_ENV !== 'production' && (req.body?.debug === 'true' || req.query?.debug === 'true')
          ? { rawResponse: result.rawResponse }
          : {})
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/ai/try-on
 * Virtual try-on: place garment on user's photo
 * Requires: garment image (field "image"), user photo (field "userPhoto" or "userPhotoBase64")
 */
router.post('/try-on', authenticate, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'userPhoto', maxCount: 1 }
]), async (req, res) => {
  req.setTimeout(900000); // 15 min - local image gen can take a long time
  res.setTimeout(900000);
  try {
    const garmentFile = req.files?.image?.[0];
    if (!garmentFile || !garmentFile.buffer) {
      return res.status(400).json({
        success: false,
        error: 'Garment image is required. Use form field "image".'
      });
    }

    let userPhoto = null;
    const userPhotoFile = req.files?.userPhoto?.[0];
    if (userPhotoFile && userPhotoFile.buffer) {
      userPhoto = `data:${userPhotoFile.mimetype};base64,${userPhotoFile.buffer.toString('base64')}`;
    } else if (req.body?.userPhotoBase64) {
      const b64 = req.body.userPhotoBase64;
      userPhoto = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
    }

    if (!userPhoto) {
      if (req.user?.profileImage) {
        userPhoto = req.user.profileImage;
      }
    }

    if (!userPhoto) {
      return res.status(400).json({
        success: false,
        error: 'Add your photo in the Profile tab to use virtual try-on.'
      });
    }

    const result = await virtualTryOn(
      userPhoto,
      garmentFile.buffer,
      garmentFile.mimetype
    );

    if (result.success) {
      res.json({
        success: true,
        image: result.image,
        message: "Here's how you'd look!"
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Try-on route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate try-on image'
    });
  }
});

/**
 * POST /api/ai/analyze-image
 * Analyze clothing image and extract tags
 */
router.post('/analyze-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required'
      });
    }

    const imageBuffer = req.file.buffer;
    const imageMimeType = req.file.mimetype;

    const result = await analyzeClothingImage(imageBuffer, imageMimeType);

    if (result.success) {
      res.json({
        success: true,
        tags: result.tags,
        ...(process.env.NODE_ENV !== 'production' && (req.body?.debug === 'true' || req.query?.debug === 'true')
          ? { rawResponse: result.rawResponse }
          : {})
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Image analysis route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/ai/recommendations
 * Get outfit recommendations from wardrobe
 * Can use wardrobe items from request OR fetch from database (if authenticated)
 */
router.post('/recommendations', authenticate, async (req, res) => {
  try {
    const { wardrobeItems, occasion, bodyShape, weather, useDatabase } = req.body;

    // If useDatabase is true and user is authenticated, fetch from DB
    let itemsToUse = wardrobeItems;
    if (useDatabase && req.user) {
      const WardrobeItem = require('../models/WardrobeItem');
      const User = require('../models/User');
      
      const user = await User.findById(req.user._id);
      
      // Check recommendation limit for free tier
      if (!user.canGetRecommendation()) {
        return res.status(403).json({
          success: false,
          error: 'Recommendation limit reached. Upgrade to premium for unlimited recommendations.'
        });
      }

      const dbItems = await WardrobeItem.find({ userId: req.user._id });
      itemsToUse = dbItems.map(item => ({
        name: item.name,
        tags: item.tags,
        itemType: item.itemType,
        color: item.color,
        style: item.style,
        occasion: item.occasion
      }));

      // Increment recommendation count
      await user.incrementRecommendationCount();
    }

    if (!itemsToUse || !Array.isArray(itemsToUse) || itemsToUse.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Wardrobe items array is required or user has no items in wardrobe'
      });
    }

    if (!occasion) {
      return res.status(400).json({
        success: false,
        error: 'Occasion is required'
      });
    }

    const result = await getOutfitRecommendations(
      itemsToUse,
      occasion,
      bodyShape || null,
      weather || null
    );

    if (result.success) {
      res.json({
        success: true,
        outfits: result.outfits,
        ...(process.env.NODE_ENV !== 'production' && (req.body?.debug === 'true' || req.query?.debug === 'true')
          ? { rawResponse: result.rawResponse }
          : {})
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Recommendations route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/ai/rate-item
 * Rate/style score a clothing item
 */
router.post('/rate-item', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { itemDescription, bodyShape } = req.body;
    const itemImage = req.file ? req.file.buffer : null;

    if (!itemDescription && !itemImage) {
      return res.status(400).json({
        success: false,
        error: 'Item description or image is required'
      });
    }

    const result = await rateClothingItem(
      itemDescription || 'Clothing item',
      itemImage,
      bodyShape || null
    );

    if (result.success) {
      res.json({
        success: true,
        rating: result.rating,
        rawResponse: result.rawResponse
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Rate item route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
