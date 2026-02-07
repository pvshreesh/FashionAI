/**
 * Unified AI Service
 * Routes requests to Gemini or Ollama based on AI_PROVIDER setting
 */

const { AI_PROVIDER } = require('../config/aiProvider');
const geminiService = require('./geminiService');
const ollamaService = require('./ollamaService');

/**
 * Chat with AI (unified interface)
 */
async function chatWithAI(message, wardrobeContext = null, conversationHistory = [], profileImage = null) {
  if (AI_PROVIDER === 'ollama') {
    return await ollamaService.chatWithOllama(message, wardrobeContext, conversationHistory);
  } else {
    return await geminiService.chatWithAI(message, wardrobeContext, conversationHistory, profileImage);
  }
}

/**
 * Analyze clothing image (unified interface)
 * @param {object} options - { forWardrobe: true } to use WARDROBE_AI_PROVIDER (default: ollama for wardrobe)
 */
async function analyzeClothingImage(imageBuffer, imageMimeType, options = {}) {
  const useOllama = options.forWardrobe && (process.env.WARDROBE_AI_PROVIDER || 'ollama') === 'ollama';
  if (useOllama) {
    const result = await ollamaService.analyzeClothingImageOllama(imageBuffer, imageMimeType);
    if (!result.success && result.fallback === 'gemini') {
      return await geminiService.analyzeClothingImage(imageBuffer, imageMimeType);
    }
    return result;
  }
  if (AI_PROVIDER === 'ollama') {
    return await ollamaService.analyzeClothingImageOllama(imageBuffer, imageMimeType);
  }
  return await geminiService.analyzeClothingImage(imageBuffer, imageMimeType);
}

/**
 * Get outfit recommendations (unified interface)
 */
async function getOutfitRecommendations(wardrobeItems, occasion, bodyShape = null, weather = null) {
  if (AI_PROVIDER === 'ollama') {
    return await ollamaService.getOutfitRecommendationsOllama(wardrobeItems, occasion, bodyShape, weather);
  } else {
    return await geminiService.getOutfitRecommendations(wardrobeItems, occasion, bodyShape, weather);
  }
}

/**
 * Rate clothing item (unified interface)
 */
async function rateClothingItem(itemDescription, itemImage = null, bodyShape = null) {
  // Rate item is only available in Gemini for now
  // TODO: Implement for Ollama if needed
  if (AI_PROVIDER === 'ollama') {
    return {
      success: false,
      error: 'Rating feature not yet implemented for Ollama. Please use Gemini provider.',
      fallback: 'gemini'
    };
  } else {
    return await geminiService.rateClothingItem(itemDescription, itemImage, bodyShape);
  }
}

/**
 * Virtual try-on: composite garment onto user's photo (Gemini 2.5 Flash Image)
 */
async function virtualTryOn(userPhotoDataUrl, garmentImageBuffer, garmentMimeType) {
  return require('./geminiService').virtualTryOn(userPhotoDataUrl, garmentImageBuffer, garmentMimeType);
}

module.exports = {
  chatWithAI,
  analyzeClothingImage,
  getOutfitRecommendations,
  rateClothingItem,
  virtualTryOn
};
