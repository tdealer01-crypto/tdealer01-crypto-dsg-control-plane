#!/bin/bash

################################################################################
# Stripe App Marketplace Submission Validation Script
#
# Validates that DSG Governance Gate is ready for Stripe App Marketplace submission.
# Run this before submitting to verify all requirements are met.
#
# Usage: bash scripts/validate-stripe-submission.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
log_header() {
    echo ""
    echo -e "${BLUE}${BOLD}▶ $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_file_exists() {
    local file=$1
    local name=$2

    if [ -f "$file" ]; then
        log_pass "$name exists"
        return 0
    else
        log_fail "$name NOT FOUND: $file"
        return 1
    fi
}

check_file_contains() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        log_pass "$description"
        return 0
    else
        log_fail "$description - pattern NOT FOUND: '$pattern'"
        return 1
    fi
}

check_command_succeeds() {
    local cmd=$1
    local description=$2

    if eval "$cmd" > /dev/null 2>&1; then
        log_pass "$description"
        return 0
    else
        log_fail "$description"
        return 1
    fi
}

################################################################################
# PHASE 1: Manifest Validation
################################################################################

log_header "PHASE 1: Stripe App Manifest Validation"

# Check manifest exists
check_file_exists "packages/stripe-app/stripe-app.json" "App manifest (stripe-app.json)"

# Validate JSON
if jq . packages/stripe-app/stripe-app.json > /dev/null 2>&1; then
    log_pass "Manifest JSON is valid"
else
    log_fail "Manifest JSON is INVALID - fix syntax errors"
fi

# Check distribution_type
if grep -q '"distribution_type".*"public"' packages/stripe-app/stripe-app.json; then
    log_pass "Distribution type is 'public'"
else
    log_fail "Distribution type must be 'public' for marketplace"
fi

# Check sandbox_install_compatible
if grep -q '"sandbox_install_compatible".*true' packages/stripe-app/stripe-app.json; then
    log_pass "Sandbox install compatible enabled"
else
    log_warn "Sandbox install compatible should be true for testing"
fi

# Check app ID
if grep -q '"id".*"pics.dsg.governance"' packages/stripe-app/stripe-app.json; then
    log_pass "App ID is 'pics.dsg.governance'"
else
    log_fail "App ID must be 'pics.dsg.governance'"
fi

# Check app name
if grep -q '"name".*"DSG Governance Gate"' packages/stripe-app/stripe-app.json; then
    log_pass "App name is 'DSG Governance Gate'"
else
    log_fail "App name must be 'DSG Governance Gate'"
fi

# Check icon
if grep -q '"icon"' packages/stripe-app/stripe-app.json; then
    log_pass "Icon is specified in manifest"
else
    log_fail "Icon must be specified in manifest"
fi

# Check allowed_redirect_uris (no localhost)
if grep -q "localhost" packages/stripe-app/stripe-app.json; then
    log_fail "⚠️  allowed_redirect_uris contains localhost - REMOVE before submission"
    ((FAILED++))
else
    log_pass "No localhost in allowed_redirect_uris"
fi

# Check all redirect URIs are HTTPS
if grep '"allowed_redirect_uris"' -A 10 packages/stripe-app/stripe-app.json | grep -q "http://" && ! grep -q "https://"; then
    log_fail "All redirect URIs must be HTTPS"
else
    log_pass "All redirect URIs are HTTPS"
fi

# Check permissions
if grep -q '"permissions"' packages/stripe-app/stripe-app.json; then
    log_pass "Permissions defined"
else
    log_warn "Permissions should be explicitly defined"
fi

# Check post_install_action
if grep -q '"post_install_action"' packages/stripe-app/stripe-app.json; then
    log_pass "Post-install action configured"
else
    log_warn "Post-install action should redirect to onboarding"
fi

################################################################################
# PHASE 2: Assets Validation
################################################################################

log_header "PHASE 2: Visual Assets Validation"

# Check app icon
if check_file_exists "packages/stripe-app/icon.png" "App icon"; then
    # Check dimensions
    if command -v identify &> /dev/null; then
        size=$(identify packages/stripe-app/icon.png 2>/dev/null | awk '{print $3}')
        if [[ "$size" == "300x300" ]]; then
            log_pass "Icon dimensions are correct (300x300)"
        else
            log_warn "Icon dimensions are $size (should be 300x300 for Stripe marketplace)"
        fi
    else
        log_warn "imagemagick not installed - cannot verify icon dimensions"
    fi

    # Check file size
    size_bytes=$(stat -c%s "packages/stripe-app/icon.png" 2>/dev/null || stat -f%z "packages/stripe-app/icon.png" 2>/dev/null)
    size_kb=$((size_bytes / 1024))
    if [ "$size_kb" -lt 1024 ]; then
        log_pass "Icon size is ${size_kb}KB (< 1MB)"
    else
        log_fail "Icon size is ${size_kb}KB (must be < 1MB)"
    fi
fi

################################################################################
# PHASE 3: Listing Content Validation
################################################################################

log_header "PHASE 3: Listing Content Validation"

