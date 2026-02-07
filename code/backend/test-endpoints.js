/**
 * Test API endpoints
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  
  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Test health endpoint
    console.log('1. Testing /health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health check:', healthData.status);
    console.log('');
    
    // Test chat endpoint
    console.log('2. Testing /api/ai/chat...');
    const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What colors work well together in fashion?'
      })
    });
    
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      console.log('✅ Chat response received!');
      console.log('📝 Message:', chatData.message.substring(0, 100) + '...');
      console.log('📊 Usage:', chatData.usage);
    } else {
      const error = await chatRes.text();
      console.log('❌ Chat failed:', error);
    }
    console.log('');
    
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
  }
}

testEndpoints();
