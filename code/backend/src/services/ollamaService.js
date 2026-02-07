/**
 * Ollama Local LLM Service
 * Alternative to Gemini API - runs models locally
 * 
 * Setup:
 * 1. Install Ollama: https://ollama.com/download
 * 2. Pull models: 
 *    - ollama pull llama3:8b (for chat)
 *    - ollama pull llava (for vision)
 * 3. Start Ollama service (runs automatically)
 * 4. Set OLLAMA_BASE in .env (default: http://localhost:11434)
 */

const axios = require('axios');

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3:8b';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava';

/**
 * Check if Ollama is running
 */
async function checkOllama() {
  try {
    const response = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 2000 });
    return {
      available: true,
      models: response.data.models || []
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Chat with local LLM
 */
async function chatWithOllama(userMessage, wardrobeContext = null, conversationHistory = []) {
  try {
    // Check if Ollama is available
    const ollamaStatus = await checkOllama();
    if (!ollamaStatus.available) {
      return {
        success: false,
        error: 'Ollama is not running. Please start Ollama service.',
        fallback: 'gemini' // Suggest fallback to Gemini
      };
    }

    // Build system prompt
    let systemPrompt = `You are a professional fashion stylist AI assistant. You help users with:
- Fashion advice and styling tips
- Outfit recommendations from their wardrobe
- Clothing analysis and ratings
- Fit and sizing advice
- Body shape-based styling (Rectangle, Apple, Pear, Hourglass, Inverted Triangle)

Be friendly, helpful, and provide practical fashion advice.`;

    if (wardrobeContext) {
      systemPrompt += `\n\nUser's wardrobe items: ${JSON.stringify(wardrobeContext)}`;
    }

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await axios.post(`${OLLAMA_BASE}/api/chat`, {
      model: CHAT_MODEL,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    }, {
      timeout: 30000 // 30 second timeout
    });

    return {
      success: true,
      message: response.data.message.content,
      model: CHAT_MODEL,
      usage: {
        promptTokens: response.data.prompt_eval_count || 0,
        completionTokens: response.data.eval_count || 0,
        totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      }
    };
  } catch (error) {
    console.error('Ollama chat error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to get response from Ollama',
      fallback: 'gemini'
    };
  }
}

/**
 * Analyze clothing image with local vision model
 */
async function analyzeClothingImageOllama(imageBuffer, imageMimeType) {
  try {
    // Check if Ollama is available
    const ollamaStatus = await checkOllama();
    if (!ollamaStatus.available) {
      return {
        success: false,
        error: 'Ollama is not running. Please start Ollama service.',
        fallback: 'gemini'
      };
    }

    // Convert image to base64
    const imageBase64 = imageBuffer.toString('base64');

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

Be thorough and extract as much information as possible from the image. If size/brand is not visible, use "unknown". Return ONLY valid JSON, no markdown formatting.`;

    const response = await axios.post(`${OLLAMA_BASE}/api/generate`, {
      model: VISION_MODEL,
      prompt: prompt,
      images: [imageBase64],
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more consistent analysis
        top_p: 0.9
      }
    }, {
      timeout: 60000 // 60 second timeout for image analysis
    });

    // Try to parse JSON from response
    try {
      const responseText = response.data.response;
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/) ||
                       responseText.match(/\{[\s\S]*\}/);
      
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const tags = JSON.parse(jsonText);
      
      return {
        success: true,
        tags: tags,
        rawResponse: responseText,
        model: VISION_MODEL
      };
    } catch (parseError) {
      // If JSON parsing fails, return raw text
      return {
        success: true,
        tags: null,
        rawResponse: response.data.response,
        error: 'Could not parse JSON, returning raw response',
        model: VISION_MODEL
      };
    }
  } catch (error) {
    console.error('Ollama image analysis error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to analyze image with Ollama',
      fallback: 'gemini'
    };
  }
}

/**
 * Get outfit recommendations using local LLM
 */
async function getOutfitRecommendationsOllama(wardrobeItems, occasion, bodyShape = null, weather = null) {
  try {
    const ollamaStatus = await checkOllama();
    if (!ollamaStatus.available) {
      return {
        success: false,
        error: 'Ollama is not running',
        fallback: 'gemini'
      };
    }

    let prompt = `You are a professional fashion stylist. The user has these items in their wardrobe:\n\n`;
    
    wardrobeItems.forEach((item, index) => {
      prompt += `${index + 1}. ${item.name || 'Item'} - ${item.tags?.join(', ') || 'No tags'}\n`;
    });
    
    prompt += `\nRecommend 3 complete outfits using ONLY items from their wardrobe.\n`;
    prompt += `Occasion: ${occasion}\n`;
    
    if (bodyShape) {
      prompt += `User's body shape: ${bodyShape}\n`;
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

    const response = await axios.post(`${OLLAMA_BASE}/api/generate`, {
      model: CHAT_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    }, {
      timeout: 60000
    });

    // Try to extract JSON
    try {
      const responseText = response.data.response;
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/) ||
                       responseText.match(/\[[\s\S]*\]/);
      
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const outfits = JSON.parse(jsonText);
      
      return {
        success: true,
        outfits: Array.isArray(outfits) ? outfits : [outfits],
        rawResponse: responseText,
        model: CHAT_MODEL
      };
    } catch (parseError) {
      return {
        success: true,
        outfits: null,
        rawResponse: response.data.response,
        error: 'Could not parse JSON, returning raw response',
        model: CHAT_MODEL
      };
    }
  } catch (error) {
    console.error('Ollama recommendations error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to generate recommendations',
      fallback: 'gemini'
    };
  }
}

module.exports = {
  checkOllama,
  chatWithOllama,
  analyzeClothingImageOllama,
  getOutfitRecommendationsOllama
};
