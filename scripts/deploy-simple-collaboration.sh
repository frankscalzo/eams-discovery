#!/bin/bash

# Deploy Simple Collaboration Infrastructure for EAMS
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
STAGE="dev"
PROJECT_NAME="eams"
SERVICE_NAME="discovery"
AWS_REGION="us-east-1"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            STAGE="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set AWS region
export AWS_DEFAULT_REGION=$AWS_REGION

# Stack name
STACK_NAME="${PROJECT_NAME}-${SERVICE_NAME}-collaboration-${ENVIRONMENT}"

print_status "Deploying simple collaboration infrastructure..."
print_status "Environment: $ENVIRONMENT"
print_status "Project: $PROJECT_NAME"
print_status "Service: $SERVICE_NAME"
print_status "Region: $AWS_REGION"
print_status "Stack: $STACK_NAME"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS CLI is not configured or credentials are invalid"
    exit 1
fi

# Check if template file exists
TEMPLATE_FILE="infrastructure/pure-cf-collaboration.yml"
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    print_error "Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Prepare CloudFormation parameters
PARAMETERS=""
PARAMETERS="$PARAMETERS ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
PARAMETERS="$PARAMETERS ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME"
PARAMETERS="$PARAMETERS ParameterKey=ServiceName,ParameterValue=$SERVICE_NAME"

# Deploy CloudFormation stack
print_status "Deploying CloudFormation stack: $STACK_NAME"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" > /dev/null 2>&1; then
    print_status "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --tags Key=Environment,Value=$ENVIRONMENT Key=Project,Value=$PROJECT_NAME Key=Service,Value=$SERVICE_NAME
else
    print_status "Stack does not exist, creating..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --tags Key=Environment,Value=$ENVIRONMENT Key=Project,Value=$PROJECT_NAME Key=Service,Value=$SERVICE_NAME
fi

# Wait for stack to complete
print_status "Waiting for stack operation to complete..."
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" 2>/dev/null || \
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"

if [[ $? -eq 0 ]]; then
    print_success "Stack operation completed successfully!"
else
    print_error "Stack operation failed!"
    print_status "Checking stack events..."
    aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatus,ResourceStatusReason]' --output table
    exit 1
fi

# Get stack outputs
print_status "Retrieving stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs' --output json)

# Extract important outputs
WEBSOCKET_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="WebSocketAPIEndpoint") | .OutputValue')
CONNECTIONS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ConnectionsTableName") | .OutputValue')
WEBSOCKET_API_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="WebSocketAPIId") | .OutputValue')

# Update config.json with collaboration settings
print_status "Updating configuration..."

# Create or update config.json
CONFIG_FILE="public/config.json"
if [[ -f "$CONFIG_FILE" ]]; then
    # Update existing config
    jq --arg ws_endpoint "$WEBSOCKET_ENDPOINT" \
       --arg connections_table "$CONNECTIONS_TABLE" \
       --arg ws_api_id "$WEBSOCKET_API_ID" \
       '. + {
         WEBSOCKET_ENDPOINT: $ws_endpoint,
         CONNECTIONS_TABLE: $connections_table,
         WEBSOCKET_API_ID: $ws_api_id
       }' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
else
    # Create new config
    cat > "$CONFIG_FILE" << EOF
{
  "WEBSOCKET_ENDPOINT": "$WEBSOCKET_ENDPOINT",
  "CONNECTIONS_TABLE": "$CONNECTIONS_TABLE",
  "WEBSOCKET_API_ID": "$WEBSOCKET_API_ID"
}
EOF
fi

# Create environment-specific config
ENV_CONFIG_FILE="deploy.${ENVIRONMENT}.env"
if [[ -f "$ENV_CONFIG_FILE" ]]; then
    # Update existing env file
    if ! grep -q "WEBSOCKET_ENDPOINT" "$ENV_CONFIG_FILE"; then
        echo "" >> "$ENV_CONFIG_FILE"
        echo "# Collaboration Settings" >> "$ENV_CONFIG_FILE"
        echo "WEBSOCKET_ENDPOINT=$WEBSOCKET_ENDPOINT" >> "$ENV_CONFIG_FILE"
        echo "CONNECTIONS_TABLE=$CONNECTIONS_TABLE" >> "$ENV_CONFIG_FILE"
        echo "WEBSOCKET_API_ID=$WEBSOCKET_API_ID" >> "$ENV_CONFIG_FILE"
    fi
else
    # Create new env file
    cat > "$ENV_CONFIG_FILE" << EOF
# EAMS Environment Configuration - $ENVIRONMENT
ENVIRONMENT=$ENVIRONMENT
STAGE=$STAGE
PROJECT_NAME=$PROJECT_NAME
SERVICE_NAME=$SERVICE_NAME
AWS_REGION=$AWS_REGION

# Collaboration Settings
WEBSOCKET_ENDPOINT=$WEBSOCKET_ENDPOINT
CONNECTIONS_TABLE=$CONNECTIONS_TABLE
WEBSOCKET_API_ID=$WEBSOCKET_API_ID
EOF
fi

# Install Lambda dependencies
print_status "Installing Lambda dependencies..."
if [[ -d "src/lambda/websocket" ]]; then
    cd src/lambda/websocket
    if [[ ! -f "package.json" ]]; then
        npm init -y
        npm install aws-sdk
    else
        npm install
    fi
    cd - > /dev/null
fi

# Package and update Lambda function
print_status "Packaging Lambda function..."

# Package WebSocket handler
if [[ -d "src/lambda/websocket" ]]; then
    cd src/lambda/websocket
    zip -r ../../../websocket-handler.zip . -x "*.git*" "node_modules/.cache/*"
    cd - > /dev/null
    
    # Update Lambda function code
    aws lambda update-function-code \
        --function-name "${PROJECT_NAME}-${SERVICE_NAME}-websocket-handler-${ENVIRONMENT}" \
        --zip-file fileb://websocket-handler.zip
    
    rm websocket-handler.zip
fi

# Display results
print_success "Simple collaboration infrastructure deployed successfully!"
echo ""
print_status "Stack Outputs:"
echo "  WebSocket Endpoint: $WEBSOCKET_ENDPOINT"
echo "  Connections Table: $CONNECTIONS_TABLE"
echo "  WebSocket API ID: $WEBSOCKET_API_ID"
echo ""
print_status "Configuration updated:"
echo "  - $CONFIG_FILE"
echo "  - $ENV_CONFIG_FILE"
echo ""
print_status "Next steps:"
echo "  1. Update your React app to use the WebSocket endpoint"
echo "  2. Test real-time collaboration features"
echo ""
print_status "To test the WebSocket connection:"
echo "  wscat -c '$WEBSOCKET_ENDPOINT?userId=test&entityType=company&entityId=123'"
