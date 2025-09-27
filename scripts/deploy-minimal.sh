#!/bin/bash

# Minimal EAMS Deployment Script
set -e

echo "🚀 Minimal EAMS Deployment Script"
echo "=================================="

# Load environment variables
if [ -f "deploy.dev.env" ]; then
    echo "📋 Loading environment configuration from deploy.dev.env..."
    source deploy.dev.env
    echo "✅ Environment configuration loaded successfully"
else
    echo "❌ deploy.dev.env not found. Please create it first."
    exit 1
fi

# Set AWS region
export AWS_DEFAULT_REGION=${AWS_REGION:-us-east-1}

# Verify AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "🏦 AWS Account: $ACCOUNT_ID"
echo "🌍 AWS Region: $AWS_DEFAULT_REGION"

# Set stack name
STACK_NAME="${ENVIRONMENT}-${PROJECT_NAME}"

echo "🔧 Configuration:"
echo "   Stack Name: $STACK_NAME"
echo "   Project: $PROJECT_NAME"
echo "   Environment: $ENVIRONMENT"
echo "   Service: $SERVICE_NAME"

# Deploy CloudFormation stack
echo "📦 Deploying minimal EAMS CloudFormation stack: $STACK_NAME"

aws cloudformation deploy \
    --template-file infrastructure/minimal-eams.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        ProjectName=$PROJECT_NAME \
        Environment=$ENVIRONMENT \
        ServiceName=$SERVICE_NAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --tags \
        Project=$PROJECT_NAME \
        Environment=$ENVIRONMENT \
        Service=$SERVICE_NAME \
        ManagedBy=CloudFormation

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack deployed successfully"
    
    # Get stack outputs
    echo "📋 Getting stack outputs..."
    WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' --output text)
    USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
    IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text)
    TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ProjectManagementTableName`].OutputValue' --output text)
    BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' --output text)
    
    echo "🌐 Website URL: $WEBSITE_URL"
    echo "👤 User Pool ID: $USER_POOL_ID"
    echo "🔑 User Pool Client ID: $USER_POOL_CLIENT_ID"
    echo "🆔 Identity Pool ID: $IDENTITY_POOL_ID"
    echo "🗄️  DynamoDB Table: $TABLE_NAME"
    echo "🪣 S3 Bucket: $BUCKET_NAME"
    
    # Create config.json for frontend
    echo "📝 Creating config.json for frontend..."
    mkdir -p public
    cat > public/config.json << EOF
{
  "awsRegion": "$AWS_DEFAULT_REGION",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "identityPoolId": "$IDENTITY_POOL_ID",
  "projectManagementTableName": "$TABLE_NAME",
  "websiteBucketName": "$BUCKET_NAME",
  "apiGatewayUrl": "",
  "environment": "$ENVIRONMENT",
  "projectName": "$PROJECT_NAME",
  "serviceName": "$SERVICE_NAME"
}
EOF
    
    echo "✅ config.json created successfully"
    
    # Build React app
    echo "🔨 Building React application..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ React app built successfully"
        
        # Upload to S3
        echo "📤 Uploading to S3..."
        aws s3 sync build/ s3://$BUCKET_NAME --delete
        
        if [ $? -eq 0 ]; then
            echo "✅ Files uploaded to S3 successfully"
            echo ""
            echo "🎉 Deployment completed successfully!"
            echo "🌐 Your EAMS application is available at: $WEBSITE_URL"
            echo ""
            echo "📋 Next steps:"
            echo "   1. Visit the website URL above"
            echo "   2. Create a user account"
            echo "   3. Start using the EAMS system"
        else
            echo "❌ Failed to upload files to S3"
            exit 1
        fi
    else
        echo "❌ Failed to build React application"
        exit 1
    fi
else
    echo "❌ CloudFormation deployment failed"
    exit 1
fi
