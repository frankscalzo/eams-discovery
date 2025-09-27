const AWS = require('aws-sdk');
const Redis = require('ioredis');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const apigateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT || `https://${process.env.WEBSOCKET_API_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${process.env.WEBSOCKET_STAGE}`
});

let redis = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redis) {
    const authToken = await getSecretValue(process.env.REDIS_AUTH_TOKEN_SECRET);
    
    redis = new Redis({
      host: process.env.REDIS_ENDPOINT,
      port: process.env.REDIS_PORT,
      password: authToken,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }
  return redis;
};

// Get secret value from Secrets Manager
const getSecretValue = async (secretArn) => {
  const secretsManager = new AWS.SecretsManager();
  try {
    const result = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
    const secret = JSON.parse(result.SecretString);
    return secret['auth-token'];
  } catch (error) {
    console.error('Error getting secret:', error);
    throw error;
  }
};

// Store connection
const storeConnection = async (connectionId, userId, entityType, entityId) => {
  const entityKey = `${entityType}#${entityId}`;
  const ttl = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL

  await dynamodb.put({
    TableName: process.env.CONNECTIONS_TABLE,
    Item: {
      ConnectionId: connectionId,
      UserId: userId,
      EntityKey: entityKey,
      EntityType: entityType,
      EntityId: entityId,
      ConnectedAt: new Date().toISOString(),
      TTL: ttl
    }
  }).promise();

  // Store in Redis for fast lookups
  const redis = await initRedis();
  await redis.hset(`connections:${entityKey}`, connectionId, JSON.stringify({
    userId,
    connectedAt: new Date().toISOString()
  }));
  await redis.expire(`connections:${entityKey}`, 3600);
};

// Remove connection
const removeConnection = async (connectionId) => {
  try {
    // Get connection info first
    const connection = await dynamodb.get({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { ConnectionId: connectionId }
    }).promise();

    if (connection.Item) {
      const { EntityKey, UserId } = connection.Item;
      
      // Remove from DynamoDB
      await dynamodb.delete({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { ConnectionId: connectionId }
      }).promise();

      // Remove from Redis
      const redis = await initRedis();
      await redis.hdel(`connections:${EntityKey}`, connectionId);
      
      // Notify other users
      await notifyUserLeft(EntityKey, UserId);
    }
  } catch (error) {
    console.error('Error removing connection:', error);
  }
};

// Get connections for an entity
const getEntityConnections = async (entityType, entityId) => {
  const entityKey = `${entityType}#${entityId}`;
  
  try {
    const redis = await initRedis();
    const connections = await redis.hgetall(`connections:${entityKey}`);
    
    return Object.entries(connections).map(([connectionId, data]) => ({
      connectionId,
      ...JSON.parse(data)
    }));
  } catch (error) {
    console.error('Error getting entity connections:', error);
    return [];
  }
};

// Broadcast message to entity subscribers
const broadcastToEntity = async (entityType, entityId, message) => {
  const connections = await getEntityConnections(entityType, entityId);
  
  await Promise.all(connections.map(async ({ connectionId }) => {
    try {
      await apigateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      }).promise();
    } catch (error) {
      if (error.statusCode === 410) {
        // Connection is closed, remove it
        await removeConnection(connectionId);
      } else {
        console.error('Error sending message to connection:', error);
      }
    }
  }));
};

// Notify user joined
const notifyUserJoined = async (entityType, entityId, userId) => {
  await broadcastToEntity(entityType, entityId, {
    type: 'user_joined',
    user: { id: userId, joinedAt: new Date().toISOString() }
  });
};

// Notify user left
const notifyUserLeft = async (entityKey, userId) => {
  const [entityType, entityId] = entityKey.split('#');
  await broadcastToEntity(entityType, entityId, {
    type: 'user_left',
    user: { id: userId, leftAt: new Date().toISOString() }
  });
};

// Handle entity update
const handleEntityUpdate = async (data) => {
  const { entityType, entityId, changes, userId, timestamp } = data;
  
  // Store event in Redis for real-time access
  const redis = await initRedis();
  const eventKey = `events:${entityType}#${entityId}`;
  const event = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'entity_updated',
    entityType,
    entityId,
    changes,
    userId,
    timestamp
  };
  
  await redis.lpush(eventKey, JSON.stringify(event));
  await redis.ltrim(eventKey, 0, 99); // Keep last 100 events
  await redis.expire(eventKey, 3600); // 1 hour TTL
  
  // Broadcast to subscribers
  await broadcastToEntity(entityType, entityId, event);
};

