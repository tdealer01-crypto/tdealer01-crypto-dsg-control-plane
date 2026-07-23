# DSG ONE CDK Deployment Guide

Step-by-step guide for deploying DSG ONE infrastructure to AWS.

## Pre-Deployment Checklist

- [ ] AWS account created (prod environment)
- [ ] AWS credentials configured locally
- [ ] Node.js 22+ installed
- [ ] AWS CDK CLI installed (`npm install -g aws-cdk`)
- [ ] Docker installed (for building container images)
- [ ] GitHub repo access (for CI/CD)

## Environment Setup

### 1. AWS Credentials

```bash
# Option A: AWS CLI configured
aws configure
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Option B: Environment variables
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

# Option C: IAM role (if running on EC2/Lambda)
# Automatically assumed
```

### 2. Bootstrap CDK

CDK needs AWS resources created for it to function:

```bash
# First time only
cdk bootstrap aws://ACCOUNT-ID/REGION

# Example:
cdk bootstrap aws://123456789012/us-east-1
```

### 3. Set Environment Variables

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
export ENVIRONMENT=dev
```

## Deployment Process

### Phase 1: Development Environment

#### Step 1: Install dependencies

```bash
cd infra/cdk
npm install
npm run build
```

#### Step 2: Synthesize (dry-run)

```bash
npm run synth
```

Output: `cdk.out/` directory with CloudFormation templates.

#### Step 3: Review changes

```bash
npm run diff
```

Shows:
- Resources to be created
- Resources to be modified
- Resources to be destroyed

**Example output:**

```
Resources
[+] AWS::EC2::VPC VPC BCDBE93F
[+] AWS::EC2::Subnet PublicSubnet1PublicSubnetSubnet1Subnet BCDBE94F
...
Stack Policy
{"Statement":[{"Effect":"Allow","Principal":"*","Action":"Update:*","Resource":"*"}]}
```

#### Step 4: Deploy

```bash
npm run deploy
```

You'll be prompted:

```
Do you wish to deploy these changes (y/n)?
```

Press `y` to proceed.

#### Step 5: Verify deployment

```bash
# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name dsg-one-dev

# Get outputs
aws cloudformation describe-stacks \
  --stack-name dsg-one-dev \
  --query 'Stacks[0].Outputs'
```

### Phase 2: Staging Environment

```bash
export ENVIRONMENT=staging
npm run diff
npm run deploy
```

### Phase 3: Production Environment

#### Pre-deployment checks

```bash
# Verify prod config
export ENVIRONMENT=prod
npm run synth

# Review all changes
npm run diff

# Run tests
npm run test
```

#### Deploy production

```bash
npm run deploy
```

**Note:** Production requires additional approval steps beyond CDK confirmation.

## Post-Deployment Configuration

### 1. Verify Resources

```bash
# List stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE

# Check VPC
aws ec2 describe-vpcs --filters "Name=tag:Environment,Values=dev"

# Check IAM roles
aws iam list-roles --query "Roles[?Tags[?Key=='Project' && Value=='DSG-ONE']]"

# Check KMS keys
aws kms list-keys
aws kms describe-key --key-id alias/dsg-one-dev-master-key

# Check ECR repositories
aws ecr describe-repositories --query "repositories[?contains(repositoryName, 'dsg-one')]"

# Check DynamoDB tables
aws dynamodb list-tables --query "TableNames[?contains(@, 'dsg_one')]"
```

### 2. Configure Secrets

```bash
# Set API secrets
aws secretsmanager update-secret \
  --secret-id dsg-one-dev-api-secrets \
  --secret-string '{
    "ANTHROPIC_API_KEY": "sk-...",
    "JWT_SECRET": "your-jwt-secret",
    "API_KEY": "your-api-key"
  }'

# Set database secrets
aws secretsmanager update-secret \
  --secret-id dsg-one-dev-database-secrets \
  --secret-string '{
    "username": "dsg_admin",
    "password": "secure-password",
    "host": "db-instance.rds.amazonaws.com",
    "port": 5432,
    "dbname": "dsg_one"
  }'
```

### 3. Push container images to ECR

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push API image
docker build -t dsg-one-api:latest .
docker tag dsg-one-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/dsg-one-dev-api:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/dsg-one-dev-api:latest
```

## Updating Deployment

### Update Configuration

Edit the environment config file (e.g., `lib/config/dev.ts`):

```typescript
export const devConfig: DSGConfig = {
  // ... your changes
};
```

### Redeploy

```bash
npm run diff
npm run deploy
```

## Rollback

### Automatic rollback (CDK failure)

If deployment fails, CDK automatically rolls back:

```
Rollback requested on failure mode ROLLBACK
```

### Manual rollback

If needed, revert to previous CloudFormation stack:

```bash
# List stack events
aws cloudformation describe-stack-events \
  --stack-name dsg-one-dev

# Rollback to previous version
aws cloudformation cancel-update-stack \
  --stack-name dsg-one-dev
```

## Monitoring & Troubleshooting

### View stack events

```bash
# Watch deployment in real-time
aws cloudformation describe-stack-events \
  --stack-name dsg-one-dev \
  --query 'StackEvents[*].[EventId,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
  --output table
```

### Common issues

**Issue: `Insufficient capacity`**
- Solution: Try different AZ or instance type

**Issue: `IAM role not found`**
- Solution: Check IAM permissions for the AWS user/role

**Issue: `KMS key not found`**
- Solution: Ensure KMS key is created before dependent resources

**Issue: `VPC CIDR conflict`**
- Solution: Update VPC CIDR in config to avoid overlaps

## Destroying Stacks

### WARNING: This deletes all resources!

```bash
# Destroy dev stack
export ENVIRONMENT=dev
npm run destroy

# Confirm deletion
aws cloudformation describe-stacks --stack-name dsg-one-dev
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy DSG ONE Infrastructure

on:
  push:
    branches: [ main ]
    paths: [ 'infra/cdk/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: us-east-1
      
      - name: Install and deploy
        run: |
          cd infra/cdk
          npm install
          export ENVIRONMENT=prod
          npm run deploy
```

## Best Practices

1. **Always use `npm run diff` before deploy**
2. **Test in dev environment first**
3. **Require code review before prod deployment**
4. **Keep secrets in Secrets Manager, not .env files**
5. **Enable CloudTrail for audit logging**
6. **Use MFA for production access**
7. **Rotate credentials regularly**
8. **Monitor costs with CloudWatch**

## Support

For issues:
1. Check `infra/cdk/README.md`
2. Review AWS CDK logs: `cdk.out/`
3. Check CloudFormation events: AWS Console → CloudFormation → Stack Events
4. Open GitHub issue with error logs
