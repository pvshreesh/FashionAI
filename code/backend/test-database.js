/**
 * Test MongoDB connection and optionally create a test wardrobe item.
 * Run: node test-database.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/fashion-app';

async function testConnection() {
  console.log('\n🔌 Testing MongoDB connection...');
  console.log('   URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // hide password

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB:', mongoose.connection.host);
    console.log('   Database:', mongoose.connection.name);

    // Optional: create a test wardrobe item
    const WardrobeItem = require('./src/models/WardrobeItem');
    const count = await WardrobeItem.countDocuments({});
    console.log('\n📊 Current wardrobe items in DB:', count);

    if (process.argv.includes('--seed') && count === 0) {
      const tempUserId = new mongoose.Types.ObjectId('000000000000000000000000');
      await WardrobeItem.create({
        userId: tempUserId,
        name: 'Test T-Shirt',
        itemType: 'tshirt',
        color: 'blue',
        style: 'casual',
        tags: ['test', 'tshirt', 'casual'],
        images: [{ url: 'data:image/png;base64,test', isPrimary: true }]
      });
      console.log('   Created 1 test item (--seed)');
    }

    console.log('\n✅ Database is ready. You can start the server with: npm start\n');
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    if (!process.env.DATABASE_URL) {
      console.log('\n💡 Tip: Set DATABASE_URL in .env (see docs/DATABASE_SETUP.md)');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
