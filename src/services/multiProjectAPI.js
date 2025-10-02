import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  QueryCommand, 
  ScanCommand, 
  DeleteItemCommand, 
  UpdateItemCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { 
  TextractClient, 
  AnalyzeDocumentCommand 
} from '@aws-sdk/client-textract';
import { 
  ComprehendClient, 
  ClassifyDocumentCommand,
  DetectEntitiesCommand 
} from '@aws-sdk/client-comprehend';
import { 
  BedrockRuntimeClient, 
  InvokeModelCommand 
} from '@aws-sdk/client-bedrock-runtime';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Load config from public/config.json
let config = null;
const loadConfig = async () => {
  try {
    const response = await fetch('/config.json');
    config = await response.json();
  } catch (error) {
    console.error('Error loading config:', error);
    config = {
      awsRegion: 'us-east-1',
      projectManagementTableName: 'eams-dev-projects',
      websiteBucketName: 'eams-dev-discovery-904233104383'
    };
  }
};

// Initialize config
loadConfig();

// AWS SDK clients - will be initialized after config loads
let dynamoClient, s3Client, textractClient, comprehendClient, bedrockClient;

const initializeClients = () => {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({ 
      region: config?.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: 'demo-key',
        secretAccessKey: 'demo-secret'
      }
    });
    s3Client = new S3Client({ 
      region: config?.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: 'demo-key',
        secretAccessKey: 'demo-secret'
      }
    });
    textractClient = new TextractClient({ 
      region: config?.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: 'demo-key',
        secretAccessKey: 'demo-secret'
      }
    });
    comprehendClient = new ComprehendClient({ 
      region: config?.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: 'demo-key',
        secretAccessKey: 'demo-secret'
      }
    });
    bedrockClient = new BedrockRuntimeClient({ 
      region: config?.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: 'demo-key',
        secretAccessKey: 'demo-secret'
      }
    });
  }
};

// Helper functions for DynamoDB operations
const marshallItem = (item) => {
  if (!item) return null;
  
  const result = {};
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string') result[key] = { S: value };
    else if (typeof value === 'number') result[key] = { N: value.toString() };
    else if (typeof value === 'boolean') result[key] = { BOOL: value };
    else if (Array.isArray(value)) result[key] = { L: value.map(marshallItem) };
    else if (typeof value === 'object' && value !== null) result[key] = { M: marshallItem(value) };
    else result[key] = { S: String(value) };
  }
  return result;
};

const unmarshallItem = (item) => {
  if (!item) return null;
  
  const result = {};
  for (const [key, value] of Object.entries(item)) {
    if (value.S) result[key] = value.S;
    else if (value.N) result[key] = Number(value.N);
    else if (value.BOOL !== undefined) result[key] = value.BOOL;
    else if (value.L) result[key] = value.L.map(unmarshallItem);
    else if (value.M) result[key] = unmarshallItem(value.M);
    else if (value.SS) result[key] = value.SS;
    else if (value.NS) result[key] = value.NS.map(Number);
    else result[key] = value;
  }
  return result;
};

