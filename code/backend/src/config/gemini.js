const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get models
// Using gemini-2.5-flash for faster responses (good for MVP)
// Can switch to gemini-2.5-pro for better quality if needed
// Note: Model names must include "models/" prefix for Google AI Studio API keys
const getChatModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

const getVisionModel = () => {
  // gemini-2.5-flash also supports vision (multimodal)
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

module.exports = {
  genAI,
  getChatModel,
  getVisionModel
};
