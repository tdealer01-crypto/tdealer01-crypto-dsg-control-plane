#!/bin/bash

################################################################################
# setup-github-secrets-template.sh
#
# Template for adding Solana integration secrets to GitHub repository.
#
# SECURITY WARNING:
# - Never run this script with actual secret values in plain text
# - Always use GitHub CLI (gh) to add secrets — it encrypts before transmission
# - Never commit this script with real secrets filled in
# - Secrets should only exist in GitHub's encrypted secret storage
#
# Usage:
#   1. Read this file completely
#   2. Gather required values (see "Prepare Values" section)
#   3. Run interactively with prompts: bash scripts/setup-github-secrets-template.sh
#   4. Verify secrets in: https://github.com/<owner>/<repo>/settings/secrets
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com/
#   - Authenticated with: gh auth login
#   - Repository access: Requires admin or secrets access
#
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

echo -e "${BLUE}=== Solana Integration GitHub Secrets Setup ===${NC}"
echo ""

################################################################################
# Step 1: Verify GitHub CLI
################################################################################

echo -e "${BLUE}Step 1: Verify GitHub CLI is installed${NC}"

if ! command -v gh &> /dev/null; then
  echo -e "${RED}ERROR: GitHub CLI (gh) not found.${NC}"
  echo "Install from: https://cli.github.com/"
  exit 1
fi

GH_VERSION=$(gh --version)
echo -e "${GREEN}✓ GitHub CLI detected: $GH_VERSION${NC}"
echo ""

################################################################################
# Step 2: Verify GitHub authentication
################################################################################

echo -e "${BLUE}Step 2: Verify GitHub authentication${NC}"

if ! gh auth status > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Not authenticated with GitHub.${NC}"
  echo "Run: gh auth login"
  exit 1
fi

GH_USER=$(gh api user -q '.login')
echo -e "${GREEN}✓ Authenticated as: $GH_USER${NC}"
echo ""

################################################################################
# Step 3: Determine repository
################################################################################

echo -e "${BLUE}Step 3: Identify repository${NC}"

# Try to get repo from git config
if [ -d .git ]; then
  REPO_URL=$(git config --get remote.origin.url | sed 's/.git$//')
  REPO=$(echo $REPO_URL | sed 's|.*github.com/||')
else
  echo "Git repository not found. Enter repository path:"
  read -p "Repository (owner/repo): " REPO
fi

echo -e "${GREEN}✓ Target repository: $REPO${NC}"
echo ""

################################################################################
# Step 4: Prepare values (Interactive prompts)
################################################################################

echo -e "${BLUE}Step 4: Prepare secret values${NC}"
echo ""
echo "You will be prompted to enter secret values."
echo -e "${YELLOW}WARNING: These will be visible in terminal. Use a secure environment.${NC}"
echo ""

# Treasury Private Key (Base64)
echo -e "${BLUE}SOLANA_TREASURY_PRIVATE_KEY${NC}"
echo "  Format: Base64-encoded 64-byte Solana private key"
echo "  Generate: solana-keygen new --outfile treasury.json && cat treasury.json | jq -r 'join(\",\") | @base64'"
echo "  Length: Should be ~88 characters"
echo ""
read -sp "Enter SOLANA_TREASURY_PRIVATE_KEY (or leave blank to skip): " TREASURY_KEY
echo ""
echo ""