// Project Management API
export const projectAPI = {
  // Create a new project
  async createProject(projectData) {
    const projectId = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item = {
      PK: `PROJ#${projectId}#META`,
      SK: 'META#PROJECT',
      GSI1PK: 'PROJECT#ACTIVE',
      GSI1SK: new Date().toISOString(),
      GSI2PK: `PROJ#${projectId}#META`,
      GSI2SK: 'META#PROJECT',
      EntityType: 'PROJECT',
      ProjectID: projectId,
      ProjectName: projectData.name,
      Description: projectData.description,
      Status: 'ACTIVE',
      AdminUsers: projectData.adminUsers || [],
      ProjectUsers: projectData.projectUsers || [],
      Budget: projectData.budget || 1000,
      CreatedBy: projectData.createdBy,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };

    try {
      await dynamoClient.send(new PutItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Item: marshallItem(item)
      }));
      return item;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  },

  // Get project by ID
  async getProject(projectId) {
    try {
      const result = await dynamoClient.send(new GetItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Key: {
          PK: { S: `PROJ#${projectId}#META` },
          SK: { S: 'META#PROJECT' }
        }
      }));
      return unmarshallItem(result.Item);
    } catch (error) {
      console.error('Error getting project:', error);
      throw new Error('Failed to get project');
    }
  },

  // Get all projects for a user
  async getUserProjects(userId) {
    try {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: `USER#${userId}#PROJ#` }
        }
      }));
      return result.Items.map(unmarshallItem);
    } catch (error) {
      console.error('Error getting user projects:', error);
      throw new Error('Failed to get user projects');
    }
  },

  // Update project
  async updateProject(projectId, updates) {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const nameKey = `#attr${index}`;
      const valueKey = `:val${index}`;
      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = { S: String(value) };
    });

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'UpdatedAt';
    expressionAttributeValues[':updatedAt'] = { S: new Date().toISOString() };

    try {
      await dynamoClient.send(new UpdateItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Key: {
          PK: { S: `PROJ#${projectId}#META` },
          SK: { S: 'META#PROJECT' }
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  }
};

// Application Management API
export const applicationAPI = {
  // Create or update an application
  async saveApplication(projectId, application) {
    const applicationId = application.id || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item = {
      PK: `PROJ#${projectId}#APP`,
      SK: `APP#${applicationId}#${new Date().toISOString()}`,
      GSI1PK: 'APPLICATION#ACTIVE',
      GSI1SK: new Date().toISOString(),
      GSI2PK: `PROJ#${projectId}#APPLICATION#ACTIVE`,
      GSI2SK: new Date().toISOString(),
      EntityType: 'APPLICATION',
      ProjectID: projectId,
      ApplicationID: applicationId,
      ApplicationName: application.applicationName,
      Teams: application.teams || [],
      Owner: application.owner,
      Manager: application.manager,
      EpicSLG: application.epicSLG,
      TestPlanReady: application.testPlanReady || false,
      TestingStatus: application.testingStatus,
      Confidence: application.confidence,
      TestingNotes: application.testingNotes,
      ApplicationDescription: application.applicationDescription,
      IntegrationType: application.integrationType,
      IntegrationDetails: application.integrationDetails,
      ROI: application.roi,
      RTO: application.rto,
      RPO: application.rpo,
      Dependencies: application.dependencies || [],
      LeanIXData: application.leanIXData || {},
      CreatedAt: application.createdAt || new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };

    try {
      await dynamoClient.send(new PutItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Item: marshallItem(item)
      }));
      return item;
    } catch (error) {
      console.error('Error saving application:', error);
      throw new Error('Failed to save application');
    }
  },

  // Get application by ID
  async getApplication(projectId, applicationId) {
    try {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: `PROJ#${projectId}#APP` },
          ':sk': { S: `APP#${applicationId}#` }
        },
        ScanIndexForward: false,
        Limit: 1
      }));
      return result.Items.length > 0 ? unmarshallItem(result.Items[0]) : null;
    } catch (error) {
      console.error('Error getting application:', error);
      throw new Error('Failed to get application');
    }
  },

  // Get all applications for a project
  async getProjectApplications(projectId) {
    try {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: `PROJ#${projectId}#APP` }
        },
        ScanIndexForward: false
      }));
      return result.Items.map(unmarshallItem);
    } catch (error) {
      console.error('Error getting project applications:', error);
      throw new Error('Failed to get project applications');
    }
  },

  // Search applications
  async searchApplications(projectId, searchTerm) {
    try {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk',
        FilterExpression: 'contains(ApplicationName, :search)',
        ExpressionAttributeValues: {
          ':gsi2pk': { S: `PROJ#${projectId}#APPLICATION#ACTIVE` },
          ':search': { S: searchTerm }
        }
      }));
      return result.Items.map(unmarshallItem);
    } catch (error) {
      console.error('Error searching applications:', error);
      throw new Error('Failed to search applications');
    }
  },

  // Delete application
  async deleteApplication(projectId, applicationId) {
    try {
      // Get all versions of the application
      const result = await dynamoClient.send(new QueryCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: `PROJ#${projectId}#APP` },
          ':sk': { S: `APP#${applicationId}#` }
        }
      }));

      // Delete all versions
      const deletePromises = result.Items.map(item => 
        dynamoClient.send(new DeleteItemCommand({
          TableName: config?.dynamoDbTableName || 'app-management',
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }))
      );

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw new Error('Failed to delete application');
    }
  }
};

