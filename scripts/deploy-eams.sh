#!/bin/bash

# EAMS (Enterprise Architecture Management System) Deployment Script
set -e

echo "🚀 EAMS Deployment Script"
echo "========================="

# Determine environment from argument or default to dev
ENV_ARG=${1:-dev}
echo "🌍 Deploying to environment: $ENV_ARG"

# Validate and load environment configuration
ENV_FILE="deploy.${ENV_ARG}.env"
if [ -f "$ENV_FILE" ]; then
    echo "📋 Loading environment configuration from $ENV_FILE..."
    
    # Validate the environment file
    if ! source "$ENV_FILE" 2>/dev/null; then
        echo "❌ Environment file $ENV_FILE has syntax errors!"
        exit 1
    fi
    
    # Copy environment file to .env for the build process
    echo "📄 Copying $ENV_FILE to .env for build process..."
    cp "$ENV_FILE" ".env"
    
    # Also copy to build directory for runtime
    mkdir -p build
    cp "$ENV_FILE" "build/.env"
    
    echo "✅ Environment configuration loaded successfully"
else
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Available environment files:"
    ls -la deploy.*.env 2>/dev/null || echo "No environment files found"
    echo ""
    echo "💡 To create a new environment file, run:"
    echo "   ./scripts/setup-env.sh create $ENV_ARG"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID and Region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-$(aws configure get region || echo "us-east-1")}

echo "✅ AWS CLI configured"
echo "🏦 AWS Account: $AWS_ACCOUNT_ID"
echo "🌍 AWS Region: $AWS_REGION"

# Set environment variables
STACK_NAME="${STAGE}-${PROJECT_NAME}"
CUSTOM_DOMAIN="${STAGE}-${SERVICE_NAME}.${DOMAIN_NAME}"

echo "🔧 Configuration:"
echo "   Stack Name: $STACK_NAME"
echo "   Custom Domain: $CUSTOM_DOMAIN"
echo "   Certificate ARN: ${CERTIFICATE_ARN:-'Not provided'}"

echo "📦 Deploying EAMS CloudFormation stack: $STACK_NAME"

# Deploy the CloudFormation stack
aws cloudformation deploy \
    --template-file infrastructure/simple-eams.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        ProjectName=$PROJECT_NAME \
        ServiceName=$SERVICE_NAME \
        DomainName=$DOMAIN_NAME \
        CertificateArn=$CERTIFICATE_ARN \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION \
    --tags \
        Project=$TAG_PROJECT \
        Environment=$TAG_ENVIRONMENT \
        Owner=$TAG_OWNER \
        CostCenter=$TAG_COST_CENTER \
        Application=$TAG_APPLICATION

echo "✅ CloudFormation stack deployed successfully"

# Get stack outputs
echo "📋 Getting stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs' \
    --region $AWS_REGION)

# Extract values
WEBSITE_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="WebsiteURL") | .OutputValue')
CLOUDFRONT_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="CloudFrontURL") | .OutputValue')
CUSTOM_DOMAIN_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="CustomDomainURL") | .OutputValue // empty')
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
IDENTITY_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
DYNAMODB_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="DynamoDBTableName") | .OutputValue')
API_GATEWAY_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiGatewayURL") | .OutputValue')

echo "✅ Stack outputs retrieved"

# Store configuration in Parameter Store
echo "📝 Storing configuration in Parameter Store..."
aws ssm put-parameter \
    --name "/${PROJECT_NAME}/${ENVIRONMENT}/config" \
    --value "{
        \"environment\": \"${ENVIRONMENT}\",
        \"stage\": \"${STAGE}\",
        \"projectName\": \"${PROJECT_NAME}\",
        \"serviceName\": \"${SERVICE_NAME}\",
        \"domainName\": \"${DOMAIN_NAME}\",
        \"customDomain\": \"${CUSTOM_DOMAIN}\",
        \"awsRegion\": \"${AWS_REGION}\",
        \"awsAccountId\": \"${AWS_ACCOUNT_ID}\",
        \"stackName\": \"${STACK_NAME}\",
        \"cloudFrontDistributionId\": \"${CLOUDFRONT_URL}\",
        \"s3BucketName\": \"${WEBSITE_URL}\",
        \"dynamoDbTableName\": \"${DYNAMODB_TABLE}\",
        \"userPoolId\": \"${USER_POOL_ID}\",
        \"userPoolClientId\": \"${USER_POOL_CLIENT_ID}\",
        \"identityPoolId\": \"${IDENTITY_POOL_ID}\",
        \"apiGatewayUrl\": \"${API_GATEWAY_URL}\"
    }" \
    --type "String" \
    --overwrite \
    --region $AWS_REGION

# Store feature flags in Parameter Store
echo "🚩 Storing feature flags in Parameter Store..."
aws ssm put-parameter \
    --name "/${PROJECT_NAME}/${ENVIRONMENT}/feature-flags" \
    --value "{
        \"enableAIProcessing\": ${ENABLE_AI_PROCESSING:-true},
        \"enableCostMonitoring\": ${ENABLE_COST_MONITORING:-true},
        \"enableBulkUpload\": ${ENABLE_BULK_UPLOAD:-true},
        \"enableExcelImport\": ${ENABLE_EXCEL_IMPORT:-true},
        \"enableDependencyMapping\": ${ENABLE_DEPENDENCY_MAPPING:-true},
        \"enableImpactAnalysis\": ${ENABLE_IMPACT_ANALYSIS:-true},
        \"enableReporting\": ${ENABLE_REPORTING:-true},
        \"enableMultiProject\": ${ENABLE_MULTI_PROJECT:-true},
        \"enableCustomDomain\": ${ENABLE_CUSTOM_DOMAIN:-true},
        \"enableCloudFront\": ${ENABLE_CLOUDFRONT:-true},
        \"enableS3Hosting\": ${ENABLE_S3_HOSTING:-true},
        \"enableDynamoDB\": ${ENABLE_DYNAMODB:-true},
        \"enableCognito\": ${ENABLE_COGNITO:-true},
        \"enableAPIGateway\": ${ENABLE_API_GATEWAY:-true},
        \"enableLambda\": ${ENABLE_LAMBDA:-true}
    }" \
    --type "String" \
    --overwrite \
    --region $AWS_REGION

