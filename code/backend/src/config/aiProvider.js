/**
 * AI Provider Configuration
 * Switch between Gemini API and Local Ollama
 */

require('dotenv').config();

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini'; // 'gemini' or 'ollama'

// Fallback configuration
const USE_FALLBACK = process.env.USE_AI_FALLBACK === 'true';
const FALLBACK_PROVIDER = AI_PROVIDER === 'gemini' ? 'ollama' : 'gemini';

function getProvider() {
  return {
    current: AI_PROVIDER,
    fallback: USE_FALLBACK ? FALLBACK_PROVIDER : null
  };
}

function shouldUseFallback(error) {
  // Use fallback if Ollama not available or API error
  return USE_FALLBACK && (
    error?.message?.includes('not running') ||
    error?.message?.includes('timeout') ||
    error?.code === 'ECONNREFUSED'
  );
}

module.exports = {
  getProvider,
  shouldUseFallback,
  AI_PROVIDER
};
