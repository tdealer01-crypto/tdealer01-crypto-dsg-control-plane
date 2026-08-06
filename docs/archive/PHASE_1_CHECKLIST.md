# Phase 1: Live Verification & Automation Checklist

**Timeline:** Week 1–2 | **Effort:** ~12–15 hours | **Team:** 1–2 engineers | **Status:** Ready to execute

---

## Overview

Phase 1 verifies that DSG ONE's billing infrastructure works end-to-end with real Stripe transactions. This phase consists of 6 tasks that take **2–3 days** to complete.

**Go-live criteria:** First test customer checkout succeeds → DB updated → webhook fires → meter event queued.

---

## Task M1-1: Verify Stripe Account Setup ✅ (2 hours)

**Objective:** Confirm Stripe account `acct_1Tnbl5CVpjxFKlKT` has all required products, prices, meter, and webhooks configured.

### Checklist

#### Products
- [ ] **Pro Plan**
  - Product ID: `prod_1Topm...` (verify in Stripe Dashboard)
  - Pricing: $99/month or $1,088/year
  - Status: Active

- [ ] **Business Plan**
  - Product ID: `prod_1Topn...`
  - Pricing: $199/month or $2,188/year
  - Status: Active

- [ ] **Enterprise Plan**
  - Product ID: `prod_1Topo...`
  - Pricing: $499/month or $5,488/year
  - Status: Active

- [ ] **Delivery Proof Product** (one-time add-on)
  - Pricing: $49 (one-time) or $199/month (unlimited)
  - Status: Active

- [ ] **Skills Bundles** (5 add-on products)
  - [ ] Finance Governance Pack ($199/mo)
  - [ ] Dev Automation Pack ($99/mo)
  - [ ] Compliance & Legal Pack ($249/mo)
  - [ ] Operations Pack ($149/mo)
  - [ ] Enterprise Bundle ($599/mo)

#### Prices
- [ ] Pro Monthly: `price_1TopmiCVpjxFKlKT18ljNI84` (active)
- [ ] Pro Yearly: `price_1TopmiCVpjxFKlKT0EVZwCps` (active)
- [ ] Business Monthly: `price_1TopmsCVpjxFKlKTdpm128OG` (active)
- [ ] Business Yearly: `price_1Topn0CVpjxFKlKTvxKJUsff` (active)
- [ ] Enterprise Monthly: `price_1TopnACVpjxFKlKT36Pe7Zmu` (active)
- [ ] Enterprise Yearly: `price_1TopnICVpjxFKlKTqHhjKzhR` (active)

#### Billing Meter
- [ ] Meter exists: `bm_...` (verify event name = `dsg_execution`)
- [ ] Meter status: Active
- [ ] Event name: `dsg_execution` (matches env var)

#### Webhook Endpoint
- [ ] URL: `https://your-production-url/api/billing/webhook`
- [ ] Status: **Ready** (green check mark)
- [ ] Events subscribed:
  - [ ] `customer.created`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `payment_intent.succeeded`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `charge.refunded`

### Commands

```bash
# Using Stripe CLI (if installed)
stripe products list --live --limit 20
stripe prices list --live --limit 30
stripe billing meters list --live
stripe webhook_endpoints list --live

# Or via Stripe Dashboard:
# 1. Go to https://dashboard.stripe.com/apikeys
# 2. Verify account is "acct_1Tnbl5CVpjxFKlKT"
# 3. Navigate to Products and Prices tabs
# 4. Check Billing → Meters
# 5. Check Webhooks → Endpoints
```

### Expected Result
- ✅ All 3 plan products exist
- ✅ 6+ price IDs matching env var defaults
- ✅ 1 Meter with `dsg_execution` event name
- ✅ Webhook endpoint showing "Ready" and recent test events

---

## Task M1-2: Configure Environment Variables ✅ (1 hour)

**Objective:** Set all required Stripe keys and configuration in production environment.

### Step 1: Collect Values

Get these from Stripe Dashboard:

