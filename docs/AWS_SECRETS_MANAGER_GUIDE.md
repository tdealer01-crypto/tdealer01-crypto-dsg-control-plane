# AWS Secrets Manager Setup Guide for DSG ONE

## Overview

This guide walks through setting up AWS Secrets Manager for DSG ONE production deployment. Secrets Manager provides encrypted storage for sensitive credentials with automatic rotation, audit logging, and fine-grained IAM access control.

## Architecture

```
┌────────────────────────────────────────┐
│  ECS Task / Application                 │
│  (lib/dsg/brain/credential-broker)      │
└────────────────┬─────────────────────────┘
                 │
                 ↓ (at runtime)
    ┌────────────────────────┐
    │ Credential Broker      │
    │ (AWS Secrets Manager)  │
    │ - Supabase backend     │
    │ - AWS backend ✓        │
    └────────────┬───────────┘
                 │
                 ↓
    ┌────────────────────────────────┐
    │ AWS Secrets Manager             │
    │ • api-secrets                   │
    │ • database-secrets              │
    │ • oauth-secrets                 │
    │ (encrypted with KMS key)        │
    └────────────────────────────────┘
```

## Prerequisites

### Local Machine Setup

```bash
# 1. Install AWS CLI
brew install awscli          # macOS
# or
apt-get install awscli       # Ubuntu/Debian
# or
choco install awscli         # Windows

# 2. Install jq (for JSON processing)
brew install jq              # macOS
apt-get install jq           # Ubuntu/Debian
choco install jq             # Windows

# 3. Configure AWS credentials
aws configure

# Enter your AWS credentials:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output format: json

# 4. Verify AWS access
aws sts get-caller-identity
```

### Required IAM Permissions

Your AWS IAM user/role must have these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:dsg-one-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:CreateKey",
        "kms:CreateAlias",
        "kms:DescribeKey",
        "kms:GenerateDataKey",
        "kms:Decrypt"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/dsg-one-*"
    }
  ]
}
```

## Setup Steps

### Step 1: Run Automated Setup Script

```bash
cd /path/to/dsg-one-repo

# Run setup for development environment
./scripts/aws-secrets-manager-setup.sh dev

# Or for production
./scripts/aws-secrets-manager-setup.sh prod
```

The script will:
1. ✓ Verify AWS CLI and credentials
2. ✓ Create KMS encryption key
3. ✓ Create 3 Secrets Manager secrets
4. ✓ Setup IAM roles for ECS task execution
5. ✓ Output configuration summary

### Step 2: Update Secret Values

After the script completes, you need to populate the actual secret values:

```bash
# For API Secrets
aws secretsmanager update-secret \
  --secret-id dsg-one-dev-api-secrets \
  --secret-string '{
    "ANTHROPIC_API_KEY": "sk-...",
    "JWT_SECRET": "your-jwt-secret",
    "API_KEY": "your-api-key"
  }'

# For Database Secrets
aws secretsmanager update-secret \
  --secret-id dsg-one-dev-database-secrets \
  --secret-string '{
    "username": "dsg_admin",
    "password": "your-db-password",
    "host": "your-db-host.rds.amazonaws.com",
    "port": "5432",
    "dbname": "dsg_one"
  }'

# For OAuth Secrets
aws secretsmanager update-secret \
  --secret-id dsg-one-dev-oauth-secrets \
  --secret-string '{
    "GITHUB_CLIENT_ID": "your-github-id",
    "GITHUB_CLIENT_SECRET": "your-github-secret",
    "GOOGLE_CLIENT_ID": "your-google-id",
    "GOOGLE_CLIENT_SECRET": "your-google-secret"
  }'
```

### Step 3: Verify Secrets

```bash
# Verify API secrets
aws secretsmanager get-secret-value \
  --secret-id dsg-one-dev-api-secrets \
  --region us-east-1

# List all DSG secrets
aws secretsmanager list-secrets \
  --filters Key=name,Values=dsg-one-dev \
  --query 'SecretList[*].[Name,ARN]' \
  --output table
```

### Step 4: Deploy CDK Stack

```bash
cd infra/cdk

# Build TypeScript
npm run build

# Preview changes
npm run diff

# Deploy
npm run deploy

# Check deployment status
aws cloudformation describe-stacks \
  --stack-name dsg-one-cdk-dev \
  --query 'Stacks[0].StackStatus'
```

### Step 5: Configure Environment Variables

Set these environment variables for your ECS task or Lambda:

```bash
# Enable AWS Secrets Manager backend
SECRETS_MANAGER_ENABLED=true
CREDENTIAL_BROKER_BACKEND=aws-secrets-manager

