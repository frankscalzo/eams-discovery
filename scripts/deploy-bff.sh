#!/bin/bash

# Deploy EAMS Backend-for-Frontend (BFF) infrastructure
set -e

echo "🚀 Deploying EAMS BFF Infrastructure..."

# Get configuration from SSM
echo "📋 Fetching configuration from SSM..."
USERS_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/usersTable" --query 'Parameter.Value' --output text)
COMPANIES_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/companiesTable" --query 'Parameter.Value' --output text)
PROJECTS_TABLE=$(aws ssm get-parameter --name "/eams/dev/dynamodb/projectsTable" --query 'Parameter.Value' --output text)
USER_POOL_ID=$(aws ssm get-parameter --name "/eams/dev/cognito/userPoolId" --query 'Parameter.Value' --output text)
USER_POOL_CLIENT_ID=$(aws ssm get-parameter --name "/eams/dev/cognito/userPoolClientId" --query 'Parameter.Value' --output text)

echo "Configuration:"
echo "  Users Table: $USERS_TABLE"
echo "  Companies Table: $COMPANIES_TABLE"
echo "  Projects Table: $PROJECTS_TABLE"
echo "  User Pool ID: $USER_POOL_ID"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"

# Deploy CloudFormation stack
echo "🏗️  Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file infrastructure/eams-bff.yml \
  --stack-name eams-bff \
  --parameter-overrides \
    Stage=dev \
    UsersTable="$USERS_TABLE" \
    CompaniesTable="$COMPANIES_TABLE" \
    ProjectsTable="$PROJECTS_TABLE" \
    CognitoUserPoolId="$USER_POOL_ID" \
    CognitoClientId="$USER_POOL_CLIENT_ID" \
    FrontendUrl="https://d1b2c3d4e5f6g7.cloudfront.net" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks --stack-name eams-bff --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)
echo "✅ API Gateway URL: $API_URL"

# Package and deploy Lambda functions
echo "📦 Packaging Lambda functions..."

# Package Auth Lambda
cd lambda/eams-auth
npm install --production
zip -r ../eams-auth.zip .
cd ../..

# Package API Lambda  
cd lambda/eams-api
npm install --production
zip -r ../eams-api.zip .
cd ../..

# Update Lambda function code
echo "🔄 Updating Lambda function code..."
aws lambda update-function-code \
  --function-name eams-dev-auth \
  --zip-file fileb://lambda/eams-auth.zip \
  --region us-east-1

aws lambda update-function-code \
  --function-name eams-dev-api \
  --zip-file fileb://lambda/eams-api.zip \
  --region us-east-1

# Clean up zip files
rm -f lambda/eams-auth.zip lambda/eams-api.zip

echo "✅ BFF deployment complete!"
echo "🌐 API URL: $API_URL"
echo "🔐 Login URL: $API_URL/auth/login"
echo "❤️  Health Check: $API_URL/health"