1. **STRIPE_SECRET_KEY** (https://dashboard.stripe.com/apikeys)
   - Copy the "Secret key" starting with `sk_live_`
   - ⚠️ NEVER commit this to git

2. **STRIPE_PUBLISHABLE_KEY**
   - Copy the "Publishable key" starting with `pk_live_`
   - Safe to commit (used in browser)

3. **STRIPE_WEBHOOK_SECRET**
   - Go to Webhooks → select endpoint
   - Copy "Signing secret" starting with `whsec_`

4. **STRIPE_METER_ID**
   - Go to Billing → Meters
   - Copy the Meter ID starting with `bm_`

5. **STRIPE_METER_EVENT_NAME**
   - Should always be: `dsg_execution`

6. **CRON_SECRET**
   - Generate: `openssl rand -hex 32`
   - Use this to authorize cron endpoints from Vercel

### Step 2: Set in Vercel

```bash
# Option A: Via Vercel CLI (recommended)
vercel env pull .env.production
# Edit .env.production with values from Step 1
vercel env push .env.production

# Option B: Via Vercel Dashboard
# 1. Go to https://vercel.com/dashboard
# 2. Select project
# 3. Settings → Environment Variables
# 4. Add each variable:
#    - Name: STRIPE_SECRET_KEY
#    - Value: sk_live_...
#    - Environments: Production
#    - Click "Save"
# 5. Repeat for all 6 variables
```

### Checklist

In Vercel Dashboard:
- [ ] STRIPE_SECRET_KEY (starts with `sk_live_`, production env only)
- [ ] STRIPE_PUBLISHABLE_KEY (starts with `pk_live_`)
- [ ] STRIPE_WEBHOOK_SECRET (starts with `whsec_`)
- [ ] STRIPE_METER_ID (starts with `bm_`)
- [ ] STRIPE_METER_EVENT_NAME = `dsg_execution`
- [ ] CRON_SECRET (secure random 64-char string)

Optional (if using custom price IDs):
- [ ] STRIPE_PRICE_PRO_MONTHLY
- [ ] STRIPE_PRICE_PRO_YEARLY
- [ ] STRIPE_PRICE_BUSINESS_MONTHLY
- [ ] STRIPE_PRICE_BUSINESS_YEARLY
- [ ] STRIPE_PRICE_ENTERPRISE_MONTHLY
- [ ] STRIPE_PRICE_ENTERPRISE_YEARLY

### Verification

```bash
# Verify env vars are set (Vercel CLI)
vercel env list

# Or test in deployed app:
# After deployment, try calling:
curl https://your-production-url/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro","billingInterval":"monthly","orgId":"test-org"}'

# Should return 200 with sessionId (not 500 with "Missing env var")
```

---

## Task M1-3: Verify API Endpoints Deployed ✅ (1 hour)

**Objective:** Confirm all billing API routes are live and responding correctly.

### Health Checks

Run these commands against your production URL:

```bash
PROD_URL="https://your-production-url"

# 1. Test webhook endpoint (should reject invalid signature)
echo "1. Testing /api/billing/webhook..."
curl -X POST "$PROD_URL/api/billing/webhook" \
  -H "Stripe-Signature: invalid" \
  -H "Content-Type: application/json" \
  -d "test"
# Expected: 400 (invalid signature), NOT 404 or 500

# 2. Test checkout endpoint
echo "2. Testing /api/billing/checkout..."
curl -X POST "$PROD_URL/api/billing/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "billingInterval": "monthly",
    "orgId": "test-org-123"
  }' | jq .
# Expected: 200 with { ok: true, sessionId: "cs_...", redirectUrl: "..." }

# 3. Test revenue events endpoint
echo "3. Testing /api/revenue/events (GET)..."
curl -X GET "$PROD_URL/api/revenue/events" \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json"
# Expected: 200 or 401 (not 404)

# 4. Test meter health
echo "4. Testing /api/billing/meter-health..."
curl -X GET "$PROD_URL/api/billing/meter-health" \
  -H "Authorization: Bearer test-token"
# Expected: 200 with health status (not 404)
```

### Checklist

- [ ] `/api/billing/checkout` returns 200 with sessionId
- [ ] `/api/billing/webhook` returns 400 for invalid signature (not 404)
- [ ] `/api/revenue/events` (GET) returns 200 (or 401 if auth required, not 404)
- [ ] `/api/billing/meter-health` returns 200 (or 401, not 404)
- [ ] No CORS errors
- [ ] No TypeErrors in response
- [ ] Vercel logs show no 5xx errors

### Debugging

If endpoints return 404:
1. Check that routes exist: `app/api/billing/checkout/route.ts`
2. Verify deployment: `vercel deployments list`
3. Check logs: `vercel logs https://your-production-url`

If endpoints return 500:
1. Check env vars: `vercel env list`
2. Check Vercel logs for error details
3. Verify Supabase connectivity

---

## Task M1-4: Test First Customer Checkout (3 hours)

**Objective:** Execute a complete checkout flow manually to verify Stripe → DB integration.

### Step 1: Create Test Organization

In Supabase SQL Editor:

```sql
-- Create test org
INSERT INTO organizations (
  id, name, owner_id, status, plan
) VALUES (
  'test-org-001',
  'Test Checkout Org',
  'test-user-001',
  'active',
  'free'
)
RETURNING id, name, plan;

-- Record this org_id for later verification
```

### Step 2: Initiate Checkout

```bash
PROD_URL="https://your-production-url"
TEST_ORG_ID="test-org-001"

curl -X POST "$PROD_URL/api/billing/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "billingInterval": "monthly",
    "orgId": "'"$TEST_ORG_ID"'"
  }' | jq .
```

**Expected response:**
```json
{
  "ok": true,
  "sessionId": "cs_live_xxxxx",
  "redirectUrl": "https://checkout.stripe.com/pay/cs_live_xxxxx"
}
```

### Step 3: Complete Payment

1. Copy the `redirectUrl` from response
2. Paste into browser
3. Use Stripe **test card**:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/26)
   - CVC: Any 3 digits (e.g., 123)
