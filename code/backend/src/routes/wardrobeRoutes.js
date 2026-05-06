const express = require('express');
const multer = require('multer');
const router = express.Router();
const mongoose = require('mongoose');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const { analyzeClothingImage } = require('../services/aiService');
const { authenticate } = require('../middleware/auth');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

/**
 * DELETE /api/wardrobe/clear
 * Clear all wardrobe items (for testing/development)
 */
router.delete('/clear', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is disabled in production.'
      });
    }

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        message: 'Database not connected. No items to clear.',
        deletedCount: 0,
        note: 'Items are stored in memory only when database is not connected'
      });
    }

    const result = await WardrobeItem.deleteMany({});
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} item(s) from wardrobe`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear wardrobe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear wardrobe',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/wardrobe/stats
 * Get wardrobe statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        stats: { totalItems: 0, totalImages: 0 },
        note: 'Database not connected. Connect MongoDB to persist and count items.'
      });
    }
    const totalItems = await WardrobeItem.countDocuments({ userId: req.user._id });
    const totalImages = await WardrobeItem.aggregate([
      { $match: { userId: req.user._id } },
      { $project: { imageCount: { $size: { $ifNull: ['$images', []] } } } },
      { $group: { _id: null, total: { $sum: '$imageCount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalItems,
        totalImages: totalImages[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

/**
 * GET /api/wardrobe
 * Get user's wardrobe items
 * For MVP: Authentication optional
 */
router.get('/', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        items: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        note: 'Database not connected. Connect MongoDB to load saved items.'
      });
    }
    const { page = 1, limit = 20, filter, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };

    // Apply filters
    if (filter) {
      try {
        const filters = typeof filter === 'string' ? JSON.parse(filter) : filter;
        if (filters.tags) query.tags = { $in: filters.tags };
        if (filters.itemType) query.itemType = filters.itemType;
        if (filters.color) query.color = filters.color;
        if (filters.season) query.season = filters.season;
      } catch (e) {
        // Invalid filter - continue without
      }
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await WardrobeItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WardrobeItem.countDocuments(query);

    res.json({
      success: true,
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get wardrobe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wardrobe',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/wardrobe
 * Add new wardrobe item(s)
 * If multiple images: Creates ONE item per image (each image is a separate item)
 */
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    // Check wardrobe limit for free tier (if authenticated)
    if (user && user.subscription.tier === 'free') {
      const itemCount = await WardrobeItem.countDocuments({ userId: user._id });
      if (itemCount >= user.subscription.wardrobeItemLimit) {
        return res.status(403).json({
          success: false,
          error: `Wardrobe limit reached (${user.subscription.wardrobeItemLimit} items). Upgrade to premium for unlimited items.`
        });
      }
    }

    // Require at least one image for AI analysis
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one image is required for AI analysis'
      });
    }

    console.log(`\n📸 Processing ${req.files.length} image(s)...`);

    // If multiple images, create separate items for each (each image is a different item)
    const savedItems = [];
    const errors = [];
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '../../logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const errorLogFile = path.join(logDir, `wardrobe-errors-${new Date().toISOString().split('T')[0]}.txt`);
    const errorLog = [];

    const DELAY_MS = 1000; // Delay between images when processing with Ollama

    for (let fileIndex = 0; fileIndex < req.files.length; fileIndex++) {
      if (fileIndex > 0) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
      const imageFile = req.files[fileIndex];
      const imageInfo = {
        index: fileIndex + 1,
        filename: imageFile.originalname,
        size: imageFile.size,
        mimetype: imageFile.mimetype,
        timestamp: new Date().toISOString()
      };
      
      console.log(`\n  Processing image ${imageInfo.index}/${req.files.length}: ${imageInfo.filename}`);

      try {
        // Analyze each image with AI
        const analysis = await analyzeClothingImage(imageFile.buffer, imageFile.mimetype, { forWardrobe: true });
        
        if (!analysis.success) {
          const errorDetails = {
            ...imageInfo,
            error: analysis.error,
            errorType: 'AI Analysis Failed',
            rawResponse: analysis.rawResponse || null
          };
          console.error(`  ❌ AI analysis failed for image ${imageInfo.index}:`, analysis.error);
          errors.push({ 
            image: imageInfo.index, 
            filename: imageInfo.filename,
            error: analysis.error 
          });
          errorLog.push(JSON.stringify(errorDetails, null, 2));
          continue;
        }
        
        const aiTags = analysis.tags;
        
        if (!aiTags) {
          const errorDetails = {
            ...imageInfo,
            error: 'AI did not return usable data',
            errorType: 'No Tags Extracted',
            rawResponse: analysis.rawResponse || null
          };
          console.error(`  ❌ No tags extracted for image ${imageInfo.index}`);
          errors.push({ 
            image: imageInfo.index, 
            filename: imageInfo.filename,
            error: 'AI did not return usable data' 
          });
          errorLog.push(JSON.stringify(errorDetails, null, 2));
          continue;
        }

        // Store this single image
        const { storeImage } = require('../utils/imageStorage');
        const stored = await storeImage(imageFile.buffer, imageFile.mimetype, imageFile.originalname);
        
        const images = [{
          url: stored.url,
          isPrimary: true
        }];

        // Build tags array from AI analysis
        const allTags = [];
        if (aiTags.tags && Array.isArray(aiTags.tags)) {
          allTags.push(...aiTags.tags);
        } else {
          // Fallback: build tags from individual fields
          if (aiTags.itemType) allTags.push(aiTags.itemType);
          if (aiTags.color) allTags.push(aiTags.color);
          if (aiTags.pattern && aiTags.pattern !== 'solid') allTags.push(aiTags.pattern);
          if (aiTags.style) allTags.push(aiTags.style);
          if (aiTags.occasion) {
            const occasions = Array.isArray(aiTags.occasion) ? aiTags.occasion : [aiTags.occasion];
            allTags.push(...occasions);
          }
          if (aiTags.season) allTags.push(aiTags.season);
        }

        const wardrobeItem = new WardrobeItem({
          userId,
          name: aiTags.name || aiTags.description || 'Clothing Item',
          images,
          tags: [...new Set(allTags)],
          itemType: aiTags.itemType,
          color: aiTags.color,
          pattern: aiTags.pattern,
          style: aiTags.style,
          occasion: Array.isArray(aiTags.occasion) ? aiTags.occasion : [aiTags.occasion],
          season: aiTags.season,
          fit: aiTags.fit,
          size: aiTags.size && aiTags.size !== 'unknown' ? aiTags.size : undefined,
          brand: aiTags.brand && aiTags.brand !== 'unknown' ? aiTags.brand : undefined,
          bodyShapeCompatibility: aiTags.bodyShapeCompatibility || [],
          aiDescription: aiTags.description
        });

        // Try to save
        let savedItem = null;
        try {
          savedItem = await wardrobeItem.save();
          console.log(`  ✅ Saved: ${savedItem.name} (ID: ${savedItem._id})`);
          savedItems.push(savedItem);
        } catch (dbError) {
          console.log(`  ⚠️  Database not connected: ${dbError.message}`);
          savedItem = wardrobeItem;
          savedItems.push(savedItem);
        }
      } catch (error) {
        const errorDetails = {
          ...imageInfo,
          error: error.message,
          errorType: 'Processing Error',
          stack: error.stack
        };
        console.error(`  ❌ Error processing image ${imageInfo.index}:`, error.message);
        errors.push({ 
          image: imageInfo.index, 
          filename: imageInfo.filename,
          error: error.message 
        });
        errorLog.push(JSON.stringify(errorDetails, null, 2));
      }
    }
    
    // Write error log to file if there are errors
    if (errorLog.length > 0) {
      const logContent = `=== Wardrobe Upload Errors - ${new Date().toISOString()} ===\n\n` +
                       `Total Files: ${req.files.length}\n` +
                       `Successful: ${savedItems.length}\n` +
                       `Failed: ${errors.length}\n\n` +
                       `=== Error Details ===\n\n` +
                       errorLog.join('\n\n---\n\n') + '\n';
      
      try {
        fs.appendFileSync(errorLogFile, logContent);
        console.log(`\n📝 Error log saved to: ${errorLogFile}`);
      } catch (logError) {
        console.error('Failed to write error log:', logError.message);
      }
    }

    console.log(`\n📊 Summary: ${savedItems.length} item(s) saved, ${errors.length} error(s)\n`);

    if (savedItems.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process any images',
        errors: errors
      });
    }

    const response = {
      success: true,
      items: savedItems,
      count: savedItems.length,
      message: `Successfully added ${savedItems.length} item(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
    };
    
    // Include detailed error information
    if (errors.length > 0) {
      response.errors = errors;
      response.errorLogFile = errorLog.length > 0 ? errorLogFile : undefined;
      response.errorSummary = {
        total: req.files.length,
        successful: savedItems.length,
        failed: errors.length,
        failedImages: errors.map(e => ({
          image: e.image,
          filename: e.filename || `Image ${e.image}`,
          error: e.error
        }))
      };
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Add wardrobe item error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add wardrobe item',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/wardrobe/:id
 * Get single wardrobe item
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected. Connect MongoDB to load items.'
      });
    }
    let query = { _id: req.params.id, userId: req.user._id };
    
    const item = await WardrobeItem.findOne(query);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get item'
    });
  }
});

/**
 * PUT /api/wardrobe/:id
 * Update wardrobe item
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected. Connect MongoDB to update items.'
      });
    }
    let query = { _id: req.params.id, userId: req.user._id };
    
    const item = await WardrobeItem.findOneAndUpdate(
      query,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

/**
 * DELETE /api/wardrobe/:id
 * Delete wardrobe item
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected. Connect MongoDB to delete items.'
      });
    }
    let query = { _id: req.params.id, userId: req.user._id };
    
    const item = await WardrobeItem.findOneAndDelete(query);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    });
  }
});

module.exports = router;
