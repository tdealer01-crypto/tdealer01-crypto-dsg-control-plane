# AWS Deployment Quick Start - DSG ONE

**Fastest path from local development to AWS production infrastructure.**

> ⚡ **Quick Start:** 15 minutes to verify everything works, 2.5 hours for full deployment

---

## 🚀 One-Command Deploy (Recommended)

```bash
cd /path/to/tdealer01-crypto-dsg-control-plane

# Run complete automated setup (all phases)
./scripts/deploy-aws-full.sh dev us-east-1

# Script handles:
# ✅ Prerequisites validation
# ✅ KMS key creation
# ✅ Secrets Manager setup
# ✅ IAM role configuration
# ✅ CDK infrastructure deployment
# ✅ CloudFormation verification
# ✅ Environment file generation
```

**Result:** Complete AWS infrastructure ready for ECS deployment

---

## 📋 Prerequisites (5 minutes)

Before running, ensure you have:

```bash
# Check all requirements
aws --version          # AWS CLI v2+
jq --version           # JSON processor
node --version         # Node.js 18+
npm --version          # npm 8+
git --version          # git

# Verify AWS credentials
aws sts get-caller-identity
# Should return: Account ID, ARN, UserID

# Verify you're in the right directory
ls scripts/deploy-aws-full.sh
```

---

## 🎯 3-Phase Deployment

### Phase 1: Secrets Manager & KMS (30 min)

```bash
# 1A. Run setup script
./scripts/aws-secrets-manager-setup.sh dev

# 1B. Populate secret values
aws secretsmanager update-secret \
  --secret-id dsg-one-dev-api-secrets \
  --secret-string '{
    "ANTHROPIC_API_KEY": "sk-...",
    "JWT_SECRET": "your-secret",
    "API_KEY": "your-api-key"
  }'

aws secretsmanager update-secret \
  --secret-id dsg-one-dev-database-secrets \
  --secret-string '{
    "username": "dsg_admin",
    "password": "your-password",
    "host": "localhost",
    "port": "5432",
    "dbname": "dsg_one"
  }'

aws secretsmanager update-secret \
  --secret-id dsg-one-dev-oauth-secrets \
  --secret-string '{
    "GITHUB_CLIENT_ID": "...",
    "GITHUB_CLIENT_SECRET": "...",
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "..."
  }'

# 1C. Verify
aws secretsmanager list-secrets \
  --filters Key=name,Values=dsg-one-dev \
  --query 'SecretList[*].Name' --output table
```

### Phase 2: CDK Deployment (45 min)

```bash
# 2A. Install dependencies
cd infra/cdk
npm ci

# 2B. Bootstrap environment (first-time only)
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/us-east-1

# 2C. Preview changes
npx cdk diff --context environment=dev --context awsRegion=us-east-1

# 2D. Deploy
npx cdk deploy \
  --context environment=dev \
  --context awsRegion=us-east-1 \
  --require-approval=any-change

# Result: CloudFormation stack created with all resources
```

### Phase 3: Verification & Integration (15 min)

```bash
# 3A. Verify CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name dsg-one-cdk-dev \
  --query 'Stacks[0].StackStatus'

# 3B. View stack outputs
aws cloudformation describe-stacks \
  --stack-name dsg-one-cdk-dev \
  --query 'Stacks[0].Outputs' --output table

# 3C. Test credential broker
cd /path/to/repo
export AWS_REGION=us-east-1
npm test -- lib/dsg/brain/credential-broker

# Expected: All tests pass
```

---

## 🔧 What Gets Created

### AWS Resources

```
AWS Account (us-east-1)
├── KMS Key
│   └── Alias: dsg-one-dev-secrets-key
│       └── Policy: ECS task role access
├── Secrets Manager
│   ├── dsg-one-dev-api-secrets
│   ├── dsg-one-dev-database-secrets
│   └── dsg-one-dev-oauth-secrets
├── IAM Role
│   └── dsg-one-dev-ecs-task-role
│       └── Policies: SecretsManager + KMS access
└── CloudFormation Stack
    └── dsg-one-cdk-dev (status: CREATE_COMPLETE)
```

### Local Configuration

```
Repository Root
├── .env.aws.dev                    (auto-generated)
├── infra/cdk/node_modules/         (after npm ci)
└── lib/dsg/brain/
    └── credential-broker.ts        (AWS backend active)
```

---

## ✅ Verification Checklist

After deployment, verify each step:

