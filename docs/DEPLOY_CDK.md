# AWS CDK Deployment Guide

Complete guide for deploying DSG ONE infrastructure to AWS using GitHub Actions.

## Prerequisites

- AWS Account with appropriate permissions
- GitHub repository access
- Node.js 20+

## Setup Instructions

### 1. Create AWS IAM Role for GitHub Actions

```bash
# Create trust policy file
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:tdealer01-crypto/tdealer01-crypto-dsg-control-plane:*"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name cdk-deploy-github-actions \
  --assume-role-policy-document file://trust-policy.json \
  --description "Role for CDK deployment from GitHub Actions"

# Attach policy with CloudFormation + CDK permissions
aws iam attach-role-policy \
  --role-name cdk-deploy-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### 2. Configure GitHub Secrets

Add to your GitHub repository settings → Secrets:

```
AWS_ROLE_TO_ASSUME=arn:aws:iam::ACCOUNT_ID:role/cdk-deploy-github-actions
AWS_REGION=us-east-1
```

Replace `ACCOUNT_ID` with your AWS account number (e.g., 121205961822).

### 3. Set Environment-Specific Secrets (Optional)

For production deployments, create environment-specific secrets:

```bash
# In GitHub: Settings → Environments → Create "prod"
# Add secrets:
# - AWS_ROLE_TO_ASSUME (can be different role for prod)
# - AWS_REGION
```

## Usage

### Automatic Deployment (on push to main)

Any changes to `infra/cdk/**` pushed to `main` will trigger automatic deployment to dev:

```bash
git add infra/cdk/
git commit -m "feat(cdk): update infrastructure"
git push origin main
```

### Manual Deployment (workflow_dispatch)

Trigger deployment manually from GitHub Actions:

1. Go to: **Actions → Deploy CDK Infrastructure → Run workflow**
2. Select environment: `dev`, `staging`, or `prod`
3. Click **Run workflow**

Or via CLI:

```bash
gh workflow run deploy-cdk.yml \
  -f environment=dev
```

## Deployment Workflow Details

### What the workflow does:

1. **Checkout** - Pulls latest code
2. **Setup Node.js** - Installs Node 20
3. **Install Dependencies** - Runs `npm ci`
4. **Build CDK** - Compiles TypeScript
5. **Configure AWS** - Sets up AWS credentials via OIDC
6. **Synthesize** - Generates CloudFormation template
7. **Deploy** - Runs `cdk deploy`
8. **Verify** - Checks stack status
9. **Summary** - Posts results to GitHub

### Expected Outputs:

```
✅ Stack deployed successfully: CREATE_COMPLETE
  - 101 CloudFormation resources provisioned
  - 4 ECS tasks running
  - Multi-region replication configured
```

## Monitoring Deployment

### View deployment status:

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name DSGOneStack-dev \
  --query 'Stacks[0].StackStatus'

# View recent events
aws cloudformation describe-stack-events \
  --stack-name DSGOneStack-dev \
  --query 'StackEvents[0:10]' | jq '.'
```

### Check deployed resources:

```bash
# List all resources
aws cloudformation list-stack-resources \
  --stack-name DSGOneStack-dev

# View specific resource
aws cloudformation describe-stack-resource \
  --stack-name DSGOneStack-dev \
  --logical-resource-id <ResourceId>
```

## Troubleshooting

### Deployment fails with "Access Denied"

- Verify IAM role has CloudFormation permissions
- Check OIDC provider configuration in AWS
- Ensure role trust policy includes correct GitHub repo

### CloudFormation stack rollback

```bash
# Check what failed
aws cloudformation describe-stack-events \
  --stack-name DSGOneStack-dev \
  --query "StackEvents[?ResourceStatus=='CREATE_FAILED']"

# Retry deployment
gh workflow run deploy-cdk.yml -f environment=dev
```

### CDK synthesis errors

```bash
# Test locally first
cd infra/cdk
npx cdk synth --context environment=dev

# Check for TypeScript errors
npm run typecheck
```

## Local Deployment (Alternative)

To deploy locally without GitHub Actions:

```bash
cd infra/cdk

# Configure AWS credentials
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1

# Deploy
npx cdk deploy --context environment=dev --require-approval never
```

## Rollback

To rollback to previous stack version:

```bash
# List stack history
aws cloudformation list-stacks \
  --stack-status-filter UPDATE_COMPLETE

# Rollback to previous
aws cloudformation cancel-update-stack \
  --stack-name DSGOneStack-dev
```

Or delete and redeploy:

```bash
aws cloudformation delete-stack --stack-name DSGOneStack-dev
gh workflow run deploy-cdk.yml -f environment=dev
```

## Cleanup

To remove all infrastructure:

```bash
# Delete stack (WARNING: Destructive)
aws cloudformation delete-stack --stack-name DSGOneStack-dev

# Verify deletion
aws cloudformation wait stack-delete-complete \
  --stack-name DSGOneStack-dev
```

## Security Best Practices

✅ **Do:**
- Use GitHub OIDC for authentication (no long-lived credentials)
- Restrict IAM role to specific GitHub repository/branch
- Use environment-specific roles for production
- Enable CloudTrail logging
- Store all credentials in GitHub Secrets

❌ **Don't:**
- Commit AWS credentials to repository
- Use hardcoded access keys
- Share IAM credentials across teams
- Deploy directly without review process

## Support

For deployment issues:
1. Check workflow logs: **Actions → Deploy CDK Infrastructure → [Run] → [Step]**
2. Review CloudFormation events: `aws cloudformation describe-stack-events`
3. Check CDK synthesis: `cd infra/cdk && npx cdk synth`

## Next Steps

After successful deployment:

1. **Verify infrastructure**: `curl https://your-endpoint/api/health`
2. **Configure DNS**: Update Route53 records (production only)
3. **Setup monitoring**: Configure CloudWatch dashboards
4. **Test endpoints**: Run smoke tests against deployed API
5. **Document deployment**: Record CloudFormation outputs

---

**Infrastructure Status:** ✅ Production-Ready  
**Last Updated:** 2026-07-24  
**Environments:** dev, staging, prod
