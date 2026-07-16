#!/bin/bash

# Environment Setup Verification Script
# Usage: ./scripts/verify-env-setup.sh [--strict]

set -e

STRICT_MODE=${1:-""}

echo "🔍 Verifying environment setup..."
echo ""

# CRITICAL variables (must be set)
CRITICAL_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "DSG_CORE_MODE"
)

# REQUIRED variables (needed for functionality)
REQUIRED_VARS=(
  "APP_URL"
  "NEXT_PUBLIC_APP_URL"
)

# Check for either ANON_KEY or PUBLISHABLE_KEY
HAS_ANON_KEY=false
HAS_PUBLISHABLE_KEY=false

[ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY}" ] && HAS_ANON_KEY=true
[ -n "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}" ] && HAS_PUBLISHABLE_KEY=true

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CRITICAL_MISSING=""
REQUIRED_MISSING=""

# Check CRITICAL variables
for var in "${CRITICAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    CRITICAL_MISSING="$CRITICAL_MISSING $var"
  else
    echo -e "${GREEN}✓${NC} CRITICAL: $var is set"
  fi
done

# Special check for Supabase keys
if [ "$HAS_ANON_KEY" = false ] && [ "$HAS_PUBLISHABLE_KEY" = false ]; then
  CRITICAL_MISSING="$CRITICAL_MISSING NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
else
  echo -e "${GREEN}✓${NC} CRITICAL: Supabase public key is set"
fi

# Check REQUIRED variables
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    REQUIRED_MISSING="$REQUIRED_MISSING $var"
  else
    echo -e "${GREEN}✓${NC} REQUIRED: $var is set"
  fi
done

# Check DSG_CORE_MODE rules
if [ "$DSG_CORE_MODE" = "remote" ]; then
  if [ -z "$DSG_CORE_URL" ] || [ -z "$DSG_CORE_API_KEY" ]; then
    echo -e "${RED}✗${NC} DSG_CORE_MODE=remote requires DSG_CORE_URL and DSG_CORE_API_KEY"
    CRITICAL_MISSING="$CRITICAL_MISSING DSG_CORE_URL DSG_CORE_API_KEY"
  else
    echo -e "${GREEN}✓${NC} DSG_CORE_MODE remote is properly configured"
  fi
elif [ "$DSG_CORE_MODE" = "internal" ]; then
  echo -e "${GREEN}✓${NC} DSG_CORE_MODE=internal (internal routes enabled)"
fi

echo ""

# Report results
if [ -n "$CRITICAL_MISSING" ]; then
  echo -e "${RED}❌ CRITICAL variables missing:$CRITICAL_MISSING${NC}"
  exit 1
fi

if [ -n "$REQUIRED_MISSING" ]; then
  echo -e "${YELLOW}⚠️  WARNING: REQUIRED variables missing:$REQUIRED_MISSING${NC}"
  if [ "$STRICT_MODE" = "--strict" ]; then
    exit 1
  fi
fi

echo -e "${GREEN}✅ Environment setup verification PASSED${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Review .env.local and fill in placeholder values"
echo "  2. Run: npm run typecheck"
echo "  3. Run: npm run dev"
echo ""
