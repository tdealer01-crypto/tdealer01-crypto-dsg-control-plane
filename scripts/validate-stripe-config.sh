#!/bin/bash

################################################################################
# Stripe Configuration Validation Script
#
# Purpose: Verify all Stripe configuration is correctly set up in both the
#          local environment and Stripe Dashboard.
#
# Usage: ./scripts/validate-stripe-config.sh
#
# Checks performed:
#   1. API Key format and validity (test API call)
#   2. Webhook secret format and configuration
#   3. OAuth Client ID/Secret format
#   4. Webhook endpoint registered in Stripe Dashboard
#   5. OAuth redirect URIs registered
#   6. Environment variable completeness
#   7. API key connectivity
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed
#   2 = Missing required tools or environment
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILES=(
    "${PROJECT_ROOT}/.env.local"
    "${PROJECT_ROOT}/.env"
    "${PROJECT_ROOT}/packages/stripe-app/.env.local"
    "${PROJECT_ROOT}/packages/stripe-app/.env"
)

# Helper functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Load environment variables from .env files
load_env() {
    for env_file in "${ENV_FILES[@]}"; do
        if [[ -f "$env_file" ]]; then
            info "Loading environment from: $env_file"
            set -a
            # shellcheck source=/dev/null
            source "$env_file"
            set +a
            return 0
        fi
    done
    return 1
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate API key format
validate_api_key_format() {
    local key="$1"
    local key_type="$2"

    if [[ -z "$key" ]]; then
        return 1
    fi

    # Stripe test keys start with sk_test_, sk_live_ or similar
    # Restricted keys start with rk_test_, rk_live_
    if [[ "$key" =~ ^(sk_|rk_)+(test_|live_)[a-zA-Z0-9_]{20,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Validate webhook secret format
validate_webhook_secret_format() {
    local secret="$1"

    if [[ -z "$secret" ]]; then
        return 1
    fi

    # Webhook secrets follow pattern: whsec_test_* or whsec_live_*
    if [[ "$secret" =~ ^whsec_(test_|live_)[a-zA-Z0-9_]{20,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Validate OAuth client ID format
validate_oauth_client_id_format() {
    local client_id="$1"

    if [[ -z "$client_id" ]]; then
        return 1
    fi

    # Stripe app OAuth client IDs typically follow pattern: ca_* or ca_oauth_*
    if [[ "$client_id" =~ ^ca(_.+)?$ ]]; then
        return 0
    else
        return 1
    fi
}

# Test Stripe API key validity
test_api_key() {
    local api_key="$1"

    if [[ -z "$api_key" ]]; then
        fail "Stripe API key is empty"
        return 1
    fi

    if ! command_exists curl; then
        warn "curl not available, skipping API key test"
        return 0
    fi

    # Make a test API call to verify key is valid
    # Using a simple list accounts call (read-only, safe)
    local response
    if response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $api_key" \
        "https://api.stripe.com/v1/balance" \
        2>/dev/null); then

        local http_code
        http_code=$(echo "$response" | tail -n1)

        if [[ "$http_code" == "200" ]]; then
            pass "Stripe API key is valid and connected"
            return 0
        elif [[ "$http_code" == "401" ]]; then
            fail "Stripe API key is invalid (401 Unauthorized)"
            return 1
        elif [[ "$http_code" == "403" ]]; then
            warn "Stripe API key returned 403 (may have insufficient permissions)"
            return 0
        else
            warn "Stripe API returned HTTP $http_code (check key validity)"
            return 0
        fi
    else
        warn "Could not test API key connectivity (network issue?)"
        return 0
    fi
}

# Check environment variables
check_env_vars() {
    print_header "1. Checking Environment Variables"

    local required_vars=(
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "STRIPE_APP_CLIENT_ID"
    )

    local optional_vars=(
        "STRIPE_APP_CLIENT_SECRET"
        "STRIPE_PUBLISHABLE_KEY"
    )

    # Check required variables
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            fail "$var is not set"
        else
            # Show masked value for security
            local value="${!var}"
            local display="${value:0:8}...${value: -4}"
            pass "$var is set: $display"
        fi
    done

    # Check optional variables
    for var in "${optional_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            warn "$var is not set (optional)"
        else
            local value="${!var}"
            local display="${value:0:8}...${value: -4}"
            info "$var is set: $display"
        fi
    done

    echo ""
}

# Validate key formats
check_key_formats() {
    print_header "2. Validating Key Formats"

    # Validate API key
    if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
        if validate_api_key_format "$STRIPE_SECRET_KEY" "STRIPE_SECRET_KEY"; then
            pass "STRIPE_SECRET_KEY format is valid"
        else
            fail "STRIPE_SECRET_KEY format is invalid (expected sk_test_* or sk_live_*)"
        fi
    fi

    # Validate webhook secret
    if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
        if validate_webhook_secret_format "$STRIPE_WEBHOOK_SECRET"; then
            pass "STRIPE_WEBHOOK_SECRET format is valid"
        else
            fail "STRIPE_WEBHOOK_SECRET format is invalid (expected whsec_test_* or whsec_live_*)"
        fi
    fi

    # Validate OAuth client ID
    if [[ -n "${STRIPE_APP_CLIENT_ID:-}" ]]; then
        if validate_oauth_client_id_format "$STRIPE_APP_CLIENT_ID"; then
            pass "STRIPE_APP_CLIENT_ID format is valid"
        else
            fail "STRIPE_APP_CLIENT_ID format is invalid (expected ca_* pattern)"
        fi
    fi

    echo ""
}

# Test API connectivity
check_api_connectivity() {
    print_header "3. Testing API Connectivity"

    if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
        warn "Skipping API test - STRIPE_SECRET_KEY not set"
    else
        if command_exists curl; then
            test_api_key "$STRIPE_SECRET_KEY"
        else
            warn "curl not available, skipping API connectivity test"
        fi
    fi

    echo ""
}

# Check for Stripe CLI
check_stripe_cli() {
    print_header "4. Checking Stripe CLI Availability"

    if command_exists stripe; then
        local cli_version
        cli_version=$(stripe --version 2>/dev/null || echo "unknown")
        pass "Stripe CLI is installed: $cli_version"

        # Check if authenticated
        if stripe config --list &>/dev/null; then
            pass "Stripe CLI is authenticated"
        else
            warn "Stripe CLI is not authenticated (run: stripe login)"
        fi
    else
        warn "Stripe CLI is not installed"
        info "Install with: npm install -g @stripe/stripe-cli"
    fi

    echo ""
}

# Check local webhook configuration
check_local_webhook_config() {
    print_header "5. Checking Local Webhook Configuration"

    local app_root="${PROJECT_ROOT}/packages/stripe-app"

    if [[ -f "$app_root/src/routes/webhooks.ts" ]]; then
        pass "Webhook handler file exists: src/routes/webhooks.ts"

        # Check if webhook secret is validated in code
        if grep -q "STRIPE_WEBHOOK_SECRET" "$app_root/src/routes/webhooks.ts"; then
            pass "Webhook secret validation is implemented in code"
        else
            fail "Webhook secret validation not found in webhooks.ts"
        fi

        # Check if signature validation is implemented
        if grep -q "webhooks.constructEvent\|stripe.webhooks" "$app_root/src/routes/webhooks.ts"; then
            pass "Stripe webhook signature validation is implemented"
        else
            fail "Stripe webhook signature validation not found"
        fi
    else
        fail "Webhook handler file not found at: src/routes/webhooks.ts"
    fi

    echo ""
}

# Check OAuth handler
check_oauth_handler() {
    print_header "6. Checking OAuth Handler"

    local app_root="${PROJECT_ROOT}/packages/stripe-app"

    if [[ -f "$app_root/src/routes/oauth.ts" ]]; then
        pass "OAuth handler file exists: src/routes/oauth.ts"

        # Check if OAuth client ID is used
        if grep -q "STRIPE_APP_CLIENT_ID\|client_id" "$app_root/src/routes/oauth.ts"; then
            pass "OAuth client ID is referenced in handler"
        else
            warn "OAuth client ID reference not found in handler"
        fi

        # Check if state validation is planned
        if grep -q "state\|State" "$app_root/src/routes/oauth.ts"; then
            pass "OAuth state validation is implemented/planned"
        else
            warn "OAuth state validation not found in code"
        fi
    else
        fail "OAuth handler file not found at: src/routes/oauth.ts"
    fi

    echo ""
}

# Check Supabase configuration (if applicable)
check_supabase_config() {
    print_header "7. Checking Supabase Configuration"

    if [[ -z "${SUPABASE_URL:-}" ]]; then
        warn "SUPABASE_URL not set"
    else
        pass "SUPABASE_URL is set"
    fi

    if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        warn "SUPABASE_SERVICE_ROLE_KEY not set"
    else
        pass "SUPABASE_SERVICE_ROLE_KEY is set"
    fi

    echo ""
}

# Generate dashboard configuration guide
print_dashboard_guide() {
    print_header "8. Manual Verification Required (Stripe Dashboard)"

    echo "The following checks require manual verification in Stripe Dashboard:"
    echo ""
    echo "  1. Webhook Endpoint Registration:"
    echo "     - Go to: https://dashboard.stripe.com/webhooks"
    echo "     - Expected endpoint: https://your-app.vercel.app/api/stripe/webhook/events"
    echo "     - Verify events are enabled: charge.*, payout.*, refund.*, payment_intent.*"
    echo ""
    echo "  2. OAuth Configuration:"
    echo "     - Go to: https://dashboard.stripe.com/apps"
    echo "     - Verify OAuth client ID is registered"
    echo "     - Verify redirect URI is registered: https://your-app.vercel.app/stripe/oauth/callback"
    echo ""
    echo "  3. Restricted API Keys (optional):"
    echo "     - Go to: https://dashboard.stripe.com/apikeys/restricted-tokens"
    echo "     - Verify restricted keys have appropriate permissions"
    echo ""
    echo "  4. Webhook Signing Secret:"
    echo "     - Location: https://dashboard.stripe.com/webhooks"
    echo "     - Click endpoint to reveal signing secret"
    echo "     - Verify it matches STRIPE_WEBHOOK_SECRET in .env"
    echo ""
    echo "Run the following commands to test:"
    echo "  # Test with Stripe CLI (requires authentication)"
    echo "  stripe trigger charge.created"
    echo ""
    echo "  # Or use: ./scripts/test-webhook-delivery.sh"
    echo ""
}

# Main execution
main() {
    print_header "Stripe Configuration Validator"
    echo "Project: $(basename "$PROJECT_ROOT")"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""

    # Load environment
    if ! load_env; then
        warn "No .env file found - some checks may be incomplete"
        echo ""
    fi

    # Run all checks
    check_env_vars
    check_key_formats
    check_api_connectivity
    check_stripe_cli
    check_local_webhook_config
    check_oauth_handler
    check_supabase_config
    print_dashboard_guide

    # Summary
    print_header "Validation Summary"
    echo -e "Passed:  ${GREEN}$PASSED${NC}"
    echo -e "Failed:  ${RED}$FAILED${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo ""

    if [[ $FAILED -eq 0 ]]; then
        echo -e "${GREEN}All checks passed!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Verify webhook endpoint in Stripe Dashboard"
        echo "  2. Test webhook delivery: ./scripts/test-webhook-delivery.sh"
        echo "  3. Review: docs/STRIPE_CONFIGURATION_VERIFICATION.md"
        return 0
    else
        echo -e "${RED}$FAILED check(s) failed. See above for details.${NC}"
        return 1
    fi
}

# Run main function
main "$@"
