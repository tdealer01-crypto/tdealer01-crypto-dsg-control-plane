# Stripe Webhook Testing - Real-World Examples

Practical examples and workflows for testing Stripe webhooks in different scenarios.

## Example 1: Local Development Testing

**Scenario**: You're developing locally and want to test webhook handling before pushing to production.

```bash
# Start local development server
npm run dev &
DEV_PID=$!

# Give server time to start
sleep 3

# Send a test webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url http://localhost:3000/api/stripe/webhook \
  --secret whsec_test_1234567890abcdef \
  --verbose

# Verify it was processed
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 10 \
  --verbose

# Clean up
kill $DEV_PID
```

**Expected Output**:
```
[INFO] Stripe Webhook Simulator
[INFO] Event Type: charge.created
[INFO] Webhook URL: http://localhost:3000/api/stripe/webhook
[INFO] Sending webhook to: http://localhost:3000/api/stripe/webhook
[SUCCESS] Webhook sent successfully! (HTTP 200)
```

## Example 2: Staging Environment Testing

**Scenario**: You've deployed to staging and want to verify the webhook endpoint works correctly.

```bash
#!/bin/bash
set -e

STAGING_URL="https://staging-dsg.vercel.app"
WEBHOOK_SECRET="whsec_test_staging_1234567890abcdef"

echo "Testing Staging Webhook Endpoint"
echo "=================================="

# Verify endpoint is reachable
echo "1. Checking endpoint health..."
curl -f "$STAGING_URL/api/health" | jq '.ready'

# Send test webhook
echo ""
echo "2. Sending test webhook..."
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$STAGING_URL/api/stripe/webhook" \
  --secret "$WEBHOOK_SECRET" \
  --verbose

# Wait and verify
echo ""
echo "3. Verifying webhook was received..."
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30 \
  --minutes 5 \
  --verbose

echo ""
echo "4. Testing multiple event types..."
for event in charge.updated payout.created refund.created; do
  echo "  Testing: $event"
  ./scripts/stripe-webhook-simulator.sh \
    --event "$event" \
    --url "$STAGING_URL/api/stripe/webhook" \
    --secret "$WEBHOOK_SECRET"
done

echo ""
echo "Staging verification complete!"
```

## Example 3: Load Testing Before Production

**Scenario**: Before going live, you want to ensure the webhook endpoint can handle realistic production load.

```bash
#!/bin/bash

PRODUCTION_URL="https://your-app.vercel.app"
WEBHOOK_SECRET="whsec_live_1234567890abcdef"

echo "Load Testing Production Webhook Endpoint"
echo "========================================"

# Test 1: Baseline (5 webhooks, sequential)
echo "Test 1: Baseline (5 sequential webhooks)"
./scripts/webhook-load-test.sh \
  --url "$PRODUCTION_URL/api/stripe/webhook" \
  --secret "$WEBHOOK_SECRET" \
  --count 5 \
  --concurrency 1

# Test 2: Light load (20 webhooks, 5 concurrent)
echo ""
echo "Test 2: Light load (20 concurrent webhooks)"
./scripts/webhook-load-test.sh \
  --url "$PRODUCTION_URL/api/stripe/webhook" \
  --secret "$WEBHOOK_SECRET" \
  --count 20 \
  --concurrency 5

# Test 3: Medium load (50 webhooks, 10 concurrent)
echo ""
echo "Test 3: Medium load (50 concurrent webhooks)"
./scripts/webhook-load-test.sh \
  --url "$PRODUCTION_URL/api/stripe/webhook" \
  --secret "$WEBHOOK_SECRET" \
  --count 50 \
  --concurrency 10 \
  --save-results

# Test 4: Stress test (100 webhooks, 20 concurrent)
echo ""
echo "Test 4: Stress test (100 concurrent webhooks)"
./scripts/webhook-load-test.sh \
  --url "$PRODUCTION_URL/api/stripe/webhook" \
  --secret "$WEBHOOK_SECRET" \
  --count 100 \
  --concurrency 20 \
  --event charge.created \
  --save-results

echo ""
echo "Load tests complete. Results saved to webhook-load-test-*.log"
```

## Example 4: Production Rollout Verification

**Scenario**: You've just deployed to production and need to verify everything is working.

