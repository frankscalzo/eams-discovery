const AWS = require('aws-sdk');
const Redis = require('ioredis');

const dynamodb = new AWS.DynamoDB.DocumentClient();

let redis = null;

// Initialize Redis connection
const initRedis = async () => {
  if (!redis) {
    const secretsManager = new AWS.SecretsManager();
    const result = await secretsManager.getSecretValue({ 
      SecretId: process.env.REDIS_AUTH_TOKEN_SECRET 
    }).promise();
    const secret = JSON.parse(result.SecretString);
    
    redis = new Redis({
      host: process.env.REDIS_ENDPOINT,
      port: process.env.REDIS_PORT,
      password: secret['auth-token'],
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redis;
};

// Clean up expired connections
const cleanupExpiredConnections = async () => {
  try {
    console.log('Cleaning up expired connections...');
    
    // Scan for expired connections (TTL has passed)
    const now = Math.floor(Date.now() / 1000);
    
    const result = await dynamodb.scan({
      TableName: process.env.CONNECTIONS_TABLE,
      FilterExpression: 'TTL < :now',
      ExpressionAttributeValues: {
        ':now': now
      }
    }).promise();

    console.log(`Found ${result.Items.length} expired connections`);

    // Delete expired connections
    for (const item of result.Items) {
      await dynamodb.delete({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { ConnectionId: item.ConnectionId }
      }).promise();
    }

    return result.Items.length;
  } catch (error) {
    console.error('Error cleaning up expired connections:', error);
    return 0;
  }
};

// Clean up old events from Redis
const cleanupOldEvents = async () => {
  try {
    console.log('Cleaning up old events...');
    
    const redis = await initRedis();
    
    // Get all event keys
    const eventKeys = await redis.keys('events:*');
    console.log(`Found ${eventKeys.length} event keys`);

    let cleanedCount = 0;
    
    for (const key of eventKeys) {
      // Keep only last 50 events per entity
      const trimmed = await redis.ltrim(key, 0, 49);
      if (trimmed === 'OK') {
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old events:', error);
    return 0;
  }
};

// Clean up expired presence data
const cleanupExpiredPresence = async () => {
  try {
    console.log('Cleaning up expired presence data...');
    
    const redis = await initRedis();
    
    // Get all presence keys
    const presenceKeys = await redis.keys('presence:*');
    console.log(`Found ${presenceKeys.length} presence keys`);

    let cleanedCount = 0;
    
    for (const key of presenceKeys) {
      // Check if key has expired (no TTL means it's expired)
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // No TTL set, remove the key
        await redis.del(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired presence:', error);
    return 0;
  }
};

// Clean up old locks
const cleanupExpiredLocks = async () => {
  try {
    console.log('Cleaning up expired locks...');
    
    const redis = await initRedis();
    
    // Get all lock keys
    const lockKeys = await redis.keys('lock:*');
    console.log(`Found ${lockKeys.length} lock keys`);

    let cleanedCount = 0;
    
    for (const key of lockKeys) {
      try {
        const lockData = await redis.get(key);
        if (lockData) {
          const lock = JSON.parse(lockData);
          const expiresAt = new Date(lock.expiresAt);
          
          if (expiresAt < new Date()) {
            await redis.del(key);
            cleanedCount++;
          }
        }
      } catch (error) {
        // Invalid lock data, remove it
        await redis.del(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
    return 0;
  }
};

// Main cleanup function
exports.handler = async (event) => {
  console.log('Starting cleanup process...');
  
  const startTime = Date.now();
  const results = {
    expiredConnections: 0,
    oldEvents: 0,
    expiredPresence: 0,
    expiredLocks: 0,
    errors: []
  };

  try {
    // Clean up expired connections
    try {
      results.expiredConnections = await cleanupExpiredConnections();
    } catch (error) {
      console.error('Error in connection cleanup:', error);
      results.errors.push(`Connection cleanup: ${error.message}`);
    }

    // Clean up old events
    try {
      results.oldEvents = await cleanupOldEvents();
    } catch (error) {
      console.error('Error in event cleanup:', error);
      results.errors.push(`Event cleanup: ${error.message}`);
    }

    // Clean up expired presence
    try {
      results.expiredPresence = await cleanupExpiredPresence();
    } catch (error) {
      console.error('Error in presence cleanup:', error);
      results.errors.push(`Presence cleanup: ${error.message}`);
    }

    // Clean up expired locks
    try {
      results.expiredLocks = await cleanupExpiredLocks();
    } catch (error) {
      console.error('Error in lock cleanup:', error);
      results.errors.push(`Lock cleanup: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(`Cleanup completed in ${duration}ms:`, results);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        duration,
        results
      })
    };

  } catch (error) {
    console.error('Cleanup process failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        results
      })
    };
  }
};
