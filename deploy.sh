#!/bin/bash

# One-Command Deployment Script
# Sets up AWS infrastructure and deploys the application

set -e

echo "🚀 Application Management System - Quick Deploy"
echo "=============================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_VERSION -lt 22 ]]; then
    echo "❌ Node.js 22+ is required. Current version: $(node --version)"
    echo "Please run: nvm install 22 && nvm use 22"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if scripts directory exists
if [[ ! -d "scripts" ]]; then
    echo "❌ Scripts directory not found. Please run this from the project root."
    exit 1
fi

# Make all scripts executable
chmod +x scripts/*.sh

echo "✅ Scripts made executable"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    echo ""
    echo "Quick setup:"
    echo "  aws configure"
    echo "  # Enter your AWS Access Key ID, Secret Access Key, and region"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Load environment configuration
if [[ -f "deploy.env.local" ]]; then
    echo "Loading custom configuration from deploy.env.local..."
    source deploy.env.local
elif [[ -f "deploy.env" ]]; then
    echo "Loading configuration from deploy.env..."
    source deploy.env
fi

# Get AWS account info and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${AWS_REGION:-$(aws configure get region)}"
ENVIRONMENT="${ENVIRONMENT:-dev}"  # Default environment

echo "AWS Account: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1. Deploy everything (infrastructure + application) - RECOMMENDED"
echo "2. Deploy only infrastructure"
echo "3. Deploy only application (requires existing infrastructure)"
echo "4. Clean up existing data"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying everything end-to-end..."
        echo ""
        echo "Step 1: Setting up AWS infrastructure..."
        echo "This will create S3 buckets, DynamoDB tables, Cognito pools, and CloudFront distribution."
        echo ""
        
        # Set automatic naming conventions
        STACK_NAME="${ENVIRONMENT}-app-management-system"
        S3_BUCKET="${ENVIRONMENT}-app-management-${AWS_ACCOUNT_ID}"
        DYNAMODB_TABLE="${ENVIRONMENT}-applications"
        USER_POOL_NAME="${ENVIRONMENT}-app-management-users"
        USER_POOL_CLIENT_NAME="${ENVIRONMENT}-app-management-web-client"
        IDENTITY_POOL_NAME="${ENVIRONMENT}-app-management-identity"
        
        echo "Automatic resource naming:"
        echo "  Stack Name: $STACK_NAME"
        echo "  S3 Bucket: $S3_BUCKET"
        echo "  DynamoDB Table: $DYNAMODB_TABLE"
        echo "  User Pool: $USER_POOL_NAME"
        echo "  Identity Pool: $IDENTITY_POOL_NAME"
        echo ""
        
        # Deploy infrastructure with automatic naming
        echo "Deploying CloudFormation stack..."
        aws cloudformation deploy \
            --stack-name "$STACK_NAME" \
            --template-file infrastructure/cloudformation.yml \
            --capabilities CAPABILITY_NAMED_IAM \
            --parameter-overrides Environment="$ENVIRONMENT"
        
        echo "Waiting for stack to complete..."
        aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"
        
        echo "✅ Infrastructure deployment completed!"
        
        # Get stack outputs
        echo ""
        echo "📊 Getting resource details..."
        STACK_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json)
        
        # Extract specific values (using grep and sed as fallback if jq not available)
        USER_POOL_ID=$(echo "$STACK_OUTPUTS" | grep -o '"UserPoolId"[^,]*' | grep -o '[a-z0-9-]*' | head -1)
        USER_POOL_CLIENT_ID=$(echo "$STACK_OUTPUTS" | grep -o '"UserPoolClientId"[^,]*' | grep -o '[a-z0-9-]*' | head -1)
        IDENTITY_POOL_ID=$(echo "$STACK_OUTPUTS" | grep -o '"IdentityPoolId"[^,]*' | grep -o '[a-z0-9-]*' | head -1)
        CLOUDFRONT_DISTRIBUTION_ID=$(echo "$STACK_OUTPUTS" | grep -o '"CloudFrontDistributionId"[^,]*' | grep -o '[a-z0-9-]*' | head -1)
        
        echo "✅ Infrastructure resources identified:"
        echo "  S3 Bucket: $S3_BUCKET"
        echo "  DynamoDB Table: $DYNAMODB_TABLE"
        echo "  User Pool ID: $USER_POOL_ID"
        echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
        echo "  Identity Pool ID: $IDENTITY_POOL_ID"
        echo "  CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_ID"
        
        echo ""
        echo "Step 2: Deploying application with infrastructure details..."
        
        # Set environment variables for the deployment
        export REACT_APP_AWS_REGION="$AWS_REGION"
        export REACT_APP_USER_POOL_ID="$USER_POOL_ID"
        export REACT_APP_USER_POOL_WEB_CLIENT_ID="$USER_POOL_CLIENT_ID"
        export REACT_APP_IDENTITY_POOL_ID="$IDENTITY_POOL_ID"
        export REACT_APP_S3_BUCKET="$S3_BUCKET"
        export REACT_APP_DYNAMODB_TABLE="$DYNAMODB_TABLE"
        
        # Now deploy the application with the correct resource names
        echo "Building and deploying application..."
        
        # Install dependencies if needed
        if [[ ! -d "node_modules" ]]; then
            echo "Installing dependencies..."
            npm install
        fi
        
        # Build the application
        echo "Building React application..."
        npm run build
        
        if [[ ! -d "build" ]]; then
            echo "❌ Build failed - 'build' directory not found"
            exit 1
        fi
        
        echo "✅ Build completed successfully"
        
        # Deploy to S3
        echo "Deploying to S3 bucket: $S3_BUCKET"
        aws s3 sync build/ "s3://$S3_BUCKET" --delete
        
        echo "✅ Deployment to S3 completed"
        
        # Invalidate CloudFront if available
        if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" && "$CLOUDFRONT_DISTRIBUTION_ID" != "null" ]]; then
            echo "Invalidating CloudFront cache..."
            aws cloudfront create-invalidation \
                --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
                --paths "/*"
            echo "✅ CloudFront cache invalidation initiated"
        fi
        
        # Get S3 website URL
        S3_WEBSITE_URL=$(aws s3api get-bucket-website --bucket "$S3_BUCKET" --query 'WebsiteEndpoint' --output text 2>/dev/null || echo "")
        
        echo ""
        echo "🎉 End-to-end deployment completed successfully!"
        echo "=============================================="
        echo ""
        echo "Your Application Management System is now running at:"
        if [[ -n "$S3_WEBSITE_URL" ]]; then
            echo "  🌐 S3 Website: http://$S3_WEBSITE_URL"
        fi
        echo "  🪣 S3 Bucket: $S3_BUCKET"
        echo "  🗄️  DynamoDB Table: $DYNAMODB_TABLE"
        echo "  🔐 Cognito User Pool: $USER_POOL_ID"
        echo ""
        echo "Next steps:"
        echo "1. Visit your application URL"
        echo "2. Create your first user in Cognito"
        echo "3. Start managing applications!"
        ;;
    2)
        echo ""
        echo "☁️  Deploying only infrastructure..."
        STACK_NAME="${ENVIRONMENT}-app-management-system"
        echo "Deploying stack: $STACK_NAME"
        aws cloudformation deploy \
            --stack-name "$STACK_NAME" \
            --template-file infrastructure/cloudformation.yml \
            --capabilities CAPABILITY_NAMED_IAM \
            --parameter-overrides Environment="$ENVIRONMENT"
        ;;
    3)
        echo ""
        echo "📱 Deploying only application..."
        ./scripts/deploy-local.sh
        ;;
    4)
        echo ""
        echo "🧹 Cleaning up data..."
        echo "Choose cleanup type:"
        echo "1. Data only (preserves infrastructure)"
        echo "2. Everything (removes infrastructure too)"
        echo ""
        read -p "Choose cleanup type (1-2): " cleanup_choice
        
        case $cleanup_choice in
            1)
                ./scripts/cleanup-data-only.sh
                ;;
            2)
                ./scripts/cleanup-aws.sh
                ;;
            *)
                echo "Invalid choice. Exiting."
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "🎉 Process completed!"
echo ""
echo "Your Application Management System should now be running in AWS!"
echo "Check the output above for your application URL."
