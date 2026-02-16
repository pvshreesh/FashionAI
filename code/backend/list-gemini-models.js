#!/usr/bin/env node
/**
 * List Gemini API models and show those that support image generation.
 * Run: node list-gemini-models.js
 */
require('dotenv').config();
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set in .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (ch) => { data += ch; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error('API error:', json.error.message || json.error);
        process.exit(1);
      }
      const models = json.models || [];
      console.log('Total models returned:', models.length);
      console.log('');

      // Models with "image" in name (likely image gen)
      const imageModels = models.filter((m) => {
        const name = (m.name || '').toLowerCase();
        return name.includes('image');
      });

      console.log('--- Models with "image" in name (likely image generation) ---');
      imageModels.forEach((m) => {
        const name = (m.name || '').replace(/^models\//, '');
        const methods = m.supportedGenerationMethods || [];
        console.log('  ', name);
        console.log('      displayName:', m.displayName || '-');
        console.log('      supportedGenerationMethods:', methods.join(', ') || '-');
      });

      console.log('');
      console.log('--- All model names (for reference) ---');
      models.forEach((m) => {
        const name = (m.name || '').replace(/^models\//, '');
        console.log('  ', name);
      });
    } catch (e) {
      console.error('Parse error:', e.message);
      console.error('Raw response (first 500 chars):', data.slice(0, 500));
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});
