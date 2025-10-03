// Normalized Data Service - Proper relational structure with lookup tables
import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getDynamoConfig } from './awsConfig';

// AWS Configuration
const REGION = 'us-east-1';

// Table Names
const TABLES = {
  ENTITIES: 'eams-unified-entities',
  CATEGORIES: 'eams-categories',
  DEPLOYMENT_MODELS: 'eams-deployment-models',
  VENDORS: 'eams-vendors',
  STATUSES: 'eams-statuses',
  TAGS: 'eams-tags',
  PROJECTS: 'eams-projects',
  COMPANIES: 'eams-companies',
  USERS: 'eams-users'
};

// Initialize client with SSM configuration
let dynamoClient = null;

const initializeClient = async () => {
  if (!dynamoClient) {
    const config = getDynamoConfig();
    if (config) {
      dynamoClient = new DynamoDBClient(config);
    } else {
      // Fallback to basic configuration
      dynamoClient = new DynamoDBClient({ region: REGION });
    }
  }
  return dynamoClient;
};

class NormalizedDataService {
  // Entity Types
  static ENTITY_TYPES = {
    COMPANY: 'company',
    USER: 'user',
    PROJECT: 'project',
    THIRD_PARTY_APP: 'third_party_app',
    CO_TRAVELER: 'co_traveler',
    APPLICATION: 'application'
  };

  // Initialize lookup tables with default data
  async initializeLookupTables() {
    const lookupData = {
      categories: [
        { id: 'admin', name: 'Administration', description: 'Administrative and ERP systems' },
        { id: 'clinical', name: 'Clinical', description: 'Clinical applications and systems' },
        { id: 'infrastructure', name: 'Infrastructure', description: 'Infrastructure and platform services' },
        { id: 'security', name: 'Security', description: 'Security and compliance tools' },
        { id: 'communication', name: 'Communication', description: 'Communication and collaboration tools' },
        { id: 'analytics', name: 'Analytics', description: 'Analytics and reporting tools' },
        { id: 'development', name: 'Development', description: 'Development and DevOps tools' },
        { id: 'productivity', name: 'Productivity', description: 'Productivity and office applications' },
        { id: 'other', name: 'Other', description: 'Other applications' }
      ],
      deploymentModels: [
        { id: 'cloud_saas', name: 'Cloud / SaaS', description: 'Cloud-based Software as a Service' },
        { id: 'cloud_hybrid', name: 'Cloud / SaaS (or Hybrid)', description: 'Hybrid cloud and SaaS solutions' },
        { id: 'on_premises', name: 'On-Premises', description: 'On-premises installations' },
        { id: 'unknown', name: 'Unknown / Needs vendor check', description: 'Deployment model needs verification' }
      ],
      statuses: [
        { id: 'active', name: 'Active', description: 'Currently in use and supported' },
        { id: 'inactive', name: 'Inactive', description: 'Not currently in use' },
        { id: 'deprecated', name: 'Deprecated', description: 'Scheduled for retirement' },
        { id: 'unknown', name: 'Unknown', description: 'Status needs verification' }
      ],
      tags: [
        { id: 'cloud', name: 'Cloud', description: 'Cloud-based solution' },
        { id: 'saas', name: 'SaaS', description: 'Software as a Service' },
        { id: 'on_premises', name: 'On-Premises', description: 'On-premises solution' },
        { id: 'hybrid', name: 'Hybrid', description: 'Hybrid deployment' },
        { id: 'critical', name: 'Critical', description: 'Critical business application' },
        { id: 'important', name: 'Important', description: 'Important business application' },
        { id: 'best_effort', name: 'Best Effort', description: 'Best effort support' },
        { id: 'retire', name: 'Retire', description: 'Scheduled for retirement' },
        { id: 'relocate', name: 'Relocate', description: 'Scheduled for relocation' },
        { id: 'retain', name: 'Retain', description: 'Retain in current state' },
        { id: 'redeploy', name: 'Redeploy', description: 'Scheduled for redeployment' },
        { id: 'phase_i', name: 'Phase I', description: 'Phase I implementation' },
        { id: 'phase_ii', name: 'Phase II', description: 'Phase II implementation' },
        { id: 'azure', name: 'Azure', description: 'Microsoft Azure related' },
        { id: 'aws', name: 'AWS', description: 'Amazon Web Services related' },
        { id: 'enterprise', name: 'Enterprise', description: 'Enterprise-grade solution' },
        { id: 'security', name: 'Security', description: 'Security-focused solution' },
        { id: 'productivity', name: 'Productivity', description: 'Productivity tool' },
        { id: 'collaboration', name: 'Collaboration', description: 'Collaboration tool' }
      ]
    };

    // Initialize each lookup table
    for (const [tableName, data] of Object.entries(lookupData)) {
      const tableKey = tableName.toUpperCase();
      if (TABLES[tableKey]) {
        try {
          for (const item of data) {
            await this.saveLookupItem(TABLES[tableKey], item);
          }
          console.log(`Initialized ${data.length} items in ${tableName} table`);
        } catch (error) {
          console.error(`Error initializing ${tableName} table:`, error);
        }
      }
    }
  }

