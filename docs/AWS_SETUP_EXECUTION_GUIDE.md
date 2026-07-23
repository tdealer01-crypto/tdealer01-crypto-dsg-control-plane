# AWS Setup Execution Guide - DSG ONE

Complete step-by-step guide for executing AWS Secrets Manager and CDK deployment on your local machine with AWS credentials.

## Prerequisites Checklist

Before starting, verify you have:

- [ ] AWS Account with administrative access
- [ ] AWS CLI v2 installed (`aws --version`)
- [ ] jq installed (`jq --version`)
- [ ] Node.js 18+ (`node --version`)
- [ ] npm 8+ (`npm --version`)
- [ ] git (`git --version`)
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] ~10 GB free disk space for Docker/dependencies

```bash
# Quick prerequisites check
aws --version && jq --version && node --version && npm --version
aws sts get-caller-identity  # Should return your AWS account ID
```

---

## Phase 1: Setup Secrets Manager (30 minutes)

### Step 1: Prepare Environment Variables

```bash
# Set environment for dev deployment
export AWS_REGION="us-east-1"
export ENVIRONMENT="dev"
export PROJECT_NAME="dsg-one"

# Verify
echo "Region: $AWS_REGION, Env: $ENVIRONMENT, Project: $PROJECT_NAME"
```

### Step 2: Run Secrets Manager Setup Script

```bash
cd /path/to/tdealer01-crypto-dsg-control-plane

# Make script executable
chmod +x scripts/aws-secrets-manager-setup.sh

# Run setup
./scripts/aws-secrets-manager-setup.sh $ENVIRONMENT

# Expected output:
# [INFO] Starting AWS Secrets Manager setup for DSG ONE (dev environment)
# [INFO] Checking prerequisites...
# [SUCCESS] AWS credentials verified. Account ID: 123456789012
# [SUCCESS] KMS key created: arn:aws:kms:...
# [SUCCESS] Secret created/updated: dsg-one-dev-api-secrets
# [SUCCESS] Secret created/updated: dsg-one-dev-database-secrets
# [SUCCESS] Secret created/updated: dsg-one-dev-oauth-secrets
# [SUCCESS] IAM role created: dsg-one-dev-ecs-task-role
```

### Step 3: Verify Secrets Created

```bash
# List all DSG secrets
aws secretsmanager list-secrets \
  --region $AWS_REGION \
  --filters Key=name,Values="$PROJECT_NAME-$ENVIRONMENT" \
  --query 'SecretList[*].[Name,ARN]' \
  --output table

# Expected: 3 secrets listed
```

---

## Phase 2: Populate Secret Values (15 minutes)

### Step 4: Add API Secrets

```bash
# Get your Anthropic API key from https://console.anthropic.com/
# Replace values below with actual credentials

aws secretsmanager update-secret \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-api-secrets \
  --region $AWS_REGION \
  --secret-string '{
    "ANTHROPIC_API_KEY": "sk-ant-v3-YOUR_KEY_HERE",
    "JWT_SECRET": "your-secure-jwt-secret-min-32-chars-abcdefghij1234567890",
    "API_KEY": "your-api-key-here"
  }'

# Verify
aws secretsmanager get-secret-value \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-api-secrets \
  --region $AWS_REGION \
  --query 'SecretString' | jq .
```

### Step 5: Add Database Secrets

```bash
# For development, you can use local values
# For production, use your RDS endpoint

aws secretsmanager update-secret \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-database-secrets \
  --region $AWS_REGION \
  --secret-string '{
    "username": "dsg_admin",
    "password": "dev-password-change-in-prod",
    "host": "localhost",
    "port": "5432",
    "dbname": "dsg_one"
  }'

# Verify
aws secretsmanager get-secret-value \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-database-secrets \
  --region $AWS_REGION \
  --query 'SecretString' | jq .
```

### Step 6: Add OAuth Secrets

```bash
# Get OAuth credentials from:
# - GitHub: https://github.com/settings/developers
# - Google: https://console.cloud.google.com/

aws secretsmanager update-secret \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-oauth-secrets \
  --region $AWS_REGION \
  --secret-string '{
    "GITHUB_CLIENT_ID": "your-github-client-id",
    "GITHUB_CLIENT_SECRET": "your-github-client-secret",
    "GOOGLE_CLIENT_ID": "your-google-client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-google-client-secret"
  }'

# Verify
aws secretsmanager get-secret-value \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-oauth-secrets \
  --region $AWS_REGION \
  --query 'SecretString' | jq .
```

