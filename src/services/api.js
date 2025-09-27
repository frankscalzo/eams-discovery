import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, ScanCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// AWS SDK clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REACT_APP_AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REACT_APP_AWS_REGION });
const s3Client = new S3Client({ region: process.env.REACT_APP_AWS_REGION });

// Helper function to convert DynamoDB item to regular object
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

// Helper function to convert regular object to DynamoDB item
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

// Application Management API
export const applicationAPI = {
  // Create or update an application
  async saveApplication(application) {
    const id = application.id || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item = {
      ...application,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: application.createdAt || new Date().toISOString()
    };

    try {
      await dynamoClient.send(new PutItemCommand({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        Item: marshallItem(item)
      }));
      return item;
    } catch (error) {
      console.error('Error saving application:', error);
      throw new Error('Failed to save application');
    }
  },

  // Get application by ID
  async getApplication(id) {
    try {
      const result = await dynamoClient.send(new GetItemCommand({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        Key: { id: { S: id } }
      }));
      return unmarshallItem(result.Item);
    } catch (error) {
      console.error('Error getting application:', error);
      throw new Error('Failed to get application');
    }
  },

  // Get all applications
  async getAllApplications() {
    try {
      const result = await dynamoClient.send(new ScanCommand({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE
      }));
      return result.Items.map(unmarshallItem);
    } catch (error) {
      console.error('Error getting applications:', error);
      throw new Error('Failed to get applications');
    }
  },

  // Search applications by name
  async searchApplications(searchTerm) {
    try {
      const result = await dynamoClient.send(new ScanCommand({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        FilterExpression: 'contains(applicationName, :search)',
        ExpressionAttributeValues: {
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
  async deleteApplication(id) {
    try {
      await dynamoClient.send(new DeleteItemCommand({
        TableName: process.env.REACT_APP_DYNAMODB_TABLE,
        Key: { id: { S: id } }
      }));
      return true;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw new Error('Failed to delete application');
    }
  }
};

// User Management API
export const userAPI = {
  // Create a new user in Cognito
  async createUser(userData) {
    try {
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: process.env.REACT_APP_USER_POOL_ID,
        Username: userData.email,
        UserAttributes: [
          { Name: 'email', Value: userData.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: userData.name },
          { Name: 'custom:role', Value: userData.role || 'user' }
        ],
        MessageAction: 'SUPPRESS'
      });

      const result = await cognitoClient.send(createUserCommand);
      
      // Set temporary password
      if (result.User) {
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: process.env.REACT_APP_USER_POOL_ID,
          Username: userData.email,
          Password: userData.temporaryPassword || 'TempPass123!',
          Permanent: false
        }));
      }

      return result.User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }
};

// File Management API
export const fileAPI = {
  // Upload file to S3
  async uploadFile(file, key) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: `uploads/${key}`,
        Body: file,
        ContentType: file.type,
        ACL: 'private'
      }));
      return `uploads/${key}`;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  },

  // Get file from S3
  async getFile(key) {
    try {
      const result = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key
      }));
      return result.Body;
    } catch (error) {
      console.error('Error getting file:', error);
      throw new Error('Failed to get file');
    }
  },

  // Delete file from S3
  async deleteFile(key) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key
      }));
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }
};

// Dependency Management API
export const dependencyAPI = {
  // Get application dependencies
  async getDependencies(applicationId) {
    try {
      const application = await applicationAPI.getApplication(applicationId);
      if (!application || !application.dependencies) return [];
      
      const dependencyIds = Array.isArray(application.dependencies) 
        ? application.dependencies 
        : [application.dependencies];
      
      const dependencies = [];
      for (const depId of dependencyIds) {
        try {
          const dep = await applicationAPI.getApplication(depId);
          if (dep) dependencies.push(dep);
        } catch (error) {
          console.warn(`Could not fetch dependency ${depId}:`, error);
        }
      }
      
      return dependencies;
    } catch (error) {
      console.error('Error getting dependencies:', error);
      throw new Error('Failed to get dependencies');
    }
  },

  // Add dependency to application
  async addDependency(applicationId, dependencyId) {
    try {
      const application = await applicationAPI.getApplication(applicationId);
      if (!application) throw new Error('Application not found');
      
      const dependencies = application.dependencies || [];
      if (!dependencies.includes(dependencyId)) {
        dependencies.push(dependencyId);
      }
      
      await applicationAPI.saveApplication({
        ...application,
        dependencies
      });
      
      return true;
    } catch (error) {
      console.error('Error adding dependency:', error);
      throw new Error('Failed to add dependency');
    }
  },

  // Remove dependency from application
  async removeDependency(applicationId, dependencyId) {
    try {
      const application = await applicationAPI.getApplication(applicationId);
      if (!application) throw new Error('Application not found');
      
      const dependencies = application.dependencies || [];
      const filteredDependencies = dependencies.filter(dep => dep !== dependencyId);
      
      await applicationAPI.saveApplication({
        ...application,
        dependencies: filteredDependencies
      });
      
      return true;
    } catch (error) {
      console.error('Error removing dependency:', error);
      throw new Error('Failed to remove dependency');
    }
  }
};

// Export all APIs
export default {
  applications: applicationAPI,
  users: userAPI,
  files: fileAPI,
  dependencies: dependencyAPI
};


