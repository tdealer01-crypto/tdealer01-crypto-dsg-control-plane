# AWS CDK Deployment - Quick Start

Complete automated setup for GitHub Actions CDK deployment in 5 minutes.

## 🚀 One-Command Setup

```bash
./scripts/setup-aws-cdk-deploy.sh
```

This automatically:
- ✅ Creates AWS OIDC provider
- ✅ Creates IAM role (`cdk-deploy-github-actions`)
- ✅ Attaches CloudFormation permissions
- ✅ Configures GitHub Secrets
- ✅ Validates AWS access
- ✅ Saves config to `~/.aws-cdk-deploy.env`

## 📋 Requirements

Before running setup, ensure you have:

```bash
# AWS CLI v2
aws --version

# GitHub CLI
gh --version

# jq
jq --version

# git
git --version

# Docker (for local CDK testing)
docker --version
```

**Install missing tools:**
```bash
# macOS
brew install awscli gh jq docker

# Ubuntu/Debian
sudo apt-get install awscli2 gh jq docker.io

# Windows (with Chocolatey)
choco install awscli github-cli jq docker-desktop
```

## 🔧 Setup Steps

### Step 1: Configure AWS Credentials (Local)

```bash
aws configure

# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

Or set environment variables:

```bash
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Step 2: Authenticate GitHub CLI

```bash
gh auth login

# Select: GitHub.com
# Select: HTTPS
# Authenticate with your browser
```

### Step 3: Run Automated Setup

```bash
cd /path/to/tdealer01-crypto-dsg-control-plane
./scripts/setup-aws-cdk-deploy.sh
```

**What it does:**
1. Checks AWS account access
2. Creates OIDC provider for GitHub Actions
3. Creates IAM role with CloudFormation permissions
4. Sets GitHub repository secrets
5. Tests configuration
6. Saves config to `~/.aws-cdk-deploy.env`

**Output:**
```
✅ Setup Complete!

Configuration Summary:
  AWS Account ID:        121205961822
  AWS Region:            us-east-1
  IAM Role:              cdk-deploy-github-actions
  Role ARN:              arn:aws:iam::121205961822:role/cdk-deploy-github-actions
  GitHub Repository:     tdealer01-crypto/tdealer01-crypto-dsg-control-plane

Next Steps:
1. Trigger deployment manually:
   gh workflow run deploy-cdk.yml -f environment=dev

2. Or push to main branch to trigger automatic deployment:
   git push origin main
```

## 🚀 Deployment Commands

### Automatic Deployment (on push)

```bash
# Make infrastructure changes
git add infra/cdk/
git commit -m "feat(cdk): update infrastructure"
git push origin main  # Automatically triggers deployment
```

### Manual Deployment (Immediate)

```bash
# Deploy to dev
gh workflow run deploy-cdk.yml -f environment=dev

# Deploy to staging
gh workflow run deploy-cdk.yml -f environment=staging

# Deploy to prod
gh workflow run deploy-cdk.yml -f environment=prod
```

### Monitor Deployment

```bash
# View recent workflow runs
gh run list --workflow=deploy-cdk.yml -L 5

# View specific run status
gh run view <run-id> --log

# Stream live logs
gh run watch <run-id>
```

## 🔑 Credential Management

### Option 1: AWS Secrets Manager (Recommended)

Store credentials in AWS Secrets Manager for secure access:

```bash
# Create secret
aws secretsmanager create-secret \
  --name dsg-aws-creds \
  --secret-string '{
    "access_key": "AKIA...",
    "secret_key": "wJal...",
    "region": "us-east-1"
  }'

# Retrieve and load credentials
eval "$(./scripts/get-aws-credentials.sh dsg-aws-creds export)"

# Deploy
cd infra/cdk && npx cdk deploy --context environment=dev
```

### Option 2: Environment Variables

```bash
# Export credentials
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_DEFAULT_REGION="us-east-1"

# Deploy
cd infra/cdk && npx cdk deploy --context environment=dev
```

### Option 3: AWS CLI Credentials File

```bash
# ~/.aws/credentials
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = wJal...

# Then deploy
cd infra/cdk && npx cdk deploy --context environment=dev
```

## 📊 Verify Setup

### Test AWS Access

```bash
# Verify credentials
aws sts get-caller-identity

# Expected output:
# {
#     "UserId": "AIDAI...",
#     "Account": "121205961822",
#     "Arn": "arn:aws:iam::121205961822:user/..."
# }
```

### Test GitHub Secrets

```bash
# Verify GitHub secrets are set
gh secret list --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane

# Expected:
# AWS_REGION              Updated 2026-07-24
# AWS_ROLE_TO_ASSUME      Updated 2026-07-24
```

### Test IAM Role

```bash
# Check role exists
aws iam get-role --role-name cdk-deploy-github-actions

# Expected: role details in JSON
```

## ⚡ Local Deployment (Alternative to GitHub Actions)

If you prefer to deploy directly from your machine:

```bash
cd infra/cdk

# Ensure credentials are set (see above)
# Then deploy
npx cdk deploy --context environment=dev --require-approval never

# Watch stack creation
watch -n 5 'aws cloudformation describe-stacks --stack-name DSGOneStack-dev'
```

## 🔄 Reload Configuration Anytime

Configuration is saved to `~/.aws-cdk-deploy.env`:

```bash
# Load saved configuration
source ~/.aws-cdk-deploy.env

# Verify
echo $AWS_ACCOUNT_ID
echo $ROLE_ARN
```

## 🛠️ Troubleshooting

### "AWS CLI not found"
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### "GitHub CLI not found"
```bash
# Install GitHub CLI
curl -fsSL https://cli.github.com/install.sh | bash
```

### "AWS credentials invalid"
```bash
# Reconfigure
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

### "Permission denied"
```bash
# Make scripts executable
chmod +x ./scripts/setup-aws-cdk-deploy.sh
chmod +x ./scripts/get-aws-credentials.sh

# Run again
./scripts/setup-aws-cdk-deploy.sh
```

### "GitHub repository not found"
```bash
# Ensure you're authenticated
gh auth login

# Verify repo access
gh repo view tdealer01-crypto/tdealer01-crypto-dsg-control-plane
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [GitHub Actions & AWS](https://github.com/aws-actions)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
- [IAM OIDC Integration](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments)

## 🎯 Next Steps

After setup:

1. **Deploy infrastructure:**
   ```bash
   gh workflow run deploy-cdk.yml -f environment=dev
   ```

2. **Monitor deployment:**
   ```bash
   gh run watch --exit-status
   ```

3. **Verify stack:**
   ```bash
   aws cloudformation describe-stacks --stack-name DSGOneStack-dev
   ```

4. **Check endpoints:**
   ```bash
   curl https://your-endpoint/api/health
   ```

---

**Setup Complete!** 🎉  
Your AWS CDK deployment pipeline is ready to go.
