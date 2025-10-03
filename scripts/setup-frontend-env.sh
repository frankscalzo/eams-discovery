#!/bin/bash

# Setup Frontend Environment Variables from SSM
# This script retrieves AWS credentials from SSM and sets them as React environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up frontend environment variables from SSM...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if we're authenticated
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with AWS. Please set your credentials first.${NC}"
    exit 1
fi

# Set the parameter prefix
PARAM_PREFIX="/eams/dev/aws"

# Function to get parameter value from SSM
get_param() {
    local param_name="$1"
    aws ssm get-parameter --name "$param_name" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo ""
}

# Get credentials from SSM
echo -e "${YELLOW}Retrieving credentials from SSM...${NC}"

ACCESS_KEY_ID=$(get_param "${PARAM_PREFIX}/access-key-id")
SECRET_ACCESS_KEY=$(get_param "${PARAM_PREFIX}/secret-access-key")
SESSION_TOKEN=$(get_param "${PARAM_PREFIX}/session-token")
REGION=$(get_param "${PARAM_PREFIX}/region")
ACCOUNT_ID=$(get_param "${PARAM_PREFIX}/account-id")

# Check if we got the credentials
if [[ -z "$ACCESS_KEY_ID" || -z "$SECRET_ACCESS_KEY" ]]; then
    echo -e "${RED}Error: Could not retrieve credentials from SSM. Please run setup-aws-credentials.sh first.${NC}"
    exit 1
fi

# Create .env.local file for React
ENV_FILE=".env.local"

echo -e "${YELLOW}Creating ${ENV_FILE}...${NC}"

cat > "$ENV_FILE" << EOF
# AWS Credentials from SSM
REACT_APP_AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}
REACT_APP_AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}
REACT_APP_AWS_SESSION_TOKEN=${SESSION_TOKEN}
REACT_APP_AWS_REGION=${REGION}
REACT_APP_AWS_ACCOUNT_ID=${ACCOUNT_ID}

# Other AWS Configuration
REACT_APP_USER_POOL_ID=us-east-1_CevZu4sdm
REACT_APP_USER_POOL_CLIENT_ID=qevb9qr68ddbm2tr7grmlgtus
REACT_APP_IDENTITY_POOL_ID=us-east-1:213c093b-a282-4c8a-9579-4498b5261471

# DynamoDB Tables
REACT_APP_DYNAMODB_USERS_TABLE=eams-users
REACT_APP_DYNAMODB_COMPANIES_TABLE=eams-companies
REACT_APP_DYNAMODB_PROJECTS_TABLE=eams-projects
REACT_APP_DYNAMODB_APPLICATIONS_TABLE=eams-applications

# S3 Buckets
REACT_APP_S3_FILE_BUCKET=eams-dev-storage-${ACCOUNT_ID}
REACT_APP_WEBSITE_BUCKET=eams-dev-discovery-${ACCOUNT_ID}

# Environment
REACT_APP_ENVIRONMENT=dev
REACT_APP_STAGE=dev
REACT_APP_PROJECT_NAME=eams
REACT_APP_SERVICE_NAME=discovery
EOF

echo -e "${GREEN}✅ Frontend environment variables created successfully${NC}"
echo -e "${YELLOW}Environment file: ${ENV_FILE}${NC}"

# Show the environment variables (without sensitive values)
echo -e "\n${YELLOW}Environment variables set:${NC}"
echo "  REACT_APP_AWS_ACCESS_KEY_ID: ${ACCESS_KEY_ID:0:8}..."
echo "  REACT_APP_AWS_SECRET_ACCESS_KEY: ${SECRET_ACCESS_KEY:0:8}..."
echo "  REACT_APP_AWS_SESSION_TOKEN: ${SESSION_TOKEN:0:20}..."
echo "  REACT_APP_AWS_REGION: ${REGION}"
echo "  REACT_APP_AWS_ACCOUNT_ID: ${ACCOUNT_ID}"

echo -e "\n${GREEN}Setup complete! You can now start the React development server.${NC}"
echo -e "${YELLOW}Note: The .env.local file contains sensitive credentials. Do not commit it to version control.${NC}"
