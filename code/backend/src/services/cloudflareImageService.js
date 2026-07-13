const axios = require('axios');
const { Buffer } = require('buffer');

const DEFAULT_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

function getCloudflareImageConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  const model = process.env.IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  if (!accountId || !apiToken || !model) {
    throw new Error('Cloudflare image generation is not configured.');
  }

  return {
    accountId,
    apiToken,
    model
  };
}

function normalizeImageResult(result = {}) {
  if (typeof result.image === 'string' && result.image) {
    return `data:image/jpeg;base64,${result.image}`;
  }

  if (Array.isArray(result.images) && result.images[0]) {
    return `data:image/jpeg;base64,${result.images[0]}`;
  }

  return '';
}

function buildDataUrlFromBinary(data, contentType = 'image/png') {
  if (!data) return '';
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return `data:${contentType};base64,${bytes.toString('base64')}`;
}

async function generateImageFromPrompt(prompt, options = {}) {
  if (!prompt || !String(prompt).trim()) {
    return { success: false, error: 'Prompt is required' };
  }

  try {
    const { accountId, apiToken, model } = getCloudflareImageConfig();
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        prompt: String(prompt).trim(),
        steps: Math.max(1, Math.min(Number(options.steps) || 4, 8)),
        ...(Number.isFinite(Number(options.seed)) ? { seed: Number(options.seed) } : {})
      },
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      }
    );

    const contentType = String(response.headers['content-type'] || '');
    let parsedPayload = null;
    if (!contentType.startsWith('image/')) {
      try {
        parsedPayload = JSON.parse(Buffer.from(response.data).toString('utf8') || '{}');
      } catch {}
    }

    const image = contentType.startsWith('image/')
      ? buildDataUrlFromBinary(response.data, contentType)
      : normalizeImageResult(parsedPayload?.result);
    if (!image) {
      console.error('Cloudflare image generation returned no image');
      return { success: false, error: 'Image model did not return an image' };
    }

    return {
      success: true,
      image,
      model
    };
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message ||
      error.response?.data?.result?.error ||
      error.response?.data?.message ||
      error.message;
    console.error('Cloudflare image generation error:', message);
    return {
      success: false,
      error: message || 'Failed to generate image'
    };
  }
}

module.exports = {
  generateImageFromPrompt,
  getCloudflareImageConfig
};
