function validateStartupEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];

  if (isProduction) {
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  return {
    isProduction,
    hasExplicitCorsOrigin: Boolean(
      process.env.CORS_ORIGINS || process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_ORIGIN
    )
  };
}

module.exports = {
  validateStartupEnvironment
};