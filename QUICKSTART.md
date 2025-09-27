# 🚀 Quick Start Guide

Get your Application Management System up and running in AWS with GitHub Actions in under 30 minutes!

## Prerequisites

- [ ] AWS Account with admin access
- [ ] GitHub Account
- [ ] Node.js 18+ installed
- [ ] AWS CLI configured
- [ ] GitHub CLI installed

## Step 0: Clean Existing AWS Resources (Optional)

If you have existing AWS resources that you want to clean up before starting fresh:

```bash
# Make cleanup scripts executable
chmod +x scripts/cleanup-aws.sh
chmod +x scripts/cleanup-data-only.sh

# Option 1: Full cleanup (removes everything including infrastructure)
./scripts/cleanup-aws.sh

# Option 2: Data-only cleanup (preserves infrastructure, removes users/data)
./scripts/cleanup-data-only.sh
```

**Recommendation**: Use the data-only cleanup if you want to keep your infrastructure but start with fresh data.

## Step 1: Clone and Setup Repository

```bash
# Clone this repository
git clone <your-repo-url>
cd application-management-system

# Install dependencies
npm install

# Make setup script executable
chmod +x scripts/setup-github.sh
```

## Step 2: Create GitHub Repository

```bash
# Run the setup script
./scripts/setup-github.sh

# Follow the prompts to create your repository
```

## Step 3: Deploy AWS Infrastructure

```bash
# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file infrastructure/cloudformation.yml \
  --stack-name app-management-system \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides Environment=dev

# Wait for deployment to complete (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name app-management-system
```

## Step 4: Get AWS Resource Values

```bash
# Get the outputs from CloudFormation
aws cloudformation describe-stacks \
  --stack-name app-management-system \
  --query 'Stacks[0].Outputs'
```

## Step 5: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_USER_POOL_ID` | From CloudFormation output |
| `AWS_USER_POOL_WEB_CLIENT_ID` | From CloudFormation output |
| `AWS_IDENTITY_POOL_ID` | From CloudFormation output |
| `AWS_S3_BUCKET` | From CloudFormation output |
| `AWS_S3_BUCKET_DEV` | From CloudFormation output |
| `AWS_DYNAMODB_TABLE` | From CloudFormation output |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | From CloudFormation output |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID_DEV` | From CloudFormation output |
| `AWS_CLOUDFRONT_DOMAIN` | From CloudFormation output |
| `AWS_CLOUDFRONT_DOMAIN_DEV` | From CloudFormation output |

## Step 6: Deploy Your Application

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Initial setup complete"
git push origin main
```

## Step 7: Verify Deployment

1. Check GitHub Actions tab for deployment status
2. Visit your CloudFront URL
3. Test the login functionality

## 🎯 What You Get

- **React Application** with Material-UI
- **SSO Authentication** via AWS Cognito
- **Application Management Form** with all required fields
- **Dependency Visualization** with mind map
- **AWS-Native Architecture** (S3, DynamoDB, CloudFront)
- **Automated CI/CD** with GitHub Actions
- **Cost-Optimized** (~$3-5/month)

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   ├── config/             # AWS configuration
│   └── services/           # AWS service integrations
├── infrastructure/          # CloudFormation templates
├── .github/workflows/      # GitHub Actions
├── docs/                   # Documentation
└── scripts/                # Setup scripts
```

## 🔧 Customization

### Environment Variables

Create `.env.local`:

```env
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your-client-id
REACT_APP_IDENTITY_POOL_ID=your-identity-pool-id
REACT_APP_S3_BUCKET=your-s3-bucket
REACT_APP_DYNAMODB_TABLE=your-dynamodb-table
```

### Application Fields

Edit `src/components/ApplicationForm.js` to modify the form fields.

### Styling

Modify `src/App.js` theme configuration for custom colors and styling.

## 🚨 Troubleshooting

### Common Issues

1. **CloudFormation fails**: Check IAM permissions
2. **GitHub Actions fail**: Verify AWS credentials in secrets
3. **App won't load**: Check S3 bucket policy and CloudFront settings

### Debug Commands

```bash
# Check CloudFormation status
aws cloudformation describe-stacks --stack-name app-management-system

# Test S3 access
aws s3 ls s3://your-bucket-name

# Check DynamoDB table
aws dynamodb describe-table --table-name your-table-name
```

## 📞 Support

- **Issues**: Create GitHub issue
- **Documentation**: Check `docs/` folder
- **Cost Questions**: See `docs/cost-optimization.md`

## 🎉 You're Done!

Your Application Management System is now running in AWS with:

- ✅ Modern React frontend
- ✅ Secure SSO authentication
- ✅ Scalable AWS backend
- ✅ Automated deployments
- ✅ Cost optimization
- ✅ Professional CI/CD pipeline

**Next Steps**: Customize the application fields, add your team's branding, and start managing applications!
