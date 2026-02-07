/**
 * Clear all wardrobe items from database
 */
require('dotenv').config();
const mongoose = require('mongoose');
const WardrobeItem = require('./src/models/WardrobeItem');

async function clearWardrobe() {
  try {
    console.log('🗑️  Clearing wardrobe items...\n');
    
    // Connect to database
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

    // Count items before deletion
    const countBefore = await WardrobeItem.countDocuments({});
    console.log(`📊 Found ${countBefore} item(s) in database\n`);

    if (countBefore === 0) {
      console.log('✅ Database is already empty. Nothing to clear.\n');
      await mongoose.disconnect();
      return;
    }

    // Delete all items
    const result = await WardrobeItem.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} item(s) from database\n`);
    console.log('🗑️  Wardrobe cleared! Ready for new items.\n');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  This will delete ALL wardrobe items. Continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    clearWardrobe().then(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('❌ Cancelled. No items deleted.');
    rl.close();
    process.exit(0);
  }
});
