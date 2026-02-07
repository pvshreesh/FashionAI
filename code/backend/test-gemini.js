/**
 * Simple test script to verify Gemini API connection
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    console.log('🧪 Testing Gemini API connection...\n');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return;
    }
    
    console.log('✅ API Key found');
    console.log('🔑 Key:', process.env.GEMINI_API_KEY.substring(0, 20) + '...\n');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try different model names that work with Google AI Studio
    // Note: SDK uses model name without "models/" prefix
    const modelsToTry = [
      'gemini-2.5-flash',      // Fast, cost-effective (recommended for MVP)
      'gemini-2.5-pro',        // Better quality
      'gemini-2.0-flash',      // Alternative
      'gemini-1.5-flash',      // Legacy (may not work)
      'gemini-1.5-pro'         // Legacy (may not work)
    ];
    
    let model = null;
    let workingModelName = null;
    
    // Try to find a working model
    for (const modelName of modelsToTry) {
      try {
        console.log(`🔍 Trying model: ${modelName}...`);
        model = genAI.getGenerativeModel({ model: modelName });
        const testResult = await model.generateContent('test');
        workingModelName = modelName;
        console.log(`✅ Model ${modelName} works!\n`);
        break;
      } catch (e) {
        console.log(`❌ ${modelName} failed\n`);
      }
    }
    
    if (!model || !workingModelName) {
      throw new Error('No working model found. Check API key and available models.');
    }
    
    console.log(`📤 Using model: ${workingModelName}`);
    console.log('📤 Sending test message to Gemini...\n');
    
    const result = await model.generateContent('Say "Hello! Gemini API is working correctly." in a friendly way.');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response received:');
    console.log('📝', text);
    console.log(`\n✅ Gemini API is working correctly with model: ${workingModelName}! 🎉`);
    console.log(`\n💡 Update your config to use: ${workingModelName}`);
    
  } catch (error) {
    console.error('❌ Error testing Gemini API:');
    console.error(error.message);
    
    if (error.message.includes('API_KEY')) {
      console.error('\n💡 Tip: Check if your API key is valid and has proper permissions.');
    }
  }
}

testGemini();
