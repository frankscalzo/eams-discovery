// Unified Data Service - Single database for all entities with relationships
import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// AWS Configuration
const REGION = 'us-east-1';
const UNIFIED_TABLE = 'eams-unified-entities';

// Initialize client
const dynamoClient = new DynamoDBClient({ region: REGION });

class UnifiedDataService {
  // Entity Types
  static ENTITY_TYPES = {
    COMPANY: 'company',
    USER: 'user',
    PROJECT: 'project',
    THIRD_PARTY_APP: 'third_party_app',
    CO_TRAVELER: 'co_traveler',
    APPLICATION: 'application'
  };

  // Create or update entity
  async saveEntity(entityType, data) {
    try {
      const item = {
        id: data.id || `${entityType}_${Date.now()}`,
        entityType,
        ...data,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: UNIFIED_TABLE,
        Item: marshall(item)
      });
      
      await dynamoClient.send(command);
      return item;
    } catch (error) {
      console.error(`Error saving ${entityType}:`, error);
      throw error;
    }
  }

  // Get entity by ID
  async getEntity(id) {
    try {
      const command = new GetItemCommand({
        TableName: UNIFIED_TABLE,
        Key: marshall({ id })
      });
      
      const result = await dynamoClient.send(command);
      return result.Item ? unmarshall(result.Item) : null;
    } catch (error) {
      console.error('Error getting entity:', error);
      throw error;
    }
  }

  // Get entities by type
  async getEntitiesByType(entityType, filters = {}) {
    try {
      const command = new ScanCommand({
        TableName: UNIFIED_TABLE,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': { S: entityType }
        }
      });
      
      const result = await dynamoClient.send(command);
      let entities = result.Items ? result.Items.map(item => unmarshall(item)) : [];
      
      // Apply additional filters
      if (filters.status) {
        entities = entities.filter(entity => entity.status === filters.status);
      }
      if (filters.category) {
        entities = entities.filter(entity => entity.category === filters.category);
      }
      if (filters.companyId) {
        entities = entities.filter(entity => entity.companyId === filters.companyId);
      }
      if (filters.projectId) {
        entities = entities.filter(entity => 
          entity.projectIds?.includes(filters.projectId) || 
          entity.projectId === filters.projectId
        );
      }
      
      return entities;
    } catch (error) {
      console.error(`Error getting ${entityType}s:`, error);
      throw error;
    }
  }

  // Search entities with advanced filtering
  async searchEntities(entityType, searchTerm, filters = {}) {
    try {
      const command = new ScanCommand({
        TableName: UNIFIED_TABLE,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': { S: entityType }
        }
      });
      
      const result = await dynamoClient.send(command);
      let entities = result.Items ? result.Items.map(item => unmarshall(item)) : [];
      
      // Apply search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        entities = entities.filter(entity => {
          const searchFields = [
            entity.name,
            entity.title,
            entity.description,
            entity.vendor,
            entity.company,
            entity.email,
            entity.tags?.join(' '),
            entity.category,
            entity.industry
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchFields.includes(searchLower);
        });
      }
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            entities = entities.filter(entity => 
              value.some(v => 
                entity[key] === v || 
                entity[key]?.includes?.(v) ||
                (typeof entity[key] === 'string' && entity[key].toLowerCase().includes(v.toLowerCase()))
              )
            );
          } else if (typeof value === 'object' && value.min !== undefined) {
            // Range filter
            entities = entities.filter(entity => {
              const entityValue = entity[key];
              return entityValue >= value.min && entityValue <= value.max;
            });
          } else {
            entities = entities.filter(entity => {
              const entityValue = entity[key];
              if (typeof entityValue === 'string') {
                return entityValue.toLowerCase().includes(value.toLowerCase());
              }
              return entityValue === value;
            });
          }
        }
      });
      
      return entities;
    } catch (error) {
      console.error(`Error searching ${entityType}s:`, error);
      throw error;
    }
  }

  // Delete entity
  async deleteEntity(id) {
    try {
      const command = new DeleteItemCommand({
        TableName: UNIFIED_TABLE,
        Key: marshall({ id })
      });
      
      await dynamoClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting entity:', error);
      throw error;
    }
  }

  // Get project with related entities
  async getProjectWithRelations(projectId) {
    try {
      const project = await this.getEntity(projectId);
      if (!project) return null;
      
      // Get related third-party apps
      const relatedApps = await this.getEntitiesByType(
        UnifiedDataService.ENTITY_TYPES.THIRD_PARTY_APP,
        { projectId }
      );
      
      // Get related co-travelers
      const relatedCoTravelers = await this.getEntitiesByType(
        UnifiedDataService.ENTITY_TYPES.CO_TRAVELER,
        { projectId }
      );
      
      // Get related applications
      const relatedApplications = await this.getEntitiesByType(
        UnifiedDataService.ENTITY_TYPES.APPLICATION,
        { projectId }
      );
      
      return {
        ...project,
        relatedApps,
        relatedCoTravelers,
        relatedApplications
      };
    } catch (error) {
      console.error('Error getting project with relations:', error);
      throw error;
    }
  }

  // Link entities to project
  async linkToProject(entityId, projectId) {
    try {
      const entity = await this.getEntity(entityId);
      if (!entity) throw new Error('Entity not found');
      
      const projectIds = entity.projectIds || [];
      if (!projectIds.includes(projectId)) {
        projectIds.push(projectId);
      }
      
      return await this.saveEntity(entity.entityType, {
        ...entity,
        projectIds,
        projectId // Keep for backward compatibility
      });
    } catch (error) {
      console.error('Error linking entity to project:', error);
      throw error;
    }
  }

  // Unlink entity from project
  async unlinkFromProject(entityId, projectId) {
    try {
      const entity = await this.getEntity(entityId);
      if (!entity) throw new Error('Entity not found');
      
      const projectIds = (entity.projectIds || []).filter(id => id !== projectId);
      
      return await this.saveEntity(entity.entityType, {
        ...entity,
        projectIds,
        projectId: projectIds.length > 0 ? projectIds[0] : null
      });
    } catch (error) {
      console.error('Error unlinking entity from project:', error);
      throw error;
    }
  }

  // Get all entities for a project
  async getProjectEntities(projectId) {
    try {
      const command = new ScanCommand({
        TableName: UNIFIED_TABLE,
        FilterExpression: 'contains(projectIds, :projectId) OR projectId = :projectId',
        ExpressionAttributeValues: {
          ':projectId': { S: projectId }
        }
      });
      
      const result = await dynamoClient.send(command);
      const entities = result.Items ? result.Items.map(item => unmarshall(item)) : [];
      
      // Group by entity type
      const grouped = entities.reduce((acc, entity) => {
        const type = entity.entityType;
        if (!acc[type]) acc[type] = [];
        acc[type].push(entity);
        return acc;
      }, {});
      
      return grouped;
    } catch (error) {
      console.error('Error getting project entities:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkSave(entities) {
    try {
      const promises = entities.map(entity => this.saveEntity(entity.entityType, entity));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error bulk saving entities:', error);
      throw error;
    }
  }

  // Get statistics
  async getStatistics() {
    try {
      const command = new ScanCommand({
        TableName: UNIFIED_TABLE
      });
      
      const result = await dynamoClient.send(command);
      const entities = result.Items ? result.Items.map(item => unmarshall(item)) : [];
      
      const stats = entities.reduce((acc, entity) => {
        const type = entity.entityType;
        if (!acc[type]) {
          acc[type] = { total: 0, active: 0, inactive: 0 };
        }
        acc[type].total++;
        if (entity.status === 'Active') {
          acc[type].active++;
        } else if (entity.status === 'Inactive') {
          acc[type].inactive++;
        }
        return acc;
      }, {});
      
      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

export default new UnifiedDataService();