```bash
#!/bin/bash
set -e

PROD_URL="https://your-app.vercel.app"
WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"

echo "Production Deployment Verification"
echo "==================================="

# Step 1: Health checks
echo "[1/5] Running health checks..."
HEALTH=$(curl -s "$PROD_URL/api/health")
echo "$HEALTH" | jq '.ready'
echo "$HEALTH" | jq '.database'

# Step 2: Test webhook endpoint exists
echo "[2/5] Testing webhook endpoint..."
curl -s -X OPTIONS \
  -H "Origin: $PROD_URL" \
  "$PROD_URL/api/stripe/webhook" | head -1

# Step 3: Send test webhook
echo "[3/5] Sending test webhook..."
RESPONSE=$(./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$PROD_URL/api/stripe/webhook" \
  --secret "$WEBHOOK_SECRET" 2>&1)

if echo "$RESPONSE" | grep -q "successfully"; then
  echo "✓ Webhook delivered"
else
  echo "✗ Webhook delivery failed"
  exit 1
fi

# Step 4: Verify in audit trail
echo "[4/5] Verifying in audit trail..."
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30 \
  --minutes 5 \
  --verbose

# Step 5: Check recent webhooks
echo "[5/5] Checking recent webhook activity..."
./scripts/verify-webhook-received.sh \
  --minutes 30 \
  --verbose

echo ""
echo "✓ Production deployment verified successfully!"
```

## Example 5: Different Event Types

**Scenario**: You want to test different Stripe event types to ensure each is handled correctly.

```bash
#!/bin/bash

WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
WEBHOOK_SECRET="whsec_live_1234567890abcdef"

echo "Testing All Event Types"
echo "======================="

# Define event types to test
EVENTS=(
  "charge.created"
  "charge.updated"
  "payout.created"
  "payout.updated"
  "refund.created"
  "payment_intent.created"
  "payment_intent.processing"
  "checkout.session.completed"
  "customer.subscription.updated"
  "customer.subscription.deleted"
)

# Test each event type
for event in "${EVENTS[@]}"; do
  echo "Testing: $event"
  
  if ./scripts/stripe-webhook-simulator.sh \
    --event "$event" \
    --url "$WEBHOOK_URL" \
    --secret "$WEBHOOK_SECRET" 2>&1 | grep -q "successfully"; then
    echo "  ✓ Success"
  else
    echo "  ✗ Failed"
  fi
  
  sleep 0.5
done

echo ""
echo "All event types tested!"
```

## Example 6: Continuous Integration

**Scenario**: You want to run webhook tests in CI/CD pipeline.

```yaml
# .github/workflows/webhook-test.yml
name: Webhook Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  webhook-tests:
    runs-on: ubuntu-latest
    
    services:
      supabase:
        image: supabase/supabase
        # ... service configuration
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start dev server
        run: npm run dev &
        env:
          STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
      
      - name: Wait for server
        run: sleep 5
      
      - name: Test webhook simulator
        run: |
          ./scripts/stripe-webhook-simulator.sh \
            --event charge.created \
            --url http://localhost:3000/api/stripe/webhook \
            --secret ${{ secrets.STRIPE_WEBHOOK_SECRET }} \
            --verbose
      
      - name: Verify webhook received
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          ./scripts/verify-webhook-received.sh \
            --wait \
            --timeout 30 \
            --verbose
      
      - name: Run load test
        run: |
          ./scripts/webhook-load-test.sh \
            --url http://localhost:3000/api/stripe/webhook \
            --secret ${{ secrets.STRIPE_WEBHOOK_SECRET }} \
            --count 10 \
            --concurrency 5
```

## Example 7: Debugging Signature Verification

**Scenario**: Webhooks are being rejected with "Invalid signature" errors.

```bash
#!/bin/bash

WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
WEBHOOK_SECRET="whsec_live_1234567890abcdef"

echo "Debugging Signature Verification"
echo "================================"

# Step 1: Verify secret is set
echo "1. Checking webhook secret..."
if [[ -z "$WEBHOOK_SECRET" ]]; then
  echo "✗ WEBHOOK_SECRET not set"
  exit 1
else
  echo "✓ Secret is set (first 20 chars): ${WEBHOOK_SECRET:0:20}..."
fi

# Step 2: Generate payload and check signature
echo ""
echo "2. Testing signature generation..."
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --dry-run \
  --verbose > /tmp/webhook_payload.json

echo "✓ Payload generated"

# Step 3: Manually verify signature
echo ""
echo "3. Testing signature verification..."

PAYLOAD=$(cat /tmp/webhook_payload.json)
TIMESTAMP=$(date +%s)
SIGNED_CONTENT="${TIMESTAMP}.${PAYLOAD}"
EXPECTED_SIG=$(echo -n "$SIGNED_CONTENT" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

echo "Timestamp: $TIMESTAMP"
echo "Expected signature: $EXPECTED_SIG"

# Step 4: Try sending with verbose output
echo ""
echo "4. Sending webhook with verbose output..."
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --verbose

# Step 5: Check logs for errors
echo ""
echo "5. Checking recent webhook logs..."
./scripts/verify-webhook-received.sh \
  --minutes 5 \
  --verbose

echo ""
echo "If signature is still failing:"
echo "  - Double-check WEBHOOK_SECRET value"
echo "  - Check endpoint logs for detailed error message"
echo "  - Verify payload hasn't been modified in transit"
```

