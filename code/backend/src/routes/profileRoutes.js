const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { deleteImage, getImageUrl, isSupportedImageType, storeImage } = require('../utils/imageStorage');
const { getUserById, updateUser } = require('../repositories/usersRepository');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (isSupportedImageType(file.mimetype)) {
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
    const user = await getUserById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const profileImageUrl = user.profileImage ? await getImageUrl(user.profileImage) : null;

    res.json({
      success: true,
      profile: {
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: profileImageUrl,
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

    const user = await getUserById(req.user._id);
    const storedImage = await storeImage(req.file.buffer, req.file.mimetype, req.file.originalname, {
      folder: 'profile-photos',
      metadata: req.user?._id ? { userId: String(req.user._id) } : {}
    });
    const profileImageUrl = await getImageUrl(storedImage);

    try {
      await updateUser(req.user._id, { profileImage: storedImage });
    } catch (error) {
      await deleteImage(storedImage).catch(() => {});
      throw error;
    }
    if (user?.profileImage) await deleteImage(user.profileImage).catch((error) => console.error('Old profile image cleanup failed:', error));

    res.json({
      success: true,
      message: 'Profile photo updated. You can use it for virtual try-on when you ask to "keep the dress on me".',
      hasProfileImage: true,
      profileImage: profileImageUrl
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
    const user = await getUserById(req.user._id);
    await updateUser(req.user._id, { profileImage: null });
    if (user?.profileImage) await deleteImage(user.profileImage).catch((error) => console.error('Profile image cleanup failed:', error));
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
