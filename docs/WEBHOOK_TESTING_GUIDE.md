# Stripe Webhook Testing Guide

Complete procedures for testing, verifying, and debugging Stripe webhooks in the DSG Control Plane.

**Table of Contents**
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Webhook Simulator Script](#webhook-simulator-script)
- [Verification Script](#verification-script)
- [Load Testing](#load-testing)
- [Common Issues & Fixes](#common-issues--fixes)
- [Signature Verification Debugging](#signature-verification-debugging)
- [Using Stripe CLI](#using-stripe-cli)
- [Production Verification](#production-verification)
- [Testing Checklist](#testing-checklist)

## Overview

This guide covers automated webhook testing and verification tools for the Stripe integration in the DSG Control Plane. The toolkit includes:

1. **stripe-webhook-simulator.sh** - Generates realistic webhook events with valid HMAC-SHA256 signatures
2. **verify-webhook-received.sh** - Confirms webhooks were received and processed by checking audit trails
3. **webhook-load-test.sh** - Tests webhook endpoint performance under concurrent load

### Key Concepts

**Webhook Events**: Stripe sends real-time notifications (events) when actions occur in your Stripe account. Common events include:
- `charge.created` - New charge created
- `charge.updated` - Charge updated (e.g., captured)
- `payout.created` - Payout initiated
- `payout.updated` - Payout status changed
- `refund.created` - Refund issued

**HMAC-SHA256 Signing**: Stripe signs every webhook with an HMAC-SHA256 signature using your webhook signing secret. The signature format is `t=<timestamp>,v1=<signature>`.

**Audit Trail**: Webhook events and their processing results are stored in the `stripe_operation_audits` table in Supabase for compliance and debugging.

---

## Quick Start

### Prerequisites

```bash
# Required tools
curl                    # for HTTP requests
openssl                 # for signature generation
jq                      # (optional) for JSON formatting

# On macOS (using Homebrew)
brew install curl openssl jq

# On Ubuntu/Debian
sudo apt-get install curl openssl jq

# On Alpine/minimal systems
apk add curl openssl jq
```

### Basic Webhook Test

```bash
# 1. Set your environment variables
export WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
export WEBHOOK_SECRET="whsec_live_xxxxx"

# 2. Send a test webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET"

# 3. Verify it was received (within last 5 minutes)
./scripts/verify-webhook-received.sh \
  --minutes 5 \
  --verbose
```

### Expected Output

**Simulator Success**:
```
[INFO] Stripe Webhook Simulator
[INFO] Event Type: charge.created
[INFO] Webhook URL: https://your-app.vercel.app/api/stripe/webhook
[INFO] Sending webhook to: https://your-app.vercel.app/api/stripe/webhook
[SUCCESS] Webhook sent successfully! (HTTP 200)
```

**Verification Success**:
```
[INFO] Stripe Webhook Receipt Verification
[SUCCESS] Found webhook event:
  Event ID: evt_1234567890abcdef
  Object Type: charge
  Object ID: ch_1234567890abcdef
  Status: APPROVE
  Amount: 5000 cents
  Created At: 2026-06-07T10:30:45Z
```

---

## Webhook Simulator Script

### Purpose

Generates realistic Stripe webhook event payloads with valid HMAC-SHA256 signatures and sends them to a target endpoint.

### Usage

```bash
./scripts/stripe-webhook-simulator.sh [OPTIONS]
```

### Options

| Option | Argument | Description |
|--------|----------|-------------|
| `--event` | `<type>` | **Required.** Event type to simulate (see supported events below) |
| `--url` | `<endpoint>` | **Required.** Target webhook endpoint URL |
| `--secret` | `<secret>` | **Required.** Webhook signing secret (whsec_... format) |
| `--account-id` | `<id>` | Stripe account ID (default: acct_1234567890123456) |
| `--dry-run` | - | Show payload without sending |
| `--verbose` | - | Enable debug output |
| `--help` | - | Show help message |

### Supported Events

```
charge.created              New charge created
charge.updated              Charge updated (captured, etc.)
payout.created              Payout initiated
payout.updated              Payout status changed (paid, failed)
refund.created              Refund issued
payment_intent.created      Payment intent created
payment_intent.processing   Payment intent processing
checkout.session.completed  Checkout session completed
customer.subscription.updated   Subscription updated
customer.subscription.deleted    Subscription canceled
```

### Examples

#### Test charge.created locally

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url http://localhost:3000/api/stripe/webhook \
  --secret whsec_test_xxxxx
```

#### Dry-run to see payload without sending

```bash
./scripts/stripe-webhook-simulator.sh \
  --event payout.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --dry-run
```

**Output** (prettified with jq):
```json
{
  "id": "evt_1a2b3c4d5e6f7g8h",
  "object": "event",
  "api_version": "2024-04-10",
  "created": 1717849500,
  "data": {
    "object": {
      "id": "po_1a2b3c4d5e6f7g8h",
      "object": "payout",
      "amount": 100000,
      "currency": "usd",
      "status": "pending",
      "type": "bank_account"
    }
  },
  "livemode": false,
  "type": "payout.created"
}
```

#### Test with verbose output

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.updated \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --verbose
```

#### Test specific Stripe account

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --account-id acct_prod_1234567890
```

### Payload Generation

The simulator generates realistic test payloads with:
- ✅ Valid Stripe event structure
- ✅ Realistic random IDs (evt_xxx, ch_xxx, po_xxx, etc.)
- ✅ Realistic amounts and currencies
- ✅ Metadata and customer information
- ✅ Proper timestamp formatting
- ✅ HMAC-SHA256 signature with current timestamp

### Signature Generation

Signatures are generated using the HMAC-SHA256 algorithm:

```bash
timestamp=$(date +%s)
signed_content="${timestamp}.${payload}"
signature=$(echo -n "$signed_content" | openssl dgst -sha256 -hmac "$secret" -hex)
```

The final signature header is: `t=<timestamp>,v1=<signature>`

---

## Verification Script

### Purpose

Confirms that a webhook was received and processed correctly by querying the Supabase audit trail.

### Prerequisites

The following environment variables must be set:

```bash
# Required
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGc..."

# Or load from .env/.env.local
# Scripts automatically load these if they exist
```

### Usage

```bash
./scripts/verify-webhook-received.sh [OPTIONS]
```

### Options

| Option | Argument | Description |
|--------|----------|-------------|
| `--minutes` | `<N>` | Check last N minutes (default: 5) |
| `--event-id` | `<id>` | Check specific event ID (evt_xxx) |
| `--account-id` | `<id>` | Filter by Stripe account ID |
| `--wait` | - | Wait for webhook to appear (polls with timeout) |
| `--timeout` | `<seconds>` | Timeout for --wait in seconds (default: 30) |
| `--verbose` | - | Enable verbose debug output |
| `--help` | - | Show help message |

### Examples

#### Check for recent webhooks

```bash
# Check last 5 minutes (default)
./scripts/verify-webhook-received.sh

# Check last 10 minutes
./scripts/verify-webhook-received.sh --minutes 10

# Check last 30 minutes
./scripts/verify-webhook-received.sh --minutes 30
```

#### Check specific event

```bash
# Verify specific event ID
./scripts/verify-webhook-received.sh --event-id evt_1a2b3c4d5e6f7g8h

# Verify with verbose output
./scripts/verify-webhook-received.sh \
  --event-id evt_1a2b3c4d5e6f7g8h \
  --verbose
```

#### Wait for webhook to appear

```bash
# Wait up to 30 seconds for webhook to appear
./scripts/verify-webhook-received.sh --wait

# Wait up to 60 seconds with longer timeout
./scripts/verify-webhook-received.sh --wait --timeout 60

# Useful when chaining commands
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx && \
./scripts/verify-webhook-received.sh --wait --timeout 30 --verbose
```

#### Filter by account

```bash
./scripts/verify-webhook-received.sh \
  --minutes 5 \
  --account-id acct_1234567890123456 \
  --verbose
```

### Output Format

**Successful verification**:
```
[INFO] Stripe Webhook Receipt Verification
[INFO] Checking webhooks from last 5 minute(s)
[SUCCESS] Found webhook event:
  Event ID: evt_1a2b3c4d5e6f7g8h
  Object Type: charge
  Object ID: ch_1a2b3c4d5e6f7g8h
  Status: APPROVE
  Amount: 5000 cents
  Currency: usd
  Account ID: acct_1234567890123456
  Created At: 2026-06-07T10:30:45Z
[SUCCESS] Verification complete. Found 1 event(s).
```

**Not found**:
```
[ERROR] No webhook events found in the last 5 minute(s)
[WARNING] Tip: Use --wait flag to poll until webhook appears
```

---

## Load Testing

### Purpose

Tests webhook endpoint performance under concurrent load and identifies bottlenecks.

### Usage

```bash
./scripts/webhook-load-test.sh [OPTIONS]
```

### Options

| Option | Argument | Description |
|--------|----------|-------------|
| `--url` | `<endpoint>` | **Required.** Target webhook endpoint URL |
| `--secret` | `<secret>` | **Required.** Webhook signing secret |
| `--count` | `<N>` | Number of webhooks to send (default: 10) |
| `--event` | `<type>` | Event type to send (default: charge.created) |
| `--concurrency` | `<N>` | Max concurrent requests (default: 5) |
| `--delay` | `<ms>` | Delay between webhooks in ms (default: 100) |
| `--save-results` | - | Save results to timestamped file |
| `--verbose` | - | Enable verbose output |

### Examples

#### Basic load test (10 webhooks)

```bash
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx
```

#### Stress test (50 concurrent)

```bash
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 50 \
  --concurrency 10
```

#### Test different event types

```bash
# Test charge events
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 20 \
  --event charge.created

# Test payout events
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 20 \
  --event payout.created
```

#### Save results for analysis

```bash
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 50 \
  --concurrency 10 \
  --save-results \
  --verbose
```

### Output

```
[INFO] Starting load test
[INFO] Total webhooks: 20
[INFO] Concurrency: 5
[INFO] Target URL: https://your-app.vercel.app/api/stripe/webhook

Progress: [##################################################] 100%

========================================
[SUCCESS] Load Test Complete
========================================

Results Summary:
  Successful: 20/20
  Failed: 0/20
  Success Rate: 100%

Performance:
  Average: 245ms
  Median: 238ms
  Min: 195ms
  Max: 410ms
  Std Dev: 1024ms²

[SUCCESS] Results saved to: webhook-load-test-1717849500.log
```

### Interpreting Results

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Success Rate | 100% | <95% | <80% |
| Average Response | <500ms | 500-1000ms | >1000ms |
| p99 Response | <2000ms | 2-5s | >5s |
| Max Response | <5000ms | 5-10s | >10s |
| Concurrent Load | 10+ | 5-10 | <5 |

---

## Common Issues & Fixes

### Issue: "Invalid signature" error

**Symptom**: Webhook returns `401 Invalid signature` or `signature verification failed`

**Causes**:
- Wrong webhook secret
- Payload modified in transit
- Timestamp too old (>5 minutes)

**Fix**:
```bash
# Verify you're using the correct signing secret
echo "Secret: $WEBHOOK_SECRET"

# Test with a fresh event (uses current timestamp)
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret "$WEBHOOK_SECRET" \
  --verbose
```

### Issue: "Webhook secret not configured" error

**Symptom**: Webhook endpoint returns 500 error about missing secret

**Causes**:
- `STRIPE_WEBHOOK_SECRET` not set in environment
- Environment not reloaded after setting variable
- Deployed version missing secret in Vercel settings

**Fix**:

```bash
# Check if secret is set in current environment
echo $STRIPE_WEBHOOK_SECRET

# Set it if missing
export STRIPE_WEBHOOK_SECRET="whsec_live_xxxxx"

# For deployed apps, add to Vercel
vercel env add STRIPE_WEBHOOK_SECRET

# Redeploy
npm run deploy:prod
```

### Issue: Webhook received but not in audit trail

**Symptom**: Webhook returns 200 OK but no entry in `stripe_operation_audits`

**Causes**:
- Processing failed after signature verification
- Database write error
- DSG gate evaluation failed silently

**Fix**:
```bash
# Check recent errors in logs
./scripts/verify-webhook-received.sh --minutes 10 --verbose

# Check database connection
curl -f https://your-app.vercel.app/api/health | jq '.database'

# Review Supabase logs for errors
# https://app.supabase.com/project/xxxxx/logs/postgres
```

### Issue: "HTTP 422 - Invalid payload"

**Symptom**: Webhook returns 422 Unprocessable Entity

**Causes**:
- Invalid JSON in request body
- Missing required fields in event
- Payload size too large

**Fix**:
```bash
# Test payload locally without sending
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --dry-run | jq '.' 

# Verify it's valid JSON
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --dry-run | jq 'keys'
```

### Issue: High latency on webhook processing

**Symptom**: Webhooks take >5 seconds to process

**Causes**:
- DSG gate evaluation slow
- Database queries slow
- Network latency to external services

**Fix**:
```bash
# Run load test to identify bottleneck
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 10 \
  --concurrency 1 \
  --verbose

# Check which queries are slow in Supabase
# https://app.supabase.com/project/xxxxx/sql/monitor

# Review application logs for slowness
curl https://your-app.vercel.app/api/agent/status | jq '.diagnostics'
```

---

## Signature Verification Debugging

### Understanding the Signature Format

Stripe sends signatures in the `Stripe-Signature` header:

```
Stripe-Signature: t=1717849500,v1=9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f
```

**Format**: `t=<timestamp>,v1=<signature_hex>`

### Manual Verification

To manually verify a signature without the SDK:

```bash
#!/bin/bash
WEBHOOK_SECRET="whsec_live_xxxxx"
STRIPE_SIGNATURE="t=1717849500,v1=9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f"
PAYLOAD='{"id":"evt_test","type":"charge.created"...}'

# Extract timestamp and signature
TIMESTAMP=$(echo "$STRIPE_SIGNATURE" | cut -d'=' -f2 | cut -d',' -f1)
SIGNATURE=$(echo "$STRIPE_SIGNATURE" | cut -d'=' -f3)

# Compute expected signature
SIGNED_CONTENT="${TIMESTAMP}.${PAYLOAD}"
EXPECTED=$(echo -n "$SIGNED_CONTENT" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# Compare
echo "Expected: $EXPECTED"
echo "Actual:   $SIGNATURE"
echo "Match: $([ "$EXPECTED" = "$SIGNATURE" ] && echo "YES" || echo "NO")"
```

### Debugging with Stripe CLI

Using `stripe listen` for local testing (see [Using Stripe CLI](#using-stripe-cli) section).

---

## Using Stripe CLI

### Installation

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -o install.sh
sudo bash install.sh

# Windows
choco install stripe-cli
```

### Forward Webhooks to Local Endpoint

```bash
# Listen to all events and forward to local endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhook

# You'll see output like:
# > Ready! Your webhook signing secret is whsec_test_4eC39HqLyjWDarltT...
# Save this for testing

# In another terminal, trigger test events
stripe trigger charge.created

# Check the first terminal to see the request
```

### Common Stripe CLI Commands

```bash
# Trigger specific event
stripe trigger charge.created

# Trigger with custom data
stripe trigger charge.created --override object.amount=5000

# List recent events
stripe events list

# Get event details
stripe events retrieve evt_1A2b3C4d5E6f7G8h

# Test event routing
stripe listen --api-key sk_test_xxxxx \
  --forward-to localhost:3000/api/stripe/webhook

# View webhook logs
stripe logs tail --colors --api-key sk_test_xxxxx
```

### Advantages over Simulator

- Uses actual Stripe event schema (100% accurate)
- Can trigger from Stripe dashboard
- Shows real-time logs
- Can replay past events
- Integrates with Stripe account data

---

## Production Verification

### Pre-Production Checklist

Before deploying to production:

```bash
# 1. Test locally
npm run dev &
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url http://localhost:3000/api/stripe/webhook \
  --secret "$STRIPE_WEBHOOK_SECRET" \
  --verbose

# 2. Verify locally
./scripts/verify-webhook-received.sh --wait --timeout 10

# 3. Load test locally
./scripts/webhook-load-test.sh \
  --url http://localhost:3000/api/stripe/webhook \
  --secret "$STRIPE_WEBHOOK_SECRET" \
  --count 20 \
  --concurrency 5

# 4. Check all tests pass
npm run test:integration

# 5. Type check
npm run typecheck
```

### Production Deployment Verification

After deploying to production:

```bash
# 1. Verify environment is configured
curl https://your-app.vercel.app/api/health | jq '.ready'

# 2. Send a test webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret "$STRIPE_WEBHOOK_SECRET"

# 3. Verify it was received
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30 \
  --minutes 5 \
  --verbose

# 4. Do NOT skip: Check audit trail in Supabase
# https://app.supabase.com/project/xxxxx/editor/stripe_operation_audits
```

### Stripe Endpoint Configuration

To register your webhook endpoint with Stripe:

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Developers > Webhooks
3. Click "Add Endpoint"
4. Enter your endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
5. Select events to listen for
6. Copy the signing secret (whsec_live_xxxxx)
7. Store it in Vercel:

```bash
vercel env add STRIPE_WEBHOOK_SECRET whsec_live_xxxxx
```

---

## Testing Checklist

Use this checklist to ensure complete webhook testing:

### Unit Tests
- [ ] HMAC-SHA256 signature generation correct
- [ ] Event payload structure valid
- [ ] All supported event types generate correctly
- [ ] Random ID generation works for all object types

### Integration Tests
- [ ] Webhook received at endpoint
- [ ] Signature verified correctly
- [ ] Event parsed into gateway request
- [ ] Gateway evaluation called
- [ ] Audit entry created in database
- [ ] Response status is 200 OK

### Performance Tests
- [ ] Response time < 500ms (median)
- [ ] Response time < 2s (p99)
- [ ] Handles 10 concurrent webhooks
- [ ] Handles 50 concurrent webhooks
- [ ] Database writes aren't bottleneck
- [ ] Gateway evaluation completes quickly

### Security Tests
- [ ] Invalid signature rejected
- [ ] Missing signature rejected
- [ ] Old timestamp rejected (>5 min)
- [ ] Signature header required
- [ ] No secrets leaked in logs
- [ ] Request body size limited

### Event Type Tests
- [ ] charge.created → APPROVE/BLOCK decision
- [ ] charge.updated → audit recorded
- [ ] payout.created → evaluated correctly
- [ ] payout.updated → status tracked
- [ ] refund.created → linked to charge
- [ ] payment_intent.* → parsed correctly
- [ ] customer.subscription.* → entitlements synced

### Error Handling
- [ ] Missing secret → 500 error
- [ ] Invalid signature → 400 error
- [ ] Webhook secret changed → old webhooks fail
- [ ] Database down → graceful error
- [ ] Malformed JSON → 400 error
- [ ] Large payload → 413 error (if size limit set)

### Audit Trail Verification
- [ ] Event recorded in stripe_operation_audits
- [ ] Decision stored correctly (APPROVE/BLOCK/REVIEW)
- [ ] Timestamp accurate
- [ ] All context fields present
- [ ] Signature validation status recorded
- [ ] Can query by event_id, account_id, created_at

### Production Checklist
- [ ] Webhook secret set in Vercel environment
- [ ] Endpoint registered with Stripe
- [ ] Test webhook sent and verified
- [ ] Production logs show no errors
- [ ] Load test completed successfully
- [ ] Audit trail entries visible in Supabase
- [ ] Team notified of endpoint readiness

---

## Additional Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe Event Types](https://stripe.com/docs/api/events/types)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [HMAC-SHA256 Signing](https://en.wikipedia.org/wiki/HMAC)

---

## Support & Troubleshooting

For issues not covered in this guide:

1. **Check logs**: `curl https://your-app.vercel.app/api/agent/status`
2. **Review audit trail**: Supabase dashboard > stripe_operation_audits table
3. **Test locally first**: Use `npm run dev` and test with localhost endpoint
4. **Enable verbose output**: Add `--verbose` flag to scripts
5. **Check webhook signing secret**: `echo $STRIPE_WEBHOOK_SECRET`
6. **Review recent commits**: Check what changed if webhooks suddenly fail

If issues persist, check:
- Supabase project status
- Vercel deployment logs
- Network connectivity
- DNS resolution of endpoints
- Rate limiting (5+ webhooks/second may be throttled)
