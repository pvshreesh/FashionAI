/**
 * AI Provider Configuration
 * Gemini only for all AI features
 */

require('dotenv').config();

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

function getProvider() {
  return { current: AI_PROVIDER, fallback: null };
}

function shouldUseFallback(error) {
  return false;
}

module.exports = {
  getProvider,
  shouldUseFallback,
  AI_PROVIDER
};
