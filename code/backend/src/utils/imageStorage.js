const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getStorageProvider, isS3StorageEnabled } = require('../config/storage');
const { getAwsRegion } = require('../config/aws');

const SIGNED_URL_TTL_SECONDS = Number(process.env.S3_SIGNED_URL_TTL_SECONDS || 3600);
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

let s3Client = null;

function isSupportedImageType(contentType) {
  return SUPPORTED_IMAGE_TYPES.has(String(contentType || '').toLowerCase());
}

function decodeImageDataUrl(dataUrl, maxBytes = 10 * 1024 * 1024) {
  const match = typeof dataUrl === 'string'
    ? dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i)
    : null;
  if (!match) throw new Error('Image must be a JPEG, PNG, or WebP data URL.');

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxBytes) throw new Error('Image must be 10 MB or smaller.');
  return { buffer, contentType: match[1].toLowerCase() };
}

function getS3BucketName() {
  const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';
  if (!bucketName) {
    throw new Error('S3 storage is enabled, but S3_BUCKET_NAME is not configured.');
  }
  return bucketName;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({ region: getAwsRegion() });
  }

  return s3Client;
}

function makeObjectKey(filename = 'image.bin', folder = 'uploads') {
  const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  return `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
}

function normalizeStoredImage(storedImage) {
  if (!storedImage) return null;

  if (typeof storedImage === 'string') {
    if (storedImage.startsWith('data:')) {
      return {
        storageType: 'base64',
        url: storedImage
      };
    }

    return {
      storageType: 'url',
      url: storedImage
    };
  }

  return storedImage;
}

async function createSignedGetUrl(key, options = {}) {
  const bucket = options.bucket || getS3BucketName();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: options.contentType
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: options.expiresIn || SIGNED_URL_TTL_SECONDS
  });
}

async function storeImage(fileBuffer, mimetype, filename, options = {}) {
  if (!isS3StorageEnabled()) {
    const base64Image = fileBuffer.toString('base64');
    const dataUrl = `data:${mimetype};base64,${base64Image}`;

    return {
      url: dataUrl,
      storageType: 'base64',
      contentType: mimetype,
      originalFilename: filename || null
    };
  }

  const bucket = getS3BucketName();
  const key = makeObjectKey(filename, options.folder || 'images');
  await getS3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
    Metadata: options.metadata || {}
  }));

  return {
    storageType: 's3',
    bucket,
    key,
    contentType: mimetype,
    originalFilename: filename || null
  };
}

async function deleteImage(storedImage) {
  const normalized = normalizeStoredImage(storedImage);
  if (!normalized) return true;

  if (normalized.storageType !== 's3' || !normalized.key) {
    return true;
  }

  await getS3Client().send(new DeleteObjectCommand({
    Bucket: normalized.bucket || getS3BucketName(),
    Key: normalized.key
  }));

  return true;
}

async function getImageUrl(storedImage, options = {}) {
  const normalized = normalizeStoredImage(storedImage);
  if (!normalized) return null;

  if (normalized.storageType === 's3' && normalized.key) {
    return createSignedGetUrl(normalized.key, {
      bucket: normalized.bucket,
      contentType: normalized.contentType,
      expiresIn: options.expiresIn
    });
  }

  return normalized.url || null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function resolveStoredImageDataUrl(storedImage) {
  const normalized = normalizeStoredImage(storedImage);
  if (!normalized) return null;

  if (normalized.storageType === 'base64') {
    return normalized.url;
  }

  if (normalized.storageType !== 's3' || !normalized.key) {
    return normalized.url || null;
  }

  const response = await getS3Client().send(new GetObjectCommand({
    Bucket: normalized.bucket || getS3BucketName(),
    Key: normalized.key
  }));
  const buffer = await streamToBuffer(response.Body);
  const contentType = normalized.contentType || response.ContentType || 'image/jpeg';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function hydrateStoredImages(images = []) {
  const hydrated = [];

  for (const image of images) {
    const normalized = normalizeStoredImage(image);
    if (!normalized) continue;

    hydrated.push({
      ...normalized,
      url: await getImageUrl(normalized)
    });
  }

  return hydrated;
}

module.exports = {
  decodeImageDataUrl,
  deleteImage,
  getImageUrl,
  getStorageProvider,
  hydrateStoredImages,
  isSupportedImageType,
  resolveStoredImageDataUrl,
  storeImage
};
