/**
 * Check wardrobe items in database
 */
require('dotenv').config();
const mongoose = require('mongoose');
const WardrobeItem = require('./src/models/WardrobeItem');

async function checkWardrobe() {
  try {
    // Connect to database
    const mongoURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/fashion-app';
    
    console.log('🔍 Connecting to database...');
    try {
      await mongoose.connect(mongoURI);
      console.log('✅ Connected to database\n');
    } catch (error) {
      console.log('⚠️  Database not connected, checking in-memory items...\n');
      console.log('Note: Items are only saved if MongoDB is connected.\n');
      return;
    }

    // Get all items
    const items = await WardrobeItem.find({}).sort({ createdAt: -1 });
    
    console.log(`📊 Total items in wardrobe: ${items.length}\n`);
    
    if (items.length === 0) {
      console.log('No items found in database.');
      console.log('This could mean:');
      console.log('  1. MongoDB is not connected');
      console.log('  2. No items have been saved yet');
      console.log('  3. Items are stored in a different database\n');
      return;
    }

    console.log('📋 Recent items:\n');
    items.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.name || 'Unnamed Item'}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   Type: ${item.itemType || 'N/A'}`);
      console.log(`   Color: ${item.color || 'N/A'}`);
      console.log(`   Images: ${item.images?.length || 0}`);
      console.log(`   Tags: ${(item.tags || []).slice(0, 5).join(', ')}${item.tags?.length > 5 ? '...' : ''}`);
      console.log(`   Created: ${item.createdAt}`);
      console.log('');
    });

    // Statistics
    console.log('\n📈 Statistics:');
    console.log(`   Total items: ${items.length}`);
    console.log(`   Items with images: ${items.filter(i => i.images && i.images.length > 0).length}`);
    console.log(`   Total images: ${items.reduce((sum, i) => sum + (i.images?.length || 0), 0)}`);
    
    // Group by type
    const byType = {};
    items.forEach(item => {
      const type = item.itemType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    console.log('\n📦 Items by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWardrobe();