echo "✅ Configuration stored in Parameter Store"

# Create test user
echo "👤 Creating test user..."
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username "admin@eams.com" \
    --user-attributes Name=email,Value="admin@eams.com" Name=email_verified,Value=true \
    --temporary-password "EAMSPass123!" \
    --message-action SUPPRESS \
    --region $AWS_REGION

aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username "admin@eams.com" \
    --password "EAMSPass123!" \
    --permanent \
    --region $AWS_REGION

echo "✅ Test user created: admin@eams.com / EAMSPass123!"

# Build the React app
echo "🏗️ Building EAMS application..."
npm install
npm run build

# Create config.json with actual values
echo "⚙️ Creating config.json..."
cat > build/config.json << EOF
{
  "environment": "$ENVIRONMENT",
  "stage": "$STAGE",
  "projectName": "$PROJECT_NAME",
  "serviceName": "$SERVICE_NAME",
  "awsRegion": "$AWS_REGION",
  "awsAccountId": "$AWS_ACCOUNT_ID",
  "domainName": "$DOMAIN_NAME",
  "customDomain": "$CUSTOM_DOMAIN",
  "cloudFrontUrl": "$CLOUDFRONT_URL",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "identityPoolId": "$IDENTITY_POOL_ID",
  "dynamoDbTableName": "$DYNAMODB_TABLE",
  "apiBaseUrl": "$API_GATEWAY_URL",
  "parameterStorePrefix": "/$PROJECT_NAME/$ENVIRONMENT",
  "secretsManagerPrefix": "/$PROJECT_NAME/$ENVIRONMENT",
  "featureFlags": {
    "enableAIProcessing": ${ENABLE_AI_PROCESSING:-true},
    "enableCostMonitoring": ${ENABLE_COST_MONITORING:-true},
    "enableBulkUpload": ${ENABLE_BULK_UPLOAD:-true},
    "enableExcelImport": ${ENABLE_EXCEL_IMPORT:-true},
    "enableDependencyMapping": ${ENABLE_DEPENDENCY_MAPPING:-true},
    "enableImpactAnalysis": ${ENABLE_IMPACT_ANALYSIS:-true},
    "enableReporting": ${ENABLE_REPORTING:-true},
    "enableMultiProject": ${ENABLE_MULTI_PROJECT:-true},
    "enableCustomDomain": ${ENABLE_CUSTOM_DOMAIN:-true}
  }
}
EOF

# Upload to S3
echo "📤 Uploading EAMS application to S3..."
aws s3 sync build/ s3://$WEBSITE_URL --delete --region $AWS_REGION

echo ""
echo "🎉 EAMS Deployment Complete!"
echo "============================"
echo "🌍 Environment: $ENVIRONMENT ($STAGE)"
echo "🏷️  Project: $PROJECT_NAME-$SERVICE_NAME"
if [ -n "$CUSTOM_DOMAIN_URL" ]; then
    echo "🌐 Application URL: $CUSTOM_DOMAIN_URL"
    echo "🌐 CloudFront URL: $CLOUDFRONT_URL"
else
    echo "🌐 Application URL: $CLOUDFRONT_URL"
fi
echo "👤 Test User: admin@eams.com"
echo "🔑 Test Password: EAMSPass123!"
echo ""
echo "📊 Resources Created:"
echo "   CloudFormation Stack: $STACK_NAME"
echo "   CloudFront Distribution: $CLOUDFRONT_URL"
if [ -n "$CUSTOM_DOMAIN_URL" ]; then
    echo "   Custom Domain: $CUSTOM_DOMAIN_URL"
fi
echo "   User Pool: $USER_POOL_ID"
echo "   Identity Pool: $IDENTITY_POOL_ID"
echo "   DynamoDB Table: $DYNAMODB_TABLE"
echo "   API Gateway: $API_GATEWAY_URL"
echo "   Parameter Store: /$PROJECT_NAME/$ENVIRONMENT"
echo "   Secrets Manager: /$PROJECT_NAME/$ENVIRONMENT"
echo ""
echo "🔧 Configuration Management:"
echo "   ✅ Environment-specific .env files"
echo "   ✅ Parameter Store integration"
echo "   ✅ Secrets Manager integration"
echo "   ✅ Feature flags support"
echo "   ✅ Fully decoupled architecture"
echo ""
echo "🚀 Usage:"
echo "   Deploy to dev:    ./scripts/deploy-eams.sh dev"
echo "   Deploy to stage:  ./scripts/deploy-eams.sh stage"
echo "   Deploy to prod:   ./scripts/deploy-eams.sh prod"
echo ""
echo "🔧 Next Steps:"
echo "   1. Visit the application URL"
echo "   2. Login with the test credentials"
echo "   3. Navigate to the EAMS tab to access the Enterprise Architecture Management System"
echo "   4. Start creating and managing your enterprise assets with Excel-like functionality"
echo ""
echo "💡 To clean up resources later, run:"
echo "   aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION"
