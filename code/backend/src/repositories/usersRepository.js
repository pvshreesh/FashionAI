const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDocumentClient, getUsersTableName } = require('../config/dynamodb');

function buildDefaultSubscription() {
  return {
    tier: 'free',
    wardrobeItemLimit: 20,
    recommendationLimit: 5,
    recommendationCount: 0,
    recommendationResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
}

function normalizeUserRecord(record) {
  if (!record) return null;

  return {
    ...record,
    _id: record.userId,
    id: record.userId,
    cognitoUserId: record.cognitoUserId || record.userId
  };
}

function getResolvedUsername({ username, email }) {
  return username || (email ? email.split('@')[0] : 'user');
}

function applySubscriptionReset(user) {
  if (!user?.subscription) {
    return {
      user: {
        ...user,
        subscription: buildDefaultSubscription()
      },
      changed: true
    };
  }

  const resetDate = new Date(user.subscription.recommendationResetDate || 0);
  if (Number.isNaN(resetDate.getTime()) || new Date() <= resetDate) {
    return { user, changed: false };
  }

  return {
    user: {
      ...user,
      subscription: {
        ...user.subscription,
        recommendationCount: 0,
        recommendationResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    changed: true
  };
}

async function putUser(user) {
  const item = {
    ...user,
    _id: undefined,
    id: undefined,
    updatedAt: new Date().toISOString()
  };

  await getDynamoDocumentClient().send(new PutCommand({
    TableName: getUsersTableName(),
    Item: item
  }));

  return normalizeUserRecord(item);
}

async function getUserById(userId) {
  if (!userId) return null;

  const response = await getDynamoDocumentClient().send(new GetCommand({
    TableName: getUsersTableName(),
    Key: { userId }
  }));

  return normalizeUserRecord(response.Item || null);
}

async function upsertCognitoUserProfile(cognitoUser) {
  if (!cognitoUser?.id) return null;

  const existing = await getUserById(cognitoUser.id);
  const now = new Date().toISOString();
  const merged = {
    userId: cognitoUser.id,
    cognitoUserId: cognitoUser.id,
    email: cognitoUser.email,
    username: getResolvedUsername(cognitoUser),
    profileImage: existing?.profileImage || null,
    stylePreferences: existing?.stylePreferences || {
      favoriteColors: [],
      preferredStyles: [],
      sizePreferences: {}
    },
    subscription: existing?.subscription || buildDefaultSubscription(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  return putUser(merged);
}

async function updateUser(userId, updates) {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...updates,
    userId: existing.userId,
    cognitoUserId: existing.cognitoUserId || existing.userId,
    updatedAt: new Date().toISOString()
  };

  return putUser(merged);
}

async function canUserGetRecommendation(user) {
  if (!user) return false;
  if (user.subscription?.tier === 'premium') return true;

  const { user: normalizedUser, changed } = applySubscriptionReset(user);
  if (changed) {
    await putUser(normalizedUser);
  }

  return (normalizedUser.subscription?.recommendationCount || 0) < (normalizedUser.subscription?.recommendationLimit || 0);
}

async function incrementRecommendationCount(user) {
  if (!user) return null;
  if (user.subscription?.tier === 'premium') return user;

  const { user: normalizedUser } = applySubscriptionReset(user);
  const subscription = normalizedUser.subscription || buildDefaultSubscription();

  return updateUser(normalizedUser.userId, {
    subscription: {
      ...subscription,
      recommendationCount: (subscription.recommendationCount || 0) + 1
    }
  });
}

module.exports = {
  buildDefaultSubscription,
  canUserGetRecommendation,
  getUserById,
  incrementRecommendationCount,
  normalizeUserRecord,
  updateUser,
  upsertCognitoUserProfile
};
