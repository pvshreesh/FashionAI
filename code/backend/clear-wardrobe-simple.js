/**
 * Clear all wardrobe items (non-interactive)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const WardrobeItem = require('./src/models/WardrobeItem');

async function clearWardrobe() {
  try {
    console.log('🗑️  Clearing wardrobe items...\n');
    
    const mongoURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/fashion-app';
    
    try {
      await mongoose.connect(mongoURI);
      console.log('✅ Connected to database\n');
    } catch (error) {
      console.log('⚠️  Database not connected.');
      console.log('   Items are not being saved anyway (MongoDB not connected).');
      console.log('   No items to clear.\n');
      return;
    }

    const countBefore = await WardrobeItem.countDocuments({});
    console.log(`📊 Found ${countBefore} item(s) in database\n`);

    if (countBefore === 0) {
      console.log('✅ Database is already empty.\n');
      await mongoose.disconnect();
      return;
    }

    const result = await WardrobeItem.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} item(s)\n`);
    console.log('🗑️  Wardrobe cleared! Ready for new items.\n');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearWardrobe();
