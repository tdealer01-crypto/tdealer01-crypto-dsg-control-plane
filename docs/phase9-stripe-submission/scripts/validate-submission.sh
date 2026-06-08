#!/bin/bash

##############################################################################
# validate-submission.sh
#
# Validates that all Stripe Marketplace submission assets meet specifications.
# Must pass before submitting to Stripe Dashboard.
#
# Usage: bash docs/phase9-stripe-submission/scripts/validate-submission.sh
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"
ERRORS=0
WARNINGS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_header() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_file_exists() {
    local file=$1
    local name=$2

    if [ -f "$file" ]; then
        log_pass "$name exists: $file"
        return 0
    else
        log_fail "$name MISSING: $file"
        return 1
    fi
}

check_image_dimensions() {
    local file=$1
    local expected_width=$2
    local expected_height=$3
    local name=$4

    if ! command -v identify &> /dev/null; then
        log_warn "ImageMagick 'identify' not installed - skipping image dimension check for $name"
        return 0
    fi

    local dims=$(identify -format "%wx%h" "$file" 2>/dev/null || echo "unknown")
    local width="${dims%x*}"
    local height="${dims#*x}"

    if [ "$width" = "$expected_width" ] && [ "$height" = "$expected_height" ]; then
        log_pass "$name dimensions correct: ${width}x${height}"
        return 0
    else
        log_fail "$name dimensions INCORRECT: ${dims} (expected ${expected_width}x${expected_height})"
        return 1
    fi
}

