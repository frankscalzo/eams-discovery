// SSM Configuration Service - All configuration from SSM Parameter Store
import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

class SSMConfigService {
  constructor() {
    // Initialize SSM client without credentials - will use default credential chain
    this.ssmClient = new SSMClient({ 
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
      // Credentials will be resolved from default credential chain (IAM roles, etc.)
    });
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get a single parameter from SSM
  async getParameter(parameterName, withDecryption = false) {
    const cacheKey = `param_${parameterName}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: withDecryption
      });
      
      const response = await this.ssmClient.send(command);
      const value = response.Parameter.Value;
      
      this.setCache(cacheKey, value);
      return value;
    } catch (error) {
      console.error(`Error fetching parameter ${parameterName}:`, error);
      return null;
    }
  }

  // Get all parameters by path
  async getParametersByPath(path, withDecryption = false) {
    const cacheKey = `path_${path}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const command = new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: withDecryption
      });
      
      const response = await this.ssmClient.send(command);
      const parameters = {};
      
      response.Parameters.forEach(param => {
        const key = param.Name.split('/').pop();
        parameters[key] = param.Value;
      });
      
      this.setCache(cacheKey, parameters);
      return parameters;
    } catch (error) {
      console.error(`Error fetching parameters from path ${path}:`, error);
      return {};
    }
  }

  // Get AWS credentials from SSM
  async getAWSCredentials() {
    try {
      const [accessKeyId, secretAccessKey, sessionToken] = await Promise.all([
        this.getParameter('/eams/dev/aws/access-key-id', true),
        this.getParameter('/eams/dev/aws/secret-access-key', true),
        this.getParameter('/eams/dev/aws/session-token', true)
      ]);

      if (accessKeyId && secretAccessKey) {
        return {
          accessKeyId,
          secretAccessKey,
          sessionToken: sessionToken || undefined
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching AWS credentials from SSM:', error);
      return null;
    }
  }

  // Get all configuration from SSM
  async getConfig() {
    const cacheKey = 'full_config';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const [credentials, configParams] = await Promise.all([
        this.getAWSCredentials(),
        this.getParametersByPath('/eams/dev/config')
      ]);

      const config = {
        // AWS Credentials
        credentials,
        
        // AWS Configuration
        region: configParams.region || 'us-east-1',
        accountId: configParams['account-id'] || '904233104383',
        
        // Cognito Configuration
        userPoolId: configParams['user-pool-id'],
        userPoolClientId: configParams['user-pool-client-id'],
        identityPoolId: configParams['identity-pool-id'],
        
        // DynamoDB Tables
        dynamoDB: {
          usersTable: configParams['usersTable'],
          companiesTable: configParams['companiesTable'],
          projectsTable: configParams['projectsTable'],
          applicationsTable: configParams['applicationsTable']
        },
        
        // S3 Configuration
        s3: {
          fileBucket: configParams['s3-file-bucket']
        },
        
        // Environment
        environment: 'dev',
        stage: 'dev',
        projectName: 'eams',
        serviceName: 'discovery'
      };

      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error('Error fetching full configuration from SSM:', error);
      return this.getFallbackConfig();
    }
  }

  // Fallback configuration if SSM fails - NO CREDENTIALS, use default credential chain
  getFallbackConfig() {
    return {
      // No credentials - will use default AWS credential chain (IAM roles, etc.)
      credentials: null,
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      accountId: process.env.REACT_APP_AWS_ACCOUNT_ID || '904233104383',
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_CevZu4sdm',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'qevb9qr68ddbm2tr7grmlgtus',
      identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID || 'us-east-1:213c093b-a282-4c8a-9579-4498b5261471',
      dynamoDB: {
        usersTable: process.env.REACT_APP_DYNAMODB_USERS_TABLE || 'eams-users',
        companiesTable: process.env.REACT_APP_DYNAMODB_COMPANIES_TABLE || 'eams-companies',
        projectsTable: process.env.REACT_APP_DYNAMODB_PROJECTS_TABLE || 'eams-projects',
        applicationsTable: process.env.REACT_APP_DYNAMODB_APPLICATIONS_TABLE || 'eams-applications'
      },
      s3: {
        fileBucket: process.env.REACT_APP_S3_FILE_BUCKET || 'eams-dev-storage-904233104383'
      },
      environment: 'dev',
      stage: 'dev',
      projectName: 'eams',
      serviceName: 'discovery'
    };
  }

  // Cache management
  isCacheValid(key) {
    const expiry = this.cacheExpiry.get(key);
    return expiry && Date.now() < expiry;
  }

  setCache(key, value) {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.cacheTimeout);
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Initialize configuration
  async initialize() {
    try {
      const config = await this.getConfig();
      return {
        ...config,
        isInitialized: true
      };
    } catch (error) {
      console.error('Error initializing SSM configuration:', error);
      return {
        ...this.getFallbackConfig(),
        isInitialized: false
      };
    }
  }
}

// Export singleton instance
export default new SSMConfigService();
