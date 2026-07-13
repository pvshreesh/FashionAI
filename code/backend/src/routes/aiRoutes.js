const express = require('express');
const multer = require('multer');
const router = express.Router();
const { optionalAuthenticate } = require('../middleware/auth');
const {
  chatWithAI,
  analyzeClothingImage,
  getOutfitRecommendations,
  rateClothingItem,
  virtualTryOn,
  generateImageFromPrompt
} = require('../services/aiService');
const { resolveStoredImageDataUrl } = require('../utils/imageStorage');
const { getWardrobeOwnerId, isSharedWardrobeEnabled } = require('../config/wardrobeMode');
const {
  canUserGetRecommendation,
  getUserById,
  incrementRecommendationCount
} = require('../repositories/usersRepository');
const { listWardrobeItems } = require('../repositories/wardrobeRepository');

function normalizeChatPayload(body) {
  if (Array.isArray(body)) {
    const conversationHistory = body.map((message) => ({
      role: message.role,
      content: message.content || message.text || ''
    }));
    const lastUserMessage = [...conversationHistory].reverse().find((message) => message.role === 'user');
    return {
      message: lastUserMessage?.content || '',
      conversationHistory: lastUserMessage
        ? conversationHistory.slice(0, conversationHistory.lastIndexOf(lastUserMessage))
        : conversationHistory,
      wardrobeContext: null,
      profileImage: null
    };
  }

  return body || {};
}

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
router.post('/chat', optionalAuthenticate, async (req, res) => {
  try {
    const { message, wardrobeContext, conversationHistory, profileImage } = normalizeChatPayload(req.body);

    if (!message || typeof message !== 'string' || message.trim().length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Message must be between 1 and 4000 characters.'
      });
    }

    // Fetch wardrobe for context (for MVP: allow without auth)
    let contextToUse = wardrobeContext;
    const wardrobeOwnerId = getWardrobeOwnerId(req);
    if (!wardrobeContext && wardrobeOwnerId) {
      try {
        const result = await listWardrobeItems({
          userId: wardrobeOwnerId,
          page: 1,
          limit: 20
        });
        contextToUse = result.items.map((item) => ({
          name: item.name,
          itemType: item.itemType,
          color: item.color,
          style: item.style,
          tags: item.tags || []
        }));
      } catch (error) {
        console.log('Could not fetch wardrobe context:', error.message);
      }
    }

    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-20).map((entry) => ({
        role: entry?.role === 'assistant' ? 'assistant' : 'user',
        content: String(entry?.content || '').slice(0, 2000)
      }))
      : [];
    const resolvedProfileImage = profileImage || await resolveStoredImageDataUrl(req.user?.profileImage) || null;
    const result = await chatWithAI(message.trim(), contextToUse, safeHistory, resolvedProfileImage);

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
router.post('/try-on', optionalAuthenticate, upload.fields([
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
        userPhoto = await resolveStoredImageDataUrl(req.user.profileImage);
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
        previewUrl: result.image,
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
 * POST /api/ai/generate-image
 * Generate an image from a text prompt
 */
router.post('/generate-image', optionalAuthenticate, async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt || prompt.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Prompt must be between 1 and 2000 characters.'
      });
    }

    const result = await generateImageFromPrompt(prompt, {
      steps: req.body?.steps,
      seed: req.body?.seed
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error || 'Image generation failed'
      });
    }

    return res.json({
      success: true,
      image: result.image,
      model: result.model
    });
  } catch (error) {
    console.error('Generate image route error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image'
    });
  }
});

/**
 * POST /api/ai/analyze-image
 * Analyze clothing image and extract tags
 */
router.post('/analyze-image', optionalAuthenticate, upload.single('image'), async (req, res) => {
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
        item: result.tags,
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
router.post('/recommendations', optionalAuthenticate, async (req, res) => {
  try {
    const { wardrobeItems, occasion, bodyShape, weather, useDatabase } = req.body;

    // If useDatabase is true and user is authenticated, fetch from DB
    let itemsToUse = wardrobeItems;
    let recommendationUser = null;
    if (useDatabase) {
      const ownerId = getWardrobeOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to use the personal wardrobe database.'
        });
      }

      recommendationUser = isSharedWardrobeEnabled() || !req.user ? null : await getUserById(req.user._id);

      if (recommendationUser && !(await canUserGetRecommendation(recommendationUser))) {
        return res.status(403).json({
          success: false,
          error: 'Recommendation limit reached. Upgrade to premium for unlimited recommendations.'
        });
      }

      const dbItems = await listWardrobeItems({
        userId: ownerId,
        page: 1,
        limit: 100
      });
      itemsToUse = dbItems.items.map((item) => ({
        name: item.name,
        tags: item.tags,
        itemType: item.itemType,
        color: item.color,
        style: item.style,
        occasion: item.occasion
      }));

    }

    if (!itemsToUse || !Array.isArray(itemsToUse) || itemsToUse.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Wardrobe items array is required or user has no items in wardrobe'
      });
    }

    itemsToUse = itemsToUse.slice(0, 100).map((item) => ({
      name: String(item?.name || 'Item').slice(0, 200),
      tags: Array.isArray(item?.tags) ? item.tags.map(String).slice(0, 20) : [],
      itemType: String(item?.itemType || '').slice(0, 100),
      color: String(item?.color || '').slice(0, 100),
      style: String(item?.style || '').slice(0, 100)
    }));

    if (typeof occasion !== 'string' || !occasion.trim() || occasion.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Occasion must be between 1 and 200 characters.'
      });
    }

    const result = await getOutfitRecommendations(
      itemsToUse,
      occasion.trim(),
      bodyShape || null,
      weather || null
    );

    if (result.success) {
      if (recommendationUser) {
        await incrementRecommendationCount(recommendationUser);
      }
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
router.post('/rate-item', optionalAuthenticate, upload.single('image'), async (req, res) => {
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
        rating: result.rating
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
