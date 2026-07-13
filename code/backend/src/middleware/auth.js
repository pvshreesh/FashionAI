const { getCognitoUser } = require('../services/cognitoAuth');
const { upsertCognitoUserProfile } = require('../repositories/usersRepository');
const { isSharedWardrobeEnabled } = require('../config/wardrobeMode');

async function resolveUserFromToken(token) {
  const cognitoUser = await getCognitoUser(token);
  const localUser = await upsertCognitoUserProfile(cognitoUser);

  if (localUser) {
    return localUser;
  }

  return {
    _id: cognitoUser.id,
    id: cognitoUser.id,
    cognitoUserId: cognitoUser.id,
    email: cognitoUser.email,
    username: cognitoUser.username,
    profileImage: null,
    subscription: { tier: 'free' }
  };
}

function readBearerToken(req) {
  return req.header('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Authentication required.'
      });
    }

    const user = await resolveUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const user = await resolveUserFromToken(token);
    if (user) {
      req.user = user;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};

const authenticateWardrobeRequest = async (req, res, next) => {
  if (isSharedWardrobeEnabled()) {
    next();
    return;
  }

  return authenticate(req, res, next);
};

module.exports = {
  authenticateWardrobeRequest,
  authenticate,
  optionalAuthenticate
};
