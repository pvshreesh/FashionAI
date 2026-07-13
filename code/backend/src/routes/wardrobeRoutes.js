const express = require('express');
const multer = require('multer');
const router = express.Router();
const { analyzeClothingImage } = require('../services/aiService');
const { authenticateWardrobeRequest } = require('../middleware/auth');
const { decodeImageDataUrl, deleteImage, hydrateStoredImages, isSupportedImageType, storeImage } = require('../utils/imageStorage');
const { getWardrobeOwnerId, isSharedWardrobeEnabled } = require('../config/wardrobeMode');
const {
  countWardrobeItems,
  createWardrobeItem,
  deleteAllWardrobeItems,
  deleteWardrobeItem,
  getWardrobeItem,
  getWardrobeStats,
  listWardrobeItems,
  updateWardrobeItem
} = require('../repositories/wardrobeRepository');
const { getUserById } = require('../repositories/usersRepository');

function cleanText(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || undefined : undefined;
}

function cleanList(value, maxItems = 20) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => cleanText(item, 100)).filter(Boolean))].slice(0, maxItems)
    : [];
}

function buildWardrobeTags(aiTags = {}) {
  const allTags = [];

  if (Array.isArray(aiTags.tags) && aiTags.tags.length > 0) {
    allTags.push(...aiTags.tags);
  } else {
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

  return cleanList(allTags);
}

function createWardrobeItemPayload(userId, aiTags, images) {
  return {
    userId,
    name: cleanText(aiTags.name, 200) || cleanText(aiTags.description, 200) || 'Clothing Item',
    images,
    tags: buildWardrobeTags(aiTags),
    itemType: cleanText(aiTags.itemType, 100),
    color: cleanText(aiTags.color, 100),
    pattern: cleanText(aiTags.pattern, 100),
    style: cleanText(aiTags.style, 100),
    occasion: cleanList(Array.isArray(aiTags.occasion) ? aiTags.occasion : [aiTags.occasion]),
    season: cleanText(aiTags.season, 100),
    fit: cleanText(aiTags.fit, 100),
    size: aiTags.size !== 'unknown' ? cleanText(aiTags.size, 50) : undefined,
    brand: aiTags.brand !== 'unknown' ? cleanText(aiTags.brand, 100) : undefined,
    bodyShapeCompatibility: cleanList(aiTags.bodyShapeCompatibility, 10),
    aiDescription: cleanText(aiTags.description || aiTags.aiDescription, 2000),
    wearCount: 0,
    isFavorite: false
  };
}

async function hydrateWardrobeItem(item) {
  if (!item) return item;

  return {
    ...item,
    images: await hydrateStoredImages(item.images || [])
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (isSupportedImageType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

router.delete('/clear', authenticateWardrobeRequest, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is disabled in production.'
      });
    }

    const ownerId = getWardrobeOwnerId(req);
    const deletedItems = await deleteAllWardrobeItems(ownerId);
    await Promise.allSettled(deletedItems.flatMap((item) => (item.images || []).map(deleteImage)));
    res.json({
      success: true,
      message: `Cleared ${deletedItems.length} item(s) from wardrobe`,
      deletedCount: deletedItems.length
    });
  } catch (error) {
    console.error('Clear wardrobe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear wardrobe'
    });
  }
});