4. Fill email: `test@example.com`
5. Click "Pay"

**Expected:** Checkout completes → redirects to success page (or back to app)

### Step 4: Verify Database Updates

**Wait 5–10 seconds** for webhook to process.

In Supabase SQL Editor:

```sql
-- 1. Check billing_customers created
SELECT 
  stripe_customer_id, 
  org_id, 
  email, 
  created_at
FROM billing_customers 
WHERE org_id = 'test-org-001'
LIMIT 5;

-- Expected: 1 row with stripe_customer_id = cus_...

-- 2. Check billing_subscriptions created
SELECT 
  stripe_subscription_id, 
  org_id, 
  status, 
  plan_key, 
  billing_interval, 
  current_period_start, 
  current_period_end,
  trial_start,
  trial_end,
  created_at
FROM billing_subscriptions 
WHERE org_id = 'test-org-001'
LIMIT 5;

-- Expected: 1 row with:
-- - status = 'trialing' (during 14-day trial)
-- - plan_key = 'pro'
-- - billing_interval = 'monthly'
-- - trial_start = now
-- - trial_end = now + 14 days

-- 3. Check revenue_events logged
SELECT 
  id,
  event_type, 
  amount, 
  source, 
  created_at,
  metadata
FROM revenue_events 
WHERE org_id = 'test-org-001'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: 1 row with event_type = 'subscription.created'

-- 4. Check billing_events logged (webhook audit trail)
SELECT 
  event_type, 
  COUNT(*) as count,
  MAX(processed_at) as latest
FROM billing_events
GROUP BY event_type
ORDER BY latest DESC
LIMIT 20;

-- Expected: See 'customer.subscription.created' event

-- 5. Check organizations.plan was updated
SELECT 
  id, 
  plan, 
  created_at,
  updated_at
FROM organizations
WHERE id = 'test-org-001';

-- Expected: plan = 'pro' (or 'trialing' if trial logic is active)
```

### Checklist

After completing payment:

**Database:**
- [ ] `billing_customers` row exists with correct org_id
- [ ] `billing_subscriptions` row with status='trialing' and plan_key='pro'
- [ ] `revenue_events` row with event_type='subscription.created'
- [ ] `organizations.plan` updated to 'pro'

**Stripe Webhook:**
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Find your endpoint
- [ ] Click to expand event list
- [ ] See `customer.subscription.created` event
- [ ] Event status: ✅ **Success** (green)

**App/Dashboard:**
- [ ] Organization shows as "Pro" plan (if dashboard implemented)
- [ ] No error emails sent

### If Anything Fails

**If webhook shows "Failed" or "400 error":**
1. Check webhook endpoint URL is correct
2. Verify STRIPE_WEBHOOK_SECRET env var matches Stripe Dashboard
3. Check Vercel logs: `vercel logs` for 400 errors
4. Re-test with `bash scripts/test-checkout.sh $PROD_URL`

**If DB rows not created:**
1. Check Supabase migrations applied: `supabase migration list`
2. Check user's Supabase auth (webhook must have service role access)
3. Check Supabase RLS policies on tables

**If session not created:**
1. Verify STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are set
2. Verify price IDs exist: `stripe prices list --live`
3. Check Vercel logs for "Missing price ID" error

---

## Task M1-5: Test Metered Billing (2 hours)

**Objective:** Verify usage-based billing works by queuing and processing meter events.

### Step 1: Verify Org Has Stripe Customer

From M1-4, we created a subscription. Verify it has a `stripe_customer_id`:

