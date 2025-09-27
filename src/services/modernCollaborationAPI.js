import AWS from 'aws-sdk';

const modernCollaborationAPI = {
  // AWS Services
  dynamodb: new AWS.DynamoDB.DocumentClient({
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
  }),
  
  apigateway: new AWS.APIGatewayManagementApi({
    endpoint: process.env.REACT_APP_WS_ENDPOINT
  }),

  // WebSocket connection management
  wsConnections: new Map(),
  
  // Event sourcing and CQRS
  async createEvent(eventType, entityType, entityId, data, userId) {
    try {
      const event = {
        PK: `EVENT#${entityType}#${entityId}`,
        SK: `EVENT#${Date.now()}#${Math.random().toString(36).substr(2, 9)}`,
        GSI1PK: 'EVENTS',
        GSI1SK: `${eventType}#${Date.now()}`,
        EventType: eventType,
        EntityType: entityType,
        EntityId: entityId,
        Data: data,
        UserId: userId,
        Timestamp: new Date().toISOString(),
        Version: await this.getNextVersion(entityType, entityId),
        EntityType: 'EVENT'
      };

      // Store event
      await this.dynamodb.put({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        Item: event
      }).promise();

      // Update read model
      await this.updateReadModel(event);

      // Broadcast to WebSocket connections
      await this.broadcastEvent(event);

      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update read model (CQRS pattern)
  async updateReadModel(event) {
    try {
      const { EntityType, EntityId, EventType, Data, Version } = event;
      
      // Get current read model
      const currentModel = await this.getReadModel(EntityType, EntityId);
      
      // Apply event to read model
      const updatedModel = this.applyEventToModel(currentModel, event);
      
      // Store updated read model
      await this.dynamodb.put({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        Item: {
          PK: `READ_MODEL#${EntityType}#${EntityId}`,
          SK: 'CURRENT',
          GSI1PK: 'READ_MODELS',
          GSI1SK: `${EntityType}#${EntityId}`,
          ...updatedModel,
          Version,
          LastUpdated: new Date().toISOString(),
          EntityType: 'READ_MODEL'
        }
      }).promise();

      return updatedModel;
    } catch (error) {
      console.error('Error updating read model:', error);
      throw error;
    }
  },

  // Apply event to model (event sourcing)
  applyEventToModel(currentModel, event) {
    const { EventType, Data } = event;
    
    switch (EventType) {
      case 'COMPANY_CREATED':
        return { ...Data, Status: 'active' };
      
      case 'COMPANY_UPDATED':
        return { ...currentModel, ...Data };
      
      case 'COMPANY_FIELD_CHANGED':
        return {
          ...currentModel,
          [Data.field]: Data.value,
          [`${Data.field}_history`]: [
            ...(currentModel[`${Data.field}_history`] || []),
            {
              value: Data.value,
              changedBy: event.UserId,
              timestamp: event.Timestamp,
              version: event.Version
            }
          ]
        };
      
      case 'PROJECT_ADDED':
        return {
          ...currentModel,
          Projects: [...(currentModel.Projects || []), Data.projectId]
        };
      
      case 'FILE_UPLOADED':
        return {
          ...currentModel,
          CompanyFiles: [...(currentModel.CompanyFiles || []), Data.file]
        };
      
      default:
        return { ...currentModel, ...Data };
    }
  },

  // Get read model
  async getReadModel(entityType, entityId) {
    try {
      const result = await this.dynamodb.get({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        Key: {
          PK: `READ_MODEL#${entityType}#${entityId}`,
          SK: 'CURRENT'
        }
      }).promise();

      return result.Item || {};
    } catch (error) {
      console.error('Error getting read model:', error);
      return {};
    }
  },

  // Get next version number
  async getNextVersion(entityType, entityId) {
    try {
      const result = await this.dynamodb.query({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${entityType}#${entityId}`
        },
        ScanIndexForward: false,
        Limit: 1
      }).promise();

      return (result.Items[0]?.Version || 0) + 1;
    } catch (error) {
      console.error('Error getting next version:', error);
      return 1;
    }
  },

  // CRDT-based conflict resolution
  async resolveConflictWithCRDT(entityType, entityId, localChanges, remoteChanges) {
    try {
      // Get current state
      const currentState = await this.getReadModel(entityType, entityId);
      
      // Apply CRDT merge rules
      const mergedState = this.mergeCRDT(currentState, localChanges, remoteChanges);
      
      // Create merge event
      await this.createEvent('ENTITY_MERGED', entityType, entityId, {
        localChanges,
        remoteChanges,
        mergedState
      }, 'system');

      return mergedState;
    } catch (error) {
      console.error('Error resolving conflict with CRDT:', error);
      throw error;
    }
  },

  // CRDT merge logic
  mergeCRDT(currentState, localChanges, remoteChanges) {
    const merged = { ...currentState };
    
    // Merge arrays (union)
    Object.keys(localChanges).forEach(key => {
      if (Array.isArray(localChanges[key]) && Array.isArray(remoteChanges[key])) {
        merged[key] = [...new Set([...localChanges[key], ...remoteChanges[key]])];
      } else if (typeof localChanges[key] === 'object' && typeof remoteChanges[key] === 'object') {
        merged[key] = { ...localChanges[key], ...remoteChanges[key] };
      } else {
        // Last-write-wins for primitives
        merged[key] = localChanges[key];
      }
    });

    // Add remote changes not in local
    Object.keys(remoteChanges).forEach(key => {
      if (!(key in localChanges)) {
        merged[key] = remoteChanges[key];
      }
    });

    return merged;
  },

  // WebSocket connection management
  async connectWebSocket(connectionId, userId) {
    try {
      this.wsConnections.set(connectionId, {
        userId,
        connectedAt: new Date().toISOString(),
        subscriptions: new Set()
      });

      // Send connection confirmation
      await this.sendToConnection(connectionId, {
        type: 'connected',
        connectionId,
        userId
      });

      return { success: true };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      return { success: false, error: error.message };
    }
  },

  // Subscribe to entity updates
  async subscribeToEntity(connectionId, entityType, entityId) {
    try {
      const connection = this.wsConnections.get(connectionId);
      if (connection) {
        connection.subscriptions.add(`${entityType}#${entityId}`);
        
        await this.sendToConnection(connectionId, {
          type: 'subscribed',
          entityType,
          entityId
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error subscribing to entity:', error);
      return { success: false, error: error.message };
    }
  },

  // Broadcast event to subscribers
  async broadcastEvent(event) {
    try {
      const { EntityType, EntityId } = event;
      const subscriptionKey = `${EntityType}#${EntityId}`;
      
      // Find all connections subscribed to this entity
      const subscribers = Array.from(this.wsConnections.entries())
        .filter(([_, conn]) => conn.subscriptions.has(subscriptionKey))
        .map(([connectionId, _]) => connectionId);

      // Send to all subscribers
      await Promise.all(subscribers.map(connectionId => 
        this.sendToConnection(connectionId, {
          type: 'entity_updated',
          event
        })
      ));

      return { success: true, subscribers: subscribers.length };
    } catch (error) {
      console.error('Error broadcasting event:', error);
      return { success: false, error: error.message };
    }
  },

  // Send message to specific connection
  async sendToConnection(connectionId, message) {
    try {
      await this.apigateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      }).promise();

      return { success: true };
    } catch (error) {
      // Connection might be closed, remove it
      if (error.statusCode === 410) {
        this.wsConnections.delete(connectionId);
      }
      
      console.error('Error sending to connection:', error);
      return { success: false, error: error.message };
    }
  },

  // Optimistic updates with rollback
  async optimisticUpdate(entityType, entityId, changes, userId) {
    try {
      // Get current version
      const currentModel = await this.getReadModel(entityType, entityId);
      const currentVersion = currentModel.Version || 0;

      // Create optimistic update event
      const event = await this.createEvent('ENTITY_OPTIMISTIC_UPDATE', entityType, entityId, {
        changes,
        expectedVersion: currentVersion,
        userId
      }, userId);

      // Check for conflicts after a short delay
      setTimeout(async () => {
        const updatedModel = await this.getReadModel(entityType, entityId);
        if (updatedModel.Version > currentVersion + 1) {
          // Conflict detected, rollback
          await this.rollbackOptimisticUpdate(entityType, entityId, event, userId);
        }
      }, 1000);

      return { success: true, event };
    } catch (error) {
      console.error('Error in optimistic update:', error);
      return { success: false, error: error.message };
    }
  },

  // Rollback optimistic update
  async rollbackOptimisticUpdate(entityType, entityId, event, userId) {
    try {
      await this.createEvent('ENTITY_ROLLBACK', entityType, entityId, {
        rollbackEvent: event,
        reason: 'conflict_detected'
      }, 'system');

      // Notify user of rollback
      const connection = Array.from(this.wsConnections.entries())
        .find(([_, conn]) => conn.userId === userId);
      
      if (connection) {
        await this.sendToConnection(connection[0], {
          type: 'rollback',
          entityType,
          entityId,
          reason: 'conflict_detected'
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error rolling back optimistic update:', error);
      return { success: false, error: error.message };
    }
  },

  // Get collaboration status
  async getCollaborationStatus(entityType, entityId) {
    try {
      // Get recent events
      const events = await this.dynamodb.query({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${entityType}#${entityId}`
        },
        ScanIndexForward: false,
        Limit: 10
      }).promise();

      // Get active subscribers
      const activeSubscribers = Array.from(this.wsConnections.values())
        .filter(conn => conn.subscriptions.has(`${entityType}#${entityId}`))
        .map(conn => ({
          userId: conn.userId,
          connectedAt: conn.connectedAt
        }));

      return {
        recentEvents: events.Items || [],
        activeSubscribers,
        lastActivity: events.Items[0]?.Timestamp
      };
    } catch (error) {
      console.error('Error getting collaboration status:', error);
      return {
        recentEvents: [],
        activeSubscribers: [],
        lastActivity: null
      };
    }
  },

  // Cleanup old events (eventual consistency)
  async cleanupOldEvents(entityType, entityId, keepLast = 100) {
    try {
      const events = await this.dynamodb.query({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `EVENT#${entityType}#${entityId}`
        },
        ScanIndexForward: false
      }).promise();

      if (events.Items.length > keepLast) {
        const toDelete = events.Items.slice(keepLast);
        
        await Promise.all(toDelete.map(event => 
          this.dynamodb.delete({
            TableName: process.env.REACT_APP_DYNAMODB_TABLE,
            Key: {
              PK: event.PK,
              SK: event.SK
            }
          }).promise()
        ));
      }

      return { success: true };
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      return { success: false, error: error.message };
    }
  }
};

export default modernCollaborationAPI;
