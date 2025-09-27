import AWS from 'aws-sdk';

const companyAPI = {
  // DynamoDB configuration
  dynamodb: new AWS.DynamoDB.DocumentClient({
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
  }),

  tableName: process.env.REACT_APP_DYNAMODB_TABLE || 'eams-dev-data',

  // Create a new company
  async createCompany(companyData) {
    try {
      const companyId = `COMPANY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const company = {
        PK: `COMPANY#${companyId}`,
        SK: 'PROFILE',
        GSI1PK: 'COMPANIES',
        GSI1SK: companyData.CompanyName,
        CompanyID: companyId,
        CompanyName: companyData.CompanyName,
        State: companyData.State,
        Address: companyData.Address,
        ProjectManager: companyData.ProjectManager,
        ExecutiveSponsor: companyData.ExecutiveSponsor,
        IntegrationSettings: companyData.IntegrationSettings || {
          teams: { enabled: false },
          confluence: { enabled: false }
        },
        CompanyLogo: companyData.CompanyLogo,
        CompanyDistribution: companyData.CompanyDistribution,
        ProjectLocation: companyData.ProjectLocation,
        Projects: [],
        ServiceNowProjectCode: companyData.ServiceNowProjectCode,
        SageProjectCode: companyData.SageProjectCode,
        Notes: companyData.Notes,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
        CreatedBy: companyData.CreatedBy || 'system',
        Status: 'active',
        CompanyFiles: [],
        EntityType: 'COMPANY'
      };

      await this.dynamodb.put({
        TableName: this.tableName,
        Item: company
      }).promise();

      return { success: true, company };
    } catch (error) {
      console.error('Error creating company:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all companies
  async getCompanies() {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'COMPANIES'
        }
      }).promise();

      return result.Items || [];
    } catch (error) {
      console.error('Error getting companies:', error);
      throw error;
    }
  },

  // Get company by ID
  async getCompany(companyId) {
    try {
      const result = await this.dynamodb.get({
        TableName: this.tableName,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: 'PROFILE'
        }
      }).promise();

      return result.Item;
    } catch (error) {
      console.error('Error getting company:', error);
      throw error;
    }
  },

  // Update company
  async updateCompany(companyId, updates) {
    try {
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      // Build update expression dynamically
      Object.keys(updates).forEach((key, index) => {
        if (updates[key] !== undefined) {
          updateExpression.push(`#${key} = :val${index}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:val${index}`] = updates[key];
        }
      });

      updateExpression.push('#UpdatedAt = :updatedAt');
      expressionAttributeNames['#UpdatedAt'] = 'UpdatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      await this.dynamodb.update({
        TableName: this.tableName,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: 'PROFILE'
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }).promise();

      return { success: true };
    } catch (error) {
      console.error('Error updating company:', error);
      return { success: false, error: error.message };
    }
  },

  // Add project to company
  async addProjectToCompany(companyId, projectId, projectData) {
    try {
      // Add project reference to company
      await this.dynamodb.update({
        TableName: this.tableName,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: 'PROFILE'
        },
        UpdateExpression: 'ADD Projects :projectId SET UpdatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':projectId': this.dynamodb.createSet([projectId]),
          ':updatedAt': new Date().toISOString()
        }
      }).promise();

      // Create project record
      const project = {
        PK: `COMPANY#${companyId}`,
        SK: `PROJECT#${projectId}`,
        GSI1PK: 'PROJECTS',
        GSI1SK: projectData.ProjectName,
        ProjectID: projectId,
        ProjectName: projectData.ProjectName,
        ProjectDescription: projectData.ProjectDescription,
        Status: projectData.Status || 'planning',
        StartDate: projectData.StartDate,
        EndDate: projectData.EndDate,
        Location: projectData.Location,
        CreatedAt: new Date().toISOString(),
        LastUpdated: new Date().toISOString(),
        EntityType: 'COMPANY_PROJECT'
      };

      await this.dynamodb.put({
        TableName: this.tableName,
        Item: project
      }).promise();

      return { success: true };
    } catch (error) {
      console.error('Error adding project to company:', error);
      return { success: false, error: error.message };
    }
  },

  // Get company projects
  async getCompanyProjects(companyId) {
    try {
      const result = await this.dynamodb.query({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `COMPANY#${companyId}`,
          ':sk': 'PROJECT#'
        }
      }).promise();

      return result.Items || [];
    } catch (error) {
      console.error('Error getting company projects:', error);
      throw error;
    }
  },

  // Upload company file
  async uploadCompanyFile(companyId, file, fileType, description) {
    try {
      const fileId = `FILE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileName = file.name;
      const fileSize = file.size;
      
      // Upload to S3 (this would be handled by the file upload service)
      const fileUrl = `https://eams-dev-storage-${process.env.REACT_APP_AWS_ACCOUNT_ID}.s3.amazonaws.com/companies/${companyId}/files/${fileId}/${fileName}`;
      
      const companyFile = {
        FileID: fileId,
        FileName: fileName,
        FileType: fileType,
        FileSize: fileSize,
        FileUrl: fileUrl,
        UploadedAt: new Date().toISOString(),
        UploadedBy: 'current-user', // This should come from auth context
        Description: description,
        Version: '1.0'
      };

      // Add file to company
      await this.dynamodb.update({
        TableName: this.tableName,
        Key: {
          PK: `COMPANY#${companyId}`,
          SK: 'PROFILE'
        },
        UpdateExpression: 'SET CompanyFiles = list_append(if_not_exists(CompanyFiles, :empty_list), :file)',
        ExpressionAttributeValues: {
          ':empty_list': [],
          ':file': [companyFile]
        }
      }).promise();

      return { success: true, file: companyFile };
    } catch (error) {
      console.error('Error uploading company file:', error);
      return { success: false, error: error.message };
    }
  },

  // Get company statistics
  async getCompanyStats(companyId) {
    try {
      const company = await this.getCompany(companyId);
      const projects = await this.getCompanyProjects(companyId);
      
      const activeProjects = projects.filter(p => p.Status === 'active').length;
      const completedProjects = projects.filter(p => p.Status === 'completed').length;
      
      // Get total applications across all projects
      let totalApplications = 0;
      for (const project of projects) {
        // This would query applications for each project
        // For now, we'll use a placeholder
        totalApplications += 0; // This should be calculated from actual application data
      }

      const stats = {
        totalProjects: projects.length,
        activeProjects,
        completedProjects,
        totalApplications,
        totalFiles: company.CompanyFiles?.length || 0,
        storageUsed: company.CompanyFiles?.reduce((total, file) => total + file.FileSize, 0) || 0,
        lastActivity: company.UpdatedAt
      };

      return stats;
    } catch (error) {
      console.error('Error getting company stats:', error);
      throw error;
    }
  },

  // Search companies
  async searchCompanies(query) {
    try {
      const result = await this.dynamodb.scan({
        TableName: this.tableName,
        FilterExpression: 'contains(CompanyName, :query) OR contains(State, :query)',
        ExpressionAttributeValues: {
          ':query': query
        }
      }).promise();

      return result.Items || [];
    } catch (error) {
      console.error('Error searching companies:', error);
      throw error;
    }
  },

  // Archive company
  async archiveCompany(companyId) {
    try {
      await this.updateCompany(companyId, { Status: 'archived' });
      return { success: true };
    } catch (error) {
      console.error('Error archiving company:', error);
      return { success: false, error: error.message };
    }
  }
};

export default companyAPI;