```sql
SELECT stripe_customer_id 
FROM billing_customers 
WHERE org_id = 'test-org-001';

-- Copy this ID (e.g., cus_abc123) for next step
```

### Step 2: Trigger Meter Event

Manually insert an execution to trigger metering:

```sql
-- Insert test execution
INSERT INTO executions (
  id,
  org_id,
  status,
  result,
  created_at
) VALUES (
  'exec-test-001',
  'test-org-001',
  'succeeded',
  '{"ok":true}',
  now()
)
RETURNING id, org_id, status;

-- This would normally call meterExecution() in /api/execute
-- For manual test, we'll queue directly to billing_meter_outbox

-- Insert meter event directly (simulating what meterExecution() does)
INSERT INTO billing_meter_outbox (
  execution_id,
  org_id,
  stripe_customer_id,
  event_name,
  quantity,
  status,
  created_at
) SELECT
  'exec-test-001',
  'test-org-001',
  stripe_customer_id,
  'dsg_execution',
  1,
  'pending',
  now()
FROM billing_customers
WHERE org_id = 'test-org-001';
```

### Step 3: Verify Meter Outbox

```sql
-- Check pending meter events
SELECT 
  id,
  execution_id,
  org_id,
  stripe_customer_id,
  event_name,
  quantity,
  status,
  stripe_event_id,
  error,
  created_at,
  flushed_at
FROM billing_meter_outbox
WHERE org_id = 'test-org-001'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: status = 'pending', error = NULL, flushed_at = NULL
```

### Step 4: Flush Meter Outbox

Manually trigger the cron job (or wait 5 minutes):

```bash
# Manual flush (requires CRON_SECRET)
curl -X POST "$PROD_URL/api/cron/flush-meter-outbox" \
  -H "X-Cron-Secret: $CRON_SECRET"

# Expected response:
# {
#   "ok": true,
#   "scanned": 1,
#   "sent": 1,
#   "failed": 0,
#   "skipped": 0,
#   "errors": []
# }
```

### Step 5: Verify Meter Event Sent

Re-check the outbox:

```sql
SELECT 
  id,
  execution_id,
  status,
  stripe_event_id,
  error,
  flushed_at
FROM billing_meter_outbox
WHERE org_id = 'test-org-001'
ORDER BY flushed_at DESC
LIMIT 10;

-- Expected: status = 'sent', stripe_event_id = 'evt_...', error = NULL
-- flushed_at should be ~now()
```

### Step 6: Verify in Stripe

Check Stripe Meter events:

```bash
# Via Stripe CLI
stripe billing meter events list --live

# Or in Stripe Dashboard:
# 1. Go to https://dashboard.stripe.com/billing/meters
# 2. Click meter "dsg_execution"
# 3. View "Events" tab
# 4. Should see event from test-org-001 with value=1
```

### Checklist

- [ ] `billing_meter_outbox` row created with status='pending'
- [ ] After flush, status changes to 'sent'
- [ ] `stripe_event_id` populated (not NULL)
- [ ] No errors logged
- [ ] `flushed_at` timestamp set
- [ ] Stripe Meter events log shows event from test org
- [ ] Event quantity = 1

### If Meter Event Fails

**If status='failed' with error:**
1. Check error message: `SELECT error FROM billing_meter_outbox WHERE status='failed'`
2. Common errors:
   - "Stripe metering not configured" → Check STRIPE_METER_ID env var
   - "customer not found" → Check stripe_customer_id exists
   - "invalid meter event" → Check event_name matches STRIPE_METER_EVENT_NAME

**If status stays 'pending' after flush:**
1. Cron job might not have run
2. Manually trigger: `bash scripts/verify-stripe-setup.sh`
3. Check Vercel logs for `/api/cron/flush-meter-outbox`

---

## Task M1-6: Cron Job Automation ✅ (1 hour)

**Objective:** Enable automatic billing sync and meter outbox flushing every 5 minutes.

### Step 1: Update vercel.json

✅ Already done (see `vercel.json` updates above)

**Current config:**
```json
{
  "crons": [
    { "path": "/api/cron/billing-sync", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/flush-meter-outbox", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/reconcile-meter", "schedule": "0 4 * * *" }
  ]
}
```

**Explanation:**
- `*/5 * * * *` = Every 5 minutes
- `0 4 * * *` = Every day at 4:00 AM

### Step 2: Commit and Deploy

```bash
# Verify changes
git diff vercel.json

# Commit
git add vercel.json
git commit -m "Enable Phase 1 billing cron jobs (billing-sync, flush-meter-outbox every 5 min)"

# Push to main (or staging first)
git push origin claude/production-governance-docs-4d6e30
# Then merge PR to main, Vercel will auto-deploy
```

