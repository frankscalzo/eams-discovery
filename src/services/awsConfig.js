import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';

// AWS Configuration for client-side
const REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';
const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID || 'us-east-1:213c093b-a282-4c8a-9579-4498b5261471';

// Create credentials provider for Cognito Identity Pool
const credentialsProvider = fromCognitoIdentityPool({
  client: new CognitoIdentityClient({ region: REGION }),
  identityPoolId: IDENTITY_POOL_ID,
});

// Export AWS configuration
export const awsConfig = {
  region: REGION,
  credentials: credentialsProvider,
};

// Export individual service configurations
export const dynamoConfig = {
  region: REGION,
  credentials: credentialsProvider,
};

export const cognitoConfig = {
  region: REGION,
  credentials: credentialsProvider,
};

export default awsConfig;

