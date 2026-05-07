# Release Gate Monetization & Safety

## Overview

Release Gate implements a secure freemium model with graceful degradation:

- **Free Tier**: Basic release gate checks available to all users
- **Pro Tier**: Advanced features, report history, scheduled checks
- **Enterprise**: Custom workflows and audit gates

## Safety Features

### 1. Free Tier Fallback

All users can always perform basic checks, even if:
- Stripe is misconfigured
- Database is unavailable
- Payment service is down

```typescript
// Example: user without Pro subscription still gets basic checks
GET /api/release-gate/check?url=https://example.com

{
  "pro": false,
  "accessSource": "free_fallback",
  "note": "Free tier - basic checks only..."
}
```

### 2. Graceful Error Handling

Any error in payment/subscription system:
- Does NOT block users
- Does NOT crash the API
- Defaults to free tier access
- Logs errors for investigation

```typescript
// Database timeout → user gets free tier
// Stripe API error → user gets free tier
// Bad email format → user gets free tier
```

### 3. Email Validation

- Email normalized to lowercase
- Only active/trialing subscriptions count
- Checks subscription expiration date
- Validates email format before DB query

```typescript
if (!email || typeof email !== 'string' || email.trim() === '') {
  return false;  // Reject invalid email
}
```

### 4. Webhook Security

- All webhooks validated with Stripe signature
- Invalid signatures rejected (HTTP 400)
- Subscription metadata stored safely
- Email from webhook validated before DB write

```typescript
event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
// Throws if signature doesn't match
```

## Flow Diagram

```
User Request → Check URL
       ↓
   Has sessionId?
       ↓ YES
   Verify Stripe Session
       ↓
   Payment Confirmed?
       ↓ YES
   isPro = true → Run Full Checks
       ↓ NO
   Check Database
       ↓
   Active Subscription?
       ↓ YES
   isPro = true → Run Full Checks
       ↓ NO
   isPro = false → Run Basic Checks
       ↓
   DB Error / Timeout?
       ↓ YES
   isPro = false → Run Basic Checks (Fallback)
       ↓
   Return Result + Access Info
```

## Configuration

### Required Environment Variables

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_RELEASE_GATE_PRO_PRICE_ID=price_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Database Migration

Run before deploying:

```sql
supabase migration up
-- Creates release_gate_entitlements table
-- Adds indices for performance
-- Enables RLS
```

## Monitoring

### Key Metrics

1. **Free vs Pro Usage**
   ```
   SELECT access_source, COUNT(*) FROM release_gate_checks GROUP BY access_source
   ```

2. **Error Rate**
   ```
   SELECT COUNT(*) FROM api_logs WHERE endpoint='/api/release-gate/check' AND status>=500
   ```

3. **Stripe Webhook Failures**
   ```
   SELECT COUNT(*) FROM api_logs WHERE endpoint='/api/stripe/webhook' AND status=400
   ```

## Testing

### Local Development

```bash
# Without Stripe configured
GET http://localhost:3000/api/release-gate/check?url=https://example.com
# → Returns free tier checks

# With Stripe test mode
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_test_...
# Then test webhook
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: ..." \
  -d @webhook.json
```

### E2E Tests

```bash
# Run test suite
npm run test:integration

# Specific test
npm run test -- release-gate/entitlements.test.ts
```

## Security Checklist

- [x] Email validated before DB query
- [x] Subscription status checked with expiration date
- [x] Database timeout protection (5 second limit)
- [x] Graceful fallback on any error
- [x] Stripe webhooks validated with signature
- [x] No plaintext secrets in logs
- [x] Rate limiting on checkout endpoint
- [x] CSRF protection on payment forms

## Deployment

### Pre-deployment Checklist

```bash
# 1. Run all tests
npm run test

# 2. Type check
npm run typecheck

# 3. Build
npm run build

# 4. Verify env vars
echo $STRIPE_SECRET_KEY | grep sk_
echo $SUPABASE_SERVICE_ROLE_KEY | grep eyJ

# 5. Deploy
npm run deploy:prod
```

### Rollback Plan

If issues occur:

1. Disable Pro check: set `STRIPE_SECRET_KEY=` (empty)
   - All users get free tier
   - No payment processing

2. Disable Stripe webhook: stop processing
   - New subscriptions not recorded
   - Existing Pro users still work

3. Revert deployment
   - Roll back to previous commit
   - Verify basic checks still work
