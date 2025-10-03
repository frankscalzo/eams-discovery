#!/bin/bash

# Deploy Normalized Database Structure
# This script creates the normalized database with lookup tables

set -e

# Load environment variables
source deploy.dev.env

echo "🚀 Deploying Normalized Database Structure..."

# Deploy CloudFormation stack
echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file infrastructure/normalized-database.yml \
    --stack-name $PROJECT_NAME-normalized-db-$ENVIRONMENT \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        ProjectName=$PROJECT_NAME \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

echo "✅ Database tables created successfully!"

# Initialize lookup tables with default data
echo "📊 Initializing lookup tables with default data..."

# Create a temporary Node.js script to initialize the tables
cat > temp_init_tables.js << 'EOF'
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';
const PROJECT_NAME = process.env.PROJECT_NAME || 'eams';
const ENVIRONMENT = process.env.ENVIRONMENT || 'dev';

const dynamoClient = new DynamoDBClient({ region: REGION });

const lookupData = {
  categories: [
    { id: 'admin', name: 'Administration', description: 'Administrative and ERP systems' },
    { id: 'clinical', name: 'Clinical', description: 'Clinical applications and systems' },
    { id: 'infrastructure', name: 'Infrastructure', description: 'Infrastructure and platform services' },
    { id: 'security', name: 'Security', description: 'Security and compliance tools' },
    { id: 'communication', name: 'Communication', description: 'Communication and collaboration tools' },
    { id: 'analytics', name: 'Analytics', description: 'Analytics and reporting tools' },
    { id: 'development', name: 'Development', description: 'Development and DevOps tools' },
    { id: 'productivity', name: 'Productivity', description: 'Productivity and office applications' },
    { id: 'other', name: 'Other', description: 'Other applications' }
  ],
  deploymentModels: [
    { id: 'cloud_saas', name: 'Cloud / SaaS', description: 'Cloud-based Software as a Service' },
    { id: 'cloud_hybrid', name: 'Cloud / SaaS (or Hybrid)', description: 'Hybrid cloud and SaaS solutions' },
    { id: 'on_premises', name: 'On-Premises', description: 'On-premises installations' },
    { id: 'unknown', name: 'Unknown / Needs vendor check', description: 'Deployment model needs verification' }
  ],
  statuses: [
    { id: 'active', name: 'Active', description: 'Currently in use and supported' },
    { id: 'inactive', name: 'Inactive', description: 'Not currently in use' },
    { id: 'deprecated', name: 'Deprecated', description: 'Scheduled for retirement' },
    { id: 'unknown', name: 'Unknown', description: 'Status needs verification' }
  ],
  tags: [
    { id: 'cloud', name: 'Cloud', description: 'Cloud-based solution' },
    { id: 'saas', name: 'SaaS', description: 'Software as a Service' },
    { id: 'on_premises', name: 'On-Premises', description: 'On-premises solution' },
    { id: 'hybrid', name: 'Hybrid', description: 'Hybrid deployment' },
    { id: 'critical', name: 'Critical', description: 'Critical business application' },
    { id: 'important', name: 'Important', description: 'Important business application' },
    { id: 'best_effort', name: 'Best Effort', description: 'Best effort support' },
    { id: 'retire', name: 'Retire', description: 'Scheduled for retirement' },
    { id: 'relocate', name: 'Relocate', description: 'Scheduled for relocation' },
    { id: 'retain', name: 'Retain', description: 'Retain in current state' },
    { id: 'redeploy', name: 'Redeploy', description: 'Scheduled for redeployment' },
    { id: 'phase_i', name: 'Phase I', description: 'Phase I implementation' },
    { id: 'phase_ii', name: 'Phase II', description: 'Phase II implementation' },
    { id: 'azure', name: 'Azure', description: 'Microsoft Azure related' },
    { id: 'aws', name: 'AWS', description: 'Amazon Web Services related' },
    { id: 'enterprise', name: 'Enterprise', description: 'Enterprise-grade solution' },
    { id: 'security', name: 'Security', description: 'Security-focused solution' },
    { id: 'productivity', name: 'Productivity', description: 'Productivity tool' },
    { id: 'collaboration', name: 'Collaboration', description: 'Collaboration tool' }
  ]
};

async function initializeTable(tableName, data) {
  console.log(`Initializing ${tableName} with ${data.length} items...`);
  
  for (const item of data) {
    try {
      const command = new PutItemCommand({
        TableName: tableName,
        Item: marshall({
          id: item.id,
          name: item.name,
          description: item.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      
      await dynamoClient.send(command);
    } catch (error) {
      console.error(`Error adding item to ${tableName}:`, error);
    }
  }
  
  console.log(`✅ ${tableName} initialized successfully!`);
}

async function main() {
  try {
    // Initialize each lookup table
    await initializeTable(`${PROJECT_NAME}-categories-${process.env.AWS_ACCOUNT_ID}`, lookupData.categories);
    await initializeTable(`${PROJECT_NAME}-deployment-models-${process.env.AWS_ACCOUNT_ID}`, lookupData.deploymentModels);
    await initializeTable(`${PROJECT_NAME}-statuses-${process.env.AWS_ACCOUNT_ID}`, lookupData.statuses);
    await initializeTable(`${PROJECT_NAME}-tags-${process.env.AWS_ACCOUNT_ID}`, lookupData.tags);
    
    console.log('🎉 All lookup tables initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing tables:', error);
    process.exit(1);
  }
}

main();
EOF

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Run the initialization script
AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID PROJECT_NAME=$PROJECT_NAME ENVIRONMENT=$ENVIRONMENT node temp_init_tables.js

# Clean up
rm temp_init_tables.js

echo "🎉 Normalized database deployment completed successfully!"
echo ""
echo "📋 Database Structure:"
echo "  • Main Entities Table: ${PROJECT_NAME}-unified-entities-${AWS_ACCOUNT_ID}"
echo "  • Categories Table: ${PROJECT_NAME}-categories-${AWS_ACCOUNT_ID}"
echo "  • Deployment Models Table: ${PROJECT_NAME}-deployment-models-${AWS_ACCOUNT_ID}"
echo "  • Vendors Table: ${PROJECT_NAME}-vendors-${AWS_ACCOUNT_ID}"
echo "  • Statuses Table: ${PROJECT_NAME}-statuses-${AWS_ACCOUNT_ID}"
echo "  • Tags Table: ${PROJECT_NAME}-tags-${AWS_ACCOUNT_ID}"
echo "  • Projects Table: ${PROJECT_NAME}-projects-${AWS_ACCOUNT_ID}"
echo "  • Companies Table: ${PROJECT_NAME}-companies-${AWS_ACCOUNT_ID}"
echo "  • Users Table: ${PROJECT_NAME}-users-${AWS_ACCOUNT_ID}"
echo ""
echo "💡 Next steps:"
echo "  1. Update your application to use the normalized data service"
echo "  2. Import your CSV data using the Data Importer"
echo "  3. Test the advanced filtering with real data"



