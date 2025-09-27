#!/bin/bash

# AWS Cleanup Script for Application Management System
# This script removes all existing users and data to start fresh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 AWS Cleanup Script${NC}"
echo "=================================="
echo "This script will remove ALL existing data from:"
echo "  - Cognito User Pool (users, groups, etc.)"
echo "  - DynamoDB tables"
echo "  - S3 buckets (optional)"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get current AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID} (${AWS_REGION})${NC}"

# Function to confirm action
confirm_action() {
    local message="$1"
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: ${message}${NC}"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ $confirm != "yes" ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
}

# Function to check if resource exists
resource_exists() {
    local resource_type="$1"
    local resource_name="$2"
    
    case $resource_type in
        "user-pool")
            aws cognito-idp describe-user-pool --user-pool-id "$resource_name" &> /dev/null
            ;;
        "dynamodb-table")
            aws dynamodb describe-table --table-name "$resource_name" &> /dev/null
            ;;
        "s3-bucket")
            aws s3 ls "s3://$resource_name" &> /dev/null
            ;;
    esac
}

# Function to cleanup Cognito User Pool
cleanup_cognito() {
    echo ""
    echo -e "${YELLOW}🔐 Cleaning up Cognito User Pool...${NC}"
    
    # List all user pools
    USER_POOLS=$(aws cognito-idp list-user-pools --max-items 20 --query 'UserPools[?contains(Name, `app-management`)].Id' --output text)
    
    if [[ -z "$USER_POOLS" ]]; then
        echo "No Cognito User Pools found with 'app-management' in the name."
        return
    fi
    
    for USER_POOL_ID in $USER_POOLS; do
        echo "Found User Pool: $USER_POOL_ID"
        
        # Get user pool details
        USER_POOL_NAME=$(aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" --query 'UserPool.Name' --output text)
        echo "User Pool Name: $USER_POOL_NAME"
        
        # List all users
        USERS=$(aws cognito-idp list-users --user-pool-id "$USER_POOL_ID" --query 'Users[].Username' --output text)
        
        if [[ -n "$USERS" ]]; then
            echo "Found ${#USERS[@]} users. Removing..."
            
            for USERNAME in $USERS; do
                echo "  Removing user: $USERNAME"
                aws cognito-idp admin-delete-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" || echo "  Failed to remove user: $USERNAME"
            done
        else
            echo "No users found in this pool."
        fi
        
        # List and remove groups
        GROUPS=$(aws cognito-idp list-groups --user-pool-id "$USER_POOL_ID" --query 'Groups[].GroupName' --output text)
        
        if [[ -n "$GROUPS" ]]; then
            echo "Found ${#GROUPS[@]} groups. Removing..."
            
            for GROUP_NAME in $GROUPS; do
                echo "  Removing group: $GROUP_NAME"
                aws cognito-idp delete-group --user-pool-id "$USER_POOL_ID" --group-name "$GROUP_NAME" || echo "  Failed to remove group: $GROUP_NAME"
            done
        fi
        
        # List and remove user pool clients
        CLIENTS=$(aws cognito-idp list-user-pool-clients --user-pool-id "$USER_POOL_ID" --query 'UserPoolClients[].ClientId' --output text)
        
        if [[ -n "$CLIENTS" ]]; then
            echo "Found ${#CLIENTS[@]} user pool clients. Removing..."
            
            for CLIENT_ID in $CLIENTS; do
                echo "  Removing client: $CLIENT_ID"
                aws cognito-idp delete-user-pool-client --user-pool-id "$USER_POOL_ID" --client-id "$CLIENT_ID" || echo "  Failed to remove client: $CLIENT_ID"
            done
        fi
        
        # List and remove identity pools
        IDENTITY_POOLS=$(aws cognito-identity list-identity-pools --max-results 60 --query 'IdentityPools[?contains(IdentityPoolName, `app-management`)].IdentityPoolId' --output text)
        
        if [[ -n "$IDENTITY_POOLS" ]]; then
            echo "Found ${#IDENTITY_POOLS[@]} identity pools. Removing..."
            
            for IDENTITY_POOL_ID in $IDENTITY_POOLS; do
                echo "  Removing identity pool: $IDENTITY_POOL_ID"
                aws cognito-identity delete-identity-pool --identity-pool-id "$IDENTITY_POOL_ID" || echo "  Failed to remove identity pool: $IDENTITY_POOL_ID"
            done
        fi
        
        echo -e "${GREEN}✅ Cognito User Pool cleanup completed for: $USER_POOL_NAME${NC}"
    done
}

# Function to cleanup DynamoDB tables
cleanup_dynamodb() {
    echo ""
    echo -e "${YELLOW}🗄️  Cleaning up DynamoDB tables...${NC}"
    
    # List all tables with 'app-management' in the name
    TABLES=$(aws dynamodb list-tables --query 'TableNames[?contains(@, `app-management`)]' --output text)
    
    if [[ -z "$TABLES" ]]; then
        echo "No DynamoDB tables found with 'app-management' in the name."
        return
    fi
    
    for TABLE_NAME in $TABLES; do
        echo "Found table: $TABLE_NAME"
        
        # Scan and delete all items
        echo "  Scanning table for items..."
        ITEMS=$(aws dynamodb scan --table-name "$TABLE_NAME" --attributes-to-get "id" --query 'Items[].id.S' --output text)
        
        if [[ -n "$ITEMS" ]]; then
            echo "  Found ${#ITEMS[@]} items. Removing..."
            
            for ITEM_ID in $ITEMS; do
                echo "    Removing item: $ITEM_ID"
                aws dynamodb delete-item \
                    --table-name "$TABLE_NAME" \
                    --key "{\"id\":{\"S\":\"$ITEM_ID\"}}" || echo "    Failed to remove item: $ITEM_ID"
            done
        else
            echo "  No items found in table."
        fi
        
        echo -e "${GREEN}✅ DynamoDB table cleanup completed for: $TABLE_NAME${NC}"
    done
}

# Function to cleanup S3 buckets (optional)
cleanup_s3() {
    echo ""
    echo -e "${YELLOW}🪣 Cleaning up S3 buckets...${NC}"
    
    # List all buckets with 'app-management' in the name
    BUCKETS=$(aws s3api list-buckets --query 'Buckets[?contains(Name, `app-management`)].Name' --output text)
    
    if [[ -z "$BUCKETS" ]]; then
        echo "No S3 buckets found with 'app-management' in the name."
        return
    fi
    
    for BUCKET_NAME in $BUCKETS; do
        echo "Found bucket: $BUCKET_NAME"
        
        # Check if bucket is empty
        OBJECT_COUNT=$(aws s3api list-objects-v2 --bucket "$BUCKET_NAME" --query 'KeyCount' --output text)
        
        if [[ "$OBJECT_COUNT" -gt 0 ]]; then
            echo "  Bucket contains $OBJECT_COUNT objects."
            
            read -p "  Do you want to delete all objects in this bucket? (yes/no): " delete_objects
            if [[ $delete_objects == "yes" ]]; then
                echo "  Removing all objects..."
                aws s3 rm "s3://$BUCKET_NAME" --recursive || echo "    Failed to remove objects"
                echo "  Objects removed."
            fi
        else
            echo "  Bucket is empty."
        fi
        
        # Ask if user wants to delete the bucket itself
        read -p "  Do you want to delete this bucket? (yes/no): " delete_bucket
        if [[ $delete_bucket == "yes" ]]; then
            echo "  Deleting bucket..."
            aws s3api delete-bucket --bucket "$BUCKET_NAME" || echo "    Failed to delete bucket"
            echo "  Bucket deleted."
        fi
        
        echo -e "${GREEN}✅ S3 bucket cleanup completed for: $BUCKET_NAME${NC}"
    done
}

# Function to cleanup CloudFormation stacks
cleanup_cloudformation() {
    echo ""
    echo -e "${YELLOW}☁️  Cleaning up CloudFormation stacks...${NC}"
    
    # List all stacks with 'app-management' in the name
    STACKS=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[?contains(StackName, `app-management`)].StackName' --output text)
    
    if [[ -z "$STACKS" ]]; then
        echo "No CloudFormation stacks found with 'app-management' in the name."
        return
    fi
    
    for STACK_NAME in $STACKS; do
        echo "Found stack: $STACK_NAME"
        
        read -p "  Do you want to delete this CloudFormation stack? (yes/no): " delete_stack
        if [[ $delete_stack == "yes" ]]; then
            echo "  Deleting stack..."
            aws cloudformation delete-stack --stack-name "$STACK_NAME" || echo "    Failed to delete stack"
            echo "  Stack deletion initiated. This may take several minutes."
        fi
        
        echo -e "${GREEN}✅ CloudFormation stack cleanup completed for: $STACK_NAME${NC}"
    done
}

# Main cleanup process
main() {
    echo "This script will perform a COMPLETE cleanup of all AWS resources related to the Application Management System."
    echo "This action cannot be undone!"
    
    confirm_action "This will remove ALL users, data, and potentially infrastructure."
    
    # Perform cleanup in order
    cleanup_cognito
    cleanup_dynamodb
    cleanup_s3
    cleanup_cloudformation
    
    echo ""
    echo -e "${GREEN}🎉 AWS cleanup completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run the CloudFormation template to recreate infrastructure"
    echo "2. Set up GitHub repository with the setup script"
    echo "3. Configure GitHub secrets with new AWS resource values"
    echo "4. Deploy your application"
    echo ""
    echo "Your AWS environment is now clean and ready for fresh deployment!"
}

# Run main function
main "$@"


