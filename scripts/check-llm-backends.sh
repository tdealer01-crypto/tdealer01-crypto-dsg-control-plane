#!/usr/bin/env bash

##############################################################################
# check-llm-backends.sh
#
# Diagnostic script for Hermes Agent LLM backend configuration.
# Checks which LLM providers are configured and their status.
#
# Usage:
#   ./scripts/check-llm-backends.sh              # Check local .env setup
#   ./scripts/check-llm-backends.sh <base-url>   # Check deployed instance
#
# Exit codes:
#   0 = At least one LLM backend is configured
#   1 = No LLM backends configured
#   2 = Usage error
#
##############################################################################

set -euo pipefail

BASE_URL="${1:-}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Hermes Agent LLM Backend Configuration Check              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [[ -z "$BASE_URL" ]]; then
  # Local check
  echo "${BLUE}📋 LOCAL ENVIRONMENT CHECK${NC}"
  echo "---"

  # Check for .env files
  if [[ ! -f .env.local && ! -f .env ]]; then
    echo "${YELLOW}⚠️  No .env files found${NC}"
  fi

  # Load env if available
  if [[ -f .env.local ]]; then
    set -a
    source .env.local 2>/dev/null || true
    set +a
  elif [[ -f .env ]]; then
    set -a
    source .env 2>/dev/null || true
    set +a
  fi

  # Check each provider
  echo ""
  echo "${BLUE}🔍 PROVIDER STATUS:${NC}"
  echo ""

  openrouter_status="not set"
  together_status="not set"
  anthropic_status="not set"

  if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    openrouter_status="${GREEN}✓ configured${NC}"
    primary_provider="OpenRouter"
  else
    openrouter_status="${RED}✗ missing${NC}"
  fi

  if [[ -n "${TOGETHER_API_KEY:-}" ]]; then
    together_status="${GREEN}✓ configured${NC}"
    if [[ -z "$primary_provider" ]]; then
      primary_provider="Together AI"
    fi
  else
    together_status="${RED}✗ missing${NC}"
  fi

  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    anthropic_status="${GREEN}✓ configured${NC}"
    if [[ -z "$primary_provider" ]]; then
      primary_provider="Anthropic"
    fi
  else
    anthropic_status="${RED}✗ missing${NC}"
  fi

  echo -e "  OPENROUTER_API_KEY    : $openrouter_status"
  echo -e "  TOGETHER_API_KEY       : $together_status"
  echo -e "  ANTHROPIC_API_KEY      : $anthropic_status"
  echo ""

  if [[ -z "${primary_provider:-}" ]]; then
    echo -e "${RED}❌ NO LLM PROVIDERS CONFIGURED${NC}"
    echo ""
    echo "To enable Hermes Agent conversational mode, set one of:"
    echo ""
    echo "  1. OPENROUTER_API_KEY"
    echo "     Get key from: https://openrouter.ai/keys"
    echo "     Recommended for Hermes (NousResearch) models"
    echo ""
    echo "  2. TOGETHER_API_KEY"
    echo "     Get key from: https://api.together.ai"
    echo "     Recommended for Hermes (NousResearch) models"
    echo ""
    echo "  3. ANTHROPIC_API_KEY"
    echo "     Get key from: https://console.anthropic.com"
    echo "     Fallback provider (Claude models)"
    echo ""
    echo "Setup for local development:"
    echo "  echo 'OPENROUTER_API_KEY=sk-or-...' >> .env.local"
    echo ""
    echo "Setup for Vercel deployment:"
    echo "  vercel env add OPENROUTER_API_KEY"
    echo "  # Enter your OpenRouter API key"
    echo "  # Redeploy the application"
    echo ""
    exit 1
  else
    echo -e "${GREEN}✅ PRIMARY PROVIDER: $primary_provider${NC}"
    echo ""

    if [[ -n "${DSG_BRAIN_MODEL:-}" ]]; then
      echo "  Default model: ${DSG_BRAIN_MODEL}"
    fi

    echo ""
    echo "Hermes Agent is ${GREEN}ready${NC} for conversational operation."
    echo ""
    exit 0
  fi
else
  # Remote check via API
  echo "${BLUE}🌍 REMOTE DEPLOYMENT CHECK${NC}"
  echo "Checking: $BASE_URL"
  echo "---"
  echo ""

  # Try to fetch health endpoint
  response=$(curl -s --max-time 10 "$BASE_URL/api/health" 2>/dev/null || echo "{}")

  if [[ "$response" == "{}" ]]; then
    echo -e "${RED}❌ Could not reach deployment${NC}"
    echo "Make sure the URL is correct and deployment is ready."
    exit 1
  fi

  # Parse response for LLM status (if available in health endpoint)
  if echo "$response" | grep -q "llm"; then
    echo "LLM status from /api/health:"
    echo "$response" | grep -o '"llm[^}]*}' || true
  else
    echo "Health endpoint reached, but LLM status not available."
    echo "This may indicate the deployment needs to be updated."
  fi

  echo ""
  echo "For more details, check:"
  echo "  curl $BASE_URL/api/agent/status"
  echo ""
  exit 0
fi
