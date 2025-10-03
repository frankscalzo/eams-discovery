#!/bin/bash

# Setup SSM Parameters for EAMS Discovery
# This script sets up all required SSM parameters for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up SSM Parameters for EAMS Discovery${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${YELLOW}Using AWS Account ID: ${ACCOUNT_ID}${NC}"

# Function to create SSM parameter
create_parameter() {
    local name=$1
    local value=$2
    local description=$3
    local secure=${4:-false}
    
    echo -e "${YELLOW}Creating parameter: ${name}${NC}"
    
    if [ "$secure" = "true" ]; then
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --type "SecureString" \
            --description "$description" \
            --overwrite
    else
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --type "String" \
            --description "$description" \
            --overwrite
    fi
}

# AWS Configuration Parameters
echo -e "${GREEN}Setting up AWS configuration parameters...${NC}"
create_parameter "/eams/dev/config/region" "us-east-1" "AWS Region"
create_parameter "/eams/dev/config/account-id" "$ACCOUNT_ID" "AWS Account ID"

# Cognito Configuration Parameters
echo -e "${GREEN}Setting up Cognito configuration parameters...${NC}"
create_parameter "/eams/dev/config/user-pool-id" "us-east-1_CevZu4sdm" "Cognito User Pool ID"
create_parameter "/eams/dev/config/user-pool-client-id" "qevb9qr68ddbm2tr7grmlgtus" "Cognito User Pool Client ID"
create_parameter "/eams/dev/config/identity-pool-id" "us-east-1:2b17b6f2-9995-42c2-83d4-e1e5f443b7da" "Cognito Identity Pool ID"

# DynamoDB Table Names
echo -e "${GREEN}Setting up DynamoDB table parameters...${NC}"
create_parameter "/eams/dev/config/usersTable" "eams-dev-users" "DynamoDB Users Table Name"
create_parameter "/eams/dev/config/companiesTable" "eams-dev-companies" "DynamoDB Companies Table Name"
create_parameter "/eams/dev/config/projectsTable" "eams-dev-projects" "DynamoDB Projects Table Name"
create_parameter "/eams/dev/config/applicationsTable" "eams-dev-applications" "DynamoDB Applications Table Name"

# S3 Configuration
echo -e "${GREEN}Setting up S3 configuration parameters...${NC}"
create_parameter "/eams/dev/config/s3-file-bucket" "eams-dev-discovery-${ACCOUNT_ID}" "S3 File Bucket Name"

# Note about AWS credentials
echo -e "${YELLOW}Note: AWS credentials should be managed through IAM roles, not stored in SSM.${NC}"
echo -e "${YELLOW}The application will use the default AWS credential chain.${NC}"

# Optional: Create IAM role for the application
echo -e "${GREEN}Creating IAM role for EAMS Discovery application...${NC}"

# Create trust policy for the role
cat > /tmp/eams-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role if it doesn't exist
if ! aws iam get-role --role-name EAMSDiscoveryRole &> /dev/null; then
    aws iam create-role \
        --role-name EAMSDiscoveryRole \
        --assume-role-policy-document file:///tmp/eams-trust-policy.json \
        --description "Role for EAMS Discovery application"
    
    echo -e "${GREEN}Created IAM role: EAMSDiscoveryRole${NC}"
else
    echo -e "${YELLOW}IAM role EAMSDiscoveryRole already exists${NC}"
fi

# Attach necessary policies
echo -e "${GREEN}Attaching policies to IAM role...${NC}"

# Attach basic Lambda execution policy
aws iam attach-role-policy \
    --role-name EAMSDiscoveryRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Attach DynamoDB full access policy
aws iam attach-role-policy \
    --role-name EAMSDiscoveryRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# Attach S3 full access policy
aws iam attach-role-policy \
    --role-name EAMSDiscoveryRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach Cognito full access policy
aws iam attach-role-policy \
    --role-name EAMSDiscoveryRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonCognitoPowerUser

# Attach SSM read access policy
aws iam attach-role-policy \
    --role-name EAMSDiscoveryRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess

# Clean up temporary files
rm -f /tmp/eams-trust-policy.json

echo -e "${GREEN}SSM parameters setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Deploy your Lambda functions with the EAMSDiscoveryRole"
echo -e "2. Ensure your application uses the default AWS credential chain"
echo -e "3. Test the application to verify SSM parameter access"
