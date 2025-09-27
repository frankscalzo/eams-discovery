#!/bin/bash

# Local Deployment Script for Application Management System
# Deploys directly to AWS without GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Local AWS Deployment Script${NC}"
echo "=================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get current AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID} (${AWS_REGION})${NC}"

# Check if required environment variables are set
if [[ -z "$REACT_APP_AWS_REGION" ]]; then
    echo -e "${YELLOW}⚠️  REACT_APP_AWS_REGION not set, using AWS CLI region: ${AWS_REGION}${NC}"
    export REACT_APP_AWS_REGION="$AWS_REGION"
fi

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

# Function to validate S3 bucket exists
validate_s3_bucket() {
    local bucket="$1"
    if aws s3 ls "s3://$bucket" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to validate DynamoDB table exists
validate_dynamodb_table() {
    local table="$1"
    if aws dynamodb describe-table --table-name "$table" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Get deployment configuration
echo ""
echo -e "${BLUE}📋 Deployment Configuration${NC}"
echo "================================"

S3_BUCKET=$(get_input "S3 bucket name for website hosting")
if ! validate_s3_bucket "$S3_BUCKET"; then
    echo -e "${RED}❌ S3 bucket '$S3_BUCKET' does not exist or is not accessible${NC}"
    exit 1
fi

DYNAMODB_TABLE=$(get_input "DynamoDB table name for applications")
if ! validate_dynamodb_table "$DYNAMODB_TABLE"; then
    echo -e "${RED}❌ DynamoDB table '$DYNAMODB_TABLE' does not exist or is not accessible${NC}"
    exit 1
fi

USER_POOL_ID=$(get_input "Cognito User Pool ID")
USER_POOL_CLIENT_ID=$(get_input "Cognito User Pool Client ID")
IDENTITY_POOL_ID=$(get_input "Cognito Identity Pool ID")

# Optional CloudFront distribution ID
CLOUDFRONT_DISTRIBUTION_ID=$(get_input "CloudFront Distribution ID (optional, press Enter to skip)")

# Set environment variables for build
export REACT_APP_AWS_REGION="$AWS_REGION"
export REACT_APP_USER_POOL_ID="$USER_POOL_ID"
export REACT_APP_USER_POOL_WEB_CLIENT_ID="$USER_POOL_CLIENT_ID"
export REACT_APP_IDENTITY_POOL_ID="$IDENTITY_POOL_ID"
export REACT_APP_S3_BUCKET="$S3_BUCKET"
export REACT_APP_DYNAMODB_TABLE="$DYNAMODB_TABLE"

echo ""
echo -e "${BLUE}🔧 Building Application${NC}"
echo "========================"

# Install dependencies if node_modules doesn't exist
if [[ ! -d "node_modules" ]]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the application
echo "Building React application..."
npm run build

if [[ ! -d "build" ]]; then
    echo -e "${RED}❌ Build failed - 'build' directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Deploy to S3
echo ""
echo -e "${BLUE}📤 Deploying to S3${NC}"
echo "=================="

echo "Syncing build files to S3 bucket: $S3_BUCKET"
aws s3 sync build/ "s3://$S3_BUCKET" --delete

echo -e "${GREEN}✅ Deployment to S3 completed${NC}"

# Invalidate CloudFront cache if distribution ID provided
if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    echo ""
    echo -e "${BLUE}🔄 Invalidating CloudFront Cache${NC}"
    echo "================================"
    
    echo "Creating CloudFront invalidation..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    echo "CloudFront invalidation created: $INVALIDATION_ID"
    echo -e "${GREEN}✅ CloudFront cache invalidation initiated${NC}"
fi

# Get S3 website URL
S3_WEBSITE_URL=$(aws s3api get-bucket-website --bucket "$S3_BUCKET" --query 'WebsiteEndpoint' --output text 2>/dev/null || echo "")

echo ""
echo -e "${GREEN}🎉 Deployment Completed Successfully!${NC}"
echo "=========================================="
echo ""
echo "Application deployed to:"
echo "  🌐 S3 Bucket: $S3_BUCKET"
if [[ -n "$S3_WEBSITE_URL" ]]; then
    echo "  🌐 S3 Website URL: http://$S3_WEBSITE_URL"
fi
if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    echo "  🚀 CloudFront: Distribution updated and cache invalidated"
fi
echo ""
echo "Environment variables set:"
echo "  REACT_APP_AWS_REGION: $REACT_APP_AWS_REGION"
echo "  REACT_APP_USER_POOL_ID: $USER_POOL_ID"
echo "  REACT_APP_USER_POOL_WEB_CLIENT_ID: $USER_POOL_CLIENT_ID"
echo "  REACT_APP_IDENTITY_POOL_ID: $IDENTITY_POOL_ID"
echo "  REACT_APP_S3_BUCKET: $S3_BUCKET"
echo "  REACT_APP_DYNAMODB_TABLE: $DYNAMODB_TABLE"
echo ""
echo "Next steps:"
echo "1. Test your application at the S3 website URL"
echo "2. Set up your first user in Cognito"
echo "3. Test the application functionality"
echo ""
echo "To update the application later, just run this script again!"


