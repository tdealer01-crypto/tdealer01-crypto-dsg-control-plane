#!/bin/bash
# Phase 1: Test First Customer Checkout
# This script initiates a test Stripe checkout session and verifies the flow
# Usage: bash scripts/test-checkout.sh https://your-production-url

set -e

PRODUCTION_URL="${1:-http://localhost:3000}"

echo "=========================================="
echo "Phase 1: Testing Checkout Flow"
echo "=========================================="
echo "Production URL: $PRODUCTION_URL"
echo ""

# Generate test organization
TEST_ORG_ID="test-org-$(date +%s)"
echo "Test Organization ID: $TEST_ORG_ID"
echo ""

# Create test checkout session
echo "Step 1: Creating Stripe checkout session..."
echo ""
echo "Request:"
echo "POST $PRODUCTION_URL/api/billing/checkout"
echo '{'
echo '  "plan": "pro",'
echo '  "billingInterval": "monthly",'
echo '  "orgId": "'"$TEST_ORG_ID"'"'
echo '}'
echo ""

RESPONSE=$(curl -s -X POST "$PRODUCTION_URL/api/billing/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "billingInterval": "monthly",
    "orgId": "'"$TEST_ORG_ID"'"
  }')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId' 2>/dev/null || echo "")

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "❌ Failed to create checkout session"
  exit 1
fi

echo "✅ Checkout session created: $SESSION_ID"
echo ""

# Extract redirect URL
REDIRECT_URL=$(echo "$RESPONSE" | jq -r '.redirectUrl' 2>/dev/null || echo "")

if [ -z "$REDIRECT_URL" ] || [ "$REDIRECT_URL" = "null" ]; then
  echo "⚠️  No redirect URL in response"
else
  echo "Redirect URL: $REDIRECT_URL"
  echo ""
  echo "Next steps:"
  echo "1. Copy the redirect URL above"
  echo "2. Paste into browser"
  echo "3. Use Stripe test card:"
  echo "   Number: 4242 4242 4242 4242"
  echo "   Exp: Any future date (e.g., 12/26)"
  echo "   CVC: Any 3 digits (e.g., 123)"
  echo ""
fi

# Wait for webhook to process (optional)
echo "Step 2: Waiting for webhook processing (~5 seconds)..."
sleep 5
echo ""

# Verify database updates (requires database access)
echo "Step 3: Checking database for updates..."
echo ""
echo "To verify the checkout was processed:"
echo ""
echo "1. Check billing_customers:"
echo "   SELECT * FROM billing_customers WHERE org_id = '$TEST_ORG_ID';"
echo ""
echo "2. Check billing_subscriptions:"
echo "   SELECT * FROM billing_subscriptions WHERE org_id = '$TEST_ORG_ID';"
echo ""
echo "3. Check revenue_events:"
echo "   SELECT * FROM revenue_events WHERE org_id = '$TEST_ORG_ID' ORDER BY created_at DESC;"
echo ""
echo "4. Check billing_events:"
echo "   SELECT event_type, COUNT(*) FROM billing_events GROUP BY event_type;"
echo ""

# Verify Stripe webhook
echo "Step 4: Checking Stripe webhook status..."
echo ""
echo "Go to: https://dashboard.stripe.com/webhooks"
echo "1. Find the endpoint for your production URL"
echo "2. Click to expand"
echo "3. Look for 'customer.subscription.created' event"
echo "4. Should show 'Success' (green check mark)"
echo ""

echo "=========================================="
echo "✅ Checkout test initiated!"
echo "=========================================="
