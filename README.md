# Application Management System

A React-based application management system with AWS-native architecture, featuring SSO authentication, comprehensive application tracking, and dependency visualization.

## Features

- **SSO Authentication**: Azure AD integration via AWS Cognito
- **Application Management**: Complete CRUD operations for application data
- **Dependency Mapping**: Interactive mind map visualization of application dependencies
- **AWS Native**: Built on S3, DynamoDB, and Cognito for cost-effective scalability
- **Modern UI**: Material-UI based responsive interface

## Architecture

- **Frontend**: React 18 with Material-UI
- **Authentication**: AWS Cognito with Azure AD federation
- **Storage**: S3 for file attachments, DynamoDB for application data
- **Deployment**: S3 + CloudFront for static hosting
- **CI/CD**: GitHub Actions for automated deployment

## Prerequisites

- AWS Account
- Azure AD tenant
- Node.js 18+
- AWS CLI configured

## Setup Instructions

### 1. AWS Infrastructure Setup

```bash
# Deploy AWS infrastructure
aws cloudformation deploy \
  --template-file infrastructure/cloudformation.yml \
  --stack-name app-management-system \
  --capabilities CAPABILITY_NAMED_IAM
```

### 2. Environment Configuration

Create `.env.local` file:

```env
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-cognito-user-pool-id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your-cognito-client-id
REACT_APP_IDENTITY_POOL_ID=your-cognito-identity-pool-id
REACT_APP_S3_BUCKET=your-s3-bucket-name
REACT_APP_DYNAMODB_TABLE=your-dynamodb-table-name
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm start
```

### 5. Build for Production

```bash
npm run build
```

## Deployment

### Manual Deployment

```bash
# Build the application
npm run build

# Sync to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Automated Deployment

The repository includes GitHub Actions workflows for automatic deployment on push to main branch.

## Cost Optimization

- **S3**: Pay-per-use storage with intelligent tiering
- **DynamoDB**: On-demand pricing with auto-scaling
- **CloudFront**: Global CDN with edge caching
- **Cognito**: Pay-per-authentication

Estimated monthly cost: $5-15 for typical usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details