  // Save lookup item
  async saveLookupItem(tableName, item) {
    try {
      const client = await initializeClient();
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall({
          id: item.id,
          name: item.name,
          description: item.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      await client.send(command);
      return item;
    } catch (error) {
      console.error(`Error saving lookup item to ${tableName}:`, error);
      throw error;
    }
  }

  // Get all lookup items
  async getLookupItems(tableName) {
    try {
      const client = await initializeClient();
      const command = new ScanCommand({
        TableName: tableName
      });
      
      const result = await client.send(command);
      return result.Items ? result.Items.map(item => unmarshall(item)) : [];
    } catch (error) {
      console.error(`Error getting lookup items from ${tableName}:`, error);
      throw error;
    }
  }

  // Update lookup item
  async updateLookupItem(tableName, id, data) {
    try {
      const command = new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({ id }),
        UpdateExpression: 'SET #name = :name, #description = :description, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#name': 'name',
          '#description': 'description',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: marshall({
          ':name': data.name,
          ':description': data.description || '',
          ':updatedAt': new Date().toISOString()
        }),
        ReturnValues: 'ALL_NEW'
      });
      
      const client = await initializeClient();
      const result = await client.send(command);
      return unmarshall(result.Attributes);
    } catch (error) {
      console.error(`Error updating lookup item in ${tableName}:`, error);
      throw error;
    }
  }

