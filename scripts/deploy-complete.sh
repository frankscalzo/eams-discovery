#!/bin/bash

# Complete EAMS Infrastructure Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="eams-complete"
TEMPLATE_FILE="infrastructure/eams-complete.yml"
REGION="us-east-1"
ENVIRONMENT="dev"

echo -e "${BLUE}🚀 Deploying Complete EAMS Infrastructure${NC}"
echo "================================================"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${BLUE}📋 AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"

# Deploy CloudFormation stack
echo -e "${YELLOW}📦 Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file $TEMPLATE_FILE \
    --stack-name $STACK_NAME \
    --parameter-overrides Environment=$ENVIRONMENT \
    --region $REGION \
    --capabilities CAPABILITY_NAMED_IAM

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CloudFormation stack deployed successfully${NC}"
else
    echo -e "${RED}❌ CloudFormation deployment failed${NC}"
    exit 1
fi

# Get stack outputs
echo -e "${YELLOW}📋 Retrieving stack outputs...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

IDENTITY_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
    --output text)

USERS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UsersTableName`].OutputValue' \
    --output text)

COMPANIES_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CompaniesTableName`].OutputValue' \
    --output text)

PROJECTS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ProjectsTableName`].OutputValue' \
    --output text)

APPLICATIONS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApplicationsTableName`].OutputValue' \
    --output text)

FILE_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FileUploadBucketName`].OutputValue' \
    --output text)

# Create environment file
echo -e "${YELLOW}📝 Creating environment configuration...${NC}"
cat > .env.production << EOF
REACT_APP_API_GATEWAY_URL=$API_URL
REACT_APP_AWS_REGION=$REGION
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
REACT_APP_DYNAMODB_USERS_TABLE=$USERS_TABLE
REACT_APP_DYNAMODB_COMPANIES_TABLE=$COMPANIES_TABLE
REACT_APP_DYNAMODB_PROJECTS_TABLE=$PROJECTS_TABLE
REACT_APP_DYNAMODB_APPLICATIONS_TABLE=$APPLICATIONS_TABLE
REACT_APP_S3_FILE_BUCKET=$FILE_BUCKET
EOF

echo -e "${GREEN}✅ Environment configuration created${NC}"

# Create admin user
echo -e "${YELLOW}👤 Creating admin user...${NC}"
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username admin@eams.com \
    --user-attributes Name=email,Value=admin@eams.com Name=given_name,Value=Admin Name=family_name,Value=User Name=user_type,Value=admin Name=company_id,Value=primary-company Name=is_primary_company,Value=true \
    --temporary-password AdminPass123! \
    --message-action SUPPRESS \
    --region $REGION

# Set permanent password
aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username admin@eams.com \
    --password AdminPass123! \
    --permanent \
    --region $REGION

echo -e "${GREEN}✅ Admin user created${NC}"

# Seed initial data
echo -e "${YELLOW}🌱 Seeding initial data...${NC}"
python3 scripts/seed-initial-data.py \
    --region $REGION \
    --users-table $USERS_TABLE \
    --companies-table $COMPANIES_TABLE \
    --projects-table $PROJECTS_TABLE

echo -e "${GREEN}✅ Initial data seeded${NC}"

# Display configuration
echo -e "${BLUE}📋 Configuration Summary${NC}"
echo "=========================="
echo -e "API Gateway URL: ${GREEN}$API_URL${NC}"
echo -e "User Pool ID: ${GREEN}$USER_POOL_ID${NC}"
echo -e "User Pool Client ID: ${GREEN}$USER_POOL_CLIENT_ID${NC}"
echo -e "Identity Pool ID: ${GREEN}$IDENTITY_POOL_ID${NC}"
echo -e "Users Table: ${GREEN}$USERS_TABLE${NC}"
echo -e "Companies Table: ${GREEN}$COMPANIES_TABLE${NC}"
echo -e "Projects Table: ${GREEN}$PROJECTS_TABLE${NC}"
echo -e "Applications Table: ${GREEN}$APPLICATIONS_TABLE${NC}"
echo -e "File Upload Bucket: ${GREEN}$FILE_BUCKET${NC}"
echo ""
echo -e "${GREEN}🎉 Complete EAMS infrastructure deployed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy the .env.production file to your project root"
echo "2. Run 'npm run build' to build with AWS configuration"
echo "3. Deploy the built files to S3"
echo "4. Test the application with admin@eams.com / AdminPass123!"







