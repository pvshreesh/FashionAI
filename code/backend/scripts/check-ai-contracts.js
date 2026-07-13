const assert = require('assert');
const { parseJsonResponse } = require('../src/services/geminiService');
const { decodeImageDataUrl } = require('../src/utils/imageStorage');

const analysis = parseJsonResponse(
  '```json\n{"name":"Blue blazer"}\n```',
  (value) => value && !Array.isArray(value) && typeof value.name === 'string',
  'clothing analysis'
);
assert.equal(analysis.name, 'Blue blazer');

assert.throws(
  () => parseJsonResponse('null', (value) => Array.isArray(value) && value.length > 0, 'outfit recommendation'),
  /invalid outfit recommendation data/
);

assert.deepEqual(
  decodeImageDataUrl('data:image/png;base64,aGVsbG8='),
  { buffer: Buffer.from('hello'), contentType: 'image/png' }
);
assert.throws(() => decodeImageDataUrl('data:image/svg+xml;base64,PHN2Zz4='), /JPEG, PNG, or WebP/);

console.log('AI contract checks passed.');
