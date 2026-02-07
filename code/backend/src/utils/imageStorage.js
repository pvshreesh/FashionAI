/**
 * Image Storage Utility
 * Currently: Base64 (temporary for MVP)
 * Production: Should use AWS S3, Cloudinary, or Firebase Storage
 */

/**
 * Store image - currently returns base64, but structure ready for cloud storage
 */
async function storeImage(fileBuffer, mimetype, filename) {
  // TEMPORARY: Base64 storage for MVP
  // TODO: Replace with cloud storage (AWS S3, Cloudinary, etc.)
  
  const base64Image = fileBuffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64Image}`;
  
  return {
    url: dataUrl,
    storageType: 'base64', // temporary
    // Future: cloudUrl, cloudPath, etc.
  };
}

/**
 * Delete image - placeholder for future cloud storage deletion
 */
async function deleteImage(imageUrl) {
  // TEMPORARY: Base64 images are stored in DB, no deletion needed
  // TODO: Implement cloud storage deletion
  if (imageUrl.startsWith('data:')) {
    // Base64 image - nothing to delete
    return true;
  }
  
  // Future: Delete from cloud storage
  return true;
}

/**
 * Get image URL - returns the stored URL
 */
function getImageUrl(storedImage) {
  if (typeof storedImage === 'string') {
    return storedImage;
  }
  return storedImage.url || storedImage;
}

module.exports = {
  storeImage,
  deleteImage,
  getImageUrl
};
