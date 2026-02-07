/**
 * Test Gemini API directly with fetch
 */
require('dotenv').config();

async function testDirectAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API key not found');
    return;
  }
  
  console.log('🧪 Testing Gemini API directly...\n');
  console.log('🔑 API Key:', apiKey.substring(0, 20) + '...\n');
  
  // Try to list models first
  try {
    console.log('📋 Attempting to list available models...\n');
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log('✅ Successfully connected to API!\n');
      console.log('Available models:');
      if (data.models && data.models.length > 0) {
        data.models.forEach(model => {
          console.log(`  - ${model.name}`);
        });
        
        // Try to use the first available model
        const firstModel = data.models[0].name;
        console.log(`\n🧪 Testing with model: ${firstModel}\n`);
        
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/${firstModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: 'Say hello in one sentence'
                }]
              }]
            })
          }
        );
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('✅ API call successful!');
          console.log('📝 Response:', testData.candidates[0].content.parts[0].text);
          console.log(`\n✅ Use model name: ${firstModel}`);
        } else {
          const errorText = await testResponse.text();
          console.log('❌ Model test failed:', testResponse.status);
          console.log('Error:', errorText);
        }
      } else {
        console.log('⚠️  No models found in response');
        console.log('Full response:', JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await listResponse.text();
      console.log('❌ Failed to list models:', listResponse.status);
      console.log('Error:', errorText);
      console.log('\n💡 This might mean:');
      console.log('   1. API key is invalid');
      console.log('   2. API key needs Generative AI API enabled');
      console.log('   3. Check Google AI Studio for correct API key');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectAPI();
