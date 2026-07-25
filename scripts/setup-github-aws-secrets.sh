#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}GitHub Secrets Configuration for AWS Deployment${NC}"
echo ""

# Check prerequisites
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not found${NC}"
    exit 1
fi

REPO="tdealer01-crypto/tdealer01-crypto-dsg-control-plane"

echo -e "${YELLOW}Setting up GitHub Secrets for: $REPO${NC}"
echo ""

# AWS Account ID
AWS_ACCOUNT_ID="${1:-121205961822}"
echo -e "${BLUE}AWS Account ID: $AWS_ACCOUNT_ID${NC}"

# AWS Region
AWS_REGION="${2:-us-east-1}"
echo -e "${BLUE}AWS Region: $AWS_REGION${NC}"

# Bedrock Configuration
BEDROCK_REGISTRY_ID="${3:-cGcvetJOMzWh3xmj}"
echo -e "${BLUE}Bedrock Registry ID: $BEDROCK_REGISTRY_ID${NC}"

# Cognito Configuration
COGNITO_USER_POOL_ID="${4:-us-east-1_ZtxWdHzFJ}"
echo -e "${BLUE}Cognito User Pool ID: $COGNITO_USER_POOL_ID${NC}"

COGNITO_CLIENT_ID="${5:-7njqeoh6bq64s6u44oo9vghfcg}"
echo -e "${BLUE}Cognito Client ID: $COGNITO_CLIENT_ID${NC}"

echo ""
echo -e "${YELLOW}Setting secrets...${NC}"

# Set AWS secrets
gh secret set AWS_ACCOUNT_ID --body "$AWS_ACCOUNT_ID" --repo "$REPO"
echo -e "${GREEN}✅ AWS_ACCOUNT_ID set${NC}"

gh secret set AWS_REGION --body "$AWS_REGION" --repo "$REPO"
echo -e "${GREEN}✅ AWS_REGION set${NC}"

# Set Bedrock secrets
gh secret set BEDROCK_REGISTRY_ID --body "$BEDROCK_REGISTRY_ID" --repo "$REPO"
echo -e "${GREEN}✅ BEDROCK_REGISTRY_ID set${NC}"

gh secret set COGNITO_USER_POOL_ID --body "$COGNITO_USER_POOL_ID" --repo "$REPO"
echo -e "${GREEN}✅ COGNITO_USER_POOL_ID set${NC}"

gh secret set COGNITO_CLIENT_ID --body "$COGNITO_CLIENT_ID" --repo "$REPO"
echo -e "${GREEN}✅ COGNITO_CLIENT_ID set${NC}"

# Verify secrets
echo ""
echo -e "${BLUE}Verifying secrets:${NC}"
gh secret list --repo "$REPO" | grep -E "AWS_|BEDROCK_|COGNITO_"

echo ""
echo -e "${GREEN}✅ GitHub Secrets Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Make changes to infra/cdk/"
echo "2. Commit and push to main branch"
echo "3. GitHub Actions will automatically deploy"
echo ""
echo -e "${BLUE}Or manually trigger deployment:${NC}"
echo "gh workflow run deploy-cdk.yml -f environment=staging"
