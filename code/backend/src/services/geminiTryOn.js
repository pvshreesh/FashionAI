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
    return await sharp(buffer)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return buffer;
  }
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
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      let outBuffer = Buffer.from(inlineData.data, 'base64');
      outBuffer = await resizeOutputToMax(outBuffer);
      const b64 = outBuffer.toString('base64');
      return { success: true, image: `data:image/jpeg;base64,${b64}` };
    }
  }

  return { success: false, error: 'Model did not return an image' };
}

/**
 * Virtual try-on with Gemini's stable image model.
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

    const model = process.env.GEMINI_TRY_ON_MODEL || 'gemini-2.5-flash-image';
    return await tryModel(apiKey, model, userBase64, garmentBase64);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Gemini try-on error:', msg);
    return { success: false, error: msg || 'Failed to generate try-on image' };
  }
}

module.exports = { virtualTryOnGemini };
