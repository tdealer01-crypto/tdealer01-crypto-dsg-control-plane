#!/bin/bash

# GitHub Actions Secrets Setup Wizard
# Interactive setup for GitHub repository secrets
# Usage: ./scripts/setup-github-secrets.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_OWNER="${GITHUB_REPO_OWNER:-tdealer01-crypto}"
REPO_NAME="${GITHUB_REPO_NAME:-tdealer01-crypto-dsg-control-plane}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

show_header() {
  cat <<EOF

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${BLUE}  GitHub Actions Secrets Setup Wizard${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

Repository: ${BLUE}${REPO_OWNER}/${REPO_NAME}${NC}

This wizard will help you configure GitHub Actions secrets for:
  • AWS credentials (deployment)
  • API keys (Anthropic, Supabase, Stripe)
  • JWT secret (authentication)

${YELLOW}⚠ Prerequisites:${NC}
  1. GitHub CLI installed: ${BLUE}brew install gh${NC}
  2. GitHub authenticated: ${BLUE}gh auth login${NC}
  3. Repository access token with 'repo' scope

EOF
}

check_requirements() {
  echo -e "${BLUE}Checking requirements...${NC}"

  # Check GitHub CLI
  if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI not found${NC}"
    echo -e "${YELLOW}Install: brew install gh${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ GitHub CLI found${NC}"

  # Check authentication
  if ! gh auth status &> /dev/null; then
    echo -e "${RED}✗ Not authenticated with GitHub${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ GitHub authenticated${NC}"

  # Check repository access
  if ! gh repo view "$REPO_OWNER/$REPO_NAME" &> /dev/null; then
    echo -e "${RED}✗ Cannot access repository${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Repository accessible${NC}"

  echo ""
}

get_aws_credentials() {
  echo -e "${BLUE}AWS Credentials${NC}"
  echo -e "${YELLOW}Get these from AWS Console → IAM → Users → Security credentials${NC}"
  echo ""

  read -p "AWS Account ID (12 digits): " aws_account_id
  if ! [[ $aws_account_id =~ ^[0-9]{12}$ ]]; then
    echo -e "${RED}✗ Invalid AWS Account ID format${NC}"
    exit 1
  fi

  read -p "AWS Region (e.g., us-east-1): " aws_region
  if [[ -z "$aws_region" ]]; then
    aws_region="us-east-1"
  fi

  read -p "AWS Access Key ID: " aws_access_key
  if [[ -z "$aws_access_key" ]]; then
    echo -e "${RED}✗ AWS Access Key ID required${NC}"
    exit 1
  fi

  read -sp "AWS Secret Access Key: " aws_secret_key
  echo ""
  if [[ -z "$aws_secret_key" ]]; then
    echo -e "${RED}✗ AWS Secret Access Key required${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ AWS credentials collected${NC}"
}

get_application_secrets() {
  echo ""
  echo -e "${BLUE}Application Secrets (Optional)${NC}"
  echo -e "${YELLOW}Leave blank to skip${NC}"
  echo ""

  read -sp "ANTHROPIC_API_KEY (optional): " anthropic_key
  echo ""

  read -sp "JWT_SECRET (optional): " jwt_secret
  echo ""

  read -sp "SUPABASE_SERVICE_ROLE (optional): " supabase_key
  echo ""

  read -sp "STRIPE_SECRET_KEY (optional): " stripe_key
  echo ""

  echo -e "${GREEN}✓ Application secrets collected${NC}"
}

get_environment() {
  echo ""
  echo -e "${BLUE}Deployment Environment${NC}"
  echo "Choose target environment:"
  echo "  1) dev"
  echo "  2) staging"
  echo "  3) prod"
  echo ""
  read -p "Select environment (1-3): " env_choice

  case $env_choice in
    1) environment="dev" ;;
    2) environment="staging" ;;
    3) environment="prod" ;;
    *) environment="dev" ;;
  esac

  echo -e "${GREEN}✓ Environment: $environment${NC}"
}

validate_secrets() {
  echo ""
  echo -e "${BLUE}Validating secrets...${NC}"

  local valid=true

  if [[ -z "$aws_account_id" ]] || ! [[ $aws_account_id =~ ^[0-9]{12}$ ]]; then
    echo -e "${RED}✗ Invalid AWS Account ID${NC}"
    valid=false
  fi

  if [[ -z "$aws_region" ]]; then
    echo -e "${RED}✗ AWS Region required${NC}"
    valid=false
  fi

  if [[ -z "$aws_access_key" ]]; then
    echo -e "${RED}✗ AWS Access Key required${NC}"
    valid=false
  fi

  if [[ -z "$aws_secret_key" ]]; then
    echo -e "${RED}✗ AWS Secret Key required${NC}"
    valid=false
  fi

  if [[ "$valid" == "false" ]]; then
    echo -e "${RED}Validation failed. Please review inputs.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ All required secrets validated${NC}"
}

