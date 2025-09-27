# EAMS Environment Management

This document describes how to manage environment-specific configurations for the EAMS (Enterprise Architecture Management System) using AWS Systems Manager Parameter Store and Secrets Manager.

## 🏗️ Architecture Overview

The EAMS system uses a fully decoupled architecture where all configuration and secrets are managed through AWS services:

- **Systems Manager Parameter Store**: Configuration parameters and feature flags
- **Secrets Manager**: API keys, database credentials, and sensitive data
- **Environment Files**: Local development and deployment configuration

## 📁 Environment Files

### File Structure
```
deploy.dev.env      # Development environment
deploy.stage.env    # Staging environment  
deploy.prod.env     # Production environment
.env                # Current environment (copied during deployment)
```

### Environment File Template
Each environment file contains:
- **Environment Settings**: Environment name, stage, project details
- **AWS Configuration**: Region, account ID, resource names
- **Domain Configuration**: Custom domains, SSL certificates
- **Feature Flags**: Toggle features on/off per environment
- **External Services**: API keys and endpoints
- **Monitoring**: Log levels, tracing configuration
- **Tags**: Resource tagging for cost management

## 🔧 Environment Management Scripts

### Setup Script (`scripts/setup-env.sh`)
Manages environment files and configuration:

```bash
# Create a new environment file
./scripts/setup-env.sh create dev

# Copy environment file to .env
./scripts/setup-env.sh copy dev

# Validate environment file
./scripts/setup-env.sh validate prod

# List all environments
./scripts/setup-env.sh list

# Clean up .env files
./scripts/setup-env.sh clean
```

### Deployment Script (`scripts/deploy-eams.sh`)
Deploys to specific environments:

```bash
# Deploy to development
./scripts/deploy-eams.sh dev

# Deploy to staging
./scripts/deploy-eams.sh stage

# Deploy to production
./scripts/deploy-eams.sh prod
```

## 🔐 Configuration Management

### Parameter Store Structure
```
/eams/{environment}/config          # Main configuration
/eams/{environment}/feature-flags   # Feature toggles
/eams/{environment}/database/credentials  # Database secrets
/eams/{environment}/api/keys        # API keys
/eams/{environment}/external/services     # External service credentials
```

### Configuration Service
The `ConfigService` class provides:
- **Automatic fallback** to environment variables
- **Caching** for performance (5-minute cache)
- **Error handling** with graceful degradation
- **Type safety** for configuration values

## 🚀 Deployment Process

### 1. Environment Setup
```bash
# Create environment file
./scripts/setup-env.sh create dev

# Edit configuration
vim deploy.dev.env

# Validate configuration
./scripts/setup-env.sh validate dev
```

### 2. Deploy Infrastructure
```bash
# Deploy to development
./scripts/deploy-eams.sh dev
```

### 3. Configuration Storage
The deployment script automatically:
- Stores configuration in Parameter Store
- Stores secrets in Secrets Manager
- Generates config.json for frontend
- Copies .env files for build process

## 🔒 Security Best Practices

### Secrets Management
- **Never commit secrets** to version control
- **Use Secrets Manager** for all sensitive data
- **Rotate secrets regularly** (automated rotation supported)
- **Use least privilege** IAM policies

### Parameter Store
- **Use SecureString** for sensitive parameters
- **Organize by environment** and service
- **Use consistent naming** conventions
- **Enable parameter history** for audit trails

### Environment Isolation
- **Separate AWS accounts** for prod/stage/dev
- **Environment-specific** resource naming
- **Network isolation** where possible
- **Access controls** per environment

## 📊 Monitoring and Observability

### CloudWatch Integration
- **Log aggregation** across all services
- **Metrics collection** for performance monitoring
- **Alarms** for critical issues
- **Dashboards** for operational visibility

### X-Ray Tracing
- **Distributed tracing** across services
- **Performance profiling** and optimization
- **Error tracking** and debugging
- **Service map** visualization

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: Deploy EAMS
on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Development
        if: github.ref == 'refs/heads/develop'
        run: ./scripts/deploy-eams.sh dev
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: ./scripts/deploy-eams.sh prod
```

### Environment Promotion
1. **Development**: Feature development and testing
2. **Staging**: Integration testing and validation
3. **Production**: Live system with monitoring

## 🛠️ Troubleshooting

### Common Issues

#### Environment File Not Found
```bash
# Check available environments
./scripts/setup-env.sh list

# Create missing environment
./scripts/setup-env.sh create dev
```

#### Configuration Validation Errors
```bash
# Validate environment file
./scripts/setup-env.sh validate dev

# Check for syntax errors
bash -n deploy.dev.env
```

#### Parameter Store Access Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify parameter store access
aws ssm get-parameter --name "/eams/dev/config"
```

### Debug Mode
Enable debug logging by setting:
```bash
export LOG_LEVEL=debug
```

## 📚 Additional Resources

- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [CloudFormation Best Practices](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