// AI Processing API
export const aiAPI = {
  // Process Excel/CSV file with AI
  async processFile(file, projectId) {
    try {
      // Upload file to S3
      const fileKey = `uploads/${projectId}/${Date.now()}-${file.name}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.REACT_APP_AI_BUCKET,
        Key: fileKey,
        Body: file,
        ContentType: file.type
      }));

      // Process with Textract
      const textractResult = await textractClient.send(new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: process.env.REACT_APP_AI_BUCKET,
            Name: fileKey
          }
        },
        FeatureTypes: ['TABLES', 'FORMS']
      }));

      // Extract structured data
      const extractedData = this.extractStructuredData(textractResult);
      
      // Use AI to detect field mappings
      const fieldMapping = await this.detectFieldMapping(extractedData);
      
      // Use AI to validate and clean data
      const cleanedData = await this.validateAndCleanData(extractedData, fieldMapping);

      return {
        rawData: extractedData,
        fieldMapping,
        cleanedData,
        fileKey
      };
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error('Failed to process file');
    }
  },

  // Extract structured data from Textract result
  extractStructuredData(textractResult) {
    const data = [];
    const blocks = textractResult.Blocks || [];
    
    // Find table blocks
    const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
    
    tableBlocks.forEach(table => {
      const tableData = this.extractTableData(table, blocks);
      data.push(...tableData);
    });

    return data;
  },

  // Extract table data
  extractTableData(table, blocks) {
    const rows = [];
    const cells = table.Children.map(cellId => 
      blocks.find(block => block.Id === cellId)
    );

    // Group cells by row
    const rowMap = new Map();
    cells.forEach(cell => {
      if (cell.RowIndex !== undefined) {
        if (!rowMap.has(cell.RowIndex)) {
          rowMap.set(cell.RowIndex, []);
        }
        rowMap.get(cell.RowIndex).push(cell);
      }
    });

    // Convert to array of objects
    const headers = rowMap.get(0) || [];
    for (let i = 1; i < rowMap.size; i++) {
      const row = rowMap.get(i) || [];
      const rowData = {};
      
      headers.forEach((header, index) => {
        const cell = row.find(c => c.ColumnIndex === header.ColumnIndex);
        const headerText = this.getCellText(header, blocks);
        const cellText = cell ? this.getCellText(cell, blocks) : '';
        rowData[headerText] = cellText;
      });
      
      rows.push(rowData);
    }

    return rows;
  },

  // Get text from cell
  getCellText(cell, blocks) {
    if (!cell.Children) return '';
    
    return cell.Children.map(wordId => {
      const word = blocks.find(block => block.Id === wordId);
      return word ? word.Text : '';
    }).join(' ');
  },

  // AI-powered field mapping detection
  async detectFieldMapping(data) {
    if (!data || data.length === 0) return {};

    const sample = data[0];
    const mapping = {};
    const fieldNames = Object.keys(sample);

    // Use Comprehend to analyze field names
    for (const fieldName of fieldNames) {
      try {
        const result = await comprehendClient.send(new DetectEntitiesCommand({
          Text: fieldName,
          LanguageCode: 'en'
        }));

        const entities = result.Entities || [];
        
        // Map based on detected entities
        if (entities.some(e => e.Type === 'PERSON' && e.Score > 0.8)) {
          if (fieldName.toLowerCase().includes('owner')) {
            mapping['Owner'] = fieldName;
          } else if (fieldName.toLowerCase().includes('manager')) {
            mapping['Manager'] = fieldName;
          }
        } else if (fieldName.toLowerCase().includes('application') || 
                   fieldName.toLowerCase().includes('app')) {
          mapping['ApplicationName'] = fieldName;
        } else if (fieldName.toLowerCase().includes('team')) {
          mapping['Teams'] = fieldName;
        } else if (fieldName.toLowerCase().includes('description')) {
          mapping['ApplicationDescription'] = fieldName;
        } else if (fieldName.toLowerCase().includes('critical')) {
          mapping['Criticality'] = fieldName;
        } else if (fieldName.toLowerCase().includes('vendor')) {
          mapping['Vendor'] = fieldName;
        }
      } catch (error) {
        console.warn(`Error analyzing field ${fieldName}:`, error);
      }
    }

    return mapping;
  },

  // Validate and clean data using AI
  async validateAndCleanData(data, mapping) {
    const cleanedData = [];

    for (const item of data) {
      const cleaned = {};
      
      Object.entries(mapping).forEach(([field, column]) => {
        const value = item[column];
        
        // Basic cleaning
        cleaned[field] = this.cleanValue(value, field);
      });

      // Use AI to validate critical fields
      if (cleaned.ApplicationName) {
        const validation = await this.validateApplicationName(cleaned.ApplicationName);
        if (!validation.isValid) {
          cleaned._validationErrors = cleaned._validationErrors || [];
          cleaned._validationErrors.push(`Invalid application name: ${validation.reason}`);
        }
      }

      cleanedData.push(cleaned);
    }

    return cleanedData;
  },

  // Clean value based on field type
  cleanValue(value, field) {
    if (!value) return '';

    let cleaned = String(value).trim();

    // Field-specific cleaning
    switch (field) {
      case 'Owner':
      case 'Manager':
        // Extract name parts
        const nameParts = cleaned.split(' ');
        if (nameParts.length >= 2) {
          return {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' '),
            fullName: cleaned
          };
        }
        return { fullName: cleaned };
      
      case 'Teams':
        return cleaned.split(',').map(t => t.trim()).filter(t => t);
      
      case 'Confidence':
        const confidence = parseInt(cleaned);
        return isNaN(confidence) ? 0 : Math.max(0, Math.min(100, confidence));
      
      case 'TestPlanReady':
        return cleaned.toLowerCase() === 'yes' || cleaned.toLowerCase() === 'true' || cleaned === '1';
      
      default:
        return cleaned;
    }
  },

  // Validate application name using AI
  async validateApplicationName(name) {
    try {
      const result = await comprehendClient.send(new ClassifyDocumentCommand({
        Text: name,
        EndpointArn: process.env.REACT_APP_COMPREHEND_ENDPOINT // You'll need to create this
      }));

      // Basic validation - check if it's a valid application name
      if (name.length < 3) {
        return { isValid: false, reason: 'Name too short' };
      }
      
      if (name.length > 100) {
        return { isValid: false, reason: 'Name too long' };
      }

      return { isValid: true };
    } catch (error) {
      console.warn('Error validating application name:', error);
      return { isValid: true }; // Default to valid if AI fails
    }
  },

  // Generate insights using Bedrock
  async generateInsights(projectId) {
    try {
      const applications = await applicationAPI.getProjectApplications(projectId);
      
      const prompt = `Analyze this project data and provide insights:
      
Project ID: ${projectId}
Applications: ${JSON.stringify(applications, null, 2)}

Please provide:
1. Risk assessment
2. Resource optimization suggestions
3. Compliance recommendations
4. Dependency analysis
5. Next steps

Format as JSON with the following structure:
{
  "riskAssessment": {...},
  "resourceOptimization": {...},
  "complianceRecommendations": {...},
  "dependencyAnalysis": {...},
  "nextSteps": [...]
}`;

      const result = await bedrockClient.send(new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: JSON.stringify({
          prompt,
          max_tokens: 2000,
          temperature: 0.7
        }),
        contentType: 'application/json'
      }));

      const response = JSON.parse(new TextDecoder().decode(result.body));
      return JSON.parse(response.completion);
    } catch (error) {
      console.error('Error generating insights:', error);
      throw new Error('Failed to generate insights');
    }
  }
};

// User Role Management API
export const userRoleAPI = {
  // Assign user to project
  async assignUserToProject(userId, projectId, role = 'USER') {
    const item = {
      PK: `USER#${userId}#PROJ#${projectId}`,
      SK: `ROLE#${role}`,
      GSI3PK: `USER#${userId}#PROJ#${projectId}`,
      GSI3SK: `ROLE#${role}`,
      EntityType: 'USER_ROLE',
      UserID: userId,
      ProjectID: projectId,
      Role: role,
      Permissions: this.getRolePermissions(role),
      AssignedAt: new Date().toISOString()
    };

    try {
      await dynamoClient.send(new PutItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Item: marshallItem(item)
      }));
      return item;
    } catch (error) {
      console.error('Error assigning user to project:', error);
      throw new Error('Failed to assign user to project');
    }
  },

  // Get user's role in project
  async getUserProjectRole(userId, projectId) {
    try {
      const result = await dynamoClient.send(new GetItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Key: {
          PK: { S: `USER#${userId}#PROJ#${projectId}` },
          SK: { S: 'ROLE#ADMIN' }
        }
      }));

      if (result.Item) {
        return unmarshallItem(result.Item);
      }

      // Check for USER role
      const userResult = await dynamoClient.send(new GetItemCommand({
        TableName: config?.dynamoDbTableName || 'app-management',
        Key: {
          PK: { S: `USER#${userId}#PROJ#${projectId}` },
          SK: { S: 'ROLE#USER' }
        }
      }));

      return userResult.Item ? unmarshallItem(userResult.Item) : null;
    } catch (error) {
      console.error('Error getting user project role:', error);
      throw new Error('Failed to get user project role');
    }
  },

  // Get role permissions
  getRolePermissions(role) {
    const permissions = {
      ADMIN: ['READ', 'WRITE', 'DELETE', 'MANAGE_USERS', 'MANAGE_PROJECT'],
      USER: ['READ', 'WRITE'],
      VIEWER: ['READ']
    };
    return permissions[role] || ['READ'];
  }
};

