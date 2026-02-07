const axios = require('axios');
const sharp = require('sharp');
const { getChatModel, getVisionModel } = require('../config/gemini');

const MAX_IMAGE_DIM = 1024; // Resize for faster API response

/** Extract base64 and mime from data URL (e.g. data:image/jpeg;base64,...) */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/**
 * Chat with AI fashion assistant
 * @param {string} userMessage
 * @param {array} wardrobeContext
 * @param {array} conversationHistory
 * @param {string} profileImageDataUrl - optional: user's photo from Profile (data URL)
 */
async function chatWithAI(userMessage, wardrobeContext = null, conversationHistory = [], profileImageDataUrl = null) {
  try {
    const model = profileImageDataUrl ? getVisionModel() : getChatModel();
- Fashion advice and styling tips
- Outfit recommendations from their wardrobe
- Clothing analysis and ratings
- Fit and sizing advice
- Body shape-based styling (Rectangle, Apple, Pear, Hourglass, Inverted Triangle)

Be friendly, helpful, and provide practical fashion advice.`;

    if (wardrobeContext) {
      systemPrompt += `\n\nUser's wardrobe items: ${JSON.stringify(wardrobeContext)}`;
    }
    if (profileImageDataUrl) {
      systemPrompt += `\n\nThe user has shared a photo of themselves. Use it to give personalized styling advice when relevant.`;
    }

    // Build conversation history
    const chat = model.startChat({
      history: conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    let messageParts;
    if (profileImageDataUrl) {
      const parsed = parseDataUrl(profileImageDataUrl);
      if (parsed) {
        messageParts = [
          { text: userMessage },
          { inlineData: { mimeType: parsed.mimeType, data: parsed.data } }
        ];
      } else {
        messageParts = userMessage;
      }
    } else {
      messageParts = userMessage;
    }
    const result = await chat.sendMessage(messageParts);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      message: text,
      usage: {
        promptTokens: result.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: result.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata?.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error('Gemini chat error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get AI response'
    };
  }
}

/** Extract retry delay (seconds) from 429 error message */
function getRetryDelayFrom429(error) {
  const msg = error?.message || '';
  const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(parseFloat(match[1])) * 1000 : 60000; // ms
}

/** Check if error is rate limit (429) */
function isRateLimitError(error) {
  return (error?.message || '').includes('429') || (error?.message || '').toLowerCase().includes('quota exceeded');
}

/**
 * Analyze clothing image and extract comprehensive information
 * Retries once on 429 rate limit with delay
 */
async function analyzeClothingImage(imageBuffer, imageMimeType, retryCount = 0) {
  const maxRetries = 1;
  try {
    const model = getVisionModel();
    
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

Be thorough and extract as much information as possible from the image. If size/brand is not visible, use "unknown".`;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: imageMimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      const tags = JSON.parse(jsonText);
      
      return {
        success: true,
        tags: tags,
        rawResponse: text
      };
    } catch (parseError) {
      // If JSON parsing fails, return raw text
      return {
        success: true,
        tags: null,
        rawResponse: text,
        error: 'Could not parse JSON, returning raw response'
      };
    }
  } catch (error) {
    if (isRateLimitError(error) && retryCount < maxRetries) {
      const delay = getRetryDelayFrom429(error);
      console.log(`  ⏳ Rate limit hit, waiting ${delay / 1000}s before retry...`);
      await new Promise(r => setTimeout(r, delay));
      return analyzeClothingImage(imageBuffer, imageMimeType, retryCount + 1);
    }
    const errMsg = error.message || 'Failed to analyze image';
    if (isRateLimitError(error)) {
      return {
        success: false,
        error: 'Daily API limit reached (20 requests/day on free tier). Add fewer images or try again tomorrow.',
        rawResponse: errMsg
      };
    }
    console.error('Image analysis error:', error);
    return {
      success: false,
      error: errMsg
    };
  }
}

/**
 * Get outfit recommendations from wardrobe
 */
async function getOutfitRecommendations(wardrobeItems, occasion, bodyShape = null, weather = null) {
  try {
    const model = getChatModel();
    
    let prompt = `You are a professional fashion stylist. The user has these items in their wardrobe:\n\n`;
    
    wardrobeItems.forEach((item, index) => {
      prompt += `${index + 1}. ${item.name || 'Item'} - ${item.tags?.join(', ') || 'No tags'}\n`;
    });
    
    prompt += `\nRecommend 3 complete outfits using ONLY items from their wardrobe.\n`;
    prompt += `Occasion: ${occasion}\n`;
    
    if (bodyShape) {
      prompt += `User's body shape: ${bodyShape}\n`;
      prompt += `Consider body shape styling guidelines for ${bodyShape}:\n`;
      
      const bodyShapeGuidelines = {
        'Rectangle': 'Add definition with belts, layers, peplum details to create curves. Recommend structured pieces, defined waistlines, A-line skirts.',
        'Apple': 'Define waist, elongate torso with flowy tops, high-rise pants, V-necks. Recommend empire waist dresses, flowy tops, high-waisted bottoms.',
        'Pear': 'Balance proportions by drawing attention upward, statement tops, flared sleeves. Recommend statement tops, A-line dresses, wide-leg pants.',
        'Hourglass': 'Highlight waist, embrace curves with wrap dresses, high-waisted jeans, fitted tops. Recommend wrap dresses, fitted tops, belted pieces.',
        'Inverted Triangle': 'Ground silhouette by softening upper body, adding volume below. Recommend V-necks, A-line skirts, wide-leg pants.'
      };
      
      prompt += bodyShapeGuidelines[bodyShape] || '';
    }
    
    if (weather) {
      prompt += `\nWeather: ${weather}\n`;
    }
    
    prompt += `\nFor each outfit, provide:\n`;
    prompt += `1. List of items to wear together\n`;
    prompt += `2. Why it works for the occasion\n`;
    prompt += `3. Styling tips\n`;
    prompt += `4. How it flatters their body shape (if applicable)\n\n`;
    prompt += `Return as structured JSON array with outfit objects.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to extract JSON
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      const outfits = JSON.parse(jsonText);
      
      return {
        success: true,
        outfits: Array.isArray(outfits) ? outfits : [outfits],
        rawResponse: text
      };
    } catch (parseError) {
      return {
        success: true,
        outfits: null,
        rawResponse: text,
        error: 'Could not parse JSON, returning raw response'
      };
    }
  } catch (error) {
    console.error('Outfit recommendation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate recommendations'
    };
  }
}

/**
 * Rate/style score a clothing item
 */
async function rateClothingItem(itemDescription, itemImage = null, bodyShape = null) {
  try {
    const model = itemImage ? getVisionModel() : getChatModel();
    
    let prompt = `Rate this clothing item on a scale of 1-10 for:\n`;
    prompt += `1. Versatility (works with many outfits)\n`;
    prompt += `2. Trendiness (current fashion relevance)\n`;
    prompt += `3. Quality indicators (based on appearance/description)\n`;
    
    if (bodyShape) {
      prompt += `4. Body shape compatibility for ${bodyShape}\n`;
    }
    
    prompt += `\nItem: ${itemDescription}\n\n`;
    prompt += `Return scores and brief explanations in JSON format.`;

    let result;
    if (itemImage) {
      const imagePart = {
        inlineData: {
          data: itemImage.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };
      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(prompt);
    }
    
    const response = await result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      const rating = JSON.parse(jsonText);
      
      return {
        success: true,
        rating: rating,
        rawResponse: text
      };
    } catch (parseError) {
      return {
        success: true,
        rating: null,
        rawResponse: text,
        error: 'Could not parse JSON, returning raw response'
      };
    }
  } catch (error) {
    console.error('Rating error:', error);
    return {
      success: false,
      error: error.message || 'Failed to rate item'
    };
  }
}

/**
 * Virtual try-on: composite garment onto person using Gemini 2.5 Flash Image
 * @param {string} userPhotoDataUrl - User's profile photo (data URL or base64)
 * @param {Buffer} garmentImageBuffer - Garment image buffer
 * @param {string} garmentMimeType - Garment image MIME type
 * @returns {{ success: boolean, image?: string, error?: string }}
 */
async function resizeForApi(buffer) {
  try {
    return await sharp(buffer)
      .resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return buffer;
  }
}

async function virtualTryOn(userPhotoDataUrl, garmentImageBuffer, garmentMimeType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Gemini API key not configured' };
    }

    const userParsed = parseDataUrl(userPhotoDataUrl);
    const userBase64Raw = userParsed ? userParsed.data : (typeof userPhotoDataUrl === 'string' ? userPhotoDataUrl : null);
    if (!userBase64Raw) {
      return { success: false, error: 'Invalid user photo format' };
    }
    // Resize images for faster API response (large images slow down generation)
    const userBuffer = Buffer.from(userBase64Raw, 'base64');
    const [garmentResized, userResized] = await Promise.all([
      resizeForApi(garmentImageBuffer),
      resizeForApi(userBuffer)
    ]);

    const userBase64 = userResized.toString('base64');
    const garmentBase64 = garmentResized.toString('base64');

    const prompt = `First image: person. Second image: clothing item. Create a realistic photo of the person wearing this clothing. Match pose and lighting. Output one image.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: userBase64 } },
          { inline_data: { mime_type: 'image/jpeg', data: garmentBase64 } }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };

    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000 // 2 min - Gemini image gen can be slow
    });

    const candidates = response.data?.candidates;
    if (!candidates || candidates.length === 0) {
      const errText = response.data?.promptFeedback?.blockReason || 'No response from model';
      return { success: false, error: errText };
    }

    const parts = candidates[0].content?.parts || [];
    for (const part of parts) {
      if (part.inline_data && part.inline_data.data) {
        const mime = part.inline_data.mime_type || 'image/png';
        const dataUrl = `data:${mime};base64,${part.inline_data.data}`;
        return { success: true, image: dataUrl };
      }
    }

    return { success: false, error: 'Model did not return an image' };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Virtual try-on error:', error.response?.data || error);
    return { success: false, error: msg || 'Failed to generate try-on image' };
  }
}

module.exports = {
  chatWithAI,
  analyzeClothingImage,
  getOutfitRecommendations,
  rateClothingItem,
  virtualTryOn
};
