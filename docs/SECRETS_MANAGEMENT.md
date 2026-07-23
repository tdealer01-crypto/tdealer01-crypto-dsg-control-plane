# Secret Management Guide

Enterprise-grade secret management for DSG ONE control plane.

## Overview

Two-tier secret management approach:

1. **Local Development** — `scripts/secrets-manager.sh`
   - Encrypt/decrypt secrets locally
   - Validate secret format
   - Prepare for GitHub Actions

2. **GitHub Actions & CI/CD** — `scripts/setup-github-secrets.sh`
   - Interactive setup wizard
   - Upload secrets to GitHub repository
   - Secure credential passing to workflows

3. **AWS Secrets Manager** (Production)
   - KMS-encrypted secrets storage
   - Automatic rotation policies
   - Audit trail via CloudTrail
   - IAM-based access control

## Quick Start

### 1. Local Secret Management

Initialize secret manager:

```bash
./scripts/secrets-manager.sh init
```

Load secrets from environment file:

```bash
./scripts/secrets-manager.sh load dev    # Load dev/.env.dev
./scripts/secrets-manager.sh load prod   # Load prod/.env.prod
```

Validate secrets:

```bash
./scripts/secrets-manager.sh validate
```

List available secrets (no values):

```bash
./scripts/secrets-manager.sh list
```

Check for missing secrets:

```bash
./scripts/secrets-manager.sh check
```

### 2. Setup GitHub Actions Secrets

Prerequisites:

```bash
# Install GitHub CLI
brew install gh

# Authenticate with GitHub
gh auth login
```

Run interactive setup wizard:

```bash
./scripts/setup-github-secrets.sh
```

The wizard will:
- ✓ Verify GitHub CLI and authentication
- ✓ Collect AWS credentials
- ✓ Collect API keys (optional)
- ✓ Validate inputs
- ✓ Upload secrets to repository
- ✓ Show next steps

### 3. Verify Secrets

View uploaded secrets in GitHub:

1. Go to repository Settings
2. Navigate to "Secrets and variables" → "Actions"
3. Verify all secrets are present (values hidden)

## Secret Categories

### AWS Credentials (Required)

These are essential for CDK deployment:

```bash
AWS_ACCOUNT_ID          # 12-digit account number
AWS_REGION              # e.g., us-east-1
AWS_ACCESS_KEY_ID       # IAM user access key
AWS_SECRET_ACCESS_KEY   # IAM user secret key
ENVIRONMENT             # dev, staging, or prod
```

**How to get AWS credentials:**

1. Open AWS Console → IAM → Users
2. Select your user → Security credentials
3. Create access key (if needed)
4. Copy Access Key ID and Secret Access Key

### API Keys (Optional)

Application-specific secrets:

```bash
ANTHROPIC_API_KEY       # Anthropic/Claude API key
JWT_SECRET              # JWT signing secret for authentication
SUPABASE_SERVICE_ROLE   # Supabase admin key
STRIPE_SECRET_KEY       # Stripe API secret key
```

## Encrypt Local Secrets

For development, encrypt `.env.local`:

```bash
# Encrypt local secrets
./scripts/secrets-manager.sh encrypt .env.local

# You'll be prompted for a password
# Encrypted file saved to: .secrets/encrypted/secrets.local.enc
```

To decrypt later:

```bash
./scripts/secrets-manager.sh decrypt .secrets/encrypted/secrets.local.enc
```

## Export for Local Development

Export secrets in GitHub Actions format:

```bash
./scripts/secrets-manager.sh export
```

This shows values in a format ready for copy/paste into GitHub Actions UI.

## Security Best Practices

### Do's ✓

- ✓ Store secrets in `.secrets/` directory (gitignored)
- ✓ Use `SECRETS_PASSWORD` environment variable for automation
- ✓ Rotate AWS access keys regularly (quarterly minimum)
- ✓ Use different credentials per environment (dev/staging/prod)
- ✓ Enable MFA for production deployments
- ✓ Review GitHub Actions audit logs for secret access
- ✓ Use AWS Secrets Manager for production credentials
- ✓ Encrypt `.env.local` for development machines

### Don'ts ✗

