const crypto = require('crypto');
const {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand
} = require('@aws-sdk/lib-dynamodb');
const { getDynamoDocumentClient, getWardrobeTableName } = require('../config/dynamodb');

function getWardrobeKeyNames() {
  return {
    partitionKey: process.env.DYNAMODB_WARDROBE_PARTITION_KEY || 'userId',
    sortKey: process.env.DYNAMODB_WARDROBE_SORT_KEY || 'itemId'
  };
}

function normalizeWardrobeItem(item) {
  if (!item) return null;

  const itemId = item.itemId || item.itemID;
  const userId = item.userId || item.userID;

  return {
    ...item,
    userId,
    itemId,
    _id: itemId,
    id: itemId
  };
}

function applyFilters(items, filters = {}, search = '') {
  return items.filter((item) => {
    if (filters.tags?.length) {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      if (!filters.tags.some((tag) => itemTags.includes(tag))) return false;
    }

    if (filters.itemType && item.itemType !== filters.itemType) return false;
    if (filters.color && item.color !== filters.color) return false;
    if (filters.season && item.season !== filters.season) return false;

    if (search) {
      const needle = search.toLowerCase();
      const haystacks = [
        item.name,
        item.itemType,
        item.color,
        item.style,
        ...(item.tags || [])
      ].filter(Boolean).map((value) => String(value).toLowerCase());

      if (!haystacks.some((value) => value.includes(needle))) {
        return false;
      }
    }

    return true;
  });
}

async function queryUserWardrobe(userId) {
  const { partitionKey } = getWardrobeKeyNames();
  const response = await getDynamoDocumentClient().send(new QueryCommand({
    TableName: getWardrobeTableName(),
    KeyConditionExpression: `${partitionKey} = :userId`,
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  return (response.Items || []).map(normalizeWardrobeItem);
}

async function listWardrobeItems({ userId, page = 1, limit = 20, filter, search }) {
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  let filters = {};

  if (filter) {
    try {
      filters = typeof filter === 'string' ? JSON.parse(filter) : filter;
    } catch (error) {
      filters = {};
    }
  }

  const allItems = await queryUserWardrobe(userId);
  const filtered = applyFilters(
    allItems.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    filters,
    search
  );

  const startIndex = (parsedPage - 1) * parsedLimit;
  return {
    items: filtered.slice(startIndex, startIndex + parsedLimit),
    total: filtered.length,
    page: parsedPage,
    limit: parsedLimit,
    pages: Math.ceil(filtered.length / parsedLimit)
  };
}

async function countWardrobeItems(userId) {
  const items = await queryUserWardrobe(userId);
  return items;
}

async function getWardrobeStats(userId) {
  const items = await queryUserWardrobe(userId);
  return {
    totalItems: items.length,
    totalImages: items.reduce((sum, item) => sum + (Array.isArray(item.images) ? item.images.length : 0), 0)
  };
}

async function createWardrobeItem(userId, payload) {
  const { partitionKey, sortKey } = getWardrobeKeyNames();
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();
  const item = normalizeWardrobeItem({
    ...payload,
    userId,
    itemId,
    [partitionKey]: userId,
    [sortKey]: itemId,
    createdAt: now,
    updatedAt: now
  });

  await getDynamoDocumentClient().send(new PutCommand({
    TableName: getWardrobeTableName(),
    Item: {
      ...item,
      _id: undefined,
      id: undefined
    }
  }));

  return item;
}

async function getWardrobeItem(userId, itemId) {
  const { partitionKey, sortKey } = getWardrobeKeyNames();
  const response = await getDynamoDocumentClient().send(new GetCommand({
    TableName: getWardrobeTableName(),
    Key: {
      [partitionKey]: userId,
      [sortKey]: itemId
    }
  }));

  return normalizeWardrobeItem(response.Item || null);
}

async function updateWardrobeItem(userId, itemId, updates) {
  const { partitionKey, sortKey } = getWardrobeKeyNames();
  const existing = await getWardrobeItem(userId, itemId);
  if (!existing) return null;

  const merged = {
    ...existing,
    ...updates,
    userId,
    itemId,
    [partitionKey]: userId,
    [sortKey]: itemId,
    updatedAt: new Date().toISOString()
  };

  await getDynamoDocumentClient().send(new PutCommand({
    TableName: getWardrobeTableName(),
    Item: {
      ...merged,
      _id: undefined,
      id: undefined
    }
  }));

  return normalizeWardrobeItem(merged);
}

async function deleteWardrobeItem(userId, itemId) {
  const { partitionKey, sortKey } = getWardrobeKeyNames();
  const existing = await getWardrobeItem(userId, itemId);
  if (!existing) return null;

  await getDynamoDocumentClient().send(new DeleteCommand({
    TableName: getWardrobeTableName(),
    Key: {
      [partitionKey]: userId,
      [sortKey]: itemId
    }
  }));

  return existing;
}

async function deleteAllWardrobeItems(userId) {
  const { partitionKey, sortKey } = getWardrobeKeyNames();
  const items = await queryUserWardrobe(userId);
  for (const item of items) {
    await getDynamoDocumentClient().send(new DeleteCommand({
      TableName: getWardrobeTableName(),
      Key: {
        [partitionKey]: userId,
        [sortKey]: item.itemId
      }
    }));
  }

  return items.length;
}

module.exports = {
  countWardrobeItems,
  createWardrobeItem,
  deleteAllWardrobeItems,
  deleteWardrobeItem,
  getWardrobeItem,
  getWardrobeStats,
  listWardrobeItems,
  normalizeWardrobeItem,
  queryUserWardrobe,
  updateWardrobeItem
};
