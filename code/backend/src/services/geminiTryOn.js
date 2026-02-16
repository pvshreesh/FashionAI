/**
 * Gemini API – image generation only (virtual try-on)
 * Uses REST API; no @google/generative-ai SDK.
 */
const axios = require('axios');
const sharp = require('sharp');

// Smaller = faster generation (512 is a good balance; 384 for even faster)
const MAX_IMAGE_DIM = parseInt(process.env.TRY_ON_IMAGE_MAX_DIM, 10) || 512;
const JPEG_QUALITY = parseInt(process.env.TRY_ON_JPEG_QUALITY, 10) || 80;

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function resizeForApi(buffer) {
  try {
    return await sharp(buffer)
      .resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch {
    return buffer;
  }
}

/** Optionally shrink output image for faster display/transfer */
async function resizeOutputToMax(buffer, maxDim = MAX_IMAGE_DIM) {
  try {
    const meta = await sharp(buffer).metadata();
    if ((meta.width || 0) <= maxDim && (meta.height || 0) <= maxDim) return buffer;
    return await sharp(buffer)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return buffer;
  }
}

/** Parse "retry in Xs" from 429 error message; return delay in ms or null */
function getRetryAfterMs(error) {
  const msg = error?.response?.data?.error?.message || error?.message || '';
  const m = msg.match(/retry in ([\d.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1])) * 1000 : 60000; // default 60s
}

/**
 * Call Gemini generateContent for one model. Returns { success, image?, error? }.
 */
async function tryModel(apiKey, model, userBase64, garmentBase64) {
  const prompt = `First image: person. Second image: clothing item. Create a realistic photo of the person wearing this clothing. Match pose and lighting. Output one image.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: userBase64 } },
        { inline_data: { mime_type: 'image/jpeg', data: garmentBase64 } }
      ]
    }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  };

  const response = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000
  });

  const candidates = response.data?.candidates;
  if (!candidates || candidates.length === 0) {
    const errText = response.data?.promptFeedback?.blockReason || 'No response from model';
    return { success: false, error: errText };
  }

  const parts = candidates[0].content?.parts || [];
  for (const part of parts) {
    if (part.inline_data && part.inline_data.data) {
      let outBuffer = Buffer.from(part.inline_data.data, 'base64');
      outBuffer = await resizeOutputToMax(outBuffer);
      const b64 = outBuffer.toString('base64');
      return { success: true, image: `data:image/jpeg;base64,${b64}` };
    }
  }

  return { success: false, error: 'Model did not return an image' };
}

/**
 * Virtual try-on: try gemini-2.5-flash-image, then gemini-2.0-flash-exp-image-generation. If both fail, return both errors.
 * @returns {{ success: boolean, image?: string, error?: string }}
 */
async function virtualTryOnGemini(userPhotoDataUrl, garmentImageBuffer, garmentMimeType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Gemini API key not configured' };
    }

    const userParsed = parseDataUrl(userPhotoDataUrl);
    const userBase64Raw = userParsed ? userParsed.data : (typeof userPhotoDataUrl === 'string' && userPhotoDataUrl.includes('base64,') ? userPhotoDataUrl.split('base64,')[1] : null);
    if (!userBase64Raw) {
      return { success: false, error: 'Invalid user photo format' };
    }

    const userBuffer = Buffer.from(userBase64Raw, 'base64');
    const [garmentResized, userResized] = await Promise.all([
      resizeForApi(garmentImageBuffer),
      resizeForApi(userBuffer)
    ]);
    const userBase64 = userResized.toString('base64');
    const garmentBase64 = garmentResized.toString('base64');

    const models = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp-image-generation'];
    const errors = [];

    for (const model of models) {
      console.log('[Gemini try-on] trying model:', model);
      try {
        const result = await tryModel(apiKey, model, userBase64, garmentBase64);
        if (result.success) return result;
        errors.push({ model, error: result.error || 'No image returned' });
        console.log('[Gemini try-on]', model, 'failed:', result.error);
      } catch (err) {
        const msg = err.response?.data?.error?.message || err.message;
        errors.push({ model, error: msg });
        console.log('[Gemini try-on]', model, 'error:', msg);
      }
    }

    const combined = errors.map((e) => `${e.model}: ${e.error}`).join(' | ');
    console.error('[Gemini try-on] both models failed.', combined);
    return { success: false, error: `Both models failed. ${combined}` };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Gemini try-on error:', msg);
    return { success: false, error: msg || 'Failed to generate try-on image' };
  }
}

module.exports = { virtualTryOnGemini };
