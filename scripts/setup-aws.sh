#!/bin/bash

# Quick AWS Infrastructure Setup Script
# Deploys the CloudFormation stack for the Application Management System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}☁️  AWS Infrastructure Setup Script${NC}"
echo "=========================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get current AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID} (${AWS_REGION})${NC}"

# Function to get user input
get_input() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [[ -n "$default" ]]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# Get stack configuration
echo ""
echo -e "${BLUE}📋 Stack Configuration${NC}"
echo "========================"

STACK_NAME=$(get_input "CloudFormation stack name" "app-management-system")
ENVIRONMENT=$(get_input "Environment" "dev")
DOMAIN_NAME=$(get_input "Domain name (optional, press Enter to skip)" "")

# Build CloudFormation parameters
PARAMETERS="Environment=$ENVIRONMENT"
if [[ -n "$DOMAIN_NAME" ]]; then
    PARAMETERS="$PARAMETERS DomainName=$DOMAIN_NAME"
fi

echo ""
echo -e "${BLUE}🚀 Deploying CloudFormation Stack${NC}"
echo "====================================="

echo "Stack Name: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Parameters: $PARAMETERS"
echo ""

# Check if stack already exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Stack '$STACK_NAME' already exists.${NC}"
    read -p "Do you want to update it? (yes/no): " update_stack
    
    if [[ $update_stack == "yes" ]]; then
        echo "Updating existing stack..."
        OPERATION="update-stack"
    else
        echo "Stack update cancelled."
        exit 0
    fi
else
    echo "Creating new stack..."
    OPERATION="create-stack"
fi

# Deploy the stack
echo ""
echo "Deploying CloudFormation stack (this may take 5-10 minutes)..."
aws cloudformation $OPERATION \
    --stack-name "$STACK_NAME" \
    --template-body file://infrastructure/cloudformation.yml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters $PARAMETERS

echo ""
echo -e "${GREEN}✅ CloudFormation stack deployment initiated${NC}"
echo "Waiting for stack to complete..."

# Wait for stack to complete
aws cloudformation wait stack-$OPERATION-complete --stack-name "$STACK_NAME"

echo ""
echo -e "${GREEN}🎉 Infrastructure deployment completed successfully!${NC}"

# Get stack outputs
echo ""
echo -e "${BLUE}📊 Stack Outputs${NC}"
echo "================"

aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo -e "${GREEN}✅ Your AWS infrastructure is ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy the output values above"
echo "2. Run the local deployment script: ./scripts/deploy-local.sh"
echo "3. Use the output values when prompted"
echo ""
echo "The infrastructure includes:"
echo "  🪣 S3 buckets for website hosting and file storage"
echo "  🗄️  DynamoDB table for application data"
echo "  🔐 Cognito User Pool for authentication"
echo "  🚀 CloudFront distribution for global CDN"
echo ""
echo "You can now deploy your application!"


