function getAwsRegion() {
  return process.env.AWS_REGION || process.env.COGNITO_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
}

module.exports = {
  getAwsRegion
};
