#!/bin/bash

# EAMS Environment Setup Script
# This script helps manage environment-specific configuration files

set -e

echo "🔧 EAMS Environment Setup"
echo "========================="

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  create [env]    Create a new environment file"
    echo "  copy [env]      Copy environment file to .env"
    echo "  validate [env]  Validate environment file"
    echo "  list            List all available environments"
    echo "  clean           Clean up .env files"
    echo ""
    echo "Environments: dev, stage, prod"
    echo ""
    echo "Examples:"
    echo "  $0 create dev"
    echo "  $0 copy dev"
    echo "  $0 validate prod"
    echo "  $0 list"
}

# Function to create environment file
create_env() {
    local env=$1
    local env_file="deploy.${env}.env"
    
    if [ -f "$env_file" ]; then
        echo "⚠️  Environment file $env_file already exists!"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Cancelled"
            exit 1
        fi
    fi
    
    echo "📝 Creating $env_file..."
    
    # Set environment-specific values
    case $env in
        "dev")
            ENV_NAME="dev"
            STAGE="dev"
            LOG_LEVEL="debug"
            ;;
        "stage")
            ENV_NAME="staging"
            STAGE="stage"
            LOG_LEVEL="info"
            ;;
        "prod")
            ENV_NAME="prod"
            STAGE="prod"
            LOG_LEVEL="warn"
            ;;
        *)
            echo "❌ Invalid environment: $env"
            exit 1
            ;;
    esac
    
    cat > "$env_file" << EOF
# EAMS ${ENV_NAME^} Environment Configuration
# This file is copied to .env during ${env} deployments

# Environment
ENVIRONMENT=${ENV_NAME}
STAGE=${STAGE}
PROJECT_NAME=eams
SERVICE_NAME=discovery

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=904233104383

# Domain Configuration
DOMAIN_NAME=optimumcloudservices.com
CUSTOM_DOMAIN=${STAGE}-discovery.optimumcloudservices.com
CLOUDFRONT_ALIASES=${STAGE}-discovery.optimumcloudservices.com

# SSL Certificate (must be in us-east-1 for CloudFront)
CERTIFICATE_ARN=arn:aws:acm:us-east-1:904233104383:certificate/your-${env}-certificate-id

# Cognito Configuration
COGNITO_DOMAIN_PREFIX=${STAGE}-eams
USER_POOL_NAME=${STAGE}-eams-users

# DynamoDB Configuration
DYNAMODB_TABLE_PREFIX=${STAGE}-eams

# S3 Configuration
S3_BUCKET_PREFIX=${STAGE}-eams

# API Gateway Configuration
API_GATEWAY_NAME=${STAGE}-eams-api

# Parameter Store Paths
PARAMETER_STORE_PREFIX=/eams/${STAGE}
SECRETS_MANAGER_PREFIX=/eams/${STAGE}

# Feature Flags
ENABLE_AI_PROCESSING=true
ENABLE_COST_MONITORING=true
ENABLE_BULK_UPLOAD=true
ENABLE_EXCEL_IMPORT=true
ENABLE_DEPENDENCY_MAPPING=true
ENABLE_IMPACT_ANALYSIS=true
ENABLE_REPORTING=true
ENABLE_MULTI_PROJECT=true
ENABLE_CUSTOM_DOMAIN=true
ENABLE_CLOUDFRONT=true
ENABLE_S3_HOSTING=true
ENABLE_DYNAMODB=true
ENABLE_COGNITO=true
ENABLE_API_GATEWAY=true
ENABLE_LAMBDA=true

# External Service Configuration
OPENAI_API_KEY=your-${env}-openai-key
ANTHROPIC_API_KEY=your-${env}-anthropic-key
AZURE_OPENAI_KEY=your-${env}-azure-key
AZURE_OPENAI_ENDPOINT=https://your-${env}-resource.openai.azure.com/

# Monitoring and Logging
LOG_LEVEL=${LOG_LEVEL}
ENABLE_CLOUDWATCH_LOGS=true
ENABLE_XRAY_TRACING=true

# Tags
TAG_PROJECT=EAMS
TAG_ENVIRONMENT=${ENV_NAME}
TAG_OWNER=OptimumCloudServices
TAG_COST_CENTER=IT-Architecture
TAG_APPLICATION=EnterpriseArchitectureManagement
EOF
    
    echo "✅ Created $env_file"
    echo "📝 Please update the following values:"
    echo "   - CERTIFICATE_ARN: Update with your actual certificate ARN"
    echo "   - External Service Keys: Update with your actual API keys"
    echo "   - AWS_ACCOUNT_ID: Update with your actual account ID"
}

# Function to copy environment file
copy_env() {
    local env=$1
    local env_file="deploy.${env}.env"
    
    if [ ! -f "$env_file" ]; then
        echo "❌ Environment file $env_file not found!"
        echo "Run '$0 create $env' to create it first."
        exit 1
    fi
    
    echo "📄 Copying $env_file to .env..."
    cp "$env_file" ".env"
    echo "✅ Copied $env_file to .env"
}

# Function to validate environment file
validate_env() {
    local env=$1
    local env_file="deploy.${env}.env"
    
    if [ ! -f "$env_file" ]; then
        echo "❌ Environment file $env_file not found!"
        exit 1
    fi
    
    echo "🔍 Validating $env_file..."
    
    # Source the file to check for syntax errors
    if source "$env_file" 2>/dev/null; then
        echo "✅ $env_file syntax is valid"
        
        # Check for required variables
        local required_vars=("ENVIRONMENT" "STAGE" "PROJECT_NAME" "SERVICE_NAME" "AWS_REGION" "DOMAIN_NAME")
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if [ -z "${!var}" ]; then
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -eq 0 ]; then
            echo "✅ All required variables are set"
        else
            echo "❌ Missing required variables: ${missing_vars[*]}"
            exit 1
        fi
    else
        echo "❌ $env_file has syntax errors"
        exit 1
    fi
}

# Function to list environments
list_envs() {
    echo "📋 Available environments:"
    for file in deploy.*.env; do
        if [ -f "$file" ]; then
            local env=$(echo "$file" | sed 's/deploy\.\(.*\)\.env/\1/')
            echo "   - $env ($file)"
        fi
    done
    
    if [ ! -f "deploy.*.env" ]; then
        echo "   No environment files found"
    fi
}

# Function to clean up .env files
clean_env() {
    echo "🧹 Cleaning up .env files..."
    
    if [ -f ".env" ]; then
        rm ".env"
        echo "✅ Removed .env"
    fi
    
    if [ -d "build" ] && [ -f "build/.env" ]; then
        rm "build/.env"
        echo "✅ Removed build/.env"
    fi
    
    echo "✅ Cleanup complete"
}

# Main script logic
case $1 in
    "create")
        if [ -z "$2" ]; then
            echo "❌ Please specify an environment"
            show_usage
            exit 1
        fi
        create_env "$2"
        ;;
    "copy")
        if [ -z "$2" ]; then
            echo "❌ Please specify an environment"
            show_usage
            exit 1
        fi
        copy_env "$2"
        ;;
    "validate")
        if [ -z "$2" ]; then
            echo "❌ Please specify an environment"
            show_usage
            exit 1
        fi
        validate_env "$2"
        ;;
    "list")
        list_envs
        ;;
    "clean")
        clean_env
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
