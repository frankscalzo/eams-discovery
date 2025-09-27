import AWS from 'aws-sdk';

const collaborationAPI = {
  // Redis client (using AWS ElastiCache or Redis Cloud)
  redis: null, // Will be initialized with actual Redis connection
  
  // DynamoDB for persistent storage
  dynamodb: new AWS.DynamoDB.DocumentClient({
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
  }),

  tableName: process.env.REACT_APP_DYNAMODB_TABLE || 'eams-dev-data',

  // WebSocket connection for real-time updates
  wsConnection: null,
  wsReconnectAttempts: 0,
  maxReconnectAttempts: 5,

  // Initialize Redis connection
  async initializeRedis() {
    try {
      // This would connect to Redis (ElastiCache, Redis Cloud, etc.)
      // For now, we'll use a mock implementation
      this.redis = {
        get: async (key) => {
          console.log(`[REDIS] GET ${key}`);
          return null; // Mock implementation
        },
        set: async (key, value, ttl = 3600) => {
          console.log(`[REDIS] SET ${key} with TTL ${ttl}`);
          return 'OK';
        },
        del: async (key) => {
          console.log(`[REDIS] DEL ${key}`);
          return 1;
        },
        exists: async (key) => {
          console.log(`[REDIS] EXISTS ${key}`);
          return 0;
        },
        hget: async (key, field) => {
          console.log(`[REDIS] HGET ${key} ${field}`);
          return null;
        },
        hset: async (key, field, value) => {
          console.log(`[REDIS] HSET ${key} ${field}`);
          return 1;
        },
        hdel: async (key, field) => {
          console.log(`[REDIS] HDEL ${key} ${field}`);
          return 1;
        },
        publish: async (channel, message) => {
          console.log(`[REDIS] PUBLISH ${channel} ${message}`);
          return 1;
        },
        subscribe: async (channel, callback) => {
          console.log(`[REDIS] SUBSCRIBE ${channel}`);
          return true;
        }
      };
    } catch (error) {
      console.error('Error initializing Redis:', error);
      throw error;
    }
  },

  // Initialize WebSocket connection
  initializeWebSocket() {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.eams.optimumcloudservices.com/ws';
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
        this.wsReconnectAttempts = 0;
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  },

  // Attempt to reconnect WebSocket
  attemptReconnect() {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++;
      const delay = Math.pow(2, this.wsReconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket (attempt ${this.wsReconnectAttempts})`);
        this.initializeWebSocket();
      }, delay);
    }
  },

  // Handle real-time updates from WebSocket
  handleRealtimeUpdate(data) {
    const { type, entityType, entityId, changes, userId, timestamp } = data;
    
    // Emit custom events for components to listen to
    const event = new CustomEvent('realtimeUpdate', {
      detail: { type, entityType, entityId, changes, userId, timestamp }
    });
    window.dispatchEvent(event);
  },

  // Get cached data with fallback to DynamoDB
  async getCachedData(key, fallbackFn) {
    try {
      if (!this.redis) {
        await this.initializeRedis();
      }

      // Try to get from Redis cache first
      const cached = await this.redis.get(key);
      if (cached) {
        console.log(`Cache hit for ${key}`);
        return JSON.parse(cached);
      }

      // Fallback to DynamoDB
      console.log(`Cache miss for ${key}, fetching from DynamoDB`);
      const data = await fallbackFn();
      
      // Cache the result
      await this.redis.set(key, JSON.stringify(data), 300); // 5 minutes TTL
      
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      // Fallback to DynamoDB on Redis error
      return await fallbackFn();
    }
  },

  // Update data with optimistic locking and change tracking
  async updateData(entityType, entityId, changes, userId) {
    try {
      const lockKey = `lock:${entityType}:${entityId}`;
      const dataKey = `data:${entityType}:${entityId}`;
      const changeKey = `changes:${entityType}:${entityId}`;
      
      // Acquire lock
      const lockAcquired = await this.acquireLock(lockKey, userId, 30000); // 30 second lock
      if (!lockAcquired) {
        throw new Error('Entity is currently being edited by another user');
      }

      try {
        // Get current data
        const currentData = await this.getCachedData(dataKey, async () => {
          const result = await this.dynamodb.get({
            TableName: this.tableName,
            Key: { PK: entityType, SK: entityId }
          }).promise();
          return result.Item;
        });

        if (!currentData) {
          throw new Error('Entity not found');
        }

        // Track changes
        const changeRecord = {
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          timestamp: new Date().toISOString(),
          changes,
          previousVersion: currentData.version || 0
        };

        // Apply changes
        const updatedData = {
          ...currentData,
          ...changes,
          version: (currentData.version || 0) + 1,
          lastModified: new Date().toISOString(),
          lastModifiedBy: userId
        };

        // Save to DynamoDB
        await this.dynamodb.put({
          TableName: this.tableName,
          Item: updatedData
        }).promise();

        // Update cache
        await this.redis.set(dataKey, JSON.stringify(updatedData), 300);
        
        // Store change record
        await this.redis.hset(changeKey, changeRecord.id, JSON.stringify(changeRecord));
        
        // Publish change notification
        await this.redis.publish(`updates:${entityType}:${entityId}`, JSON.stringify({
          type: 'update',
          entityType,
          entityId,
          changes,
          userId,
          timestamp: changeRecord.timestamp,
          version: updatedData.version
        }));

        // Send WebSocket notification
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
          this.wsConnection.send(JSON.stringify({
            type: 'update',
            entityType,
            entityId,
            changes,
            userId,
            timestamp: changeRecord.timestamp
          }));
        }

        return { success: true, data: updatedData, changeId: changeRecord.id };
      } finally {
        // Release lock
        await this.releaseLock(lockKey, userId);
      }
    } catch (error) {
      console.error('Error updating data:', error);
      return { success: false, error: error.message };
    }
  },

  // Acquire optimistic lock
  async acquireLock(lockKey, userId, ttl = 30000) {
    try {
      const lockValue = JSON.stringify({
        userId,
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl).toISOString()
      });

      // Try to set lock if it doesn't exist
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return false;
    }
  },

  // Release optimistic lock
  async releaseLock(lockKey, userId) {
    try {
      const lockData = await this.redis.get(lockKey);
      if (lockData) {
        const lock = JSON.parse(lockData);
        if (lock.userId === userId) {
          await this.redis.del(lockKey);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error releasing lock:', error);
      return false;
    }
  },

  // Get active users editing an entity
  async getActiveUsers(entityType, entityId) {
    try {
      const lockKey = `lock:${entityType}:${entityId}`;
      const lockData = await this.redis.get(lockKey);
      
      if (lockData) {
        const lock = JSON.parse(lockData);
        return [{
          userId: lock.userId,
          acquiredAt: lock.acquiredAt,
          expiresAt: lock.expiresAt
        }];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  },

  // Get change history for an entity
  async getChangeHistory(entityType, entityId, limit = 50) {
    try {
      const changeKey = `changes:${entityType}:${entityId}`;
      const changes = await this.redis.hgetall(changeKey);
      
      return Object.values(changes)
        .map(change => JSON.parse(change))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting change history:', error);
      return [];
    }
  },

  // Subscribe to real-time updates for an entity
  async subscribeToUpdates(entityType, entityId, callback) {
    try {
      const channel = `updates:${entityType}:${entityId}`;
      
      // Subscribe to Redis channel
      await this.redis.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          console.error('Error processing Redis message:', error);
        }
      });

      // Also listen to WebSocket
      const wsHandler = (event) => {
        const data = event.detail;
        if (data.entityType === entityType && data.entityId === entityId) {
          callback(data);
        }
      };
      
      window.addEventListener('realtimeUpdate', wsHandler);
      
      // Return unsubscribe function
      return () => {
        window.removeEventListener('realtimeUpdate', wsHandler);
        // Note: Redis unsubscribe would be implemented here
      };
    } catch (error) {
      console.error('Error subscribing to updates:', error);
      return () => {};
    }
  },

  // Resolve conflicts when multiple users edit the same data
  async resolveConflict(entityType, entityId, conflictData) {
    try {
      const { localVersion, remoteVersion, localChanges, remoteChanges } = conflictData;
      
      // Simple conflict resolution strategy: last-write-wins with change merging
      if (localVersion > remoteVersion) {
        // Local version is newer, keep local changes
        return { strategy: 'local', changes: localChanges };
      } else if (remoteVersion > localVersion) {
        // Remote version is newer, keep remote changes
        return { strategy: 'remote', changes: remoteChanges };
      } else {
        // Same version, merge changes intelligently
        const mergedChanges = this.mergeChanges(localChanges, remoteChanges);
        return { strategy: 'merge', changes: mergedChanges };
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return { strategy: 'manual', error: error.message };
    }
  },

  // Merge changes from multiple users
  mergeChanges(localChanges, remoteChanges) {
    const merged = { ...localChanges };
    
    // Apply remote changes that don't conflict with local changes
    Object.keys(remoteChanges).forEach(key => {
      if (!(key in localChanges)) {
        merged[key] = remoteChanges[key];
      } else if (typeof localChanges[key] === 'object' && typeof remoteChanges[key] === 'object') {
        // Merge nested objects
        merged[key] = { ...localChanges[key], ...remoteChanges[key] };
      }
      // For primitive values, keep local changes (last-write-wins)
    });
    
    return merged;
  },

  // Get collaboration status for an entity
  async getCollaborationStatus(entityType, entityId) {
    try {
      const [activeUsers, changeHistory] = await Promise.all([
        this.getActiveUsers(entityType, entityId),
        this.getChangeHistory(entityType, entityId, 10)
      ]);

      return {
        isLocked: activeUsers.length > 0,
        activeUsers,
        recentChanges: changeHistory,
        lastModified: changeHistory[0]?.timestamp,
        lastModifiedBy: changeHistory[0]?.userId
      };
    } catch (error) {
      console.error('Error getting collaboration status:', error);
      return {
        isLocked: false,
        activeUsers: [],
        recentChanges: [],
        lastModified: null,
        lastModifiedBy: null
      };
    }
  },

  // Broadcast presence update
  async updatePresence(entityType, entityId, userId, status = 'viewing') {
    try {
      const presenceKey = `presence:${entityType}:${entityId}`;
      const presenceData = {
        userId,
        status,
        timestamp: new Date().toISOString()
      };

      await this.redis.hset(presenceKey, userId, JSON.stringify(presenceData));
      
      // Set expiration for presence data
      await this.redis.expire(presenceKey, 60); // 1 minute

      // Broadcast presence update
      await this.redis.publish(`presence:${entityType}:${entityId}`, JSON.stringify(presenceData));
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  },

  // Get current presence for an entity
  async getPresence(entityType, entityId) {
    try {
      const presenceKey = `presence:${entityType}:${entityId}`;
      const presence = await this.redis.hgetall(presenceKey);
      
      return Object.values(presence).map(p => JSON.parse(p));
    } catch (error) {
      console.error('Error getting presence:', error);
      return [];
    }
  },

  // Clean up expired locks and presence
  async cleanupExpiredData() {
    try {
      // This would be called by a scheduled Lambda function
      // to clean up expired locks and presence data
      console.log('Cleaning up expired collaboration data');
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }
};

export default collaborationAPI;