router.get('/stats', authenticateWardrobeRequest, async (req, res) => {
  try {
    const stats = await getWardrobeStats(getWardrobeOwnerId(req));
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

router.get('/', authenticateWardrobeRequest, async (req, res) => {
  try {
    const { page = 1, limit = 20, filter, search } = req.query;
    const result = await listWardrobeItems({
      userId: getWardrobeOwnerId(req),
      page,
      limit,
      filter,
      search
    });

    const hydratedItems = [];
    for (const item of result.items) {
      hydratedItems.push(await hydrateWardrobeItem(item));
    }

    res.json({
      success: true,
      items: hydratedItems,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
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

router.post('/save-analyzed', authenticateWardrobeRequest, async (req, res) => {
  try {
    const { analysis, imageDataUrl } = req.body || {};
    const ownerId = getWardrobeOwnerId(req);

    if (!analysis || Array.isArray(analysis) || typeof analysis !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Analysis data is required'
      });
    }

    if (!imageDataUrl) {
      return res.status(400).json({
        success: false,
        error: 'A base64 imageDataUrl is required'
      });
    }

    if (!isSharedWardrobeEnabled()) {
      const user = await getUserById(ownerId);
      if (user?.subscription?.tier === 'free' && await countWardrobeItems(ownerId) >= user.subscription.wardrobeItemLimit) {
        return res.status(403).json({
          success: false,
          error: `Wardrobe limit reached (${user.subscription.wardrobeItemLimit} items).`
        });
      }
    }

    const { buffer, contentType } = decodeImageDataUrl(imageDataUrl);
    const storedImage = await storeImage(buffer, contentType, `analysis.${contentType.split('/')[1]}`);
    let item;
    try {
      item = await createWardrobeItem(
        ownerId,
        createWardrobeItemPayload(ownerId, analysis, [{ ...storedImage, isPrimary: true }])
      );
    } catch (error) {
      await deleteImage(storedImage).catch(() => {});
      throw error;
    }

    res.status(201).json({
      success: true,
      item: await hydrateWardrobeItem(item),
      message: 'Analyzed item saved to wardrobe'
    });
  } catch (error) {
    console.error('Save analyzed wardrobe item error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save analyzed item'
    });
  }
});

router.post('/', authenticateWardrobeRequest, upload.array('images', 10), async (req, res) => {
  try {
    const userId = getWardrobeOwnerId(req);
    const user = isSharedWardrobeEnabled() ? null : await getUserById(userId);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one image is required for AI analysis'
      });
    }

    if (user && user.subscription?.tier === 'free') {
      const itemCount = await countWardrobeItems(userId);
      if (itemCount + req.files.length > user.subscription.wardrobeItemLimit) {
        return res.status(403).json({
          success: false,
          error: `This upload would exceed the ${user.subscription.wardrobeItemLimit}-item wardrobe limit.`
        });
      }
    }

    const savedItems = [];
    const errors = [];

    for (let fileIndex = 0; fileIndex < req.files.length; fileIndex += 1) {
      const imageFile = req.files[fileIndex];
      const imageInfo = {
        index: fileIndex + 1,
        filename: imageFile.originalname,
        size: imageFile.size,
        mimetype: imageFile.mimetype,
        timestamp: new Date().toISOString()
      };

      let stored = null;
      try {
        const analysis = await analyzeClothingImage(imageFile.buffer, imageFile.mimetype, { forWardrobe: true });

        if (!analysis.success || !analysis.tags) {
          const message = analysis.error || 'AI did not return usable data';
          errors.push({
            image: imageInfo.index,
            filename: imageInfo.filename,
            error: message
          });
          continue;
        }

        stored = await storeImage(imageFile.buffer, imageFile.mimetype, imageFile.originalname);
        const item = await createWardrobeItem(
          userId,
          createWardrobeItemPayload(userId, analysis.tags, [{
            ...stored,
            isPrimary: true
          }])
        );

        savedItems.push(await hydrateWardrobeItem(item));
      } catch (error) {
        if (stored) await deleteImage(stored).catch(() => {});
        errors.push({
          image: imageInfo.index,
          filename: imageInfo.filename,
          error: error.message
        });
      }
    }

    if (savedItems.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process any images',
        errors
      });
    }

    const response = {
      success: true,
      items: savedItems,
      count: savedItems.length,
      message: `Successfully added ${savedItems.length} item(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.errorSummary = {
        total: req.files.length,
        successful: savedItems.length,
        failed: errors.length,
        failedImages: errors.map((entry) => ({
          image: entry.image,
          filename: entry.filename || `Image ${entry.image}`,
          error: entry.error
        }))
      };
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Add wardrobe item error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add wardrobe item',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/:id', authenticateWardrobeRequest, async (req, res) => {
  try {
    const item = await getWardrobeItem(getWardrobeOwnerId(req), req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      item: await hydrateWardrobeItem(item)
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get item'
    });
  }
});

router.put('/:id', authenticateWardrobeRequest, async (req, res) => {
  try {
    const updates = {};
    for (const field of ['name', 'itemType', 'color', 'pattern', 'style', 'season', 'fit', 'size', 'brand', 'aiDescription']) {
      if (req.body?.[field] !== undefined) updates[field] = cleanText(req.body[field], field === 'aiDescription' ? 2000 : 200);
    }
    for (const field of ['tags', 'occasion', 'bodyShapeCompatibility']) {
      if (req.body?.[field] !== undefined) updates[field] = cleanList(req.body[field]);
    }
    if (typeof req.body?.isFavorite === 'boolean') updates.isFavorite = req.body.isFavorite;
    if (Number.isInteger(req.body?.wearCount) && req.body.wearCount >= 0) updates.wearCount = req.body.wearCount;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid wardrobe fields provided.' });
    }
    const item = await updateWardrobeItem(getWardrobeOwnerId(req), req.params.id, updates);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      item: await hydrateWardrobeItem(item)
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item'
    });
  }
});

router.delete('/:id', authenticateWardrobeRequest, async (req, res) => {
  try {
    const item = await deleteWardrobeItem(getWardrobeOwnerId(req), req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const cleanup = await Promise.allSettled((item.images || []).map(deleteImage));
    cleanup.filter((result) => result.status === 'rejected').forEach((result) => console.error('Deleted wardrobe image cleanup failed:', result.reason));

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
