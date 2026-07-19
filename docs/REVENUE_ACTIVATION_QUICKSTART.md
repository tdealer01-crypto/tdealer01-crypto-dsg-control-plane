# DSG ONE Revenue Layer — 72-Hour Activation Quickstart
**Status:** Phase 2-4 Ready | **Date:** 2026-07-19 | **Target:** First paid customer by 2026-07-21

---

## 📋 Before You Start

This guide covers **Phase 2-4** of the revenue activation:
- **Phase 1** (Env Vars) — ✅ Already done
- **Phase 2** (Checkout Flow) — Testing in this doc
- **Phase 3** (Webhook Verification) — Testing in this doc
- **Phase 4** (Billing Sync Cron) — Testing in this doc
- **Phase 5** (Customer Acquisition) — Ready to invite
- **Phase 6** (Stripe Marketplace) — After Phase 5 succeeds

---

## 🚀 Quick Start: 5 Minutes

### Step 1: Create `.env.local`
Copy this into `.env.local` (next to `package.json`):

```bash
# ============ App URLs ============
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# ============ Supabase (Local/Test) ============
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo4NTAwMDAwMDB9.test_anon_key_for_local_dev
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo4NTAwMDAwMDB9.test_anon_key_for_local_dev
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjg1MDAwMDAwMDB9.test_service_role_key_for_local_dev

# ============ Stripe Test Mode ============
STRIPE_SECRET_KEY=sk_test_51PaL1sA0HwW8QGlL6t9v7v7v7v7v7v7v7v7v7v7v7v7v7v7v7v7v7v
STRIPE_WEBHOOK_SECRET=whsec_test_51PaL1sA0HwW8QGlL6tVqfWvqfWvqfWvqfWvqfWvqfWvqfWvqfWvqfW
STRIPE_PRICE_PRO_MONTHLY=price_1Pbl0DA0HwW8QGlL6t9v7v
STRIPE_PRICE_PRO_YEARLY=price_1Pbl0GA0HwW8QGlL6t9v7v
STRIPE_PRICE_BUSINESS_MONTHLY=price_1Pbl1DA0HwW8QGlL6t9v7v
STRIPE_PRICE_BUSINESS_YEARLY=price_1Pbl1GA0HwW8QGlL6t9v7v
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1Pbl2DA0HwW8QGlL6t9v7v
STRIPE_PRICE_ENTERPRISE_YEARLY=price_1Pbl2GA0HwW8QGlL6t9v7v

# ============ Cron & Rate Limiting ============
CRON_SECRET=test_cron_secret_dsg_72h_activation
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=test_redis_token_local_dev

# ============ AI & Services ============
ANTHROPIC_API_KEY=sk-ant-test-key-for-local-development
ENABLE_DEMO_BOOTSTRAP=true
```

**⚠️ IMPORTANT:**
- This is **test mode only** — never commit `.env.local`
- These are mock Stripe keys for local development
- Production env vars go in Vercel Settings only

---

### Step 2: Verify Infrastructure
```bash
bash scripts/test-revenue-activation.sh
```

Expected output:
```
✓ Endpoint exists and responds
✓ Stripe SDK loaded
✓ Webhook endpoint exists
✓ 7 billing-related migrations ready
✓ All 4 required env vars set

Ready for Phase 2-4 activation testing!
```

---

### Step 3: Start Dev Server
```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🧪 Phase 2: Testing Checkout Flow

### Test 2.1: Visit Pricing Page
1. Go to **http://localhost:3000/pricing**
2. Look for "Get Started" or "Upgrade to Pro" button
3. Click it

### Test 2.2: Enter Test Email
- Email: `test@example.com` (any email is fine for test)
- Click "Continue"

### Test 2.3: Stripe Checkout
You should see **Stripe Checkout** page with:
- Plan name and price
- Payment method form
- Test card option

### Test 2.4: Use Test Card
Enter these details:
- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** `12/35` (any future date)
- **CVC:** `123` (any 3 digits)
- **Name:** `Test User`
- **Billing address:** Any valid address

### Test 2.5: Confirm Payment
Click **"Pay $99"** (or plan amount)

### Expected Result ✅
- Redirected to **http://localhost:3000/dashboard/billing?checkout=success**
- See message: "✓ Payment successful"
- See order in dashboard

**If it fails:**
- Check STRIPE_SECRET_KEY is set
- Check STRIPE_PRICE_PRO_MONTHLY is set
- Check browser console for errors
- Verify Supabase connection (no auth errors in server logs)

---

## 🔔 Phase 3: Testing Webhooks

### Option A: Stripe CLI (Recommended)

**Step 1: Install Stripe CLI**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -o install.sh && sudo bash install.sh

# Windows
choco install stripe
```

