#!/bin/bash

# Simple deployment script using working patterns from ohit-aws-transfer
set -e

echo "🚀 Simple Application Management System Deployment"
echo "================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID and Region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo "✅ AWS CLI configured"
echo "🏦 AWS Account: $AWS_ACCOUNT_ID"
echo "🌍 AWS Region: $AWS_REGION"

# Create a simple S3 bucket for hosting
BUCKET_NAME="app-management-${AWS_ACCOUNT_ID}-${RANDOM}"
echo "📦 Creating S3 bucket: $BUCKET_NAME"

aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

# Configure bucket for static website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Set bucket policy for public read access
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
rm bucket-policy.json

# Create a simple Cognito User Pool
echo "🔐 Creating Cognito User Pool..."

USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "app-management-users" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": false
        }
    }' \
    --auto-verified-attributes email \
    --query 'UserPool.Id' \
    --output text)

echo "✅ User Pool created: $USER_POOL_ID"

# Create User Pool Client
USER_POOL_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id $USER_POOL_ID \
    --client-name "app-management-web-client" \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --prevent-user-existence-errors ENABLED \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✅ User Pool Client created: $USER_POOL_CLIENT_ID"

# Create Identity Pool
IDENTITY_POOL_ID=$(aws cognito-identity create-identity-pool \
    --identity-pool-name "app-management-identity" \
    --allow-unauthenticated-identities false \
    --cognito-identity-providers ProviderName="cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}",ClientId="${USER_POOL_CLIENT_ID}" \
    --query 'IdentityPoolId' \
    --output text)

echo "✅ Identity Pool created: $IDENTITY_POOL_ID"

# Create DynamoDB table
TABLE_NAME="app-management-${AWS_ACCOUNT_ID}"
echo "🗄️ Creating DynamoDB table: $TABLE_NAME"

aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region $AWS_REGION

echo "✅ DynamoDB table created"

# Wait for table to be active
echo "⏳ Waiting for DynamoDB table to be active..."
aws dynamodb wait table-exists --table-name $TABLE_NAME --region $AWS_REGION

# Create a test user
echo "👤 Creating test user..."
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username "admin@example.com" \
    --user-attributes Name=email,Value="admin@example.com" Name=email_verified,Value=true \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username "admin@example.com" \
    --password "TempPass123!" \
    --permanent

echo "✅ Test user created: admin@example.com / TempPass123!"

# Build the React app
echo "🏗️ Building React application..."
npm install
npm run build

# Upload to S3
echo "📤 Uploading application to S3..."
aws s3 sync build/ s3://$BUCKET_NAME --delete

# Create environment file for the app
cat > build/config.json << EOF
{
  "awsRegion": "$AWS_REGION",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "identityPoolId": "$IDENTITY_POOL_ID",
  "dynamoDbTableName": "$TABLE_NAME",
  "apiBaseUrl": "https://api.example.com"
}
EOF

aws s3 cp build/config.json s3://$BUCKET_NAME/config.json

# Get the website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "🌐 Application URL: $WEBSITE_URL"
echo "👤 Test User: admin@example.com"
echo "🔑 Test Password: TempPass123!"
echo ""
echo "📊 Resources Created:"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   User Pool: $USER_POOL_ID"
echo "   Identity Pool: $IDENTITY_POOL_ID"
echo "   DynamoDB Table: $TABLE_NAME"
echo ""
echo "🔧 Next Steps:"
echo "   1. Visit the application URL"
echo "   2. Login with the test credentials"
echo "   3. Start creating projects and applications"
echo ""
echo "💡 To clean up resources later, run:"
echo "   aws s3 rb s3://$BUCKET_NAME --force"
echo "   aws cognito-idp delete-user-pool --user-pool-id $USER_POOL_ID"
echo "   aws cognito-identity delete-identity-pool --identity-pool-id $IDENTITY_POOL_ID"
echo "   aws dynamodb delete-table --table-name $TABLE_NAME"
