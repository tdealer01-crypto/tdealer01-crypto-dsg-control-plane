# Complete AWS Deployment Guide - DSG ONE + Bedrock Agent Core

**Status:** ✅ **READY FOR IMMEDIATE DEPLOYMENT**

This guide covers the complete 5-phase setup for AWS CDK deployment with Bedrock Agent Core integration.

---

## 🎯 Quick Summary

- **Phase 1**: 🔐 Secure AWS credentials (rotate exposed keys)
- **Phase 2**: 🔍 Review Bedrock & Cognito architecture
- **Phase 3**: 🏗️ CDK infrastructure (Bedrock + Cognito IAM roles)
- **Phase 4**: 🚀 GitHub Actions CI/CD automation
- **Phase 5**: 📚 Production readiness verification

**Estimated Time:** 30 minutes total

---

## Phase 1️⃣: 🔐 Security First — Rotate Exposed Credentials

### ⚠️ CRITICAL: Exposed AWS Credentials

Previously exposed credentials must be rotated **immediately**:
- ❌ Old Access Key that was exposed in chat — **DELETE FROM AWS CONSOLE**
- ❌ Old Secret Key that was exposed in chat — **DO NOT USE**

**Details:** AWS credentials were inadvertently pasted into chat session. These must be deleted from IAM and new credentials created immediately before deployment.

### Step 1: Delete Expired Credentials

```bash
# 1. Go to AWS IAM Console
# https://console.aws.amazon.com/iam/home
#
# 2. Navigate to Users → [Your User] → Security credentials
#
# 3. Find the Access Key that was exposed in chat
#    (starts with AKIA...)
#
# 4. Click "Delete" button
#
# 5. Confirm deletion

# 6. Verify no other users have this key
aws iam list-access-keys --user-name [your-username]
```

### Step 2: Create New Access Key Securely

```bash
# AWS CLI method (recommended)
aws iam create-access-key --user-name [your-username]

# Output: Save to secure location (password manager)
# {
#   "AccessKey": {
#     "AccessKeyId": "AKIA...",
#     "SecretAccessKey": "...",
#     "Status": "Active"
#   }
# }
```

### Step 3: Configure AWS CLI with New Credentials

```bash
aws configure

# Enter when prompted (input will be hidden):
# AWS Access Key ID: [paste new key]
# AWS Secret Access Key: [paste new secret]
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity

# Expected output:
# {
#   "UserId": "...",
#   "Account": "121205961822",
#   "Arn": "arn:aws:iam::121205961822:user/..."
# }
```

### Step 4: Scan CloudTrail for Suspicious Activity

```bash
# Check for unauthorized access using expired key
# Replace [YOUR_EXPOSED_ACCESS_KEY] with the key that was exposed
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=[YOUR_EXPOSED_ACCESS_KEY] \
  --region us-east-1 \
  --query 'Events[?CloudTrailEvent]' \
  --output json

# If found, investigate and remediate
```

---

## Phase 2️⃣: 🔍 Review Code & Architecture

### Bedrock Agent Core Stack

**File:** `infra/cdk/lib/stacks/bedrock-agentcore-stack.ts`

**What It Does:**
```
✅ Creates IAM role for Bedrock Agent Core
✅ Grants permissions for MCP registry operations
✅ Connects to Cognito for authentication
✅ Sets up CloudWatch logging for agent execution
✅ Exports stack outputs for CI/CD integration
```

**Key Permissions:**
```
- bedrock-agentcore-control:* (MCP registry management)
- bedrock-agentcore:SearchRegistryRecords (query MCP servers)
- cognito-idp:* (JWT authentication)
- logs:* (execution tracing)
```

### MCP Registry Manager

**File:** `infra/cdk/lib/utils/mcp-registry-manager.ts`

**Functions:**
```
1. createRecord() → Create new MCP server record
2. submitForApproval() → Send for approval workflow
3. approveRecord() → Approve and activate record
4. waitForRecord() → Poll until record is ready
5. publishRecord() → Full create→approve→publish flow
6. searchRecords() → Query approved MCP servers
```

### Cognito Integration

**Configuration:**
```
User Pool ID:      us-east-1_ZtxWdHzFJ
Client ID:         7njqeoh6bq64s6u44oo9vghfcg
Auth Method:       JWT (OpenID Connect)
Discovery URL:     /.well-known/openid-configuration
```

**Purpose:**
- Secure API authentication for MCP server search
- Token-based access control
- User identity management

---

## Phase 3️⃣: 🏗️ CDK Infrastructure Integration

### File Structure

