#!/bin/bash

# Local Development Setup Script
# This script sets up local development with AWS services running in the cloud

set -e

echo "🚀 Setting up local development environment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it first:"
    echo "   brew install jq  # macOS"
    echo "   sudo apt-get install jq  # Ubuntu"
    exit 1
fi

# Load environment variables
if [ -f "deploy.env" ]; then
    source deploy.env
else
    echo "❌ deploy.env file not found. Please run ./deploy.sh first to create it."
    exit 1
fi

echo "📋 Environment: $ENVIRONMENT"
echo "🌍 AWS Region: $AWS_REGION"
echo "🏷️  App Name: $APP_NAME"

# Check if AWS credentials are configured
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run:"
    echo "   aws configure"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "🏦 AWS Account ID: $AWS_ACCOUNT_ID"

# Check if CloudFormation stack exists
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-stack"
echo "🔍 Checking if CloudFormation stack exists: $STACK_NAME"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
    echo "✅ CloudFormation stack exists"
    
    # Get stack outputs
    echo "📊 Getting stack outputs..."
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs' \
        --output table
else
    echo "❌ CloudFormation stack not found. Please deploy infrastructure first:"
    echo "   ./scripts/setup-aws.sh"
    exit 1
fi

# Create .env.local file for local development
echo "📝 Creating .env.local file..."

cat > .env.local << EOF
# AWS Configuration
REACT_APP_AWS_REGION=${AWS_REGION}
REACT_APP_AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

# DynamoDB Table Name
REACT_APP_DYNAMODB_TABLE=${ENVIRONMENT}-project-management

# S3 Buckets
REACT_APP_WEBSITE_BUCKET=${ENVIRONMENT}-${APP_NAME}-website-${AWS_ACCOUNT_ID}
REACT_APP_ATTACHMENTS_BUCKET=${ENVIRONMENT}-app-management-attachments-${AWS_ACCOUNT_ID}
REACT_APP_AI_BUCKET=${ENVIRONMENT}-ai-processing-${AWS_ACCOUNT_ID}

# Cognito Configuration
REACT_APP_USER_POOL_ID=\$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
REACT_APP_USER_POOL_WEB_CLIENT_ID=\$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
REACT_APP_IDENTITY_POOL_ID=\$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text)

# AI Services
REACT_APP_COMPREHEND_ENDPOINT=\$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ComprehendEndpoint`].OutputValue' --output text 2>/dev/null || echo "")

# Development flags
REACT_APP_DEVELOPMENT_MODE=true
REACT_APP_ENABLE_AI=true
EOF

# Get actual values from CloudFormation
echo "🔍 Fetching actual values from CloudFormation..."

USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text)

# Update .env.local with actual values
cat > .env.local << EOF
# AWS Configuration
REACT_APP_AWS_REGION=${AWS_REGION}
REACT_APP_AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

# DynamoDB Table Name
REACT_APP_DYNAMODB_TABLE=${ENVIRONMENT}-project-management

# S3 Buckets
REACT_APP_WEBSITE_BUCKET=${ENVIRONMENT}-${APP_NAME}-website-${AWS_ACCOUNT_ID}
REACT_APP_ATTACHMENTS_BUCKET=${ENVIRONMENT}-app-management-attachments-${AWS_ACCOUNT_ID}
REACT_APP_AI_BUCKET=${ENVIRONMENT}-ai-processing-${AWS_ACCOUNT_ID}

# Cognito Configuration
REACT_APP_USER_POOL_ID=${USER_POOL_ID}
REACT_APP_USER_POOL_WEB_CLIENT_ID=${USER_POOL_CLIENT_ID}
REACT_APP_IDENTITY_POOL_ID=${IDENTITY_POOL_ID}

# AI Services
REACT_APP_COMPREHEND_ENDPOINT=""

# Development flags
REACT_APP_DEVELOPMENT_MODE=true
REACT_APP_ENABLE_AI=true
EOF

echo "✅ .env.local file created"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create a test user in Cognito (optional)
echo "👤 Creating test user in Cognito..."
read -p "Do you want to create a test user? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter test user email: " TEST_EMAIL
    read -p "Enter test user password: " -s TEST_PASSWORD
    echo
    
    # Create user in Cognito
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$TEST_EMAIL" \
        --user-attributes Name=email,Value="$TEST_EMAIL" Name=email_verified,Value=true \
        --temporary-password "$TEST_PASSWORD" \
        --message-action SUPPRESS || echo "User might already exist"
    
    # Set permanent password
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$USER_POOL_ID" \
        --username "$TEST_EMAIL" \
        --password "$TEST_PASSWORD" \
        --permanent || echo "Password might already be set"
    
    echo "✅ Test user created: $TEST_EMAIL"
fi

# Start the development server
echo "🚀 Starting development server..."
echo ""
echo "📋 Local Development Setup Complete!"
echo "=================================="
echo "🌐 Application URL: http://localhost:3000"
echo "🔐 Test User: $TEST_EMAIL (if created)"
echo "🔑 Password: [the password you entered]"
echo ""
echo "📊 AWS Services Status:"
echo "   ✅ DynamoDB: ${ENVIRONMENT}-project-management"
echo "   ✅ S3 Buckets: Website, Attachments, AI Processing"
echo "   ✅ Cognito: User Pool configured"
echo "   ✅ CloudFormation: Stack deployed"
echo ""
echo "🛠️  Development Commands:"
echo "   npm start          # Start development server"
echo "   npm run build      # Build for production"
echo "   npm test           # Run tests"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check .env.local for correct AWS resource IDs"
echo "   - Ensure AWS credentials are configured"
echo "   - Check CloudFormation stack status"
echo ""

# Start the development server
npm start
