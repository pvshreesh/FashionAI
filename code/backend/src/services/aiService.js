/**
 * Unified AI Service
 * Uses Gemini only for all AI features (chat, analyze, recommendations, rate-item, try-on)
 */

const geminiService = require('./geminiService');
const geminiTryOn = require('./geminiTryOn');

/**
 * Chat with AI
 */
async function chatWithAI(message, wardrobeContext = null, conversationHistory = [], profileImage = null) {
  return await geminiService.chatWithGemini(message, wardrobeContext, conversationHistory);
}

/**
 * Analyze clothing image
 */
async function analyzeClothingImage(imageBuffer, imageMimeType, options = {}) {
  return await geminiService.analyzeClothingImageGemini(imageBuffer, imageMimeType);
}

/**
 * Get outfit recommendations
 */
async function getOutfitRecommendations(wardrobeItems, occasion, bodyShape = null, weather = null) {
  return await geminiService.getOutfitRecommendationsGemini(wardrobeItems, occasion, bodyShape, weather);
}

/**
 * Rate clothing item
 */
async function rateClothingItem(itemDescription, itemImage = null, bodyShape = null) {
  return await geminiService.rateClothingItemGemini(itemDescription, itemImage, bodyShape);
}

/**
 * Virtual try-on
 */
async function virtualTryOn(userPhotoDataUrl, garmentImageBuffer, garmentMimeType) {
  return await geminiTryOn.virtualTryOnGemini(userPhotoDataUrl, garmentImageBuffer, garmentMimeType);
}

module.exports = {
  chatWithAI,
  analyzeClothingImage,
  getOutfitRecommendations,
  rateClothingItem,
  virtualTryOn
};
