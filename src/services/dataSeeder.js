import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoConfig } from './awsConfig';

// Initialize AWS clients with SSM configuration
let dynamoClient = null;
let docClient = null;

const initializeClient = async () => {
  if (!dynamoClient) {
    const config = getDynamoConfig();
    if (config) {
      dynamoClient = new DynamoDBClient(config);
      docClient = DynamoDBDocumentClient.from(dynamoClient);
    }
  }
  return { dynamoClient, docClient };
};

const TABLE_NAME = process.env.REACT_APP_DYNAMODB_TABLE || 'eams-dev-projects';

class DataSeeder {
  // Seed initial data for the dashboard
  async seedInitialData() {
    try {
      console.log('Seeding initial data...');
      
      // Seed sample companies
      await this.seedCompanies();
      
      // Seed sample projects
      await this.seedProjects();
      
      // Seed sample applications
      await this.seedApplications();
      
      // Seed sample activities
      await this.seedActivities();
      
      console.log('Initial data seeded successfully');
      return true;
    } catch (error) {
      console.error('Error seeding data:', error);
      return false;
    }
  }

  async seedCompanies() {
    const companies = [
      {
        PK: 'COMPANY#company-1',
        SK: 'DETAILS',
        name: 'Optimum Cloud Services',
        description: 'Primary cloud services company',
        type: 'primary',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: 'COMPANY#company-2',
        SK: 'DETAILS',
        name: 'Beta Corp',
        description: 'Secondary company for testing',
        type: 'secondary',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: 'COMPANY#company-3',
        SK: 'DETAILS',
        name: 'Gamma Industries',
        description: 'Manufacturing company',
        type: 'client',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const company of companies) {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: company
      }));
    }
  }

  async seedProjects() {
    const projects = [
      {
        PK: 'PROJECT#project-1',
        SK: 'DETAILS',
        name: 'EAMS Implementation',
        description: 'Enterprise Architecture Management System implementation',
        status: 'active',
        priority: 'high',
        budget: 150000,
        companyId: 'company-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: 'PROJECT#project-2',
        SK: 'DETAILS',
        name: 'Data Migration',
        description: 'Legacy system data migration to cloud',
        status: 'planning',
        priority: 'medium',
        budget: 80000,
        companyId: 'company-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: 'PROJECT#project-3',
        SK: 'DETAILS',
        name: 'Security Enhancement',
        description: 'Implement advanced security measures',
        status: 'completed',
        priority: 'critical',
        budget: 50000,
        companyId: 'company-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const project of projects) {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: project
      }));
    }
  }

  async seedApplications() {
    const applications = [
      {
        PK: 'APPLICATION#app-1',
        SK: 'DETAILS',
        name: 'User Management App',
        description: 'Application for managing users and permissions',
        type: 'web',
        status: 'active',
        projectId: 'project-1',
        companyId: 'company-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: 'APPLICATION#app-2',
        SK: 'DETAILS',
        name: 'Project Dashboard',
        description: 'Dashboard for project management',
        type: 'web',
        status: 'active',
        projectId: 'project-1',
        companyId: 'company-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: 'APPLICATION#app-3',
        SK: 'DETAILS',
        name: 'Data Processing Service',
        description: 'Backend service for data processing',
        type: 'api',
        status: 'active',
        projectId: 'project-2',
        companyId: 'company-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const application of applications) {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: application
      }));
    }
  }

  async seedActivities() {
    const activities = [
      {
        PK: 'ACTIVITY#activity-1',
        SK: new Date().toISOString(),
        type: 'user_created',
        message: 'New user John Doe created',
        userId: 'user-1',
        companyId: 'company-1',
        timestamp: new Date().toISOString()
      },
      {
        PK: 'ACTIVITY#activity-2',
        SK: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        type: 'project_updated',
        message: 'Project EAMS Implementation updated',
        projectId: 'project-1',
        companyId: 'company-1',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        PK: 'ACTIVITY#activity-3',
        SK: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        type: 'company_added',
        message: 'New company Beta Corp added',
        companyId: 'company-2',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      },
      {
        PK: 'ACTIVITY#activity-4',
        SK: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        type: 'application_created',
        message: 'New application User Management App created',
        applicationId: 'app-1',
        projectId: 'project-1',
        companyId: 'company-1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const activity of activities) {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: activity
      }));
    }
  }

  // Check if data already exists
  async hasData() {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        Limit: 1
      });

      const response = await docClient.send(command);
      return response.Items && response.Items.length > 0;
    } catch (error) {
      console.error('Error checking for existing data:', error);
      return false;
    }
  }
}

export default new DataSeeder();
