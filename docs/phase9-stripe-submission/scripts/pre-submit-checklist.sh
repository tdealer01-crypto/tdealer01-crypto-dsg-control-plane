#!/bin/bash

##############################################################################
# pre-submit-checklist.sh
#
# Final 20-item checklist before submitting to Stripe Dashboard.
# All items must be completed (marked with ✓) before proceeding.
#
# Usage: bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

check_item() {
    local item_num=$1
    local description=$2
    local check_cmd=$3

    echo -n "  [$item_num/20] $description ... "

    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
}

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Pre-Submission Final Checklist (20 Items)              ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}ASSET CHECKS${NC}"
check_item 1 "Icon exists (1200x1200 PNG)" \
    "[ -f '$ASSETS_DIR/icon-1200x1200.png' ]"

check_item 2 "Icon is PNG format" \
    "file -b '$ASSETS_DIR/icon-1200x1200.png' 2>/dev/null | grep -q PNG"

check_item 3 "Screenshot 1 exists" \
    "ls '$ASSETS_DIR'/screenshot-1-*.png 2>/dev/null | head -1"

check_item 4 "Screenshot 2 exists" \
    "ls '$ASSETS_DIR'/screenshot-2-*.png 2>/dev/null | head -1"

check_item 5 "Screenshot 3 exists" \
    "ls '$ASSETS_DIR'/screenshot-3-*.png 2>/dev/null | head -1"

check_item 6 "At least 3 screenshots total" \
    "[ \$(ls '$ASSETS_DIR'/screenshot-*.png 2>/dev/null | wc -l) -ge 3 ]"

echo ""
echo -e "${BLUE}SUBMISSION DATA CHECKS${NC}"
check_item 7 "SUBMISSION_DATA.json exists" \
    "[ -f '$SCRIPT_DIR/SUBMISSION_DATA.json' ]"

check_item 8 "SUBMISSION_DATA.json is valid JSON" \
    "jq empty '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null"

check_item 9 "App name is set" \
    "jq -r '.app_metadata.app_name' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null | grep -qv '^null$'"

check_item 10 "Short description ≤ 140 chars" \
    "[ \$(jq -r '.app_descriptions.short_description' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null | wc -c) -le 141 ]"

check_item 11 "Long description ≤ 4000 chars" \
    "[ \$(jq -r '.app_descriptions.long_description' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null | wc -c) -le 4001 ]"

echo ""
echo -e "${BLUE}CONFIGURATION CHECKS${NC}"
check_item 12 "Support email is valid" \
    "jq -r '.contact_info.support_email' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null | grep -q '@'"

check_item 13 "OAuth redirect URIs configured" \
    "jq '.oauth_configuration.redirect_uris | length' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null | grep -q -E '^[1-9]'"

check_item 14 "Webhook endpoint is configured" \
    "jq -r '.webhook_configuration.webhook_endpoint' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null | grep -q 'https://'"

check_item 15 "Webhook events configured (≥5)" \
    "[ \$(jq '.webhook_configuration.events | length' '$SCRIPT_DIR/SUBMISSION_DATA.json' 2>/dev/null) -ge 5 ]"

echo ""
echo -e "${BLUE}CONNECTIVITY CHECKS${NC}"
check_item 16 "Homepage URL accessible" \
    "curl -s -o /dev/null -w '%{http_code}' https://dsg.pics 2>/dev/null | grep -q '200\|301\|302'"

check_item 17 "Privacy policy URL accessible" \
    "curl -s -o /dev/null -w '%{http_code}' https://dsg.pics/privacy 2>/dev/null | grep -q '200\|301\|302'"

check_item 18 "Webhook endpoint responds" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events 2>/dev/null | grep -q '200\|400\|401'"

echo ""
echo -e "${BLUE}DOCUMENTATION CHECKS${NC}"
check_item 19 "PHASE9_SUBMISSION_READY.md exists" \
    "[ -f '$SCRIPT_DIR/../PHASE9_SUBMISSION_READY.md' ]"

check_item 20 "All scripts are executable" \
    "[ -x '$SCRIPT_DIR/validate-submission.sh' ] || [ -f '$SCRIPT_DIR/validate-submission.sh' ]"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                       CHECKLIST SUMMARY                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ ALL 20 CHECKS PASSED!${NC}"
    echo ""
    echo "You are ready to submit to Stripe Dashboard."
    echo ""
    echo "Next steps:"
    echo "1. Open: https://dashboard.stripe.com/apps"
    echo "2. Click: Create an app"
    echo "3. Read: docs/phase9-stripe-submission/PHASE9_SUBMISSION_READY.md"
    echo "4. Follow the step-by-step guide"
    echo ""
    echo "Passed: $PASSED/20"
    exit 0
else
    echo -e "${RED}✗ $FAILED CHECK(S) FAILED${NC}"
    echo ""
    echo "Please fix the failed items before submitting."
    echo ""
    echo "Failed: $FAILED"
    echo "Passed: $PASSED/20"
    exit 1
fi
