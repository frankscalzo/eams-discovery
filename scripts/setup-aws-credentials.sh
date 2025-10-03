#!/bin/bash

# Setup AWS Credentials in SSM Parameter Store
# This script stores AWS credentials in SSM for secure access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up AWS credentials in SSM Parameter Store...${NC}"

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

# Get current AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${YELLOW}Using AWS Account: ${AWS_ACCOUNT_ID}${NC}"

# Set the parameter prefix
PARAM_PREFIX="/eams/dev/aws"

# Function to create or update SSM parameter
create_or_update_param() {
    local param_name="$1"
    local param_value="$2"
    local description="$3"
    
    echo -e "${YELLOW}Setting parameter: ${param_name}${NC}"
    
    aws ssm put-parameter \
        --name "$param_name" \
        --value "$param_value" \
        --type "SecureString" \
        --description "$description" \
        --overwrite \
        --region us-east-1
}

# Store AWS credentials in SSM
create_or_update_param "${PARAM_PREFIX}/access-key-id" \
    "$AWS_ACCESS_KEY_ID" \
    "AWS Access Key ID for EAMS dev environment"

create_or_update_param "${PARAM_PREFIX}/secret-access-key" \
    "$AWS_SECRET_ACCESS_KEY" \
    "AWS Secret Access Key for EAMS dev environment"

create_or_update_param "${PARAM_PREFIX}/session-token" \
    "$AWS_SESSION_TOKEN" \
    "AWS Session Token for EAMS dev environment"

create_or_update_param "${PARAM_PREFIX}/region" \
    "us-east-1" \
    "AWS Region for EAMS dev environment"

create_or_update_param "${PARAM_PREFIX}/account-id" \
    "$AWS_ACCOUNT_ID" \
    "AWS Account ID for EAMS dev environment"

echo -e "${GREEN}✅ AWS credentials successfully stored in SSM Parameter Store${NC}"
echo -e "${YELLOW}Parameters created under: ${PARAM_PREFIX}${NC}"

# List the parameters to confirm
echo -e "\n${YELLOW}Created parameters:${NC}"
aws ssm describe-parameters \
    --parameter-filters "Key=Name,Option=BeginsWith,Values=${PARAM_PREFIX}" \
    --query 'Parameters[].Name' \
    --output table \
    --region us-east-1

echo -e "\n${GREEN}Setup complete! You can now reference these parameters in your application.${NC}"
