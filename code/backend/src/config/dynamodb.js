const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { getAwsRegion } = require('./aws');

let dynamoClient = null;
let documentClient = null;

function getTableName(envKey) {
  const tableName = process.env[envKey] || '';
  if (!tableName) {
    throw new Error(`${envKey} is required for DynamoDB access.`);
  }
  return tableName;
}

function getUsersTableName() {
  return getTableName('DYNAMODB_USERS_TABLE');
}

function getWardrobeTableName() {
  return getTableName('DYNAMODB_WARDROBE_TABLE');
}

function getDynamoClient() {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({
      region: getAwsRegion()
    });
  }

  return dynamoClient;
}

function getDynamoDocumentClient() {
  if (!documentClient) {
    documentClient = DynamoDBDocumentClient.from(getDynamoClient(), {
      marshallOptions: {
        removeUndefinedValues: true
      }
    });
  }

  return documentClient;
}

module.exports = {
  getDynamoClient,
  getDynamoDocumentClient,
  getUsersTableName,
  getWardrobeTableName
};
