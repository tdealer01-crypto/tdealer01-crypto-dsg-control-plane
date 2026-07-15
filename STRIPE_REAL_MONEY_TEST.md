# 💳 Stripe Real Money Testing Guide — ฿10 Test Transaction

**Status**: ⚠️ Setup Required  
**Branch**: `claude/claude-code-langfuse-3fwkz9`  
**Last Updated**: 2026-07-15

---

## 🎯 Objective

Test the complete Stripe billing flow with **actual ฿10 payment**:
1. User initiates checkout via `/api/revenue/checkout`
2. Stripe processes real payment
3. Payment recorded in Supabase (`customers`, `subscriptions`, `invoices`)
4. Revenue tracked in analytics

---

## ⏳ Prerequisites (MUST Complete)

### Step 1: Get Stripe Live Keys
```
1. Go to https://dashboard.stripe.com/apikeys
2. Toggle to "LIVE" mode (red warning banner)
3. Copy: Secret key (sk_live_...)
4. Copy: Publishable key (pk_live_...)
5. Go to Webhooks: https://dashboard.stripe.com/webhooks
6. Copy: Signing secret (whsec_...)
```

⚠️ **CRITICAL**: Use LIVE keys (`sk_live_`, not `sk_test_`)

### Step 2: Create Test Product & Price
```bash
# Via Stripe Dashboard:
1. Products → Create Product
   Name: "DSG Pro Plan"
   Price: ฿10.00 (or 1000 in smallest unit)
   Currency: THB
   Billing period: Monthly
   
2. Copy the PRICE ID (price_xxx)
```

### Step 3: Configure Vercel Environment
```bash
# Via https://vercel.com/dashboard → Settings → Environment Variables

Add these LIVE values:
STRIPE_SECRET_KEY=sk_live_[YOUR_KEY]
STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_SECRET]
STRIPE_PRICE_PRO=price_[YOUR_PRICE_ID]
STRIPE_APP_CLIENT_ID=ca_[APP_ID]
STRIPE_APP_CLIENT_SECRET=[SECRET]
```

### Step 4: Deploy Updated Code
```bash
# Option A: Via Git (automatic)
git push origin claude/claude-code-langfuse-3fwkz9

# Option B: Via Vercel CLI
vercel deploy --prod

# Wait for build to complete (~2-3 minutes)
```

### Step 5: Verify Deployment
```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq '.ok'
# Should return: true
```

---

## 🧪 Test Sequence

### Phase 1: Initiate Checkout

```bash
ENDPOINT="https://tdealer01-crypto-dsg-control-plane.vercel.app/api/revenue/checkout"
EMAIL="your-test-email@example.com"  # Change this!

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"plan\": \"pro\"
  }"
```

**Expected Response** (save this!):
```json
{
  "success": true,
  "sessionId": "cs_live_xxx...",
  "url": "https://checkout.stripe.com/pay/cs_live_xxx...",
  "customerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### Phase 2: Open Checkout & Pay
```bash
# Open this URL in a browser (from Phase 1 response):
https://checkout.stripe.com/pay/cs_live_xxx...

# Fill in payment details:
Card: 4242 4242 4242 4242 (or use your real card)
Exp: 12/26
CVC: 123
Name: Test User
Email: your-test-email@example.com

# Click "Pay"
```

⚠️ **WARNING**: This charges ฿10.00 to your card!

### Phase 3: Verify Payment in Stripe Dashboard

```bash
# Go to: https://dashboard.stripe.com/payments
# Look for transaction:
Amount: ฿10.00
Status: Succeeded (or Completed)
Customer: test-buyer@example.com
```

### Phase 4: Verify Database Records

Run these SQL queries in Supabase:

```sql
-- 1. Check customer was created
SELECT id, email, plan, status 
FROM customers 
WHERE email = 'your-test-email@example.com'
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Check subscription was recorded
SELECT customer_id, plan, amount, status, created_at
FROM subscriptions
WHERE amount = 10
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check invoice exists
SELECT customer_id, amount, status, created_at
FROM invoices
WHERE amount = 10
ORDER BY created_at DESC
LIMIT 1;

-- 4. Check checkout event logged
SELECT customer_id, plan, session_id, status, created_at
FROM checkout_events
WHERE plan = 'pro'
ORDER BY created_at DESC
LIMIT 1;
```

All should return 1 row per table ✅

### Phase 5: Check Revenue Analytics

```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/revenue/analytics-summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [INTERNAL_SERVICE_KEY]" \
  -d '{"days": 1}'
```

Expected:
```json
{
  "success": true,
  "metrics": {
    "checkoutsStarted": 1,
    "subscriptionsCreated": 1,
    "totalRevenue": 10,
    "conversionRate": 100,
    "avgMRR": 10,
    "newCustomers": 1
  }
}
```

---

## 🔄 If Payment Fails

### Immediate Refund (< 1 minute)
1. Go to Stripe Dashboard → Payments
2. Find your transaction
3. Click → "Refund"
4. Select "Full refund"
5. Confirm

Money returns in **3-5 business days**

### Cleanup (remove test data)
```sql
-- Remove test customer
DELETE FROM customers 
WHERE email = 'your-test-email@example.com';

-- This cascades to subscriptions, invoices, events
```

---

## ✅ Success Criteria

| Component | Status | Evidence |
|-----------|--------|----------|
| Checkout API | ✅ | Returns `sessionId` + `url` |
| Stripe Payment | ✅ | Dashboard shows "Succeeded" |
| Customer DB | ✅ | Row in `customers` table |
| Subscription DB | ✅ | Row in `subscriptions` table |
| Invoice DB | ✅ | Row in `invoices` table |
| Analytics | ✅ | Metrics show 1 sale, ฿10 revenue |
| **Payment Status** | ✅ | Bank account charged ฿10.00 |

---

## ⚠️ Known Issues & Limitations

### Current Blockers
- [ ] `/api/revenue/events` requires internal service token (not yet documented)
- [ ] Webhook event delivery may take 10-30 seconds
- [ ] Supabase replication lag possible (usually < 1 second)
- [ ] Test stub coverage incomplete (257 stubs in `packages/stripe-app/tests/`)

### Not Tested Yet
- [ ] Webhook signature verification
- [ ] Concurrent checkout attempts
- [ ] Stripe Connect (OAuth flow)
- [ ] Refund workflow integration
- [ ] MCP integration (Langfuse tracing)

---

## 📝 Rollback Checklist

After testing, cleanup:
- [ ] Request refund in Stripe Dashboard
- [ ] Delete test customer from Supabase
- [ ] Verify analytics show 0 active subscriptions
- [ ] Update environment to disable LIVE keys if not needed
- [ ] Document any issues found for next phase

---

## 🚀 Next Steps

**If test succeeds:**
1. ✅ Merge to main
2. ✅ Deploy to production
3. ✅ Monitor real revenue tracking
4. ✅ Complete MCP + Langfuse integration (branch purpose)

**If test fails:**
1. Check error message from `/api/revenue/checkout`
2. Verify all STRIPE_* env vars in Vercel
3. Check Supabase migrations applied: `npx supabase migration list`
4. Review webhook logs in Stripe Dashboard
5. Check application logs in Vercel

---

## 📞 Support Docs

- Stripe API: https://stripe.com/docs/api
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Next.js 15 API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

Last updated: 2026-07-15