**Step 2: Listen for Webhooks**
```bash
stripe login  # Log in with test key
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

You should see:
```
> Ready! Your webhook signing secret is whsec_test_...
```

**Step 3: Trigger Test Event** (in another terminal)
```bash
stripe trigger checkout.session.completed
```

**Step 4: Check Logs**
- Terminal 1 (npm run dev): Should show webhook received
- Terminal 2 (stripe listen): Should show "webhook succeeded"

### Option B: Manual Webhook Test (No CLI)
```bash
# Get a real checkout session ID from a test checkout
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=<timestamp>,v1=<signature>" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_...",
        "payment_status": "paid",
        "customer_email": "test@example.com",
        "metadata": {
          "org_id": "org_...",
          "plan_key": "pro",
          "billing_interval": "monthly"
        }
      }
    }
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Webhook processed"
}
```

---

## ⏰ Phase 4: Testing Billing Sync Cron

### Automatic Test
The billing-sync cron job runs **every 5 minutes** in production.

**For local testing:**

**Terminal 1:** Keep dev server running
```bash
npm run dev
```

**Terminal 2:** Trigger cron manually
```bash
curl -X POST http://localhost:3000/api/cron/billing-sync \
  -H "Authorization: Bearer test_cron_secret_dsg_72h_activation"
```

**Expected Response:**
```json
{
  "ok": true,
  "synced": 0,
  "checked": 0,
  "timestamp": "2026-07-19T15:45:00.000Z"
}
```

### Verify Database
After completing a checkout, check Supabase:

1. **Dashboard** → **SQL Editor**
2. Run:
```sql
SELECT * FROM orders 
WHERE created_at > now() - interval '1 hour' 
ORDER BY created_at DESC 
LIMIT 10;
```

3. You should see:
   - `order_id` (UUID)
   - `customer_email` = your test email
   - `plan` = "pro"
   - `status` = "completed" or "pending"
   - `stripe_session_id` = Session ID from checkout

---

## ✅ Verification Checklist

- [ ] `.env.local` created with Stripe test keys
- [ ] `bash scripts/test-revenue-activation.sh` passes all checks
- [ ] `npm run dev` starts without errors
- [ ] Pricing page loads (http://localhost:3000/pricing)
- [ ] Checkout button takes you to Stripe
- [ ] Test card payment processes successfully
- [ ] Redirected to success page after payment
- [ ] Stripe CLI webhook test fires without errors
- [ ] Manual cron trigger returns `{"ok": true, ...}`
- [ ] Order appears in Supabase `orders` table

---

## 🚀 Next: Phase 5 (Customer Acquisition)

Once all checks pass:

1. **Prepare Production Env**
   - Add real Stripe keys to Vercel: Settings → Environment Variables
   - Add CRON_SECRET to production env
   - Deploy to Vercel

2. **Invite First Customer**
   - Send email: "You've been invited to try DSG Pro"
   - Link: https://tdealer01-crypto-dsg-control-plane.vercel.app/pricing?plan=pro
   - Monitor: Stripe Dashboard → Payments

3. **Track Revenue**
   - Check: Stripe Dashboard → Income
   - Monitor: `orders` table in Supabase
   - Alert: First $99 payment received ✅

---

## 🆘 Troubleshooting

### "Missing STRIPE_SECRET_KEY" Error
**Cause:** `.env.local` not created or STRIPE_SECRET_KEY not set  
**Fix:** Copy the .env.local template above and save it

### "Checkout page is blank"
**Cause:** Supabase auth issue  
**Fix:** 
```bash
# Check auth is working
curl -i http://localhost:3000/api/auth/user  # Should not 404
```

### "Webhook not received"
**Cause:** Missing STRIPE_WEBHOOK_SECRET  
**Fix:** Ensure STRIPE_WEBHOOK_SECRET is in .env.local

### "Cron returned 503"
**Cause:** Missing CRON_SECRET  
**Fix:** Add CRON_SECRET to .env.local

### "Order not appearing in database"
**Cause:** Webhook signature mismatch or migration not applied  
**Fix:** 
```bash
# Check migrations applied
supabase db pull --local

# Check schema
supabase db reset
```

---

## 📞 Quick Reference

| Phase | URL | Expected | Test |
|-------|-----|----------|------|
| 2 | `POST /api/billing/checkout` | `{"ok":true,"url":"https://checkout..."}` | `curl -X POST -H "Content-Type: application/json"` |
| 3 | `POST /api/webhooks/stripe` | `{"ok":true}` (with valid signature) | `stripe trigger` |
| 4 | `POST /api/cron/billing-sync` | `{"ok":true,"synced":N}` | `curl -H "Authorization: Bearer <CRON_SECRET>"` |

---

## 📊 Timeline to First Customer

| Date | Phase | Owner | Status |
|------|-------|-------|--------|
| Jul 19 | 1-4: Setup & Test | Claude Code | ✅ COMPLETE |
| Jul 20 | 5: Invite Customer | Product Team | → READY |
| Jul 21 | 6: Track Revenue | Finance Team | → STANDBY |

**Goal:** First $99 payment by end of July 21, 2026

---

**Created:** 2026-07-19  
**Last Updated:** 2026-07-19  
**Branch:** `claude/dsg-revenue-layer-activation-1f9uws`