  // Delete lookup item
  async deleteLookupItem(tableName, id) {
    try {
      const command = new DeleteItemCommand({
        TableName: tableName,
        Key: marshall({ id })
      });
      
      const client = await initializeClient();
      await client.send(command);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting lookup item from ${tableName}:`, error);
      throw error;
    }
  }

  // Create or update entity with normalized references
  async saveEntity(entityType, data) {
    try {
      // Normalize foreign key references
      const normalizedData = await this.normalizeEntityData(data);
      
      const item = {
        id: data.id || `${entityType}_${Date.now()}`,
        entityType,
        ...normalizedData,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: TABLES.ENTITIES,
        Item: marshall(item)
      });
      
      const client = await initializeClient();
      await client.send(command);
      return item;
    } catch (error) {
      console.error(`Error saving ${entityType}:`, error);
      throw error;
    }
  }

  // Normalize entity data by resolving foreign keys
  async normalizeEntityData(data) {
    const normalized = { ...data };

    // Resolve category ID
    if (data.category) {
      const categories = await this.getLookupItems(TABLES.CATEGORIES);
      const category = categories.find(c => 
        c.name.toLowerCase() === data.category.toLowerCase() ||
        c.id === data.category
      );
      normalized.categoryId = category ? category.id : 'other';
      normalized.categoryName = category ? category.name : data.category;
    }

    // Resolve deployment model ID
    if (data.deploymentModel) {
      const deploymentModels = await this.getLookupItems(TABLES.DEPLOYMENT_MODELS);
      const model = deploymentModels.find(m => 
        m.name.toLowerCase() === data.deploymentModel.toLowerCase() ||
        m.id === data.deploymentModel
      );
      normalized.deploymentModelId = model ? model.id : 'unknown';
      normalized.deploymentModelName = model ? model.name : data.deploymentModel;
    }

    // Resolve status ID
    if (data.status) {
      const statuses = await this.getLookupItems(TABLES.STATUSES);
      const status = statuses.find(s => 
        s.name.toLowerCase() === data.status.toLowerCase() ||
        s.id === data.status
      );
      normalized.statusId = status ? status.id : 'unknown';
      normalized.statusName = status ? status.name : data.status;
    }

    // Resolve vendor ID
    if (data.vendor) {
      const vendorId = await this.getOrCreateVendor(data.vendor);
      normalized.vendorId = vendorId;
    }

    // Resolve tag IDs
    if (data.tags && Array.isArray(data.tags)) {
      const tagIds = await this.getOrCreateTags(data.tags);
      normalized.tagIds = tagIds;
    }

    return normalized;
  }

  // Get or create vendor
  async getOrCreateVendor(vendorName) {
    try {
      // First try to find existing vendor
      const command = new ScanCommand({
        TableName: TABLES.VENDORS,
        FilterExpression: 'vendorName = :vendorName',
        ExpressionAttributeValues: {
          ':vendorName': { S: vendorName }
        }
      });
      
      const client = await initializeClient();
      const result = await client.send(command);
      if (result.Items && result.Items.length > 0) {
        return unmarshall(result.Items[0]).id;
      }

      // Create new vendor
      const vendorId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const vendorData = {
        id: vendorId,
        vendorName: vendorName,
        website: '',
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const putCommand = new PutItemCommand({
        TableName: TABLES.VENDORS,
        Item: marshall(vendorData)
      });
      
      await dynamoClient.send(putCommand);
      return vendorId;
    } catch (error) {
      console.error('Error getting/creating vendor:', error);
      return `vendor_${Date.now()}`;
    }
  }

  // Get or create tags
  async getOrCreateTags(tagNames) {
    try {
      const tagIds = [];
      
      for (const tagName of tagNames) {
        // First try to find existing tag
        const command = new ScanCommand({
          TableName: TABLES.TAGS,
          FilterExpression: 'name = :name',
          ExpressionAttributeValues: {
            ':name': { S: tagName }
          }
        });
        
        const client = await initializeClient();
      const result = await client.send(command);
        if (result.Items && result.Items.length > 0) {
          tagIds.push(unmarshall(result.Items[0]).id);
        } else {
          // Create new tag
          const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const tagData = {
            id: tagId,
            name: tagName,
            description: this.getTagDescription(tagName),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const putCommand = new PutItemCommand({
            TableName: TABLES.TAGS,
            Item: marshall(tagData)
          });
          
          await dynamoClient.send(putCommand);
          tagIds.push(tagId);
        }
      }
      
      return tagIds;
    } catch (error) {
      console.error('Error getting/creating tags:', error);
      return [];
    }
  }

  // Get tag description based on name
  getTagDescription(tagName) {
    const descriptions = {
      'cloud': 'Cloud-based solution',
      'saas': 'Software as a Service',
      'on_premises': 'On-premises solution',
      'hybrid': 'Hybrid deployment',
      'critical': 'Critical business application',
      'important': 'Important business application',
      'best_effort': 'Best effort support',
      'retire': 'Scheduled for retirement',
      'relocate': 'Scheduled for relocation',
      'retain': 'Retain in current state',
      'redeploy': 'Scheduled for redeployment',
      'phase_i': 'Phase I implementation',
      'phase_ii': 'Phase II implementation',
      'azure': 'Microsoft Azure related',
      'aws': 'Amazon Web Services related',
      'enterprise': 'Enterprise-grade solution',
      'security': 'Security-focused solution',
      'productivity': 'Productivity tool',
      'collaboration': 'Collaboration tool',
      'strategic': 'Strategic partner',
      'technology': 'Technology partner',
      'vendor': 'Vendor relationship',
      'consultant': 'Consulting partner',
      'startup': 'Startup company',
      'government': 'Government entity',
      'nonprofit': 'Non-profit organization'
    };
    
    return descriptions[tagName.toLowerCase()] || '';
  }

  // Get entity by ID with resolved references
  async getEntity(id) {
    try {
      const command = new GetItemCommand({
        TableName: TABLES.ENTITIES,
        Key: marshall({ id })
      });
      
      const client = await initializeClient();
      const result = await client.send(command);
      if (!result.Item) return null;

      const entity = unmarshall(result.Item);
      return await this.resolveEntityReferences(entity);
    } catch (error) {
      console.error('Error getting entity:', error);
      throw error;
    }
  }

  // Resolve entity references (denormalize for display)
  async resolveEntityReferences(entity) {
    const resolved = { ...entity };

    // Resolve category
    if (entity.categoryId) {
      const categories = await this.getLookupItems(TABLES.CATEGORIES);
      const category = categories.find(c => c.id === entity.categoryId);
      resolved.category = category ? category.name : entity.categoryName;
    }

    // Resolve deployment model
    if (entity.deploymentModelId) {
      const deploymentModels = await this.getLookupItems(TABLES.DEPLOYMENT_MODELS);
      const model = deploymentModels.find(m => m.id === entity.deploymentModelId);
      resolved.deploymentModel = model ? model.name : entity.deploymentModelName;
    }

    // Resolve status
    if (entity.statusId) {
      const statuses = await this.getLookupItems(TABLES.STATUSES);
      const status = statuses.find(s => s.id === entity.statusId);
      resolved.status = status ? status.name : entity.statusName;
    }

    // Resolve vendor
    if (entity.vendorId) {
      const vendors = await this.getLookupItems(TABLES.VENDORS);
      const vendor = vendors.find(v => v.id === entity.vendorId);
      resolved.vendor = vendor ? vendor.vendorName : entity.vendor;
    }

    // Resolve tags
    if (entity.tagIds && Array.isArray(entity.tagIds)) {
      const tags = await this.getLookupItems(TABLES.TAGS);
      resolved.tags = entity.tagIds.map(tagId => {
        const tag = tags.find(t => t.id === tagId);
        return tag ? tag.name : tagId;
      });
    }

    return resolved;
  }

  // Get entities by type with resolved references
  async getEntitiesByType(entityType, filters = {}) {
    try {
      const command = new ScanCommand({
        TableName: TABLES.ENTITIES,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': { S: entityType }
        }
      });
      
      const client = await initializeClient();
      const result = await client.send(command);
      let entities = result.Items ? result.Items.map(item => unmarshall(item)) : [];
      
      // Apply additional filters
      if (filters.statusId) {
        entities = entities.filter(entity => entity.statusId === filters.statusId);
      }
      if (filters.categoryId) {
        entities = entities.filter(entity => entity.categoryId === filters.categoryId);
      }
      if (filters.vendorId) {
        entities = entities.filter(entity => entity.vendorId === filters.vendorId);
      }
      if (filters.projectId) {
        entities = entities.filter(entity => 
          entity.projectIds?.includes(filters.projectId) || 
          entity.projectId === filters.projectId
        );
      }
      
      // Resolve references for all entities
      const resolvedEntities = await Promise.all(
        entities.map(entity => this.resolveEntityReferences(entity))
      );
      
      return resolvedEntities;
    } catch (error) {
      console.error(`Error getting ${entityType}s:`, error);
      throw error;
    }
  }

  // Search entities with advanced filtering
  async searchEntities(entityType, searchTerm, filters = {}) {
    try {
      const command = new ScanCommand({
        TableName: TABLES.ENTITIES,
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': { S: entityType }
        }
      });
      
      const client = await initializeClient();
      const result = await client.send(command);
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
            entity.categoryName,
            entity.vendorName
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
      
      // Resolve references for filtered entities
      const resolvedEntities = await Promise.all(
        entities.map(entity => this.resolveEntityReferences(entity))
      );
      
      return resolvedEntities;
    } catch (error) {
      console.error(`Error searching ${entityType}s:`, error);
      throw error;
    }
  }

  // Delete entity
  async deleteEntity(id) {
    try {
      const command = new DeleteItemCommand({
        TableName: TABLES.ENTITIES,
        Key: marshall({ id })
      });
      
      const client = await initializeClient();
      await client.send(command);
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
        'third_party_app',
        { projectId }
      );
      
      // Get related co-travelers
      const relatedCoTravelers = await this.getEntitiesByType(
        'co_traveler',
        { projectId }
      );
      
      // Get related applications
      const relatedApplications = await this.getEntitiesByType(
        'application',
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

  // Get statistics
  async getStatistics() {
    try {
      const command = new ScanCommand({
        TableName: TABLES.ENTITIES
      });
      
      const client = await initializeClient();
      const result = await client.send(command);
      const entities = result.Items ? result.Items.map(item => unmarshall(item)) : [];
      
      const stats = entities.reduce((acc, entity) => {
        const type = entity.entityType;
        if (!acc[type]) {
          acc[type] = { total: 0, active: 0, inactive: 0 };
        }
        acc[type].total++;
        if (entity.statusId === 'active') {
          acc[type].active++;
        } else if (entity.statusId === 'inactive') {
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
}

export { NormalizedDataService };
export default new NormalizedDataService();