---

## Phase 3: Build and Deploy CDK Stack (45 minutes)

### Step 7: Install CDK Dependencies

```bash
cd infra/cdk

# Install dependencies
npm ci

# Verify CDK CLI is available
npx cdk --version
# Expected: CDK 2.x.x
```

### Step 8: Bootstrap CDK Environment (one-time)

```bash
# Required for first deployment to an AWS account/region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

npx cdk bootstrap \
  aws://$AWS_ACCOUNT_ID/$AWS_REGION

# Expected output:
# ✅  Environment aws://123456789012/us-east-1 bootstrapped.
```

### Step 9: Preview CDK Changes

```bash
# See what will be created
npx cdk diff \
  --context environment=$ENVIRONMENT \
  --context awsRegion=$AWS_REGION

# Review output - should show:
# - KMS key creation
# - Secrets Manager resources
# - IAM roles and policies
# - ECS cluster (if included)
```

### Step 10: Deploy CDK Stack

```bash
# Deploy stack (requires user confirmation for IAM changes)
npx cdk deploy \
  --context environment=$ENVIRONMENT \
  --context awsRegion=$AWS_REGION \
  --require-approval=any-change

# Expected output:
# ✅  dsg-one-cdk-dev: deploying...
# ✅  dsg-one-cdk-dev: deployed successfully
# Outputs:
# - KMS Key ID: arn:aws:kms:...
# - Secrets Manager ARN: arn:aws:secretsmanager:...
```

### Step 11: Verify CloudFormation Stack

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name $PROJECT_NAME-cdk-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].StackStatus'
# Expected: CREATE_COMPLETE or UPDATE_COMPLETE

# View stack outputs
aws cloudformation describe-stacks \
  --stack-name $PROJECT_NAME-cdk-$ENVIRONMENT \
  --region $AWS_REGION \
  --query 'Stacks[0].Outputs' \
  --output table
```

---

## Phase 4: Test Credential Broker Integration (15 minutes)

### Step 12: Configure Environment Variables

```bash
# Create local .env.aws.dev file
cat > .env.aws.$ENVIRONMENT << EOF
# AWS Configuration - $ENVIRONMENT environment
AWS_REGION=$AWS_REGION
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Secrets Manager Configuration
SECRETS_MANAGER_ENABLED=true
CREDENTIAL_BROKER_BACKEND=aws-secrets-manager
CREDENTIAL_BROKER_DEFAULT_LEASE_TTL_MS=300000

# Stack Information
CDK_STACK_NAME=$PROJECT_NAME-cdk-$ENVIRONMENT
ENVIRONMENT=$ENVIRONMENT
EOF

# Verify file created
cat .env.aws.$ENVIRONMENT
```

### Step 13: Test Credential Broker Locally

```bash
# Install dependencies if not already done
npm ci

# Create test script
cat > test-credential-broker.mjs << 'EOF'
import { getCredential } from './lib/dsg/brain/credential-broker.js';

async function test() {
  console.log('Testing Credential Broker with AWS Secrets Manager...\n');
  
  try {
    const result = await getCredential('ANTHROPIC_API_KEY');
    console.log('✅ Successfully retrieved credential lease');
    console.log('  Fingerprint:', result.credential.fingerprint);
    console.log('  TTL:', result.lease.ttlMs, 'ms');
    console.log('  Max renewals:', result.lease.maxRenewals);
  } catch (error) {
    console.error('❌ Failed to retrieve credential:', error.message);
    process.exit(1);
  }
}

test();
EOF

# Run test (requires AWS credentials in environment)
node test-credential-broker.mjs
```

### Step 14: Run Integration Tests

```bash
# Run credential broker tests
npm run test -- lib/dsg/brain/credential-broker

# Expected: All tests pass
# ✓ credential-broker tests (X tests)
```

---

## Phase 5: Deploy to ECS Fargate (Optional - Advanced)

### Step 15: Build Docker Image

```bash
cd /path/to/tdealer01-crypto-dsg-control-plane

# Create Dockerfile if not present
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npm", "start"]
EOF

