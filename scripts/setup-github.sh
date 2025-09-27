#!/bin/bash

# GitHub Repository Setup Script for Application Management System
# This script helps you set up the GitHub repository with proper configuration

set -e

echo "🚀 Setting up GitHub repository for Application Management System"
echo "================================================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   macOS: brew install gh"
    echo "   Linux: sudo apt install gh"
    echo "   Windows: winget install GitHub.cli"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run: gh auth login"
    exit 1
fi

# Get repository details
read -p "Enter repository name (e.g., application-management-system): " REPO_NAME
read -p "Enter repository description: " REPO_DESC
read -p "Enter your GitHub username: " GITHUB_USERNAME

# Create repository
echo "📦 Creating GitHub repository..."
gh repo create "$REPO_NAME" \
    --description "$REPO_DESC" \
    --public \
    --clone

cd "$REPO_NAME"

# Initialize git and add files
git init
git add .
git commit -m "Initial commit: Application Management System"

# Push to GitHub
git branch -M main
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
git push -u origin main

echo "✅ Repository created and pushed to GitHub!"
echo ""
echo "🔐 Next steps:"
echo "1. Go to https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/secrets/actions"
echo "2. Add the following repository secrets:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - AWS_USER_POOL_ID"
echo "   - AWS_USER_POOL_WEB_CLIENT_ID"
echo "   - AWS_IDENTITY_POOL_ID"
echo "   - AWS_S3_BUCKET"
echo "   - AWS_S3_BUCKET_DEV"
echo "   - AWS_DYNAMODB_TABLE"
echo "   - AWS_CLOUDFRONT_DISTRIBUTION_ID"
echo "   - AWS_CLOUDFRONT_DISTRIBUTION_ID_DEV"
echo "   - AWS_CLOUDFRONT_DOMAIN"
echo "   - AWS_CLOUDFRONT_DOMAIN_DEV"
echo ""
echo "3. Deploy AWS infrastructure using CloudFormation:"
echo "   aws cloudformation deploy --template-file infrastructure/cloudformation.yml --stack-name app-management-system --capabilities CAPABILITY_NAMED_IAM"
echo ""
echo "4. Push to main branch to trigger deployment!"
echo ""
echo "🌐 Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"