- ✗ Never commit `.env` files to repository
- ✗ Never share secrets in Slack, email, or chat
- ✗ Never store secrets in code or comments
- ✗ Never use personal AWS credentials
- ✗ Never commit `package-lock.json` with secrets
- ✗ Never enable secret output in logs
- ✗ Never use the same credentials across environments
- ✗ Never commit encryption passwords

## Workflow: CDK Deployment

### Step 1: Setup GitHub Actions Secrets

```bash
./scripts/setup-github-secrets.sh
```

Follow the interactive prompts to upload:
- AWS credentials
- ENVIRONMENT variable (dev/staging/prod)
- Optional API keys

### Step 2: Verify Secrets

Check GitHub repository settings to confirm all secrets are present.

### Step 3: Deploy CDK

Deploy will automatically use GitHub Actions secrets:

```bash
# Via GitHub Actions (automatic on push)
git push origin claude/aws-cdk-infrastructure-enterprise

# Or manual deployment
ENVIRONMENT=prod npm run deploy
```

### Step 4: Monitor Deployment

CloudFormation stack creation:

```bash
# View stack in AWS Console
AWS Console → CloudFormation → Stacks → dsg-one-{env}

# Or via AWS CLI
aws cloudformation describe-stacks --stack-name dsg-one-prod
```

## Troubleshooting

### GitHub CLI Not Installed

```bash
# macOS
brew install gh

# Ubuntu
sudo apt-get install gh

# Or download from: https://github.com/cli/cli
```

### Not Authenticated with GitHub

```bash
gh auth login
# Follow the prompts to authenticate
```

### Repository Access Denied

Ensure your GitHub token has repository access:

1. Go to https://github.com/settings/tokens
2. Edit your token
3. Ensure "repo" scope is selected
4. Re-authenticate: `gh auth logout && gh auth login`

### Secret Upload Failed

Check error message:

```bash
# Validate inputs
./scripts/secrets-manager.sh validate

# Try again with verbose output
gh secret set AWS_ACCOUNT_ID --body "123456789012" -R owner/repo --verbose
```

### Encryption/Decryption Issues

Password mismatch:

```bash
# Use environment variable to avoid re-entry
export SECRETS_PASSWORD="your-password"
./scripts/secrets-manager.sh decrypt .secrets/encrypted/secrets.local.enc
```

## Integration with CI/CD

### GitHub Actions Workflow

Secrets are automatically available in workflows:

```yaml
name: Deploy CDK

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      AWS_REGION: ${{ secrets.AWS_REGION }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to AWS
        run: npm run deploy
        env:
          AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          ENVIRONMENT: ${{ secrets.ENVIRONMENT }}
```

### Local Development

Use encrypted `.env.local`:

```bash
# Decrypt for local use
./scripts/secrets-manager.sh decrypt .secrets/encrypted/secrets.local.enc > .env.local

# Load into environment
set -a
source .env.local
set +a

# Deploy locally
npm run deploy
```

## AWS Secrets Manager (Production)

Phase 1 CDK infrastructure includes AWS Secrets Manager construct:

```typescript
// Automatically created in Phase 1
const secrets = new SecretsConstruct(stack, 'Secrets', {
  config,
  encryptionKey: kmsKey,
});
```

**Features:**

- ✓ KMS encryption at rest
- ✓ Automatic 30-day rotation (prod)
- ✓ Access audit trail (CloudTrail)
- ✓ IAM-based access control
- ✓ Secret versioning

**Retrieve secrets in application:**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient();
const response = await client.send(new GetSecretValueCommand({
  SecretId: 'dsg-one-prod/api-secrets',
}));

const secrets = JSON.parse(response.SecretString);
```

## Support

For issues or questions:

1. Check this guide's troubleshooting section
2. Review GitHub Actions logs: Settings → Actions → Workflows
3. Check AWS CloudTrail for secret access audit
4. Open GitHub issue with tag `infra/secrets`

## References

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [AWS CDK Secrets Manager](https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_secretsmanager.html)
- [DSG ONE CDK README](./infra/cdk/README.md)

---

**Last Updated:** 2026-07-23  
**Version:** 1.0.0  
**Status:** Production-Ready