// Handle conflict detection
const handleConflict = async (data) => {
  const { entityType, entityId, conflictData } = data;
  await broadcastToEntity(entityType, entityId, {
    type: 'conflict_detected',
    conflictData,
    timestamp: new Date().toISOString()
  });
};

// Handle rollback
const handleRollback = async (data) => {
  const { entityType, entityId, rollbackData } = data;
  await broadcastToEntity(entityType, entityId, {
    type: 'rollback_required',
    rollbackData,
    timestamp: new Date().toISOString()
  });
};

// Main handler
exports.handler = async (event) => {
  console.log('WebSocket event:', JSON.stringify(event, null, 2));

  const { requestContext, body } = event;
  const { routeKey, connectionId } = requestContext;

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);
      
      case '$disconnect':
        return await handleDisconnect(event);
      
      case '$default':
        return await handleDefault(event);
      
      default:
        console.log('Unknown route:', routeKey);
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('Error handling WebSocket event:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

// Handle connection
const handleConnect = async (event) => {
  const { requestContext } = event;
  const { connectionId } = requestContext;
  
  // Extract user info from query parameters or headers
  const userId = event.queryStringParameters?.userId || 'anonymous';
  const entityType = event.queryStringParameters?.entityType || 'unknown';
  const entityId = event.queryStringParameters?.entityId || 'unknown';

  try {
    await storeConnection(connectionId, userId, entityType, entityId);
    
    // Notify other users
    await notifyUserJoined(entityType, entityId, userId);
    
    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Error handling connect:', error);
    return { statusCode: 500, body: 'Connection failed' };
  }
};

// Handle disconnection
const handleDisconnect = async (event) => {
  const { requestContext } = event;
  const { connectionId } = requestContext;

  try {
    await removeConnection(connectionId);
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Error handling disconnect:', error);
    return { statusCode: 500, body: 'Disconnect failed' };
  }
};

// Handle default messages
const handleDefault = async (event) => {
  const { requestContext, body } = event;
  const { connectionId } = requestContext;

  try {
    const data = JSON.parse(body || '{}');
    const { action, ...payload } = data;

    switch (action) {
      case 'subscribe':
        await handleSubscribe(connectionId, payload);
        break;
      
      case 'unsubscribe':
        await handleUnsubscribe(connectionId, payload);
        break;
      
      case 'entity_update':
        await handleEntityUpdate(payload);
        break;
      
      case 'conflict_detected':
        await handleConflict(payload);
        break;
      
      case 'rollback_required':
        await handleRollback(payload);
        break;
      
      default:
        console.log('Unknown action:', action);
        return { statusCode: 400, body: 'Unknown action' };
    }

    return { statusCode: 200, body: 'Message processed' };
  } catch (error) {
    console.error('Error handling default message:', error);
    return { statusCode: 400, body: 'Invalid message format' };
  }
};

// Handle subscribe
const handleSubscribe = async (connectionId, { entityType, entityId }) => {
  try {
    // Get connection info
    const connection = await dynamodb.get({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { ConnectionId: connectionId }
    }).promise();

    if (connection.Item) {
      const { UserId } = connection.Item;
      const entityKey = `${entityType}#${entityId}`;
      
      // Update connection with new entity
      await dynamodb.update({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { ConnectionId: connectionId },
        UpdateExpression: 'SET EntityKey = :entityKey, EntityType = :entityType, EntityId = :entityId',
        ExpressionAttributeValues: {
          ':entityKey': entityKey,
          ':entityType': entityType,
          ':entityId': entityId
        }
      }).promise();

      // Update Redis
      const redis = await initRedis();
      await redis.hset(`connections:${entityKey}`, connectionId, JSON.stringify({
        userId: UserId,
        connectedAt: new Date().toISOString()
      }));

      // Notify other users
      await notifyUserJoined(entityType, entityId, UserId);
    }
  } catch (error) {
    console.error('Error handling subscribe:', error);
  }
};

// Handle unsubscribe
const handleUnsubscribe = async (connectionId, { entityType, entityId }) => {
  try {
    const entityKey = `${entityType}#${entityId}`;
    
    // Remove from Redis
    const redis = await initRedis();
    await redis.hdel(`connections:${entityKey}`, connectionId);
    
    // Get user info before removing
    const connection = await dynamodb.get({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: { ConnectionId: connectionId }
    }).promise();

    if (connection.Item) {
      const { UserId } = connection.Item;
      await notifyUserLeft(entityKey, UserId);
    }
  } catch (error) {
    console.error('Error handling unsubscribe:', error);
  }
};
