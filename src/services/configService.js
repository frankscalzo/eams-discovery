import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class ConfigService {
  constructor() {
    this.ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get configuration from Parameter Store
  async getConfig() {
    const cacheKey = 'config';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const parameterName = process.env.PARAMETER_STORE_PREFIX || '/eams/dev/config';
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true
      });
      
      const response = await this.ssmClient.send(command);
      const config = JSON.parse(response.Parameter.Value);
      
      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error('Error fetching config from Parameter Store:', error);
      // Fallback to environment variables
      return this.getConfigFromEnv();
    }
  }

  // Get feature flags from Parameter Store
  async getFeatureFlags() {
    const cacheKey = 'featureFlags';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const parameterName = process.env.PARAMETER_STORE_PREFIX || '/eams/dev/feature-flags';
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true
      });
      
      const response = await this.ssmClient.send(command);
      const featureFlags = JSON.parse(response.Parameter.Value);
      
      this.setCache(cacheKey, featureFlags);
      return featureFlags;
    } catch (error) {
      console.error('Error fetching feature flags from Parameter Store:', error);
      // Fallback to environment variables
      return this.getFeatureFlagsFromEnv();
    }
  }

  // Get secrets from Secrets Manager
  async getSecret(secretName) {
    const cacheKey = `secret_${secretName}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const fullSecretName = process.env.SECRETS_MANAGER_PREFIX 
        ? `${process.env.SECRETS_MANAGER_PREFIX}/${secretName}`
        : `/eams/dev/${secretName}`;
        
      const command = new GetSecretValueCommand({
        SecretId: fullSecretName
      });
      
      const response = await this.secretsClient.send(command);
      const secret = JSON.parse(response.SecretString);
      
      this.setCache(cacheKey, secret);
      return secret;
    } catch (error) {
      console.error(`Error fetching secret ${secretName} from Secrets Manager:`, error);
      return null;
    }
  }

  // Get all parameters by path
  async getParametersByPath(path) {
    const cacheKey = `path_${path}`;
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const command = new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: true
      });
      
      const response = await this.ssmClient.send(command);
      const parameters = {};
      
      response.Parameters.forEach(param => {
        const key = param.Name.split('/').pop();
        try {
          parameters[key] = JSON.parse(param.Value);
        } catch {
          parameters[key] = param.Value;
        }
      });
      
      this.setCache(cacheKey, parameters);
      return parameters;
    } catch (error) {
      console.error(`Error fetching parameters from path ${path}:`, error);
      return {};
    }
  }

  // Fallback to environment variables
  getConfigFromEnv() {
    return {
      environment: process.env.ENVIRONMENT || 'dev',
      stage: process.env.STAGE || 'dev',
      projectName: process.env.PROJECT_NAME || 'eams',
      serviceName: process.env.SERVICE_NAME || 'discovery',
      domainName: process.env.DOMAIN_NAME || 'optimumcloudservices.com',
      customDomain: process.env.CUSTOM_DOMAIN || 'dev-discovery.optimumcloudservices.com',
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      awsAccountId: process.env.AWS_ACCOUNT_ID || '904233104383',
      stackName: process.env.STACK_NAME || 'dev-eams',
      cloudFrontDistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      s3BucketName: process.env.S3_BUCKET_NAME,
      dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME,
      userPoolId: process.env.USER_POOL_ID,
      userPoolClientId: process.env.USER_POOL_CLIENT_ID,
      identityPoolId: process.env.IDENTITY_POOL_ID,
      apiGatewayUrl: process.env.API_GATEWAY_URL,
      costMonitoringFunction: process.env.COST_MONITORING_FUNCTION,
      aiProcessingFunction: process.env.AI_PROCESSING_FUNCTION,
      aiProcessingBucket: process.env.AI_PROCESSING_BUCKET
    };
  }

  // Fallback feature flags from environment variables
  getFeatureFlagsFromEnv() {
    return {
      enableAIProcessing: process.env.ENABLE_AI_PROCESSING === 'true',
      enableCostMonitoring: process.env.ENABLE_COST_MONITORING === 'true',
      enableBulkUpload: process.env.ENABLE_BULK_UPLOAD === 'true',
      enableExcelImport: process.env.ENABLE_EXCEL_IMPORT === 'true',
      enableDependencyMapping: process.env.ENABLE_DEPENDENCY_MAPPING === 'true',
      enableImpactAnalysis: process.env.ENABLE_IMPACT_ANALYSIS === 'true',
      enableReporting: process.env.ENABLE_REPORTING === 'true',
      enableMultiProject: process.env.ENABLE_MULTI_PROJECT === 'true',
      enableCustomDomain: process.env.ENABLE_CUSTOM_DOMAIN === 'true',
      enableCloudFront: process.env.ENABLE_CLOUDFRONT === 'true',
      enableS3Hosting: process.env.ENABLE_S3_HOSTING === 'true',
      enableDynamoDB: process.env.ENABLE_DYNAMODB === 'true',
      enableCognito: process.env.ENABLE_COGNITO === 'true',
      enableAPIGateway: process.env.ENABLE_API_GATEWAY === 'true',
      enableLambda: process.env.ENABLE_LAMBDA === 'true'
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
      const [config, featureFlags] = await Promise.all([
        this.getConfig(),
        this.getFeatureFlags()
      ]);

      return {
        config,
        featureFlags,
        isInitialized: true
      };
    } catch (error) {
      console.error('Error initializing configuration:', error);
      return {
        config: this.getConfigFromEnv(),
        featureFlags: this.getFeatureFlagsFromEnv(),
        isInitialized: false
      };
    }
  }
}

// Export singleton instance
export default new ConfigService();