```
infra/cdk/
├── bin/
│   └── dsg-one.ts                    ← Main app (updated with Bedrock stack)
├── lib/
│   ├── stacks/
│   │   └── bedrock-agentcore-stack.ts  ← NEW: Bedrock infrastructure
│   ├── utils/
│   │   └── mcp-registry-manager.ts   ← NEW: MCP registry management
│   ├── config/
│   │   ├── types.ts                  ← Updated with bedrock config
│   │   ├── dev.ts                    ← Updated with Bedrock settings
│   │   ├── staging.ts                ← Updated with Bedrock settings
│   │   └── prod.ts                   ← Updated with Bedrock settings
│   └── index.ts                      ← Updated exports
└── package.json
```

### Configuration by Environment

**Development:**
```yaml
enableAgentCore: true
registryId: cGcvetJOMzWh3xmj
cognitoUserPoolId: us-east-1_ZtxWdHzFJ
cognitoClientId: 7njqeoh6bq64s6u44oo9vghfcg
mcpServers:
  - weather-mcp-server
```

**Staging:**
```yaml
enableAgentCore: true
registryId: cGcvetJOMzWh3xmj
cognitoUserPoolId: us-east-1_ZtxWdHzFJ
cognitoClientId: 7njqeoh6bq64s6u44oo9vghfcg
mcpServers:
  - weather-mcp-server
  - dsg-governance-mcp-server
```

**Production:**
```yaml
enableAgentCore: true
registryId: cGcvetJOMzWh3xmj
cognitoUserPoolId: us-east-1_ZtxWdHzFJ
cognitoClientId: 7njqeoh6bq64s6u44oo9vghfcg
mcpServers:
  - weather-mcp-server
  - dsg-governance-mcp-server
  - compliance-verification-mcp-server
```

### Build & Test CDK

```bash
# Install dependencies
cd infra/cdk
npm ci --legacy-peer-deps

# Build TypeScript
npm run build

# Synthesize CloudFormation template (dry-run)
npx cdk synth --context environment=dev

# Expected output: template.json in cdk.out/
```

---

## Phase 4️⃣: 🚀 GitHub Actions CI/CD Automation

### Step 1: Configure AWS Credentials via OIDC

GitHub Actions uses AWS OIDC provider for secure, temporary credentials:

```bash
# 1. Check existing OIDC provider
aws iam list-open-id-connect-providers

# 2. If not exists, create OIDC provider (auto-created by setup script)
# The setup script handles this automatically
```

### Step 2: Set GitHub Secrets

```bash
# Make script executable
chmod +x ./scripts/setup-github-aws-secrets.sh

# Set secrets (run with new AWS credentials)
./scripts/setup-github-aws-secrets.sh 121205961822 us-east-1 cGcvetJOMzWh3xmj us-east-1_ZtxWdHzFJ 7njqeoh6bq64s6u44oo9vghfcg

# This sets:
# - AWS_ACCOUNT_ID
# - AWS_REGION
# - BEDROCK_REGISTRY_ID
# - COGNITO_USER_POOL_ID
# - COGNITO_CLIENT_ID
```

### Step 3: Verify GitHub Secrets

```bash
gh secret list --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane
```

### Step 4: Deploy via GitHub Actions

**Automatic (on push to main):**
```bash
git add infra/cdk/
git commit -m "feat(cdk): add Bedrock Agent Core infrastructure"
git push origin main

# GitHub Actions automatically deploys to dev environment
```

**Manual (on-demand):**
```bash
gh workflow run deploy-cdk.yml -f environment=staging

# Monitor deployment
gh run list --workflow=deploy-cdk.yml -L 5
gh run watch [run-id]
```

### Workflow Execution Steps

```
1. Checkout code
2. Configure AWS credentials (via OIDC + IAM role)
3. Setup Node.js + npm cache
4. Install dependencies
5. Build CDK TypeScript
6. Synthesize CloudFormation
7. Deploy stacks:
   - DSGOneStack-{env}
   - BedrockAgentCoreStack-{env}
8. Get stack outputs
9. Verify deployment status
10. Post summary to GitHub
```

---

## Phase 5️⃣: 📚 Production Readiness

### Pre-Deployment Checklist

```
✅ AWS credentials rotated (old key deleted)
✅ New AWS credentials configured locally
✅ CDK builds successfully: npm run build
✅ CloudFormation template generated: npx cdk synth
✅ GitHub Secrets set: ./scripts/setup-github-aws-secrets.sh
✅ GitHub Actions workflow verified: .github/workflows/deploy-cdk.yml
✅ Environment variables in CDK config
✅ Bedrock permissions approved in IAM
✅ Cognito User Pool accessible
✅ MCP registry accessible
```

### Verification Steps

```bash
# 1. Verify AWS access
aws sts get-caller-identity

# 2. Verify GitHub Actions setup
gh auth status

# 3. Test CDK build
cd infra/cdk && npm run build

# 4. Synthesize template
npx cdk synth --context environment=staging

# 5. Check GitHub secrets
gh secret list --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane

# 6. List stack outputs (after deployment)
aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack-staging \
  --query 'Stacks[0].Outputs' \
  --output table
```