confirm_upload() {
  echo ""
  echo -e "${YELLOW}Summary of secrets to upload:${NC}"
  echo ""
  echo -e "  AWS_ACCOUNT_ID: ${BLUE}$aws_account_id${NC}"
  echo -e "  AWS_REGION: ${BLUE}$aws_region${NC}"
  echo -e "  AWS_ACCESS_KEY_ID: ${BLUE}[REDACTED]${NC}"
  echo -e "  AWS_SECRET_ACCESS_KEY: ${BLUE}[REDACTED]${NC}"
  echo -e "  ENVIRONMENT: ${BLUE}$environment${NC}"

  if [[ -n "$anthropic_key" ]]; then
    echo -e "  ANTHROPIC_API_KEY: ${BLUE}[REDACTED]${NC}"
  fi
  if [[ -n "$jwt_secret" ]]; then
    echo -e "  JWT_SECRET: ${BLUE}[REDACTED]${NC}"
  fi
  if [[ -n "$supabase_key" ]]; then
    echo -e "  SUPABASE_SERVICE_ROLE: ${BLUE}[REDACTED]${NC}"
  fi
  if [[ -n "$stripe_key" ]]; then
    echo -e "  STRIPE_SECRET_KEY: ${BLUE}[REDACTED]${NC}"
  fi

  echo ""
  read -p "Continue? (yes/no): " confirm

  if [[ "$confirm" != "yes" ]]; then
    echo -e "${YELLOW}Setup cancelled${NC}"
    exit 0
  fi
}

upload_secrets() {
  echo ""
  echo -e "${BLUE}Uploading secrets to GitHub...${NC}"

  local errors=0

  # Upload AWS secrets (required)
  gh secret set AWS_ACCOUNT_ID --body "$aws_account_id" -R "$REPO_OWNER/$REPO_NAME" && \
    echo -e "${GREEN}✓ AWS_ACCOUNT_ID${NC}" || ((errors++))

  gh secret set AWS_REGION --body "$aws_region" -R "$REPO_OWNER/$REPO_NAME" && \
    echo -e "${GREEN}✓ AWS_REGION${NC}" || ((errors++))

  gh secret set AWS_ACCESS_KEY_ID --body "$aws_access_key" -R "$REPO_OWNER/$REPO_NAME" && \
    echo -e "${GREEN}✓ AWS_ACCESS_KEY_ID${NC}" || ((errors++))

  gh secret set AWS_SECRET_ACCESS_KEY --body "$aws_secret_key" -R "$REPO_OWNER/$REPO_NAME" && \
    echo -e "${GREEN}✓ AWS_SECRET_ACCESS_KEY${NC}" || ((errors++))

  gh secret set ENVIRONMENT --body "$environment" -R "$REPO_OWNER/$REPO_NAME" && \
    echo -e "${GREEN}✓ ENVIRONMENT${NC}" || ((errors++))

  # Upload optional secrets
  if [[ -n "$anthropic_key" ]]; then
    gh secret set ANTHROPIC_API_KEY --body "$anthropic_key" -R "$REPO_OWNER/$REPO_NAME" && \
      echo -e "${GREEN}✓ ANTHROPIC_API_KEY${NC}" || ((errors++))
  fi

  if [[ -n "$jwt_secret" ]]; then
    gh secret set JWT_SECRET --body "$jwt_secret" -R "$REPO_OWNER/$REPO_NAME" && \
      echo -e "${GREEN}✓ JWT_SECRET${NC}" || ((errors++))
  fi

  if [[ -n "$supabase_key" ]]; then
    gh secret set SUPABASE_SERVICE_ROLE --body "$supabase_key" -R "$REPO_OWNER/$REPO_NAME" && \
      echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE${NC}" || ((errors++))
  fi

  if [[ -n "$stripe_key" ]]; then
    gh secret set STRIPE_SECRET_KEY --body "$stripe_key" -R "$REPO_OWNER/$REPO_NAME" && \
      echo -e "${GREEN}✓ STRIPE_SECRET_KEY${NC}" || ((errors++))
  fi

  if [[ $errors -eq 0 ]]; then
    echo -e "${GREEN}✓ All secrets uploaded successfully${NC}"
  else
    echo -e "${RED}✗ $errors secrets failed to upload${NC}"
    exit 1
  fi
}

show_next_steps() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✓ Setup Complete!${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  cat <<EOF

${BLUE}Next Steps:${NC}

1. ${YELLOW}Verify secrets in GitHub:${NC}
   ${BLUE}Settings → Secrets and variables → Actions${NC}

2. ${YELLOW}Deploy CDK infrastructure:${NC}
   ${BLUE}npm run deploy${NC}
   or
   ${BLUE}ENVIRONMENT=prod npm run deploy${NC}

3. ${YELLOW}Monitor deployment:${NC}
   ${BLUE}AWS Console → CloudFormation → Stacks${NC}

4. ${YELLOW}Verify deployment:${NC}
   ${BLUE}npm run go:no-go https://your-deployed-url${NC}

${YELLOW}Security Reminders:${NC}
  • Never commit secrets to repository
  • Rotate AWS access keys regularly
  • Use MFA for production deployments
  • Review secret access in GitHub audit logs

${YELLOW}Documentation:${NC}
  • ${BLUE}infra/cdk/README.md${NC} — CDK deployment guide
  • ${BLUE}docs/RUNBOOK_DEPLOY.md${NC} — Full deployment runbook

EOF
}

# Main execution
main() {
  show_header
  check_requirements

  get_aws_credentials
  get_application_secrets
  get_environment

  validate_secrets
  confirm_upload

  upload_secrets
  show_next_steps
}

main "$@"
