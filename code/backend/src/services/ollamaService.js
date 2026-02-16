/**
 * Ollama Local LLM Service
 * Local LLM service - runs models locally
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
const sharp = require('sharp');

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3:8b';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava';

/** Options to limit RAM: smaller num_ctx = less memory. Default 2048 to avoid freezing. */
function getOllamaOptions(overrides = {}) {
  const numCtx = parseInt(process.env.OLLAMA_NUM_CTX, 10) || 2048;
  const numThread = process.env.OLLAMA_NUM_THREAD ? parseInt(process.env.OLLAMA_NUM_THREAD, 10) : undefined;
  const numGpu = process.env.OLLAMA_NUM_GPU !== undefined ? parseInt(process.env.OLLAMA_NUM_GPU, 10) : undefined;
  return {
    num_ctx: numCtx,
    ...(numThread !== undefined && { num_thread: numThread }),
    ...(numGpu !== undefined && { num_gpu: numGpu }),
    ...overrides
  };
}

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
        fallback: null
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
      options: getOllamaOptions({ temperature: 0.7, top_p: 0.9, top_k: 40 })
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
      fallback: null
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
        fallback: null
      };
    }

    // Resize to limit RAM (vision models use less memory with smaller images)
    const visionMaxDim = parseInt(process.env.OLLAMA_VISION_MAX_DIM, 10) || 512;
    let inputBuffer = imageBuffer;
    try {
      inputBuffer = await sharp(imageBuffer)
        .resize(visionMaxDim, visionMaxDim, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch { /* keep original */ }
    const imageBase64 = inputBuffer.toString('base64');

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
      options: getOllamaOptions({ temperature: 0.3, top_p: 0.9 })
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
      fallback: null
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
        fallback: null
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
      options: getOllamaOptions({ temperature: 0.7, top_p: 0.9 })
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
      fallback: null
    };
  }
}

/**
 * Rate/style score a clothing item (Ollama)
 */
async function rateClothingItemOllama(itemDescription, itemImage = null, bodyShape = null) {
  try {
    const ollamaStatus = await checkOllama();
    if (!ollamaStatus.available) {
      return { success: false, error: 'Ollama is not running.' };
    }
    const model = itemImage ? VISION_MODEL : CHAT_MODEL;
    let prompt = `Rate this clothing item on a scale of 1-10 for: 1. Versatility, 2. Trendiness, 3. Quality.`;
    if (bodyShape) prompt += ` 4. Body shape compatibility for ${bodyShape}.`;
    prompt += ` Item: ${itemDescription}. Return scores and brief explanations in JSON format.`;
    const body = { model, prompt, stream: false, options: getOllamaOptions({ temperature: 0.3 }) };
    if (itemImage) body.images = [itemImage.toString('base64')];
    const response = await axios.post(`${OLLAMA_BASE}/api/generate`, body, { timeout: 60000 });
    const text = response.data.response;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const rating = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      return { success: true, rating, rawResponse: text };
    } catch {
      return { success: true, rating: null, rawResponse: text };
    }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to rate item' };
  }
}

/**
 * Virtual try-on: composite garment onto person using local image generation
 * Uses LLaVA to describe person+garment, then Ollama image model (flux2-klein/z-image-turbo) to generate
 * Note: Ollama image gen is experimental; macOS first, Windows/Linux coming soon.
 * Requires Ollama with x/flux2-klein for image gen.
 */
const IMAGE_MODEL = process.env.OLLAMA_IMAGE_MODEL || 'x/flux2-klein';