// Bulk Upload API
export const bulkUploadAPI = {
  // Process bulk upload
  async processBulkUpload(projectId, data, mapping) {
    const batchSize = 25; // DynamoDB batch write limit
    const batches = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const writeRequests = batch.map(item => ({
        PutRequest: {
          Item: marshallItem(applicationAPI.saveApplication(projectId, item))
        }
      }));
      
      batches.push({
        RequestItems: {
          [config?.dynamoDbTableName || 'app-management']: writeRequests
        }
      });
    }

    try {
      const results = await Promise.all(
        batches.map(batch => dynamoClient.send(new BatchWriteItemCommand(batch)))
      );
      
      return {
        success: true,
        processed: data.length,
        batches: batches.length
      };
    } catch (error) {
      console.error('Error processing bulk upload:', error);
      throw new Error('Failed to process bulk upload');
    }
  }
};

// Company API
export const companyAPI = {
  async getCompanies() {
    try {
      await loadConfig();
      initializeClients();
      
      const command = new ScanCommand({
        TableName: 'eams-dev-companies',
        FilterExpression: 'attribute_exists(CompanyID)'
      });
      
      const result = await dynamoClient.send(command);
      return result.Items?.map(item => unmarshallItem(item)) || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  async createCompany(companyData) {
    try {
      await loadConfig();
      initializeClients();
      
      const companyId = `comp-${Date.now()}`;
      const item = {
        CompanyID: companyId,
        ...companyData,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: 'eams-dev-companies',
        Item: marshallItem(item)
      });
      
      await dynamoClient.send(command);
      return { success: true, company: item };
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  async updateCompany(companyId, updates) {
    try {
      await loadConfig();
      initializeClients();
      
      const updateExpression = 'SET UpdatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':updatedAt': { S: new Date().toISOString() }
      };
      
      // Add dynamic updates
      Object.keys(updates).forEach((key, index) => {
        updateExpression += `, #${key} = :val${index}`;
        expressionAttributeValues[`:val${index}`] = { S: updates[key] };
      });
      
      const command = new UpdateItemCommand({
        TableName: 'eams-dev-companies',
        Key: { CompanyID: { S: companyId } },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: Object.keys(updates).reduce((acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        }, {}),
        ExpressionAttributeValues: expressionAttributeValues
      });
      
      await dynamoClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  },

  async deleteCompany(companyId) {
    try {
      await loadConfig();
      initializeClients();
      
      const command = new DeleteItemCommand({
        TableName: 'eams-dev-companies',
        Key: { CompanyID: { S: companyId } }
      });
      
      await dynamoClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }
};

// User API
export const userAPI = {
  async getUsers() {
    try {
      await loadConfig();
      initializeClients();
      
      const command = new ScanCommand({
        TableName: 'eams-dev-users',
        FilterExpression: 'attribute_exists(UserID)'
      });
      
      const result = await dynamoClient.send(command);
      return {
        success: true,
        users: result.Items?.map(item => unmarshallItem(item)) || [],
        total: result.Items?.length || 0
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message, users: [], total: 0 };
    }
  },

  async createUser(userData) {
    try {
      await loadConfig();
      initializeClients();
      
      const userId = `user-${Date.now()}`;
      const item = {
        UserID: userId,
        ...userData,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };
      
      const command = new PutItemCommand({
        TableName: 'eams-dev-users',
        Item: marshallItem(item)
      });
      
      await dynamoClient.send(command);
      return { success: true, user: item };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  },

  async updateUser(userId, updates) {
    try {
      await loadConfig();
      initializeClients();
      
      const updateExpression = 'SET UpdatedAt = :updatedAt';
      const expressionAttributeValues = {
        ':updatedAt': { S: new Date().toISOString() }
      };
      
      // Add dynamic updates
      Object.keys(updates).forEach((key, index) => {
        updateExpression += `, #${key} = :val${index}`;
        expressionAttributeValues[`:val${index}`] = { S: updates[key] };
      });
      
      const command = new UpdateItemCommand({
        TableName: 'eams-dev-users',
        Key: { UserID: { S: userId } },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: Object.keys(updates).reduce((acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        }, {}),
        ExpressionAttributeValues: expressionAttributeValues
      });
      
      await dynamoClient.send(command);
      return { success: true, user: { UserID: userId, ...updates } };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteUser(userId) {
    try {
      await loadConfig();
      initializeClients();
      
      const command = new DeleteItemCommand({
        TableName: 'eams-dev-users',
        Key: { UserID: { S: userId } }
      });
      
      await dynamoClient.send(command);
      return { success: true, user: { UserID: userId } };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export all APIs
export default {
  projectAPI: projectAPI,
  applicationAPI: applicationAPI,
  ai: aiAPI,
  userRoles: userRoleAPI,
  bulkUpload: bulkUploadAPI,
  companyAPI: companyAPI,
  userAPI: userAPI
};
