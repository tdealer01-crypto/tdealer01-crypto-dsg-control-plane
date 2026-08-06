# Stripe Webhook Testing - Quick Reference

One-page quick reference for webhook testing commands and procedures.

## Setup

```bash
# Set environment variables
export WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
export WEBHOOK_SECRET="whsec_live_xxxxx"
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGc..."
```

## Quick Commands

### 1. Send a Test Webhook

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET"
```

### 2. Verify It Was Received

```bash
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30
```

### 3. Complete Test Flow

```bash
# Send webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" && \

# Verify received
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30 \
  --verbose
```

## Common Event Types

| Event | Use Case |
|-------|----------|
| `charge.created` | New payment processed |
| `charge.updated` | Payment captured/refunded |
| `payout.created` | Payout initiated |
| `payout.updated` | Payout paid/failed |
| `refund.created` | Refund issued |
| `payment_intent.created` | Payment intent started |
| `customer.subscription.updated` | Subscription renewed |
| `customer.subscription.deleted` | Subscription canceled |

## Dry Run (No Send)

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --dry-run | jq '.'
```

## Load Testing

```bash
# 10 webhooks (default)
./scripts/webhook-load-test.sh \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET"

# 50 webhooks with 10 concurrent
./scripts/webhook-load-test.sh \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --count 50 \
  --concurrency 10 \
  --save-results
```

## Verification Options

```bash
# Check last 10 minutes
./scripts/verify-webhook-received.sh --minutes 10

# Check specific event
./scripts/verify-webhook-received.sh --event-id evt_xxx

# Filter by account
./scripts/verify-webhook-received.sh --account-id acct_xxx

# Wait with 60s timeout
./scripts/verify-webhook-received.sh --wait --timeout 60

# Verbose output
./scripts/verify-webhook-received.sh --verbose
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid signature" | Check `$WEBHOOK_SECRET` is correct |
| "Webhook secret not configured" | Set `STRIPE_WEBHOOK_SECRET` in Vercel |
| "Not found in audit trail" | Check database connection, review logs |
| "HTTP 422" | Validate JSON with `--dry-run` |
| "High latency" | Run load test to identify bottleneck |

## Stripe CLI Alternative

```bash
# Install
brew install stripe/stripe-cli/stripe

# Listen locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger event
stripe trigger charge.created

# View logs
stripe logs tail
```

## Production Verification

```bash
# Test endpoint
curl https://your-app.vercel.app/api/health | jq '.ready'

# Send webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret "$WEBHOOK_SECRET"

# Verify in Supabase
# https://app.supabase.com/project/xxxxx/editor/stripe_operation_audits
```

## Audit Trail Query

Check Supabase `stripe_operation_audits` table:

```sql
SELECT 
  stripe_event_id,
  object_type,
  object_id,
  decision,
  amount_cents,
  created_at
FROM stripe_operation_audits
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

## Performance Targets

| Metric | Target | Max |
|--------|--------|-----|
| Response time | <500ms | <2s |
| Concurrent capacity | 10+ | 50+ |
| Success rate | 100% | >95% |
| Signature verification | 100% | >99% |

## Files Reference

- **Simulator**: `/scripts/stripe-webhook-simulator.sh`
- **Verification**: `/scripts/verify-webhook-received.sh`
- **Load Test**: `/scripts/webhook-load-test.sh`
- **Full Guide**: `/docs/WEBHOOK_TESTING_GUIDE.md`

## Help

```bash
./scripts/stripe-webhook-simulator.sh --help
./scripts/verify-webhook-received.sh --help
./scripts/webhook-load-test.sh --help
```

---

For detailed documentation, see `/docs/WEBHOOK_TESTING_GUIDE.md`