### Step 3: Verify Cron Jobs Enabled

In Vercel Dashboard:

1. Go to Settings → Cron Jobs
2. Should see 3 jobs:
   - ✅ `/api/cron/billing-sync` → `*/5 * * * *`
   - ✅ `/api/cron/flush-meter-outbox` → `*/5 * * * *`
   - ✅ `/api/cron/reconcile-meter` → `0 4 * * *`

3. All should show **Enabled** (toggle is ON)

### Step 4: Monitor Logs

```bash
# After 5 minutes, check if cron jobs ran:
vercel logs https://your-production-url --follow

# You should see:
# [cron] GET /api/cron/billing-sync (status 200)
# [cron] GET /api/cron/flush-meter-outbox (status 200)
```

### Step 5: Verify Automation Works

After 5 minutes:

```sql
-- Check if meter outbox was automatically flushed
SELECT 
  status,
  COUNT(*) as count,
  MAX(flushed_at) as last_flush_time
FROM billing_meter_outbox
GROUP BY status;

-- Expected:
-- sent: 1, last_flush_time = ~5 min ago
-- pending: 0
```

### Checklist

- [ ] vercel.json updated with 3 cron jobs
- [ ] Committed and deployed to main
- [ ] Vercel Dashboard shows 3 Cron Jobs (all Enabled)
- [ ] Vercel logs show cron jobs running (check after 5 min)
- [ ] `billing_meter_outbox` has flushed_at timestamps for recent rows
- [ ] No errors in logs

---

## Phase 1 Summary

After completing all 6 tasks (M1-1 through M1-6):

| Task | Time | Status |
|------|------|--------|
| M1-1: Verify Stripe Setup | 2h | ✅ |
| M1-2: Configure Env Vars | 1h | ✅ |
| M1-3: Verify API Routes | 1h | ✅ |
| M1-4: Test Checkout | 3h | ✅ |
| M1-5: Test Metering | 2h | ✅ |
| M1-6: Cron Automation | 1h | ✅ |
| **Total** | **10h** | **Ready** |

---

## Success Criteria

### Before Proceeding to Phase 2:

- ✅ First test checkout completes without errors
- ✅ `billing_customers` row created in DB
- ✅ `billing_subscriptions` row with status='trialing'
- ✅ `organizations.plan` updated to 'pro'
- ✅ Stripe webhook delivers event successfully (green checkmark)
- ✅ Meter event created and flushed (status='sent')
- ✅ Cron jobs running every 5 minutes
- ✅ No errors in Vercel logs

### KPIs After Phase 1:

- First revenue event: 1 subscription created
- Webhook success rate: 100% (test events)
- Meter delivery rate: 100%
- Outbox latency: <5 minutes
- Cron uptime: 100%

---

## Next Steps (Phase 2)

Once Phase 1 passes:

1. **Wire revenue logging into `/api/execute`** (1 hour)
   - Call `meterExecution()` after success
   - Call `insertRevenueEvent()` for tracking

2. **Build reconciliation logic** (2 hours)
   - Implement `reconcileMeterOutbox()`
   - Add drift detection alerts

3. **Implement billing dashboard widget** (3 hours)
   - Show org's current plan, usage, renewal date
   - Display recent revenue events

---

## Debugging Quick Reference

| Issue | Check | Command |
|-------|-------|---------|
| Webhook not firing | Endpoint URL in Stripe | `stripe webhook_endpoints list --live` |
| Checkout 500 error | Env vars set | `vercel env list` |
| DB rows not created | Supabase RLS policies | `SELECT * FROM information_schema.role_table_grants;` |
| Meter event failed | stripe_customer_id exists | `SELECT stripe_customer_id FROM billing_customers WHERE org_id='...'` |
| Cron not running | Vercel Cron Jobs tab | https://vercel.com/dashboard → Settings → Cron Jobs |
| Price ID error | Prices exist in Stripe | `stripe prices list --live \| grep price_1` |

---

## Emergency Contacts & Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Vercel Logs:** `vercel logs`
- **Supabase SQL Editor:** https://app.supabase.com
- **DSG ONE Production URL:** https://your-production-url
- **Stripe Webhook Testing:** https://dashboard.stripe.com/webhooks (expand endpoint)
- **Documentation:** `/docs/PHASE_1_CHECKLIST.md`

---

**Ready to start Phase 1? Run:** `bash scripts/verify-stripe-setup.sh`