async function virtualTryOnOllama(userPhotoDataUrl, garmentImageBuffer, garmentMimeType) {
  try {
    const ollamaStatus = await checkOllama();
    if (!ollamaStatus.available) {
      return { success: false, error: 'Ollama is not running.' };
    }

    // Parse user photo
    function parseDataUrl(dataUrl) {
      if (!dataUrl || typeof dataUrl !== 'string') return null;
      const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (!match) return null;
      return { mimeType: match[1], data: match[2] };
    }
    const userParsed = parseDataUrl(userPhotoDataUrl);
    const userBase64Raw = userParsed ? userParsed.data : (typeof userPhotoDataUrl === 'string' && userPhotoDataUrl.includes('base64,') ? userPhotoDataUrl.split('base64,')[1] : null);
    if (!userBase64Raw) {
      return { success: false, error: 'Invalid user photo format.' };
    }
    const tryOnMaxDim = parseInt(process.env.TRY_ON_IMAGE_MAX_DIM, 10) || 512;
    const resizeForTryOn = async (buf) => {
      try {
        return await sharp(buf).resize(tryOnMaxDim, tryOnMaxDim, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      } catch { return buf; }
    };
    const [userResized, garmentResized] = await Promise.all([
      resizeForTryOn(Buffer.from(userBase64Raw, 'base64')),
      resizeForTryOn(garmentImageBuffer)
    ]);
    const userBase64 = userResized.toString('base64');
    const garmentBase64 = garmentResized.toString('base64');

    // Step 1: Use LLaVA to create image generation prompt from both images
    const descPrompt = `You see two images. Image 1: A person. Image 2: A clothing item.
Write ONE short prompt (max 80 words) for generating a photorealistic image: the person from image 1 wearing the clothing from image 2. Match pose and lighting. Output ONLY the prompt, nothing else.`;

    const descResponse = await axios.post(`${OLLAMA_BASE}/api/generate`, {
      model: VISION_MODEL,
      prompt: descPrompt,
      images: [userBase64, garmentBase64],
      stream: false,
      options: getOllamaOptions({ temperature: 0.3 })
    }, { timeout: 180000 }); // 3 min for LLaVA description

    const imagePrompt = (descResponse.data.response || '').trim();
    if (!imagePrompt || imagePrompt.length < 10) {
      return { success: false, error: 'Could not create try-on prompt from images.' };
    }

    // Step 2: Generate image with Ollama image model (flux2-klein or z-image-turbo)
    const genResponse = await axios.post(`${OLLAMA_BASE}/api/generate`, {
      model: IMAGE_MODEL,
      prompt: imagePrompt,
      stream: false,
      options: getOllamaOptions({ temperature: 0.7 })
    }, { timeout: 900000 }); // 15 min - local image gen can take a long time

    const resp = genResponse.data;
    // Ollama image models may return: response (base64), or image field, or different structure
    let imageBase64 = null;
    if (resp.image) imageBase64 = resp.image;
    else if (resp.response && typeof resp.response === 'string') {
      const trimmed = resp.response.trim();
      if (trimmed.length > 100 && /^[A-Za-z0-9+/=]+$/.test(trimmed.replace(/\s/g, ''))) {
        imageBase64 = trimmed;
      }
    }
    if (imageBase64) {
      const mime = resp.mime_type || 'image/png';
      return { success: true, image: `data:${mime};base64,${imageBase64}` };
    }

    return { success: false, error: 'Ollama image model did not return an image. Run: ollama pull x/flux2-klein' };
  } catch (error) {
    const data = error.response?.data;
    const msg = (typeof data?.error === 'string' ? data.error : null) || data?.error?.message || error.message;
    const str = String(msg);
    const isModelMissing = /model.*not found|not found|unknown model|file does not exist/i.test(str);
    const isWindowsNoImageGen = /image generation not available|build with mlx|mlx tag/i.test(str);
    console.error('Ollama try-on error:', msg);
    let userError = msg;
    if (isModelMissing) userError = 'Ollama image model not installed. Run: ollama pull x/flux2-klein';
    else if (isWindowsNoImageGen) userError = 'Ollama image generation is not available on Windows yet (macOS only). Use Gemini for try-on when you have quota.';
    return { success: false, error: userError, fallback: null };
  }
}

module.exports = {
  checkOllama,
  chatWithOllama,
  analyzeClothingImageOllama,
  getOutfitRecommendationsOllama,
  rateClothingItemOllama,
  virtualTryOnOllama
};
