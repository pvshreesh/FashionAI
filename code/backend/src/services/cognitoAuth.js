const axios = require('axios');
const crypto = require('crypto');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

let accessTokenVerifier = null;

function getCognitoConfig() {
  const region = process.env.COGNITO_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '';
  const userPoolId = process.env.COGNITO_USER_POOL_ID || '';
  const appClientId = process.env.COGNITO_APP_CLIENT_ID || '';
  const appClientSecret = process.env.COGNITO_APP_CLIENT_SECRET || '';

  if (!region || !userPoolId || !appClientId) {
    throw new Error('Cognito auth is enabled, but COGNITO_REGION, COGNITO_USER_POOL_ID, or COGNITO_APP_CLIENT_ID is missing.');
  }

  return {
    region,
    userPoolId,
    appClientId,
    appClientSecret
  };
}

function getCognitoEndpoint() {
  return `https://cognito-idp.${getCognitoConfig().region}.amazonaws.com/`;
}

async function cognitoRequest(target, data) {
  const response = await axios({
    method: 'POST',
    url: getCognitoEndpoint(),
    data,
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`
    },
    validateStatus: () => true
  });

  if (response.status >= 400) {
    const message =
      response.data?.message ||
      response.data?.Message ||
      response.data?.__type ||
      `Cognito ${target} failed`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = response.data;
    throw error;
  }

  return response.data;
}

function mapCognitoUser(attributes = [], username = null) {
  const attributeMap = new Map(attributes.map((attribute) => [attribute.Name, attribute.Value]));
  return {
    id: attributeMap.get('sub') || username,
    email: attributeMap.get('email') || username,
    username: attributeMap.get('name') || attributeMap.get('preferred_username') || (attributeMap.get('email') ? attributeMap.get('email').split('@')[0] : username)
  };
}

function buildSecretHash(username) {
  const { appClientId, appClientSecret } = getCognitoConfig();
  if (!appClientSecret) {
    return null;
  }

  return crypto
    .createHmac('sha256', appClientSecret)
    .update(`${username}${appClientId}`)
    .digest('base64');
}

async function signUpWithCognito({ email, password, username }) {
  const { appClientId } = getCognitoConfig();
  const payload = await cognitoRequest('SignUp', {
    ClientId: appClientId,
    Username: email,
    Password: password,
    ...(buildSecretHash(email) ? { SecretHash: buildSecretHash(email) } : {}),
    UserAttributes: [
      { Name: 'email', Value: email },
      ...(username ? [{ Name: 'name', Value: username }] : [])
    ]
  });

  return {
    user: {
      id: payload.UserSub,
      email,
      username: username || email.split('@')[0]
    },
    confirmed: Boolean(payload.UserConfirmed),
    codeDeliveryDetails: payload.CodeDeliveryDetails || null
  };
}

async function signInWithCognito({ email, password }) {
  const { appClientId } = getCognitoConfig();
  const payload = await cognitoRequest('InitiateAuth', {
    ClientId: appClientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      ...(buildSecretHash(email) ? { SECRET_HASH: buildSecretHash(email) } : {})
    }
  });

  return {
    accessToken: payload.AuthenticationResult?.AccessToken || null,
    idToken: payload.AuthenticationResult?.IdToken || null,
    refreshToken: payload.AuthenticationResult?.RefreshToken || null,
    expiresIn: payload.AuthenticationResult?.ExpiresIn || null
  };
}

async function confirmSignUpWithCognito({ email, code }) {
  const { appClientId } = getCognitoConfig();
  await cognitoRequest('ConfirmSignUp', {
    ClientId: appClientId,
    Username: email,
    ConfirmationCode: code,
    ...(buildSecretHash(email) ? { SecretHash: buildSecretHash(email) } : {})
  });
  return { success: true };
}

async function refreshCognitoSession({ refreshToken, email }) {
  const { appClientId } = getCognitoConfig();
  const payload = await cognitoRequest('InitiateAuth', {
    ClientId: appClientId,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
      ...(buildSecretHash(email) ? { SECRET_HASH: buildSecretHash(email) } : {})
    }
  });

  return {
    accessToken: payload.AuthenticationResult?.AccessToken || null,
    idToken: payload.AuthenticationResult?.IdToken || null,
    refreshToken,
    expiresIn: payload.AuthenticationResult?.ExpiresIn || null
  };
}

function getAccessTokenVerifier() {
  if (!accessTokenVerifier) {
    const { userPoolId, appClientId } = getCognitoConfig();
    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId: appClientId
    });
  }

  return accessTokenVerifier;
}

async function verifyCognitoToken(accessToken) {
  return getAccessTokenVerifier().verify(accessToken);
}

async function getCognitoUser(accessToken) {
  await verifyCognitoToken(accessToken);

  const payload = await cognitoRequest('GetUser', {
    AccessToken: accessToken
  });

  return mapCognitoUser(payload.UserAttributes || [], payload.Username);
}

module.exports = {
  confirmSignUpWithCognito,
  getCognitoConfig,
  getCognitoUser,
  refreshCognitoSession,
  signInWithCognito,
  signUpWithCognito,
  verifyCognitoToken
};
