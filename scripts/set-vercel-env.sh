#!/bin/bash

################################################################################
# Vercel Environment Variables Setup Script
#
# Purpose: Set environment variables in Vercel production/preview/development
#          environments for DSG ONE billing, Supabase, and integrations.
#
# Usage:   ./scripts/set-vercel-env.sh [environment] [--dry-run]
#
# Arguments:
#   environment   - production, preview, or development (default: production)
#   --dry-run     - Show what would be set without actually setting it
#
# Example:
#   ./scripts/set-vercel-env.sh production
#   ./scripts/set-vercel-env.sh preview --dry-run
#
# Prerequisites:
#   - VERCEL_TOKEN environment variable set
#   - Vercel CLI installed (npm install -g vercel)
#   - .env.local file with actual values to push
################################################################################

set -e

# Configuration
ENVIRONMENT="${1:-production}"
DRY_RUN="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
UPDATED=0
SKIPPED=0
ERRORS=0

# Environment variables to set (order matters for dependencies)
declare -A ENV_VARS=(
  # CRITICAL — Supabase
  [NEXT_PUBLIC_SUPABASE_URL]="Supabase project URL"
  [NEXT_PUBLIC_SUPABASE_ANON_KEY]="Supabase anonymous key"
  [SUPABASE_SERVICE_ROLE_KEY]="Supabase service role key"

  # CRITICAL — App
  [NEXT_PUBLIC_APP_URL]="Application URL"
  [DSG_CORE_MODE]="DSG core mode (internal or remote)"

  # CRITICAL — Auth
  [NEXTAUTH_SECRET]="NextAuth.js session secret"

  # REQUIRED — Stripe
  [STRIPE_SECRET_KEY]="Stripe live secret key"
  [STRIPE_WEBHOOK_SECRET]="Stripe webhook secret"
  [STRIPE_PRICE_PRO_MONTHLY]="Pro plan monthly price ID"
  [STRIPE_PRICE_PRO_YEARLY]="Pro plan yearly price ID"
  [STRIPE_PRICE_BUSINESS_MONTHLY]="Business plan monthly price ID"
  [STRIPE_PRICE_BUSINESS_YEARLY]="Business plan yearly price ID"
  [STRIPE_PRICE_ENTERPRISE_MONTHLY]="Enterprise plan monthly price ID"
  [STRIPE_PRICE_ENTERPRISE_YEARLY]="Enterprise plan yearly price ID"
  [STRIPE_METER_EVENT_NAME]="Metered billing event name"
  [STRIPE_METER_ID]="Stripe meter ID"

  # REQUIRED — Cron
  [CRON_SECRET]="Cron endpoint secret"

  # REQUIRED — AI & Notifications
  [ANTHROPIC_API_KEY]="Anthropic Claude API key"
  [RESEND_API_KEY]="Resend email API key"
  [GITHUB_TOKEN]="GitHub personal access token"
  [MARKETING_OUTREACH_MODE]="Marketing outreach mode"
  [TELEGRAM_BOT_TOKEN]="Telegram bot token"
  [TELEGRAM_CHAT_ID]="Telegram chat ID"
)

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Vercel Environment Variables Setup${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_step() {
  echo -e "${YELLOW}→${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

validate_environment() {
  case "$ENVIRONMENT" in
    production|preview|development)
      print_success "Environment: $ENVIRONMENT"
      ;;
    *)
      print_error "Invalid environment: $ENVIRONMENT"
      echo "Must be: production, preview, or development"
      exit 1
      ;;
  esac
}

check_prerequisites() {
  print_step "Checking prerequisites..."

  if [ -z "$VERCEL_TOKEN" ]; then
    print_error "VERCEL_TOKEN environment variable not set"
    echo "Set it with: export VERCEL_TOKEN=\"your-token\""
    exit 1
  fi
  print_success "VERCEL_TOKEN is set"

  if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not installed"
    echo "Install with: npm install -g vercel"
    exit 1
  fi
  print_success "Vercel CLI found"

  if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    print_warning ".env.local not found — will prompt for values"
  else
    print_success ".env.local found"
  fi
}

load_env_values() {
  if [ -f "$PROJECT_ROOT/.env.local" ]; then
    # Source the .env.local file
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
  fi
}

set_env_var() {
  local var_name="$1"
  local var_description="$2"
  local var_value="${!var_name:-}"

  if [ -z "$var_value" ]; then
    print_warning "Skipping $var_name — not set in .env.local"
    ((SKIPPED++))
    return
  fi

  if [ "$DRY_RUN" == "--dry-run" ]; then
    echo "  [DRY RUN] Would set: $var_name"
    ((UPDATED++))
    return
  fi

  # Check if var already exists
  EXISTING=$(vercel env ls "$ENVIRONMENT" 2>/dev/null | grep "^$var_name=" || true)

  if [ -n "$EXISTING" ]; then
    print_warning "$var_name already set in $ENVIRONMENT"
    ((SKIPPED++))
  else
    # Use echo to pipe value to vercel env add
    if echo "$var_value" | vercel env add "$var_name" "$ENVIRONMENT" > /dev/null 2>&1; then
      print_success "Set $var_name"
      ((UPDATED++))
    else
      print_error "Failed to set $var_name"
      ((ERRORS++))
    fi
  fi
}

verify_setup() {
  print_step "Verifying environment..."

  if [ "$DRY_RUN" != "--dry-run" ]; then
    echo ""
    echo "Listing all environment variables in $ENVIRONMENT:"
    vercel env ls "$ENVIRONMENT" || true
  fi
}

main() {
  print_header

  # Validate inputs
  validate_environment

  if [ "$DRY_RUN" == "--dry-run" ]; then
    print_warning "Running in DRY RUN mode — no changes will be made"
  fi

  echo ""

  # Check prerequisites
  check_prerequisites

  echo ""

  # Load environment values from .env.local
  print_step "Loading environment values..."
  load_env_values
  print_success "Environment values loaded"

  echo ""

  # Set environment variables
  print_step "Setting environment variables in $ENVIRONMENT..."
  echo ""

  for var_name in "${!ENV_VARS[@]}"; do
    var_description="${ENV_VARS[$var_name]}"
    set_env_var "$var_name" "$var_description"
  done

  echo ""

  # Verify setup
  verify_setup

  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
  echo -e "Results:"
  echo -e "  ${GREEN}✓ Updated: $UPDATED${NC}"
  echo -e "  ${YELLOW}⊘ Skipped: $SKIPPED${NC}"
  if [ $ERRORS -gt 0 ]; then
    echo -e "  ${RED}✗ Errors: $ERRORS${NC}"
  fi
  echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

  if [ $ERRORS -gt 0 ]; then
    exit 1
  fi

  echo ""
  echo -e "${GREEN}✓ Environment setup complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy: git push origin main (or npx vercel --prod)"
  echo "  2. Verify: curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health"
  echo ""
}

# Run main
main
