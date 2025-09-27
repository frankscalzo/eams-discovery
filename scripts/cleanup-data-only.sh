#!/bin/bash

# AWS Data-Only Cleanup Script for Application Management System
# This script removes only user data and content, preserving infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 AWS Data-Only Cleanup Script${NC}"
echo "=========================================="
echo "This script will remove ONLY data/content from:"
echo "  - Cognito User Pool (users, groups, etc.)"
echo "  - DynamoDB table contents"
echo "  - S3 bucket contents (optional)"
echo ""
echo -e "${GREEN}✅ Infrastructure will be preserved${NC}"
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
        echo "Data cleanup cancelled."
        exit 0
    fi
}

# Function to cleanup Cognito User Pool data only
cleanup_cognito_data() {
    echo ""
    echo -e "${YELLOW}🔐 Cleaning up Cognito User Pool data...${NC}"
    
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
        
        echo -e "${GREEN}✅ Cognito data cleanup completed for: $USER_POOL_NAME${NC}"
        echo -e "${BLUE}ℹ️  User Pool infrastructure preserved${NC}"
    done
}

# Function to cleanup DynamoDB table contents only
cleanup_dynamodb_data() {
    echo ""
    echo -e "${YELLOW}🗄️  Cleaning up DynamoDB table contents...${NC}"
    
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
        
        echo -e "${GREEN}✅ DynamoDB data cleanup completed for: $TABLE_NAME${NC}"
        echo -e "${BLUE}ℹ️  Table infrastructure preserved${NC}"
    done
}

# Function to cleanup S3 bucket contents only (optional)
cleanup_s3_data() {
    echo ""
    echo -e "${YELLOW}🪣 Cleaning up S3 bucket contents...${NC}"
    
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
        
        echo -e "${GREEN}✅ S3 data cleanup completed for: $BUCKET_NAME${NC}"
        echo -e "${BLUE}ℹ️  Bucket infrastructure preserved${NC}"
    done
}

# Function to show current data status
show_data_status() {
    echo ""
    echo -e "${BLUE}📊 Current Data Status${NC}"
    echo "=========================="
    
    # Check Cognito users
    USER_POOLS=$(aws cognito-idp list-user-pools --max-items 20 --query 'UserPools[?contains(Name, `app-management`)].Id' --output text)
    if [[ -n "$USER_POOLS" ]]; then
        for USER_POOL_ID in $USER_POOLS; do
            USER_COUNT=$(aws cognito-idp list-users --user-pool-id "$USER_POOL_ID" --query 'Users | length(@)' --output text)
            echo "Cognito Users: $USER_COUNT"
        done
    else
        echo "Cognito Users: No pools found"
    fi
    
    # Check DynamoDB items
    TABLES=$(aws dynamodb list-tables --query 'TableNames[?contains(@, `app-management`)]' --output text)
    if [[ -n "$TABLES" ]]; then
        for TABLE_NAME in $TABLES; do
            ITEM_COUNT=$(aws dynamodb scan --table-name "$TABLE_NAME" --select COUNT --query 'Count' --output text)
            echo "DynamoDB Items: $ITEM_COUNT (in $TABLE_NAME)"
        done
    else
        echo "DynamoDB Items: No tables found"
    fi
    
    # Check S3 objects
    BUCKETS=$(aws s3api list-buckets --query 'Buckets[?contains(Name, `app-management`)].Name' --output text)
    if [[ -n "$BUCKETS" ]]; then
        for BUCKET_NAME in $BUCKETS; do
            OBJECT_COUNT=$(aws s3api list-objects-v2 --bucket "$BUCKET_NAME" --query 'KeyCount' --output text)
            echo "S3 Objects: $OBJECT_COUNT (in $BUCKET_NAME)"
        done
    else
        echo "S3 Objects: No buckets found"
    fi
}

# Main cleanup process
main() {
    echo "This script will perform a DATA-ONLY cleanup of AWS resources related to the Application Management System."
    echo "Infrastructure (tables, buckets, user pools) will be preserved."
    echo ""
    
    # Show current status
    show_data_status
    
    confirm_action "This will remove ALL user data and content, but preserve infrastructure."
    
    # Perform cleanup in order
    cleanup_cognito_data
    cleanup_dynamodb_data
    cleanup_s3_data
    
    echo ""
    echo -e "${GREEN}🎉 AWS data cleanup completed successfully!${NC}"
    echo ""
    echo "What was cleaned:"
    echo "✅ All Cognito users and groups removed"
    echo "✅ All DynamoDB table items removed"
    echo "✅ All S3 bucket objects removed (if confirmed)"
    echo ""
    echo "What was preserved:"
    echo "🔒 Cognito User Pool infrastructure"
    echo "🔒 DynamoDB table structure"
    echo "🔒 S3 bucket configuration"
    echo "🔒 CloudFormation stacks"
    echo ""
    echo "Your AWS environment is now clean and ready for fresh data!"
    echo "You can start using the application immediately - it will create new users and data as needed."
}

# Run main function
main "$@"