# AWS configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012  # Your AWS account ID
```

### Step 6: Test Credential Broker

```bash
# In your application code
const { credential, lease } = await getCredential('ANTHROPIC_API_KEY');
// credential.value contains the secret value (redacted fingerprint in logs)
// lease contains TTL and renewal information
```

## Secrets Reference

### API Secrets (`api-secrets`)

```json
{
  "ANTHROPIC_API_KEY": "sk-...",
  "JWT_SECRET": "your-jwt-secret",
  "API_KEY": "your-api-key"
}
```

**Used by:**
- Claude API authentication
- JWT token signing
- Internal API authentication

### Database Secrets (`database-secrets`)

```json
{
  "username": "dsg_admin",
  "password": "your-db-password",
  "host": "your-db-host.rds.amazonaws.com",
  "port": "5432",
  "dbname": "dsg_one"
}
```

**Used by:**
- Supabase/PostgreSQL connection
- Runtime database operations
- Migration scripts

### OAuth Secrets (`oauth-secrets`)

```json
{
  "GITHUB_CLIENT_ID": "your-github-id",
  "GITHUB_CLIENT_SECRET": "your-github-secret",
  "GOOGLE_CLIENT_ID": "your-google-id",
  "GOOGLE_CLIENT_SECRET": "your-google-secret"
}
```

**Used by:**
- OAuth 2.0 authentication
- Third-party integrations
- Social login flows

## Security Best Practices

### 1. Never Log Secrets

✓ **Do this:**
```typescript
const { credential } = await getCredential('API_KEY');
console.log('Retrieved credential with fingerprint:', credential.fingerprint);
```

✗ **Don't do this:**
```typescript
const secret = await getSecret('API_KEY');
console.log('Secret value:', secret.value); // ❌ Never log raw values
```

### 2. Use IAM Roles for Access

```json
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:dsg-one-prod-*",
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": "us-east-1"
    }
  }
}
```

### 3. Enable Encryption

- ✓ All secrets use KMS encryption
- ✓ KMS key is managed by AWS (AWS-managed keys)
- ✓ Encryption-in-transit for API calls
- ✓ Encryption-at-rest in Secrets Manager vault

### 4. Audit Access

```bash
# View access logs
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=dsg-one-dev-api-secrets \
  --max-results 50

# CloudWatch logs integration
# Secrets Manager → CloudWatch Logs → CloudWatch Alarms
```

### 5. Rotate Secrets Regularly

```bash
# Manual rotation
aws secretsmanager update-secret \
  --secret-id dsg-one-prod-api-secrets \
  --secret-string '{"ANTHROPIC_API_KEY": "sk-new..."}'

# Automated rotation (optional Lambda configuration)
# Configure in AWS Console → Secrets Manager → Secret Details → Rotation
```

## Troubleshooting

### Issue: "AWS SDK not available"

```
Error: AWS SDK not available. Install @aws-sdk/client-secrets-manager
```

**Solution:**
```bash
npm install @aws-sdk/client-secrets-manager
```

### Issue: "Permission denied" accessing secrets

```
AccessDeniedException: User is not authorized to perform action
```

**Solution:**
1. Verify IAM role has `secretsmanager:GetSecretValue` permission
2. Check KMS key policy allows the IAM role
3. Verify resource ARN matches secret name
4. Check region configuration

```bash
# Debug IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/ecs-task-role \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:*:secret:dsg-one-*"
```

### Issue: Secret not found

```
ResourceNotFoundException: Secrets Manager can't find the specified secret
```

**Solution:**
1. Verify secret name matches exactly
2. Check AWS region is correct
3. List all secrets to find correct name

```bash
aws secretsmanager list-secrets \
  --region us-east-1 \
  --query 'SecretList[*].Name'
```

### Issue: KMS key permission error

```
KmsError: KMS key not accessible
```

**Solution:**
1. Verify KMS key policy grants access to ECS task role
2. Check key alias is correct
3. Verify region matches

```bash
# View KMS key policy
aws kms get-key-policy \
  --key-id alias/dsg-one-dev-secrets-key \
  --policy-name default
```

## Monitoring and Alerts

### CloudWatch Metrics

```bash
# Secret access count (metric)
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name SecretAccessCount \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### CloudTrail Audit Logs

All Secrets Manager API calls are logged in CloudTrail:
- GetSecretValue
- UpdateSecret
- CreateSecret
- DeleteSecret

## Migration from Supabase to AWS

```typescript
// Credential broker automatically detects backend:
const credential = await getCredential('API_KEY');

// Environment variable controls backend:
// SECRETS_MANAGER_ENABLED=false  → Supabase (dev)
// SECRETS_MANAGER_ENABLED=true   → AWS Secrets Manager (prod)
```

**Migration steps:**
1. Deploy AWS Secrets Manager infrastructure
2. Populate secrets with production values
3. Set `SECRETS_MANAGER_ENABLED=true` in ECS task definition
4. Deploy ECS service with updated task definition
5. Monitor credential broker for any access errors
6. Decommission Supabase secrets table (optional)

## Cost Estimation

### AWS Secrets Manager Pricing

- **Per secret per month**: $0.40 (first 20 secrets free)
- **API calls**: $0.06 per 10,000 calls
- **KMS encryption**: Included in Secrets Manager pricing

**Example:** 3 secrets + 100K API calls/month
- Secrets: $0 (free tier)
- API calls: $0.60
- **Total: ~$0.60/month** ✓ Very affordable

## Related Documentation

- [AWS Secrets Manager User Guide](https://docs.aws.amazon.com/secretsmanager/)
- [AWS KMS Key Management](https://docs.aws.amazon.com/kms/)
- [DSG Credential Broker Implementation](../lib/dsg/brain/CREDENTIAL_BROKER.md)
- [Production Deployment Guide](./RUNBOOK_DEPLOY.md)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review AWS CloudTrail logs
3. Check application logs for credential broker errors
4. Open issue in repository with AWS region and error details
