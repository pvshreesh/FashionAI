function validateStartupEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const storageProvider = process.env.STORAGE_PROVIDER === 's3' ? 's3' : 'base64';
  const missing = [];

  if (isProduction) {
    if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
    if (!process.env.COGNITO_REGION && !process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION) missing.push('COGNITO_REGION or AWS_REGION');
    if (!process.env.COGNITO_USER_POOL_ID) missing.push('COGNITO_USER_POOL_ID');
    if (!process.env.COGNITO_APP_CLIENT_ID) missing.push('COGNITO_APP_CLIENT_ID');
    if (!process.env.DYNAMODB_USERS_TABLE) missing.push('DYNAMODB_USERS_TABLE');
    if (!process.env.DYNAMODB_WARDROBE_TABLE) missing.push('DYNAMODB_WARDROBE_TABLE');

    if (storageProvider === 's3') {
      if (!process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION) missing.push('AWS_REGION');
      if (!process.env.S3_BUCKET_NAME) missing.push('S3_BUCKET_NAME');
    }

    if (process.env.IMAGE_MODEL) {
      if (!process.env.CLOUDFLARE_ACCOUNT_ID) missing.push('CLOUDFLARE_ACCOUNT_ID');
      if (!process.env.CLOUDFLARE_API_TOKEN) missing.push('CLOUDFLARE_API_TOKEN');
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  return {
    storageProvider,
    isProduction,
    hasExplicitCorsOrigin: Boolean(
      process.env.CORS_ORIGINS || process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_ORIGIN
    )
  };
}

module.exports = {
  validateStartupEnvironment
};
