#!/bin/bash

##############################################################################
# setup-vercel-env.sh
#
# Comprehensive Vercel environment variable validation script for DSG Control Plane.
# Validates all 11 required environment variables are present and correctly formatted.
#
# Usage:
#   bash scripts/setup-vercel-env.sh
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed (non-critical)
#   2 = Critical checks failed (deployment will not work)
#
##############################################################################

set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0
CRITICAL_FAILURES=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
    ((CRITICAL_FAILURES++))
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_var_exists() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        print_fail "$var_name is not set"
        return 1
    else
        print_pass "$var_name is set"
        return 0
    fi
}

check_var_format() {
    local var_name=$1
    local var_value=${!var_name}
    local pattern=$2
    local description=$3

    if [ -z "$var_value" ]; then
        return 1
    fi

    if [[ $var_value =~ $pattern ]]; then
        print_pass "$var_name has correct format ($description)"
        return 0
    else
        print_fail "$var_name has incorrect format. Expected: $description, Got: ${var_value:0:20}..."
        return 1
    fi
}

check_var_length() {
    local var_name=$1
    local var_value=${!var_name}
    local min_length=$2

    if [ -z "$var_value" ]; then
        return 1
    fi

    if [ ${#var_value} -ge "$min_length" ]; then
        print_pass "$var_name has sufficient length (${#var_value} chars)"
        return 0
    else
        print_fail "$var_name is too short (${#var_value} chars, minimum: $min_length)"
        return 1
    fi
}

print_var_summary() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "  ${RED}[NOT SET]${NC}"
    else
        local length=${#var_value}
        local preview="${var_value:0:20}"
        if [ $length -gt 20 ]; then
            preview="${preview}..."
        fi
        echo -e "  ${GREEN}[SET]${NC} $preview (${length} chars)"
    fi
}

##############################################################################
# MAIN VALIDATION
##############################################################################

print_header "DSG Control Plane - Vercel Environment Validation"

echo "Checking required environment variables for production deployment..."
echo ""

##############################################################################
# SECTION 1: STRIPE CONFIGURATION
##############################################################################

print_header "1. STRIPE Configuration (5 variables)"

print_info "Validating Stripe API credentials..."

if check_var_exists STRIPE_API_KEY; then
    check_var_format STRIPE_API_KEY '^sk_live_' "sk_live_* (live secret key)" || print_warn "STRIPE_API_KEY does not use live key format. If intentional for testing, you can ignore this warning."
else
    print_warn "Add STRIPE_API_KEY from Stripe Dashboard → Developers → API Keys → Secret Key"
fi

if check_var_exists STRIPE_PUBLISHABLE_KEY; then
    check_var_format STRIPE_PUBLISHABLE_KEY '^pk_live_' "pk_live_* (live publishable key)" || print_warn "STRIPE_PUBLISHABLE_KEY does not use live key format. If intentional for testing, you can ignore this warning."
else
    print_warn "Add STRIPE_PUBLISHABLE_KEY from Stripe Dashboard → Developers → API Keys → Publishable Key"
fi

if check_var_exists STRIPE_WEBHOOK_SECRET; then
    check_var_format STRIPE_WEBHOOK_SECRET '^whsec_' "whsec_* (webhook signing secret)" || print_warn "STRIPE_WEBHOOK_SECRET does not use correct format"
else
    print_warn "Add STRIPE_WEBHOOK_SECRET from Stripe Dashboard → Developers → Webhooks → Endpoint Secret"
fi

if check_var_exists STRIPE_OAUTH_CLIENT_ID; then
    check_var_length STRIPE_OAUTH_CLIENT_ID 10 || print_warn "STRIPE_OAUTH_CLIENT_ID seems too short"
else
    print_warn "Add STRIPE_OAUTH_CLIENT_ID from Stripe Dashboard → Settings → OAuth Connected Apps"
fi

if check_var_exists STRIPE_OAUTH_CLIENT_SECRET; then
    check_var_length STRIPE_OAUTH_CLIENT_SECRET 20 || print_warn "STRIPE_OAUTH_CLIENT_SECRET seems too short"
else
    print_warn "Add STRIPE_OAUTH_CLIENT_SECRET from Stripe Dashboard → Settings → OAuth Connected Apps"
fi

echo ""
echo "Stripe Summary:"
print_var_summary STRIPE_API_KEY
print_var_summary STRIPE_PUBLISHABLE_KEY
print_var_summary STRIPE_WEBHOOK_SECRET
print_var_summary STRIPE_OAUTH_CLIENT_ID
print_var_summary STRIPE_OAUTH_CLIENT_SECRET

##############################################################################
# SECTION 2: SUPABASE CONFIGURATION
##############################################################################

print_header "2. SUPABASE Configuration (3 variables)"

print_info "Validating Supabase credentials..."

if check_var_exists NEXT_PUBLIC_SUPABASE_URL; then
    check_var_format NEXT_PUBLIC_SUPABASE_URL '^https://.*\.supabase\.co$' "https://*.supabase.co" || print_warn "NEXT_PUBLIC_SUPABASE_URL does not match Supabase URL pattern"
else
    print_fail "NEXT_PUBLIC_SUPABASE_URL is required. Add from Supabase Dashboard → Project Settings → General → Project URL"
fi

if check_var_exists NEXT_PUBLIC_SUPABASE_ANON_KEY; then
    check_var_length NEXT_PUBLIC_SUPABASE_ANON_KEY 100 || print_warn "NEXT_PUBLIC_SUPABASE_ANON_KEY seems too short (should be long base64 string)"
else
    print_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Add from Supabase Dashboard → Project Settings → API → anon key"
fi

if check_var_exists SUPABASE_SERVICE_ROLE_KEY; then
    check_var_length SUPABASE_SERVICE_ROLE_KEY 100 || print_warn "SUPABASE_SERVICE_ROLE_KEY seems too short (should be longer than anon key)"
else
    print_fail "SUPABASE_SERVICE_ROLE_KEY is required. Add from Supabase Dashboard → Project Settings → API → service_role key"
fi

echo ""
echo "Supabase Summary:"
print_var_summary NEXT_PUBLIC_SUPABASE_URL
print_var_summary NEXT_PUBLIC_SUPABASE_ANON_KEY
print_var_summary SUPABASE_SERVICE_ROLE_KEY

##############################################################################
# SECTION 3: RATE LIMITING / REDIS CONFIGURATION
##############################################################################

print_header "3. Rate Limiting & Redis (1 variable)"

print_info "Validating Redis/Upstash configuration..."

if check_var_exists UPSTASH_REDIS_URL; then
    check_var_format UPSTASH_REDIS_URL '^redis://' "redis://* (Upstash Redis URL)" || print_warn "UPSTASH_REDIS_URL does not follow redis:// protocol"
else
    print_fail "UPSTASH_REDIS_URL is required. Add from Upstash Console → Databases → Your Database → REDIS_URL"
fi

echo ""
echo "Redis Summary:"
print_var_summary UPSTASH_REDIS_URL

##############################################################################
# SECTION 4: DSG CONTROL PLANE CONFIGURATION
##############################################################################

print_header "4. DSG Control Plane (2 variables)"

print_info "Validating DSG API configuration..."

if check_var_exists DSG_API_KEY; then
    check_var_length DSG_API_KEY 10 || print_warn "DSG_API_KEY seems too short"
else
    print_fail "DSG_API_KEY is required. Obtain from your DSG Control Plane deployment"
fi

if check_var_exists DSG_CORE_MODE; then
    if [[ "$DSG_CORE_MODE" == "internal" || "$DSG_CORE_MODE" == "remote" ]]; then
        print_pass "DSG_CORE_MODE is set to valid value: $DSG_CORE_MODE"
    else
        print_fail "DSG_CORE_MODE must be 'internal' or 'remote', got: $DSG_CORE_MODE"
    fi
else
    print_fail "DSG_CORE_MODE is required. Set to 'internal' (default) or 'remote' (if using external DSG Core)"
fi

# Conditional check: if DSG_CORE_MODE is 'remote', require DSG_CORE_URL
if [ "$DSG_CORE_MODE" = "remote" ]; then
    if check_var_exists DSG_CORE_URL; then
        check_var_format DSG_CORE_URL '^https://' "https:// (remote DSG Core URL)" || print_warn "DSG_CORE_URL should be HTTPS"
    else
        print_fail "DSG_CORE_URL is required when DSG_CORE_MODE=remote"
    fi
else
    if [ -z "$DSG_CORE_URL" ]; then
        print_pass "DSG_CORE_URL is correctly unset (using internal mode)"
    else
        print_warn "DSG_CORE_URL is set but DSG_CORE_MODE=internal. This variable will be ignored."
    fi
fi

echo ""
echo "DSG Summary:"
print_var_summary DSG_API_KEY
echo "  DSG_CORE_MODE: $DSG_CORE_MODE"
if [ "$DSG_CORE_MODE" = "remote" ]; then
    print_var_summary DSG_CORE_URL
fi

##############################################################################
# SECTION 5: APP URL CONFIGURATION
##############################################################################

print_header "5. App URL Configuration (2 variables)"

print_info "Validating app URL configuration..."

if check_var_exists NEXT_PUBLIC_APP_URL; then
    check_var_format NEXT_PUBLIC_APP_URL '^https://' "https:// URL" || print_warn "NEXT_PUBLIC_APP_URL should be HTTPS"
else
    print_fail "NEXT_PUBLIC_APP_URL is required. Set to your Vercel deployment URL (e.g., https://dsg-control-plane.vercel.app)"
fi

if check_var_exists APP_URL; then
    check_var_format APP_URL '^https://' "https:// URL" || print_warn "APP_URL should be HTTPS"
else
    print_fail "APP_URL is required. Set to your Vercel deployment URL (same as NEXT_PUBLIC_APP_URL)"
fi

echo ""
echo "App URL Summary:"
print_var_summary NEXT_PUBLIC_APP_URL
print_var_summary APP_URL

##############################################################################
# SECTION 6: NODE ENVIRONMENT
##############################################################################

print_header "6. Node Environment"

print_info "Validating Node.js environment setting..."

if check_var_exists NODE_ENV; then
    if [ "$NODE_ENV" = "production" ]; then
        print_pass "NODE_ENV is set to 'production' (correct for deployment)"
    else
        print_warn "NODE_ENV is set to '$NODE_ENV' instead of 'production'. This may affect performance."
    fi
else
    print_fail "NODE_ENV is not set. Should be 'production' for Vercel deployment"
fi

echo ""
echo "Environment Summary:"
echo "  NODE_ENV: ${NODE_ENV:-[NOT SET]}"

##############################################################################
# SUMMARY
##############################################################################

print_header "Validation Summary"

echo ""
echo "Results:"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $CRITICAL_FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARNINGS non-critical warnings above. Review them for completeness.${NC}"
    fi
    echo ""
    echo "Next steps:"
    echo "  1. Verify all values are correct in Vercel console"
    echo "  2. Redeploy from Vercel dashboard or run: vercel --prod"
    echo "  3. Check deployment status at: vercel.com/dashboard"
    echo "  4. Run health check: curl https://your-deployment.vercel.app/api/health"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Critical checks failed. Cannot deploy.${NC}"
    echo ""
    echo "Issues to fix:"
    grep -E "^✗" <<< "$(bash scripts/setup-vercel-env.sh 2>&1)" | head -10
    echo ""
    echo "Instructions:"
    echo "  1. Read docs/DEPLOYMENT_VERCEL_SETUP.md section 'Part 3: Environment Variables'"
    echo "  2. Add missing variables in Vercel dashboard → Settings → Environment Variables"
    echo "  3. Verify variable formats match examples in documentation"
    echo "  4. Re-run this script to verify: bash scripts/setup-vercel-env.sh"
    echo ""
    exit 2
fi
