const express = require('express');
const multer = require('multer');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

/**
 * GET /api/profile
 * Get current user profile (including optional profile photo)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      profile: {
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage || null,
        stylePreferences: user.stylePreferences,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

/**
 * POST /api/profile/photo
 * Upload user's photo (optional - for "keep the dress on you" / try-on)
 */
router.post('/photo', authenticate, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Use form field name "photo".'
      });
    }

    const base64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    await User.findByIdAndUpdate(req.user._id, {
      profileImage: dataUri,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Profile photo updated. You can use it for virtual try-on when you ask to "keep the dress on me".',
      hasProfileImage: true
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile photo'
    });
  }
});

/**
 * DELETE /api/profile/photo
 * Remove user's profile photo
 */
router.delete('/photo', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      profileImage: null,
      updatedAt: new Date()
    });
    res.json({
      success: true,
      message: 'Profile photo removed.',
      hasProfileImage: false
    });
  } catch (error) {
    console.error('Profile photo delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove profile photo'
    });
  }
});

module.exports = router;