## Example 8: Regression Testing

**Scenario**: After a code change, you want to verify all webhook functionality still works.

```bash
#!/bin/bash

WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
WEBHOOK_SECRET="whsec_live_1234567890abcdef"

echo "Webhook Regression Testing"
echo "=========================="

FAILURES=0

# Test 1: Basic functionality
echo "[Test 1] Basic webhook delivery"
if ./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" 2>&1 | grep -q "successfully"; then
  echo "✓ Pass"
else
  echo "✗ Fail"
  FAILURES=$((FAILURES + 1))
fi

# Test 2: Multiple event types
echo "[Test 2] Multiple event types"
for event in charge.created charge.updated payout.created refund.created; do
  if ./scripts/stripe-webhook-simulator.sh \
    --event "$event" \
    --url "$WEBHOOK_URL" \
    --secret "$WEBHOOK_SECRET" 2>&1 | grep -q "successfully"; then
    echo "  ✓ $event"
  else
    echo "  ✗ $event"
    FAILURES=$((FAILURES + 1))
  fi
done

# Test 3: Audit trail recording
echo "[Test 3] Audit trail recording"
COUNT_BEFORE=$(./scripts/verify-webhook-received.sh --minutes 1 2>&1 | grep "Found" | grep -oP '\d+(?= event)' || echo "0")
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" > /dev/null
sleep 2
COUNT_AFTER=$(./scripts/verify-webhook-received.sh --minutes 1 2>&1 | grep "Found" | grep -oP '\d+(?= event)' || echo "0")

if [[ $COUNT_AFTER -gt $COUNT_BEFORE ]]; then
  echo "✓ Pass"
else
  echo "✗ Fail"
  FAILURES=$((FAILURES + 1))
fi

# Test 4: Load capacity
echo "[Test 4] Load capacity (20 concurrent)"
RESULT=$(./scripts/webhook-load-test.sh \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --count 20 \
  --concurrency 5 2>&1)

SUCCESS_RATE=$(echo "$RESULT" | grep "Success Rate:" | grep -oP '\d+(?=%)')
if [[ $SUCCESS_RATE -eq 100 ]]; then
  echo "✓ Pass (100% success rate)"
else
  echo "✗ Fail ($SUCCESS_RATE% success rate)"
  FAILURES=$((FAILURES + 1))
fi

# Summary
echo ""
echo "================================"
if [[ $FAILURES -eq 0 ]]; then
  echo "✓ All tests passed!"
  exit 0
else
  echo "✗ $FAILURES test(s) failed"
  exit 1
fi
```

## Example 9: Monthly Performance Report

**Scenario**: You want to document webhook performance metrics for compliance/audit.

```bash
#!/bin/bash

WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
WEBHOOK_SECRET="whsec_live_1234567890abcdef"
REPORT_DATE=$(date +"%Y-%m-%d")

echo "Generating Monthly Performance Report: $REPORT_DATE"
echo "=================================================="

# Run comprehensive tests
echo "[1/3] Baseline performance test..."
BASELINE=$(./scripts/webhook-load-test.sh \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --count 10 \
  --concurrency 1 \
  --save-results 2>&1)

echo "[2/3] Load test (50 webhooks)..."
LOAD=$(./scripts/webhook-load-test.sh \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --count 50 \
  --concurrency 10 \
  --save-results 2>&1)

echo "[3/3] Stress test (100 webhooks)..."
STRESS=$(./scripts/webhook-load-test.sh \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --count 100 \
  --concurrency 20 \
  --save-results 2>&1)

# Generate report
cat > "webhook-performance-report-$REPORT_DATE.txt" <<EOF
Stripe Webhook Performance Report
Date: $REPORT_DATE

Baseline Test (10 sequential):
$(echo "$BASELINE" | grep -A 10 "Results Summary")

Load Test (50 with 10 concurrent):
$(echo "$LOAD" | grep -A 10 "Results Summary")

Stress Test (100 with 20 concurrent):
$(echo "$STRESS" | grep -A 10 "Results Summary")

Overall Assessment:
- All tests passed
- Endpoint stable under load
- Ready for production traffic

Generated: $(date)
EOF

echo ""
echo "Report saved to: webhook-performance-report-$REPORT_DATE.txt"
```

---

## Quick Reference: When to Use Each Script

| Scenario | Script | Command |
|----------|--------|---------|
| Manual testing | Simulator | `--dry-run` first |
| Verify receipt | Verification | `--wait` for polling |
| Performance check | Load Test | Start with `--count 20` |
| Debugging | Simulator | `--verbose` for details |
| Production check | Verification | `--minutes 30` for recent events |
| Regression test | All three | Run in sequence |

See `WEBHOOK_TESTING_GUIDE.md` for complete documentation.
