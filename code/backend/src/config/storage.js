function getStorageProvider() {
  return process.env.STORAGE_PROVIDER === 's3' ? 's3' : 'base64';
}

function isS3StorageEnabled() {
  return getStorageProvider() === 's3';
}

module.exports = {
  getStorageProvider,
  isS3StorageEnabled
};