### Expected Stack Outputs

After deployment, outputs should include:

```
BedrockRoleArn:      arn:aws:iam::121205961822:role/bedrock-agentcore-staging
RegistryId:          cGcvetJOMzWh3xmj
CognitoUserPoolArn:  arn:aws:cognito-idp:us-east-1:121205961822:userpool/us-east-1_ZtxWdHzFJ
CognitoClientId:     7njqeoh6bq64s6u44oo9vghfcg
```

---

## 🚀 Deployment Steps (Complete)

### For Development:

```bash
# 1. Rotate AWS credentials
#    (Follow Phase 1 steps above)

# 2. Verify AWS CLI
aws sts get-caller-identity

# 3. Set GitHub Secrets
./scripts/setup-github-aws-secrets.sh 121205961822 us-east-1 cGcvetJOMzWh3xmj us-east-1_ZtxWdHzFJ 7njqeoh6bq64s6u44oo9vghfcg

# 4. Test CDK locally
cd infra/cdk
npm ci --legacy-peer-deps
npm run build
npx cdk synth --context environment=dev

# 5. Deploy to AWS
npx cdk deploy --context environment=dev --require-approval never

# 6. Verify deployment
aws cloudformation describe-stacks --stack-name BedrockAgentCoreStack-dev
```

### For Staging/Production:

```bash
# 1. Push to main branch
git add infra/cdk/
git commit -m "feat: Bedrock Agent Core infrastructure"
git push origin main

# 2. GitHub Actions auto-deploys to dev
# 3. Manually trigger staging:
gh workflow run deploy-cdk.yml -f environment=staging

# 4. After staging verification, deploy production:
gh workflow run deploy-cdk.yml -f environment=prod
```

---

## 🔄 Operational Commands

### View Deployment Status

```bash
# Recent workflow runs
gh run list --workflow=deploy-cdk.yml -L 10

# Watch live deployment
gh run watch [run-id]

# View workflow logs
gh run view [run-id] --log
```

### Stack Management

```bash
# List all stacks
aws cloudformation describe-stacks --query 'Stacks[*].[StackName,StackStatus]' --output table

# Get specific stack outputs
aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack-staging \
  --query 'Stacks[0].Outputs'

# Monitor stack events
aws cloudformation describe-stack-events \
  --stack-name BedrockAgentCoreStack-staging \
  --query 'StackEvents' \
  --output table
```

### Troubleshooting

```bash
# Check IAM role
aws iam get-role --role-name bedrock-agentcore-staging

# Check Cognito User Pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_ZtxWdHzFJ

# Check Bedrock registry access
aws bedrock-agentcore list-registry-records --registry-ids cGcvetJOMzWh3xmj

# View CloudWatch logs
aws logs tail /aws/bedrock/agentcore/dev --follow
```

---

## 📋 Summary of Changes

### New Files Created

```
✅ infra/cdk/lib/stacks/bedrock-agentcore-stack.ts
✅ infra/cdk/lib/utils/mcp-registry-manager.ts
✅ scripts/setup-github-aws-secrets.sh
✅ COMPLETE_AWS_DEPLOYMENT_GUIDE.md (this file)
```

### Files Updated

```
✅ infra/cdk/lib/index.ts (added exports)
✅ infra/cdk/bin/dsg-one.ts (added Bedrock stack instantiation)
✅ infra/cdk/lib/config/types.ts (added bedrock config interface)
✅ infra/cdk/lib/config/dev.ts (added Bedrock configuration)
✅ infra/cdk/lib/config/staging.ts (added Bedrock configuration)
✅ infra/cdk/lib/config/prod.ts (added Bedrock configuration)
✅ .github/workflows/deploy-cdk.yml (added Bedrock stack deployment + env vars)
```

---

## 🎯 Next Steps

1. **Immediate:** Rotate AWS credentials (Phase 1)
2. **Today:** Run `./scripts/setup-github-aws-secrets.sh`
3. **Today:** Test CDK build locally
4. **Today:** Push changes and trigger deployment
5. **Verify:** Check stack outputs and logs
6. **Document:** Update deployment runbook

---

## 📞 Support & Documentation

- **AWS CDK Docs:** https://docs.aws.amazon.com/cdk/
- **Bedrock Agent Core:** https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html
- **Cognito OIDC:** https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-oidc-provider.html
- **GitHub Actions:** https://docs.github.com/en/actions

---

**Generated:** 2026-07-25  
**Status:** ✅ **READY FOR DEPLOYMENT**

Need help? Check the workflow logs:
```bash
gh run list --workflow=deploy-cdk.yml
gh run view [run-id] --log
```