check_file_size() {
    local file=$1
    local max_size_kb=$2
    local name=$3

    if [ ! -f "$file" ]; then
        return 1
    fi

    local size_kb=$(( $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file") / 1024 ))

    if [ "$size_kb" -le "$max_size_kb" ]; then
        log_pass "$name file size acceptable: ${size_kb}KB (max: ${max_size_kb}KB)"
        return 0
    else
        log_warn "$name file size LARGE: ${size_kb}KB (max recommended: ${max_size_kb}KB)"
        return 0
    fi
}

check_file_type() {
    local file=$1
    local expected_type=$2
    local name=$3

    if ! command -v file &> /dev/null; then
        log_warn "file command not installed - skipping file type check for $name"
        return 0
    fi

    local actual_type=$(file -b "$file" | cut -d' ' -f1)

    if [[ "$actual_type" == *"$expected_type"* ]]; then
        log_pass "$name file type correct: $actual_type"
        return 0
    else
        log_fail "$name file type INCORRECT: $actual_type (expected $expected_type)"
        return 1
    fi
}

check_urls() {
    local url=$1
    local name=$2

    if ! command -v curl &> /dev/null; then
        log_warn "curl not installed - skipping URL check for $name"
        return 0
    fi

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        log_pass "$name URL is accessible: $url"
        return 0
    else
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        log_fail "$name URL returned status $status: $url"
        return 1
    fi
}

##############################################################################
# VALIDATION STARTS HERE
##############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Stripe Marketplace Submission Asset Validation               ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Check 1: Assets directory exists
log_header "Checking assets directory"
if [ -d "$ASSETS_DIR" ]; then
    log_pass "Assets directory exists: $ASSETS_DIR"
else
    log_fail "Assets directory not found: $ASSETS_DIR"
    exit 1
fi

# Check 2: App icon
log_header "Checking app icon"
check_file_exists "$ASSETS_DIR/icon-1200x1200.png" "Icon" || true
check_file_type "$ASSETS_DIR/icon-1200x1200.png" "PNG" "Icon" || true
check_image_dimensions "$ASSETS_DIR/icon-1200x1200.png" "1200" "1200" "Icon" || true
check_file_size "$ASSETS_DIR/icon-1200x1200.png" "2048" "Icon" || true

# Check 3: Screenshots
log_header "Checking screenshots"
screenshot_count=0
for i in 1 2 3 4 5; do
    screenshot_file="$ASSETS_DIR/screenshot-${i}-*.png"
    matching_files=$(ls $screenshot_file 2>/dev/null || echo "")

    if [ -n "$matching_files" ]; then
        for file in $matching_files; do
            check_file_exists "$file" "Screenshot $i" || true
            check_file_type "$file" "PNG" "Screenshot $i" || true
            check_image_dimensions "$file" "1200" "800" "Screenshot $i" || true
            check_file_size "$file" "3072" "Screenshot $i" || true
            ((screenshot_count++))
        done
    fi
done

if [ "$screenshot_count" -ge 3 ]; then
    log_pass "Screenshot count acceptable: $screenshot_count (minimum 3 required)"
else
    log_fail "Not enough screenshots: $screenshot_count (minimum 3 required)"
fi

# Check 4: Legal documents
log_header "Checking legal documents"
if [ -f "$ASSETS_DIR/privacy-policy.pdf" ]; then
    check_file_exists "$ASSETS_DIR/privacy-policy.pdf" "Privacy Policy PDF"
    check_file_type "$ASSETS_DIR/privacy-policy.pdf" "PDF" "Privacy Policy"
else
    log_warn "Privacy Policy PDF not provided (optional)"
fi

if [ -f "$ASSETS_DIR/terms-of-service.pdf" ]; then
    check_file_exists "$ASSETS_DIR/terms-of-service.pdf" "Terms of Service PDF"
    check_file_type "$ASSETS_DIR/terms-of-service.pdf" "PDF" "Terms of Service"
else
    log_warn "Terms of Service PDF not provided (optional)"
fi

# Check 5: Configuration files
log_header "Checking configuration files"
check_file_exists "$SCRIPT_DIR/SUBMISSION_DATA.json" "Submission data JSON"
check_file_exists "$SCRIPT_DIR/../PHASE9_SUBMISSION_READY.md" "Submission guide"

# Check 6: Content validation
log_header "Checking submission data content"

if [ -f "$SCRIPT_DIR/SUBMISSION_DATA.json" ]; then
    # Check if jq is available
    if command -v jq &> /dev/null; then
        # Validate JSON structure
        if jq empty "$SCRIPT_DIR/SUBMISSION_DATA.json" 2>/dev/null; then
            log_pass "SUBMISSION_DATA.json is valid JSON"

            # Check required fields
            app_name=$(jq -r '.app_metadata.app_name' "$SCRIPT_DIR/SUBMISSION_DATA.json")
            short_desc=$(jq -r '.app_descriptions.short_description' "$SCRIPT_DIR/SUBMISSION_DATA.json")
            long_desc=$(jq -r '.app_descriptions.long_description' "$SCRIPT_DIR/SUBMISSION_DATA.json")
            support_email=$(jq -r '.contact_info.support_email' "$SCRIPT_DIR/SUBMISSION_DATA.json")

            # Check short description length
            short_desc_len=${#short_desc}
            if [ "$short_desc_len" -le 140 ]; then
                log_pass "Short description length OK: $short_desc_len/140 chars"
            else
                log_fail "Short description TOO LONG: $short_desc_len/140 chars"
            fi

            # Check long description length
            long_desc_len=${#long_desc}
            if [ "$long_desc_len" -le 4000 ]; then
                log_pass "Long description length OK: $long_desc_len/4000 chars"
            else
                log_fail "Long description TOO LONG: $long_desc_len/4000 chars"
            fi

            # Check app name
            if [ -n "$app_name" ] && [ "$app_name" != "null" ]; then
                log_pass "App name configured: $app_name"
            else
                log_fail "App name not configured"
            fi

            # Check support email
            if [[ "$support_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
                log_pass "Support email valid: $support_email"
            else
                log_fail "Support email invalid: $support_email"
            fi
        else
            log_fail "SUBMISSION_DATA.json is NOT valid JSON"
        fi
    else
        log_warn "jq not installed - skipping JSON validation"
    fi
else
    log_fail "SUBMISSION_DATA.json not found"
fi

# Check 7: URL validation
log_header "Checking URLs (if online)"
if command -v curl &> /dev/null; then
    check_urls "https://dsg.pics" "Homepage URL" || true
    check_urls "https://dsg.pics/privacy" "Privacy Policy URL" || true
    check_urls "https://dsg.pics/terms" "Terms of Service URL" || true
else
    log_warn "curl not installed - skipping URL validation"
fi

# Check 8: Webhook endpoint
log_header "Checking webhook endpoint"
if command -v curl &> /dev/null; then
    webhook_url="https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events"
    if curl -s -o /dev/null -w "%{http_code}" "$webhook_url" 2>/dev/null | grep -q "200\|400\|401"; then
        log_pass "Webhook endpoint is accessible: $webhook_url"
    else
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$webhook_url" 2>/dev/null || echo "timeout")
        log_warn "Webhook endpoint may not be accessible: status $status"
    fi
else
    log_warn "curl not installed - skipping webhook check"
fi

# Check 9: OAuth redirect URIs
log_header "Checking OAuth redirect URIs"
oauth_uri1="https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback"
oauth_uri2="https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback"

if command -v curl &> /dev/null; then
    # Note: OAuth endpoints might return 405 or other codes, we just check they exist
    status1=$(curl -s -o /dev/null -w "%{http_code}" "$oauth_uri1" 2>/dev/null || echo "timeout")
    status2=$(curl -s -o /dev/null -w "%{http_code}" "$oauth_uri2" 2>/dev/null || echo "timeout")

    if [ "$status1" != "000" ] && [ "$status1" != "timeout" ]; then
        log_pass "OAuth callback URI 1 is accessible: $oauth_uri1 (HTTP $status1)"
    else
        log_warn "OAuth callback URI 1 may not be accessible: $oauth_uri1"
    fi

    if [ "$status2" != "000" ] && [ "$status2" != "timeout" ]; then
        log_pass "OAuth callback URI 2 is accessible: $oauth_uri2 (HTTP $status2)"
    else
        log_warn "OAuth callback URI 2 may not be accessible: $oauth_uri2"
    fi
else
    log_warn "curl not installed - skipping OAuth URI checks"
fi

##############################################################################
# SUMMARY
##############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    VALIDATION SUMMARY                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"

echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo ""
    echo "You're ready to submit to Stripe Dashboard:"
    echo "1. Read: docs/phase9-stripe-submission/PHASE9_SUBMISSION_READY.md"
    echo "2. Open: https://dashboard.stripe.com/apps"
    echo "3. Click: Create an app"
    echo "4. Follow the step-by-step guide (Section 'Step-by-Step Stripe Dashboard Submission')"
    echo ""
    echo "Warnings: $WARNINGS"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before submitting:"
    echo ""

    if [ ! -f "$ASSETS_DIR/icon-1200x1200.png" ]; then
        echo "  - Create icon file: $ASSETS_DIR/icon-1200x1200.png (1200x1200 PNG)"
    fi

    if [ "$screenshot_count" -lt 3 ]; then
        echo "  - Add $((3 - screenshot_count)) more screenshot(s) to: $ASSETS_DIR/"
    fi

    echo ""
    echo "Warnings: $WARNINGS"
    exit 1
fi