# Build image
docker build -t $PROJECT_NAME:latest .
```

### Step 16: Push to ECR

```bash
# Create ECR repository (if not exists)
aws ecr create-repository \
  --repository-name $PROJECT_NAME \
  --region $AWS_REGION \
  2>/dev/null || true

# Get ECR login
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push image
docker tag $PROJECT_NAME:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME:latest

docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME:latest
```

### Step 17: Deploy ECS Service

```bash
# Use AWS Console or CloudFormation to create ECS service with:
# - Container image: ECR URI from above
# - Task role: dsg-one-dev-ecs-task-role
# - Environment variables: .env.aws.dev values
# - Secrets from Secrets Manager: See CDK outputs

echo "ECS deployment instructions:"
echo "1. Go to ECS Console"
echo "2. Create new service in dsg-one-$ENVIRONMENT cluster"
echo "3. Select task definition: dsg-one-cdk-$ENVIRONMENT"
echo "4. Mount secrets from Secrets Manager via IAM role"
echo "5. Configure load balancer and scaling"
```

---

## Verification Checklist

After deployment, verify each step:

- [ ] AWS Secrets Manager secrets exist (3 secrets)
- [ ] KMS key is created and accessible
- [ ] IAM role has Secrets Manager permissions
- [ ] CloudFormation stack is CREATE_COMPLETE
- [ ] Environment file (.env.aws.dev) is generated
- [ ] Credential broker can retrieve secrets without exposing values
- [ ] Integration tests pass
- [ ] Docker image builds successfully
- [ ] ECR repository has latest image (if ECS deployment)
- [ ] ECS service is running (if ECS deployment)

---

## Troubleshooting

### Issue: AWS credentials not found
```bash
# Configure credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
```

### Issue: Secrets Manager secret not found
```bash
# List all secrets
aws secretsmanager list-secrets --region $AWS_REGION

# Check exact secret name
aws secretsmanager describe-secret \
  --secret-id dsg-one-dev-api-secrets \
  --region $AWS_REGION
```

### Issue: IAM permission denied
```bash
# Check permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/dsg-one-dev-ecs-task-role \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:dsg-one-dev-*"
```

### Issue: CDK bootstrap needed
```bash
# Bootstrap the environment
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

---

## Cleanup (if reverting)

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name $PROJECT_NAME-cdk-$ENVIRONMENT \
  --region $AWS_REGION

# Delete Secrets Manager secrets
aws secretsmanager delete-secret \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-api-secrets \
  --region $AWS_REGION \
  --force-delete-without-recovery

aws secretsmanager delete-secret \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-database-secrets \
  --region $AWS_REGION \
  --force-delete-without-recovery

aws secretsmanager delete-secret \
  --secret-id $PROJECT_NAME-$ENVIRONMENT-oauth-secrets \
  --region $AWS_REGION \
  --force-delete-without-recovery

# Delete KMS key (schedule deletion)
aws kms schedule-key-deletion \
  --key-id alias/$PROJECT_NAME-$ENVIRONMENT-secrets-key \
  --pending-window-in-days 7 \
  --region $AWS_REGION
```

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Secrets Manager Setup | 30 min | ⏳ Ready |
| 2 | Populate Secret Values | 15 min | ⏳ Ready |
| 3 | CDK Deployment | 45 min | ⏳ Ready |
| 4 | Test Integration | 15 min | ⏳ Ready |
| 5 | ECS Deployment | 30 min | ⏳ Optional |
| | **Total** | **2.5 hours** | - |

---

## Next Steps

1. ✅ Review this guide
2. ✅ Prepare AWS credentials
3. ⏳ Execute Phase 1-4 on your machine
4. ⏳ Verify all checks pass
5. ⏳ Deploy to ECS (optional)
6. ⏳ Monitor CloudWatch logs
7. ⏳ Configure auto-scaling (optional)

---

## Support

For issues:
1. Check [AWS_SECRETS_MANAGER_GUIDE.md](./AWS_SECRETS_MANAGER_GUIDE.md) troubleshooting
2. Review CloudFormation events for stack errors
3. Check AWS CloudTrail for permission issues
4. Enable debug logging: `export AWS_SDK_LOG_LEVEL=debug`

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-23  
**Status:** Ready for execution
