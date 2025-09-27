#!/bin/bash

# Simple CloudFormation deployment script
set -e

echo "🚀 Simple Application Management System Deployment (CloudFormation)"
echo "=================================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID and Region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo "✅ AWS CLI configured"
echo "🏦 AWS Account: $AWS_ACCOUNT_ID"
echo "🌍 AWS Region: $AWS_REGION"

# Set environment variables
ENVIRONMENT=${ENVIRONMENT:-dev}
PROJECT_NAME=${PROJECT_NAME:-app-management}
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

echo "📦 Deploying CloudFormation stack: $STACK_NAME"

# Deploy the CloudFormation stack
aws cloudformation deploy \
    --template-file infrastructure/simple-cloudformation.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        ProjectName=$PROJECT_NAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION

echo "✅ CloudFormation stack deployed successfully"

# Get stack outputs
echo "📋 Getting stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs' \
    --region $AWS_REGION)

# Extract values
WEBSITE_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="WebsiteURL") | .OutputValue')
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
IDENTITY_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
DYNAMODB_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="DynamoDBTableName") | .OutputValue')
API_GATEWAY_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiGatewayURL") | .OutputValue')

echo "✅ Stack outputs retrieved"

# Create test user
echo "👤 Creating test user..."
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username "admin@example.com" \
    --user-attributes Name=email,Value="admin@example.com" Name=email_verified,Value=true \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS \
    --region $AWS_REGION

aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username "admin@example.com" \
    --password "TempPass123!" \
    --permanent \
    --region $AWS_REGION

echo "✅ Test user created: admin@example.com / TempPass123!"

# Build the React app
echo "🏗️ Building React application..."
npm install
npm run build

# Create config.json with actual values
echo "⚙️ Creating config.json..."
cat > build/config.json << EOF
{
  "awsRegion": "$AWS_REGION",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "identityPoolId": "$IDENTITY_POOL_ID",
  "dynamoDbTableName": "$DYNAMODB_TABLE",
  "apiBaseUrl": "$API_GATEWAY_URL"
}
EOF

# Upload to S3
echo "📤 Uploading application to S3..."
aws s3 sync build/ s3://$WEBSITE_URL --delete --region $AWS_REGION

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "🌐 Application URL: http://$WEBSITE_URL"
echo "👤 Test User: admin@example.com"
echo "🔑 Test Password: TempPass123!"
echo ""
echo "📊 Resources Created:"
echo "   CloudFormation Stack: $STACK_NAME"
echo "   S3 Bucket: $WEBSITE_URL"
echo "   User Pool: $USER_POOL_ID"
echo "   Identity Pool: $IDENTITY_POOL_ID"
echo "   DynamoDB Table: $DYNAMODB_TABLE"
echo "   API Gateway: $API_GATEWAY_URL"
echo ""
echo "🔧 Next Steps:"
echo "   1. Visit the application URL"
echo "   2. Login with the test credentials"
echo "   3. Start creating projects and applications"
echo ""
echo "💡 To clean up resources later, run:"
echo "   aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION"
