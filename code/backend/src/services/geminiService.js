/**
 * Gemini API Service – chat, vision, recommendations, rating
 * Uses REST API; no @google/generative-ai SDK.
 * All AI features run on Gemini (no Ollama).
 */

const axios = require('axios');
const sharp = require('sharp');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
const VISION_MAX_DIM = parseInt(process.env.GEMINI_VISION_MAX_DIM, 10) || 1024;

function getApiUrl(model, method = 'generateContent') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return `${GEMINI_BASE}/models/${model}:${method}?key=${key}`;
}

async function callGemini(model, contents, options = {}) {
  const url = getApiUrl(model);
  const { timeout = 60000, ...generationOptions } = options;
  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      topP: options.topP ?? 0.9,
      topK: options.topK ?? 40,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      ...generationOptions
    }
  };
  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout
  });
  const text = res.data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('');
  if (!text) {
    const err = res.data?.promptFeedback?.blockReason || 'No text in response';
    throw new Error(err);
  }
  return text;
}

function parseJsonResponse(text, isValid, label) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const value = JSON.parse(cleaned);
  if (!isValid(value)) throw new Error(`Gemini returned invalid ${label} data`);
  return value;
}

async function resizeImage(buffer, maxDim = VISION_MAX_DIM) {
  try {
    return await sharp(buffer)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * Chat with Gemini
 */
async function chatWithGemini(message, wardrobeContext = null, conversationHistory = [], profileImage = null) {
  try {
    let systemPrompt = `You are a professional fashion stylist AI assistant. You help users with:
- Fashion advice and styling tips
- Outfit recommendations from their wardrobe
- Clothing analysis and ratings
- Fit and sizing advice
- Body shape-based styling (Rectangle, Apple, Pear, Hourglass, Inverted Triangle)

Be friendly, helpful, and provide practical fashion advice.`;

    if (wardrobeContext && wardrobeContext.length > 0) {
      systemPrompt += `\n\nUser's wardrobe items: ${JSON.stringify(wardrobeContext)}`;
    }

    if (profileImage) {
      systemPrompt += `\n\nA saved profile photo exists for the user. Use it as context for try-on and fit guidance, but do not request the photo again unless needed.`;
    }

    const parts = [{ text: systemPrompt }];
    for (const msg of conversationHistory) {
      parts.push({ text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}` });
    }
    parts.push({ text: `User: ${message}` });
    parts.push({ text: 'Assistant:' });

    const fullPrompt = parts.map((p) => p.text).join('\n\n');
    const contents = [{ role: 'user', parts: [{ text: fullPrompt }] }];

    const response = await callGemini(CHAT_MODEL, contents, { temperature: 0.7 });
    return {
      success: true,
      message: response.trim(),
      model: CHAT_MODEL,
      usage: {},
      rawResponse: response
    };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Gemini chat error:', msg);
    return { success: false, error: msg || 'Failed to get response from Gemini' };
  }
}

/**
 * Analyze clothing image with Gemini vision
 */
async function analyzeClothingImageGemini(imageBuffer, imageMimeType) {
  try {
    const resized = await resizeImage(imageBuffer);
    const base64 = resized.toString('base64');
    const mime = 'image/jpeg'; // resizeImage outputs JPEG

    const prompt = `Analyze this clothing item image in detail and extract ALL information in JSON format:
{
  "name": "descriptive name for the item (e.g., 'Blue Denim Jacket', 'White Cotton T-Shirt')",
  "itemType": "tshirt/dress/pants/jeans/jacket/sweater/skirt/shorts/shoes/etc",
  "color": "primary color",
  "pattern": "solid/striped/floral/plaid/dotted/etc",
  "style": "casual/formal/streetwear/minimalist/bohemian/classic/etc",
  "season": "spring/summer/fall/winter/all-season",
  "occasion": ["casual", "work", "party", "date", "formal", "gym", "beach", etc],
  "size": "estimated size if visible (S/M/L/XL) or 'unknown' if not visible",
  "fit": "loose/fitted/oversized/regular",
  "material": "cotton/denim/wool/polyester/etc if visible",
  "brand": "brand name if visible on tags/labels, otherwise 'unknown'",
  "bodyShapeCompatibility": ["Rectangle", "Apple", "Pear", "Hourglass", "Inverted Triangle"],
  "description": "detailed description of the item",
  "tags": ["array", "of", "relevant", "tags", "for", "search"]
}

Be thorough. If size/brand is not visible, use "unknown". Return ONLY valid JSON, no markdown.`;

    const contents = [{
      role: 'user',
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mime, data: base64 } }
      ]
    }];

    const response = await callGemini(VISION_MODEL, contents, {
      temperature: 0.3,
      responseMimeType: 'application/json'
    });
    const tags = parseJsonResponse(
      response,
      (value) => value && !Array.isArray(value) && typeof value === 'object' && typeof value.name === 'string',
      'clothing analysis'
    );
    return { success: true, tags, rawResponse: response, model: VISION_MODEL };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Gemini image analysis error:', msg);
    return { success: false, error: msg || 'Failed to analyze image' };
  }
}

/**
 * Get outfit recommendations with Gemini
 */
async function getOutfitRecommendationsGemini(wardrobeItems, occasion, bodyShape = null, weather = null) {
  try {
    let prompt = `You are a professional fashion stylist. The user has these items in their wardrobe:\n\n`;
    wardrobeItems.forEach((item, i) => {
      prompt += `${i + 1}. ${item.name || 'Item'} - ${(item.tags || []).join(', ') || 'No tags'}\n`;
    });
    prompt += `\nRecommend 3 complete outfits using ONLY items from their wardrobe.\nOccasion: ${occasion}\n`;
    if (bodyShape) {
      prompt += `User's body shape: ${bodyShape}\n`;
    }
    if (weather) prompt += `Weather: ${weather}\n`;
    prompt += `\nFor each outfit provide: 1) List of items, 2) Why it works, 3) Styling tips, 4) Body shape flattery (if applicable). Return as a JSON array of outfit objects.`;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const response = await callGemini(CHAT_MODEL, contents, {
      temperature: 0.7,
      responseMimeType: 'application/json'
    });
    const outfits = parseJsonResponse(
      response,
      (value) => Array.isArray(value) && value.length > 0 && value.every((outfit) => outfit && typeof outfit === 'object'),
      'outfit recommendation'
    );
    return {
      success: true,
      outfits,
      rawResponse: response,
      model: CHAT_MODEL
    };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Gemini recommendations error:', msg);
    return { success: false, error: msg || 'Failed to generate recommendations' };
  }
}

/**
 * Rate clothing item with Gemini (text or vision)
 */
async function rateClothingItemGemini(itemDescription, itemImage = null, bodyShape = null) {
  try {
    let prompt = `Rate this clothing item on a scale of 1-10 for: 1. Versatility, 2. Trendiness, 3. Quality.`;
    if (bodyShape) prompt += ` 4. Body shape compatibility for ${bodyShape}.`;
    prompt += ` Item: ${itemDescription}. Return scores and brief explanations in JSON format.`;

    const parts = [{ text: prompt }];
    if (itemImage) {
      const resized = await resizeImage(itemImage);
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: resized.toString('base64') } });
    }

    const contents = [{ role: 'user', parts }];
    const model = itemImage ? VISION_MODEL : CHAT_MODEL;
    const response = await callGemini(model, contents, {
      temperature: 0.3,
      responseMimeType: 'application/json'
    });
    const rating = parseJsonResponse(
      response,
      (value) => value && !Array.isArray(value) && typeof value === 'object',
      'clothing rating'
    );
    return { success: true, rating, rawResponse: response };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Gemini rate item error:', msg);
    return { success: false, error: msg || 'Failed to rate item' };
  }
}

module.exports = {
  chatWithGemini,
  analyzeClothingImageGemini,
  getOutfitRecommendationsGemini,
  rateClothingItemGemini,
  parseJsonResponse
};
