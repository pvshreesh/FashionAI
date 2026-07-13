const SHARED_WARDROBE_USER_ID = process.env.SHARED_WARDROBE_USER_ID || 'shared';

function getWardrobeMode() {
  return process.env.WARDROBE_MODE === 'per-user' ? 'per-user' : 'shared';
}

function isSharedWardrobeEnabled() {
  return getWardrobeMode() === 'shared';
}

function getWardrobeOwnerId(req = null) {
  if (isSharedWardrobeEnabled()) {
    return SHARED_WARDROBE_USER_ID;
  }

  return req?.user?._id || null;
}

module.exports = {
  getWardrobeMode,
  getWardrobeOwnerId,
  isSharedWardrobeEnabled,
  SHARED_WARDROBE_USER_ID
};