# RPC Endpoint
echo -e "${BLUE}SOLANA_RPC_ENDPOINT${NC}"
echo "  Format: Full HTTPS URL to Solana RPC endpoint"
echo "  Examples:"
echo "    - Devnet:  https://api.devnet.solana.com"
echo "    - Testnet: https://api.testnet.solana.com"
echo "    - Mainnet: https://api.mainnet-beta.solana.com"
echo ""
read -p "Enter SOLANA_RPC_ENDPOINT (default: https://api.devnet.solana.com): " RPC_ENDPOINT
RPC_ENDPOINT=${RPC_ENDPOINT:-https://api.devnet.solana.com}
echo ""

# Fallback RPC Endpoint (Optional)
echo -e "${BLUE}SOLANA_RPC_ENDPOINT_FALLBACK (Optional)${NC}"
echo "  Format: Alternative RPC endpoint for failover"
echo "  Leave blank to skip"
echo ""
read -p "Enter SOLANA_RPC_ENDPOINT_FALLBACK (or leave blank): " RPC_FALLBACK
echo ""

# Confirmation Timeout (Optional)
echo -e "${BLUE}SOLANA_CONFIRMATION_TIMEOUT_MS (Optional)${NC}"
echo "  Format: Milliseconds to wait for transaction confirmation"
echo "  Default: 60000 (60 seconds)"
echo ""
read -p "Enter SOLANA_CONFIRMATION_TIMEOUT_MS (or leave blank for 60000): " CONFIRMATION_TIMEOUT
CONFIRMATION_TIMEOUT=${CONFIRMATION_TIMEOUT:-60000}
echo ""

# Max Retries (Optional)
echo -e "${BLUE}SOLANA_MAX_RETRIES (Optional)${NC}"
echo "  Format: Maximum RPC submission retries (1-10)"
echo "  Default: 3"
echo ""
read -p "Enter SOLANA_MAX_RETRIES (or leave blank for 3): " MAX_RETRIES
MAX_RETRIES=${MAX_RETRIES:-3}
echo ""

################################################################################
# Step 5: Validation
################################################################################

echo -e "${BLUE}Step 5: Validate inputs${NC}"

if [ -z "$RPC_ENDPOINT" ]; then
  echo -e "${RED}ERROR: RPC endpoint is required.${NC}"
  exit 1
fi

if [[ ! $RPC_ENDPOINT =~ ^https:// ]]; then
  echo -e "${RED}ERROR: RPC endpoint must use HTTPS.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ RPC endpoint valid: $RPC_ENDPOINT${NC}"

if [ ! -z "$TREASURY_KEY" ]; then
  KEY_LENGTH=${#TREASURY_KEY}
  if [ $KEY_LENGTH -lt 80 ] || [ $KEY_LENGTH -gt 100 ]; then
    echo -e "${YELLOW}WARNING: Treasury key length ($KEY_LENGTH) seems unusual. Expected ~88.${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
      exit 1
    fi
  fi
  echo -e "${GREEN}✓ Treasury key length: $KEY_LENGTH${NC}"
else
  echo -e "${YELLOW}⚠ Treasury key not provided. Solana execution will run in dry-run mode.${NC}"
fi

echo ""

################################################################################
# Step 6: Summary and confirmation
################################################################################

echo -e "${BLUE}Step 6: Review secrets to be added${NC}"
echo ""
echo "Repository: $REPO"
echo ""
echo "Secrets to add:"
echo "  • SOLANA_RPC_ENDPOINT = $RPC_ENDPOINT"
[ ! -z "$RPC_FALLBACK" ] && echo "  • SOLANA_RPC_ENDPOINT_FALLBACK = $RPC_FALLBACK"
[ ! -z "$TREASURY_KEY" ] && echo "  • SOLANA_TREASURY_PRIVATE_KEY = [${#TREASURY_KEY} chars]"
[ "$CONFIRMATION_TIMEOUT" != "60000" ] && echo "  • SOLANA_CONFIRMATION_TIMEOUT_MS = $CONFIRMATION_TIMEOUT"
[ "$MAX_RETRIES" != "3" ] && echo "  • SOLANA_MAX_RETRIES = $MAX_RETRIES"
echo ""

read -p "Proceed with adding these secrets to GitHub? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""

################################################################################
# Step 7: Add secrets via GitHub CLI
################################################################################

echo -e "${BLUE}Step 7: Adding secrets to GitHub${NC}"
echo ""

# Add RPC endpoint
echo "Adding SOLANA_RPC_ENDPOINT..."
echo "$RPC_ENDPOINT" | gh secret set SOLANA_RPC_ENDPOINT -R "$REPO"
echo -e "${GREEN}✓ SOLANA_RPC_ENDPOINT added${NC}"

# Add fallback RPC if provided
if [ ! -z "$RPC_FALLBACK" ]; then
  echo "Adding SOLANA_RPC_ENDPOINT_FALLBACK..."
  echo "$RPC_FALLBACK" | gh secret set SOLANA_RPC_ENDPOINT_FALLBACK -R "$REPO"
  echo -e "${GREEN}✓ SOLANA_RPC_ENDPOINT_FALLBACK added${NC}"
fi

# Add treasury key if provided
if [ ! -z "$TREASURY_KEY" ]; then
  echo "Adding SOLANA_TREASURY_PRIVATE_KEY..."
  echo "$TREASURY_KEY" | gh secret set SOLANA_TREASURY_PRIVATE_KEY -R "$REPO"
  echo -e "${GREEN}✓ SOLANA_TREASURY_PRIVATE_KEY added${NC}"
else
  echo -e "${YELLOW}⚠ Skipping SOLANA_TREASURY_PRIVATE_KEY (not provided)${NC}"
fi

# Add timeout if non-default
if [ "$CONFIRMATION_TIMEOUT" != "60000" ]; then
  echo "Adding SOLANA_CONFIRMATION_TIMEOUT_MS..."
  echo "$CONFIRMATION_TIMEOUT" | gh secret set SOLANA_CONFIRMATION_TIMEOUT_MS -R "$REPO"
  echo -e "${GREEN}✓ SOLANA_CONFIRMATION_TIMEOUT_MS added${NC}"
fi

# Add max retries if non-default
if [ "$MAX_RETRIES" != "3" ]; then
  echo "Adding SOLANA_MAX_RETRIES..."
  echo "$MAX_RETRIES" | gh secret set SOLANA_MAX_RETRIES -R "$REPO"
  echo -e "${GREEN}✓ SOLANA_MAX_RETRIES added${NC}"
fi

echo ""

################################################################################
# Step 8: Verification
################################################################################

echo -e "${BLUE}Step 8: Verify secrets in GitHub${NC}"
echo ""

# List secrets (public names only, values are encrypted)
echo "GitHub Secrets for $REPO:"
gh secret list -R "$REPO" | grep SOLANA

echo ""
echo -e "${GREEN}✓ All secrets successfully added!${NC}"
echo ""

################################################################################
# Step 9: Next Steps
################################################################################

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Verify secrets in GitHub UI:"
echo "   https://github.com/$REPO/settings/secrets/actions"
echo ""
echo "2. Update any GitHub Actions workflows that use these secrets:"
echo "   - Reference in env section: \${{ secrets.SOLANA_RPC_ENDPOINT }}"
echo ""
echo "3. For Vercel deployment, also add secrets to Vercel project:"
echo "   vercel env add SOLANA_RPC_ENDPOINT production"
echo "   vercel env add SOLANA_TREASURY_PRIVATE_KEY production"
echo ""
echo "4. Deploy and verify Solana integration is working:"
echo "   npm run test:integration -- lib/solana/"
echo ""
echo "5. Monitor deployment:"
echo "   https://vercel.com/dashboard"
echo ""

echo -e "${GREEN}Setup complete!${NC}"