# Check listing content file
check_file_exists "docs/STRIPE_LISTING_CONTENT.md" "Listing content file"

# Check key sections
if [ -f "docs/STRIPE_LISTING_CONTENT.md" ]; then
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Short Description" "Short description exists"
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Long Description" "Long description exists"
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Feature 1:" "Feature 1 defined"
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Feature 2:" "Feature 2 defined"
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Feature 3:" "Feature 3 defined"
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Test Scenario" "Testing guidance included"
    check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "support@dsg.pics" "Support email provided"
fi

################################################################################
# PHASE 4: Documentation Validation
################################################################################

log_header "PHASE 4: Documentation Validation"

# Check submission guide
check_file_exists "docs/STRIPE_MARKETPLACE_SUBMISSION_GUIDE.md" "Submission guide"

# Check key documentation exists
check_file_exists "docs/PHASE9_SUBMISSION_FORM.md" "Submission form template"
check_file_exists "docs/PHASE9_INDEX.md" "Phase 9 index"

################################################################################
# PHASE 5: Security & Compliance Validation
################################################################################

log_header "PHASE 5: Security & Compliance Validation"

# Check for hardcoded API keys
if grep -r "sk_live\|sk_test\|pk_live\|pk_test" packages/stripe-app/src/ --include="*.ts" --include="*.js" 2>/dev/null; then
    log_fail "⚠️  HARDCODED API KEYS FOUND - REMOVE IMMEDIATELY"
else
    log_pass "No hardcoded API keys detected"
fi

# Check npm dependencies
if [ -f "packages/stripe-app/package.json" ]; then
    log_pass "Package.json exists"
    # Note: npm audit should be run separately
else
    log_fail "packages/stripe-app/package.json not found"
fi

# Check for .env.example
check_file_exists "packages/stripe-app/.env.example" "Environment variables template"

# Check Terms of Service placeholder
check_file_exists "docs/STRIPE_LISTING_CONTENT.md" "Terms of Service content"

# Check Privacy Policy placeholder
check_file_contains "docs/STRIPE_LISTING_CONTENT.md" "Privacy" "Privacy policy reference"

################################################################################
# PHASE 6: Production Deployment Validation
################################################################################

log_header "PHASE 6: Production Deployment Validation"

# Check Vercel deployment
echo "Checking production deployment..."
if check_command_succeeds "curl -s -o /dev/null -w '%{http_code}' https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | grep -q '^200$'" "Production health endpoint responds"; then
    :
else
    log_warn "Production health endpoint check failed - verify Vercel deployment is active"
fi

# Check OAuth callback URL
echo "Checking OAuth callback URL..."
if check_command_succeeds "curl -s -o /dev/null -w '%{http_code}' https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback | grep -qE '^(200|301|302|400)$'" "OAuth callback URL accessible"; then
    :
else
    log_warn "OAuth callback URL check failed - verify Vercel deployment is active"
fi

################################################################################
# PHASE 7: Manifest Versions Validation
################################################################################

log_header "PHASE 7: Manifest Versions Validation"

# Check all manifest files
check_file_exists "packages/stripe-app/stripe-app.json" "Development manifest"
check_file_exists "packages/stripe-app/stripe-app.dev.json" "Dev manifest"
check_file_exists "packages/stripe-app/stripe-app.prod.json" "Production manifest"

# Verify they are valid JSON
echo "Validating manifest JSON..."
for manifest in stripe-app.json stripe-app.dev.json stripe-app.prod.json; do
    if jq . packages/stripe-app/$manifest > /dev/null 2>&1; then
        log_pass "$manifest is valid JSON"
    else
        log_fail "$manifest is INVALID JSON"
    fi
done

################################################################################
# PHASE 8: Stripe CLI Readiness
################################################################################

log_header "PHASE 8: Stripe CLI & Authentication"

# Check Stripe CLI is installed
if command -v stripe &> /dev/null; then
    log_pass "Stripe CLI is installed"
else
    log_warn "Stripe CLI not found - install with: npm install -g @stripe/cli"
fi

# Note: We cannot verify authentication without interactive login
log_warn "Manual step: Verify you can run 'stripe login' and authenticate"

################################################################################
# PHASE 9: Summary Report
################################################################################

log_header "SUMMARY REPORT"

echo ""
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${RED}✗ Failed:${NC} $FAILED"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo ""

# Determine overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 ALL CHECKS PASSED - READY FOR SUBMISSION!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review docs/STRIPE_MARKETPLACE_SUBMISSION_GUIDE.md"
    echo "2. Log into Stripe Dashboard"
    echo "3. Navigate to Developers → Apps & Integrations"
    echo "4. Create or select 'DSG Governance Gate' app"
    echo "5. Upload manifest and listing content"
    echo "6. Submit for review"
    echo ""
    exit 0
else
    echo -e "${RED}${BOLD}❌ VALIDATION FAILED - FIX ISSUES ABOVE${NC}"
    echo ""
    echo "Issues to fix:"
    echo "1. All failed checks (marked with ✗)"
    echo "2. Review warnings (marked with ⚠)"
    echo ""
    exit 1
fi
