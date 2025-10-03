import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import ssmConfigService from './ssmConfigService';

// AWS Configuration for client-side - All values from SSM
let awsConfig = null;

// Initialize configuration from SSM
const initializeConfig = async () => {
  try {
    const config = await ssmConfigService.getConfig();
    
    // Create credentials provider
    const credentialsProvider = () => {
      if (config.credentials) {
        return Promise.resolve(config.credentials);
      }
      
      // Fallback to Cognito Identity Pool
      return fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: config.region }),
        identityPoolId: config.identityPoolId,
      })();
    };

    awsConfig = {
      region: config.region,
      credentials: credentialsProvider,
      // Export all configuration
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      identityPoolId: config.identityPoolId,
      accountId: config.accountId,
      dynamoDB: config.dynamoDB,
      s3: config.s3,
      environment: config.environment,
      stage: config.stage,
      projectName: config.projectName,
      serviceName: config.serviceName
    };

    return awsConfig;
  } catch (error) {
    console.error('Error initializing AWS configuration:', error);
    // Fallback to environment variables
    const fallbackConfig = ssmConfigService.getFallbackConfig();
    
    const credentialsProvider = () => {
      if (fallbackConfig.credentials) {
        return Promise.resolve(fallbackConfig.credentials);
      }
      
      return fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: fallbackConfig.region }),
        identityPoolId: fallbackConfig.identityPoolId,
      })();
    };

    awsConfig = {
      region: fallbackConfig.region,
      credentials: credentialsProvider,
      userPoolId: fallbackConfig.userPoolId,
      userPoolClientId: fallbackConfig.userPoolClientId,
      identityPoolId: fallbackConfig.identityPoolId,
      accountId: fallbackConfig.accountId,
      dynamoDB: fallbackConfig.dynamoDB,
      s3: fallbackConfig.s3,
      environment: fallbackConfig.environment,
      stage: fallbackConfig.stage,
      projectName: fallbackConfig.projectName,
      serviceName: fallbackConfig.serviceName
    };

    return awsConfig;
  }
};

// Initialize configuration immediately
initializeConfig();

// Export AWS configuration (will be populated after initialization)
export { awsConfig };

// Export individual service configurations (will be populated after initialization)
export const getDynamoConfig = () => awsConfig ? {
  region: awsConfig.region,
  credentials: awsConfig.credentials
} : null;

export const getCognitoConfig = () => awsConfig ? {
  region: awsConfig.region,
  credentials: awsConfig.credentials
} : null;

export default awsConfig;




