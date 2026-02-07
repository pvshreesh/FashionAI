/**
 * List available Gemini models
 */
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    console.log('🔍 Listing available Gemini models...\n');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try to list models
    const models = await genAI.listModels();
    console.log('Available models:');
    models.forEach(model => {
      console.log(`  - ${model.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 This might mean:');
    console.error('   1. API key needs Generative AI API enabled in Google Cloud');
    console.error('   2. API key might be invalid');
    console.error('   3. Try using gemini-pro or check Google AI Studio');
    
    // Try common model names
    console.log('\n🔧 Trying common model names...\n');
    const commonModels = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'models/gemini-pro'];
    
    for (const modelName of commonModels) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('test');
        console.log(`✅ ${modelName} works!`);
        break;
      } catch (e) {
        console.log(`❌ ${modelName} failed: ${e.message.substring(0, 50)}...`);
      }
    }
  }
}

listModels();
