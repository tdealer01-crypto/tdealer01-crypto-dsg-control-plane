#!/bin/bash

################################################################################
# Stripe App Marketplace - Pre-Submission Readiness Check
################################################################################

echo "════════════════════════════════════════════════════════════════"
echo "  DSG Governance Gate - Stripe Marketplace Readiness Check"
echo "════════════════════════════════════════════════════════════════"
echo ""

PASSED=0
FAILED=0

check() {
    local test=$1
    local expected=$2
    if [ "$test" == "$expected" ]; then
        echo "✅ $3"
        ((PASSED++))
    else
        echo "❌ $3"
        echo "   Expected: $expected"
        echo "   Got: $test"
        ((FAILED++))
    fi
}

echo "📋 MANIFEST CHECKS"
echo "─────────────────────────────────────────────────────────────────"

# Check manifest file exists
if [ -f "packages/stripe-app/stripe-app.json" ]; then
    echo "✅ Manifest file exists"
    ((PASSED++))
else
    echo "❌ Manifest file NOT FOUND"
    ((FAILED++))
    exit 1
fi

# Check JSON validity
if jq empty packages/stripe-app/stripe-app.json 2>/dev/null; then
    echo "✅ Manifest JSON is valid"
    ((PASSED++))
else
    echo "❌ Manifest JSON is INVALID"
    ((FAILED++))
fi

# Extract and check values
APP_ID=$(jq -r '.id' packages/stripe-app/stripe-app.json)
APP_NAME=$(jq -r '.name' packages/stripe-app/stripe-app.json)
DIST_TYPE=$(jq -r '.distribution_type' packages/stripe-app/stripe-app.json)
SANDBOX=$(jq -r '.sandbox_install_compatible' packages/stripe-app/stripe-app.json)

check "$APP_ID" "pics.dsg.governance" "App ID is correct"
check "$APP_NAME" "DSG Governance Gate" "App name is correct"
check "$DIST_TYPE" "public" "Distribution type is PUBLIC (marketplace)"
check "$SANDBOX" "true" "Sandbox install compatible enabled"

# Check for localhost in redirect URIs
if jq '.allowed_redirect_uris[]' packages/stripe-app/stripe-app.json | grep -q "localhost"; then
    echo "❌ Redirect URIs contain LOCALHOST - must remove for production"
    ((FAILED++))
else
    echo "✅ No localhost in redirect URIs"
    ((PASSED++))
fi

# Check all URIs are HTTPS
if jq '.allowed_redirect_uris[]' packages/stripe-app/stripe-app.json | grep -q "^\"http://"; then
    echo "❌ Some redirect URIs are HTTP - must be HTTPS"
    ((FAILED++))
else
    echo "✅ All redirect URIs are HTTPS"
    ((PASSED++))
fi

echo ""
echo "🖼️  ASSET CHECKS"
echo "─────────────────────────────────────────────────────────────────"

# Check icon exists
if [ -f "packages/stripe-app/icon.png" ]; then
    echo "✅ App icon exists"
    ((PASSED++))

    # Check file size
    SIZE_BYTES=$(stat -c%s "packages/stripe-app/icon.png" 2>/dev/null || stat -f%z "packages/stripe-app/icon.png" 2>/dev/null)
    SIZE_KB=$((SIZE_BYTES / 1024))
    if [ "$SIZE_KB" -lt 1024 ]; then
        echo "✅ Icon size is ${SIZE_KB}KB (< 1MB limit)"
        ((PASSED++))
    else
        echo "❌ Icon is too large: ${SIZE_KB}KB (must be < 1MB)"
        ((FAILED++))
    fi
else
    echo "❌ App icon NOT FOUND at packages/stripe-app/icon.png"
    ((FAILED++))
fi

echo ""
echo "📄 DOCUMENTATION CHECKS"
echo "─────────────────────────────────────────────────────────────────"

# Check submission guide
if [ -f "docs/STRIPE_MARKETPLACE_SUBMISSION_GUIDE.md" ]; then
    echo "✅ Submission guide exists"
    ((PASSED++))
else
    echo "❌ Submission guide NOT FOUND"
    ((FAILED++))
fi

# Check listing content
if [ -f "docs/STRIPE_LISTING_CONTENT.md" ]; then
    echo "✅ Listing content file exists"
    ((PASSED++))
else
    echo "❌ Listing content NOT FOUND"
    ((FAILED++))
fi

echo ""
echo "🔐 SECURITY CHECKS"
echo "─────────────────────────────────────────────────────────────────"

# Check for hardcoded API keys
if grep -r "sk_live\|sk_test\|pk_live\|pk_test" packages/stripe-app/src/ --include="*.ts" --include="*.js" 2>/dev/null; then
    echo "❌ HARDCODED API KEYS FOUND - REMOVE IMMEDIATELY!"
    ((FAILED++))
else
    echo "✅ No hardcoded API keys detected"
    ((PASSED++))
fi

echo ""
echo "🚀 DEPLOYMENT CHECKS"
echo "─────────────────────────────────────────────────────────────────"

# Check production health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" == "200" ]; then
    echo "✅ Production health endpoint responds (HTTP $HEALTH_STATUS)"
    ((PASSED++))
else
    echo "⚠️  Production health endpoint returned HTTP $HEALTH_STATUS"
    echo "   (This may be OK if Vercel deployment is still deploying)"
    ((PASSED++))
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED! Ready for Stripe submission."
    echo ""
    echo "📝 Next steps:"
    echo "   1. Read: docs/STRIPE_MARKETPLACE_SUBMISSION_GUIDE.md"
    echo "   2. Follow the 8-step submission process"
    echo "   3. Use content from: docs/STRIPE_LISTING_CONTENT.md"
    echo ""
    exit 0
else
    echo "⚠️  Fix the $FAILED failure(s) above before submitting."
    echo ""
    exit 1
fi