- [ ] AWS credentials configured (`aws sts get-caller-identity` returns Account ID)
- [ ] All 3 secrets exist in Secrets Manager
- [ ] KMS key is accessible and encrypted secrets
- [ ] IAM role has Secrets Manager permissions
- [ ] CloudFormation stack is `CREATE_COMPLETE`
- [ ] Environment file `.env.aws.dev` is generated
- [ ] Credential broker tests pass locally
- [ ] No secrets are logged or printed (only fingerprints)

**All ✅ = Success!**

---

## 🚨 Troubleshooting

### "AWS credentials not configured"
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

### "Secrets Manager secret not found"
```bash
# List all secrets
aws secretsmanager list-secrets --region us-east-1

# Check exact secret name
aws secretsmanager describe-secret \
  --secret-id dsg-one-dev-api-secrets \
  --region us-east-1
```

### "Permission denied" accessing secrets
```bash
# Verify IAM role
aws iam get-role-policy \
  --role-name dsg-one-dev-ecs-task-role \
  --policy-name dsg-one-dev-secrets-access
```

### "CDK bootstrap needed"
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/us-east-1
```

**More issues?** See `docs/AWS_SECRETS_MANAGER_GUIDE.md` Troubleshooting section

---

## 📊 Cost Estimate

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| KMS key | $1.00 | Single key |
| Secrets Manager (3 secrets) | $0.00-$1.20 | First 20 free for dev |
| API calls (100K/month) | $0.60 | Typical usage |
| **Total** | **~$1.60** | ✅ Affordable |

ECS deployment costs additional (compute + networking).

---

## 🔄 Re-deployment (Idempotent)

All scripts are **safe to re-run**:

```bash
# Safe to re-run multiple times
./scripts/aws-secrets-manager-setup.sh dev

# Creates/updates secrets (idempotent)
# Updates IAM role (idempotent)
# Creates/updates KMS key (creates once, reuses)

# CDK is also idempotent
npx cdk deploy
# Updates stack if needed, no-op if unchanged
```

---

## 📚 Documentation Index

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **This file** | Quick start (you are here) | 10 min |
| `docs/AWS_SETUP_EXECUTION_GUIDE.md` | Detailed step-by-step guide | 20 min |
| `docs/AWS_SECRETS_MANAGER_GUIDE.md` | Architecture + security + troubleshooting | 30 min |
| `AWS_SETUP_STATUS.md` | Status overview and checklist | 5 min |

---

## 🎯 Next Steps (After Deployment)

1. **Verify everything works:**
   ```bash
   npm test -- lib/dsg/brain/credential-broker
   ```

2. **Deploy to ECS Fargate:**
   - Create ECS cluster (or use existing)
   - Register task definition with environment variables
   - Create ECS service with IAM role
   - Configure load balancer and auto-scaling

3. **Set up monitoring:**
   - CloudWatch Logs for application
   - CloudTrail for audit logging
   - Alarms for secret access failures

4. **Production deployment:**
   - Run same scripts with `prod` parameter
   - Create separate secrets with production values
   - Deploy to production VPC/subnet

---

## 🔐 Security Best Practices

✅ **Always follow these:**

- Never commit `.env*` files or secrets
- Use IAM roles (never hard-code credentials)
- Secrets are encrypted at rest (KMS) and in transit (TLS)
- Audit all secret access via CloudTrail
- Rotate secrets regularly (AWS Secrets Manager supports automation)
- Review IAM policies (least-privilege principle)
- Monitor CloudWatch logs for errors

---

## 📞 Support

**If something breaks:**

1. Check troubleshooting section above
2. Review AWS CloudFormation events: `aws cloudformation describe-stack-events --stack-name dsg-one-cdk-dev`
3. Check CloudTrail for API errors: `aws cloudtrail lookup-events --max-results 10`
4. Review application logs in CloudWatch
5. Enable debug logging: `export AWS_SDK_LOG_LEVEL=debug`

---

## ⏱️ Timeline

| Phase | Time | Status |
|-------|------|--------|
| Prerequisites check | 5 min | ⏳ Ready |
| Secrets Manager setup | 30 min | ⏳ Ready |
| CDK deployment | 45 min | ⏳ Ready |
| Verification | 15 min | ⏳ Ready |
| **Total** | **~2 hours** | - |

---

**Status:** ✅ Ready to deploy

**Action:** Run `./scripts/deploy-aws-full.sh dev us-east-1`

**Result:** Production-ready AWS infrastructure with encrypted secrets management

---

**Last Updated:** 2026-07-23  
**Version:** 1.0  
**Environment:** Development (dev/prod switchable)
