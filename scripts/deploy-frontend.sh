#!/bin/bash

# Deploy Frontend Changes to AWS
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Frontend Changes to AWS${NC}"
echo "============================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${BLUE}📋 AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"

# Set up environment variables from SSM
echo -e "${YELLOW}📝 Setting up environment variables from SSM...${NC}"

# Get credentials from SSM
ACCESS_KEY_ID=$(aws ssm get-parameter --name "/eams/dev/aws/access-key-id" --with-decryption --query 'Parameter.Value' --output text)
SECRET_ACCESS_KEY=$(aws ssm get-parameter --name "/eams/dev/aws/secret-access-key" --with-decryption --query 'Parameter.Value' --output text)
SESSION_TOKEN=$(aws ssm get-parameter --name "/eams/dev/aws/session-token" --with-decryption --query 'Parameter.Value' --output text)

# Get configuration from SSM
USER_POOL_ID=$(aws ssm get-parameter --name "/eams/dev/cognito/userPoolId" --query 'Parameter.Value' --output text)
USER_POOL_CLIENT_ID=$(aws ssm get-parameter --name "/eams/dev/cognito/userPoolClientId" --query 'Parameter.Value' --output text)
IDENTITY_POOL_ID=$(aws ssm get-parameter --name "/eams/dev/cognito/identityPoolId" --query 'Parameter.Value' --output text)
USERS_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/usersTable" --query 'Parameter.Value' --output text)
COMPANIES_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/companiesTable" --query 'Parameter.Value' --output text)
PROJECTS_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/projectsTable" --query 'Parameter.Value' --output text)
APPLICATIONS_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/applicationsTable" --query 'Parameter.Value' --output text)
S3_FILE_BUCKET=$(aws ssm get-parameter --name "/eams/dev/s3/fileUploadBucketName" --query 'Parameter.Value' --output text)

# Create production environment file
echo -e "${YELLOW}📝 Creating production environment file...${NC}"
cat > .env.production << EOF
REACT_APP_AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
REACT_APP_AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
REACT_APP_AWS_SESSION_TOKEN=$SESSION_TOKEN
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
REACT_APP_DYNAMODB_USERS_TABLE=$USERS_TABLE
REACT_APP_DYNAMODB_COMPANIES_TABLE=$COMPANIES_TABLE
REACT_APP_DYNAMODB_PROJECTS_TABLE=$PROJECTS_TABLE
REACT_APP_DYNAMODB_APPLICATIONS_TABLE=$APPLICATIONS_TABLE
REACT_APP_S3_FILE_BUCKET=$S3_FILE_BUCKET
REACT_APP_ENVIRONMENT=dev
REACT_APP_STAGE=dev
REACT_APP_PROJECT_NAME=eams
REACT_APP_SERVICE_NAME=discovery
EOF

echo -e "${GREEN}✅ Environment file created${NC}"

# Build the React application
echo -e "${YELLOW}🔨 Building React application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ React application built successfully${NC}"
else
    echo -e "${RED}❌ React build failed${NC}"
    exit 1
fi

# Deploy to S3
echo -e "${YELLOW}📤 Deploying to S3...${NC}"
WEBSITE_BUCKET="eams-dev-discovery-${AWS_ACCOUNT_ID}"

# Sync build files to S3
aws s3 sync build/ s3://$WEBSITE_BUCKET/ --delete

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files uploaded to S3 successfully${NC}"
else
    echo -e "${RED}❌ S3 upload failed${NC}"
    exit 1
fi

# Invalidate CloudFront cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='EAMS Discovery Distribution'].Id" --output text)

if [ ! -z "$DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
else
    echo -e "${YELLOW}⚠️  CloudFront distribution not found, skipping cache invalidation${NC}"
fi

# Display configuration
echo -e "${BLUE}📋 Deployment Summary${NC}"
echo "======================"
echo -e "Website URL: ${GREEN}https://dev-discovery.optimumcloudservices.com/${NC}"
echo -e "S3 Bucket: ${GREEN}$WEBSITE_BUCKET${NC}"
echo -e "User Pool ID: ${GREEN}$USER_POOL_ID${NC}"
echo -e "Users Table: ${GREEN}$USERS_TABLE${NC}"
echo -e "Companies Table: ${GREEN}$COMPANIES_TABLE${NC}"
echo ""
echo -e "${GREEN}🎉 Frontend deployment completed successfully!${NC}"
echo -e "${YELLOW}The updated user management system is now live!${NC}"
