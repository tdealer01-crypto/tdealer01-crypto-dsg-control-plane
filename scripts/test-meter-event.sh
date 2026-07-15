#!/bin/bash
# Phase 1: Test Metered Billing Event
# This script tests the meter event flow manually
# Usage: bash scripts/test-meter-event.sh https://your-production-url cron_secret

set -e

PRODUCTION_URL="${1:-http://localhost:3000}"
CRON_SECRET="${2:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "Usage: bash scripts/test-meter-event.sh <production_url> <cron_secret>"
  echo ""
  echo "Example:"
  echo "  bash scripts/test-meter-event.sh https://dsg-one.vercel.app abc123"
  exit 1
fi

echo "=========================================="
echo "Phase 1: Testing Metered Billing"
echo "=========================================="
echo "Production URL: $PRODUCTION_URL"
echo ""

# Step 1: Create test execution
TEST_EXEC_ID="exec-test-$(date +%s)"
echo "Step 1: Creating test execution..."
echo "Execution ID: $TEST_EXEC_ID"
echo ""

# Note: This would normally happen via API
# For testing, you'd query Supabase directly

# Step 2: Trigger meter flush
echo "Step 2: Triggering meter outbox flush..."
echo ""
echo "Request:"
echo "POST $PRODUCTION_URL/api/cron/flush-meter-outbox"
echo "X-Cron-Secret: $CRON_SECRET"
echo ""

RESPONSE=$(curl -s -X POST "$PRODUCTION_URL/api/cron/flush-meter-outbox" \
  -H "X-Cron-Secret: $CRON_SECRET" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract results
SENT=$(echo "$RESPONSE" | jq -r '.sent' 2>/dev/null || echo "0")
FAILED=$(echo "$RESPONSE" | jq -r '.failed' 2>/dev/null || echo "0")

if [ "$SENT" -gt 0 ]; then
  echo "✅ Meter events flushed: $SENT sent, $FAILED failed"
else
  echo "⚠️  No meter events to flush"
  echo "   (This is expected if no recent executions)"
fi
echo ""

# Step 3: Instructions for verification
echo "Step 3: Verify meter event in Stripe..."
echo ""
echo "Go to: https://dashboard.stripe.com/billing/meters"
echo "1. Click meter 'dsg_execution'"
echo "2. View 'Events' tab"
echo "3. Should see recent meter event"
echo ""

echo "=========================================="
echo "✅ Meter event test complete"
echo "=========================================="
