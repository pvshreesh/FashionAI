const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  confirmSignUpWithCognito,
  getCognitoUser,
  refreshCognitoSession,
  signInWithCognito,
  signUpWithCognito
} = require('../services/cognitoAuth');
const { upsertCognitoUserProfile } = require('../repositories/usersRepository');
const { getImageUrl } = require('../utils/imageStorage');

function authErrorStatus(error) {
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return error.statusCode;
  }

  const message = String(error.message || '');
  if (/confirm|verification|code/i.test(message)) return 403;
  if (/unauthorized|invalid|incorrect|password/i.test(message)) return 401;
  if (/exists/i.test(message)) return 409;
  return 500;
}

function authErrorMessage(error, fallback) {
  const message = error.message || fallback;
  if (/configured with secret but SECRET_HASH was not received/i.test(message)) {
    return 'Cognito app client secret is required. Add COGNITO_APP_CLIENT_SECRET to backend/.env or use a Cognito app client without a secret.';
  }
  return message;
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('username').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, username } = req.body;

    const { user, confirmed, codeDeliveryDetails } = await signUpWithCognito({ email, password, username });
    const profile = await upsertCognitoUserProfile(user);

    if (!confirmed) {
      return res.status(202).json({
        success: true,
        requiresEmailConfirmation: true,
        message: codeDeliveryDetails?.Destination
          ? `Cognito created the account. Confirm the verification code sent to ${codeDeliveryDetails.Destination}.`
          : 'Cognito created the account. Confirm the verification code from your email before signing in.',
        user: {
          id: profile?._id || user.id,
          email: user.email,
          username: profile?.username || user.username,
          subscription: profile?.subscription || { tier: 'free' }
        }
      });
    }

    const signInResult = await signInWithCognito({ email, password });

    res.status(201).json({
      success: true,
      token: signInResult.accessToken,
      idToken: signInResult.idToken,
      refreshToken: signInResult.refreshToken,
      user: {
        id: profile?._id || user.id,
        email: user.email,
        username: profile?.username || user.username,
        subscription: profile?.subscription || { tier: 'free' }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(authErrorStatus(error)).json({
      success: false,
      error: authErrorMessage(error, 'Failed to register user')
    });
  }
});

router.post('/confirm', [
  body('email').isEmail().normalizeEmail(),
  body('code').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, code } = req.body;
    await confirmSignUpWithCognito({ email, code });
    res.json({
      success: true,
      message: 'Account confirmed. You can sign in now.'
    });
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(authErrorStatus(error)).json({
      success: false,
      error: authErrorMessage(error, 'Failed to confirm account')
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const session = await signInWithCognito({ email, password });
    const user = await getCognitoUser(session.accessToken);
    const profile = await upsertCognitoUserProfile(user);

    res.json({
      success: true,
      token: session.accessToken,
      idToken: session.idToken,
      refreshToken: session.refreshToken,
      user: {
        id: profile?._id || user.id,
        email: user.email,
        username: profile?.username || user.username,
        subscription: profile?.subscription || { tier: 'free' }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(authErrorStatus(error)).json({
      success: false,
      error: authErrorMessage(error, 'Failed to login')
    });
  }
});

router.post('/refresh', [
  body('refreshToken').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const session = await refreshCognitoSession({
      refreshToken: req.body.refreshToken,
      email: req.body.email
    });
    const user = await getCognitoUser(session.accessToken);
    const profile = await upsertCognitoUserProfile(user);

    res.json({
      success: true,
      token: session.accessToken,
      idToken: session.idToken,
      refreshToken: session.refreshToken,
      user: {
        id: profile?._id || user.id,
        email: user.email,
        username: profile?.username || user.username,
        subscription: profile?.subscription || { tier: 'free' }
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(authErrorStatus(error)).json({
      success: false,
      error: authErrorMessage(error, 'Failed to refresh session')
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const profile = req.user;

    res.json({
      success: true,
      user: {
        id: profile._id,
        email: profile.email,
        username: profile.username,
        stylePreferences: profile?.stylePreferences,
        subscription: profile?.subscription || { tier: 'free' },
        profileImage: profile?.profileImage ? await getImageUrl(profile.profileImage) : null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(authErrorStatus(error)).json({
      success: false,
      error: authErrorMessage(error, 'Failed to get profile')
    });
  }
});

module.exports = router;
