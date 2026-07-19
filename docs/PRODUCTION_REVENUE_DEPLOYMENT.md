# DSG ONE Revenue Layer — Production Deployment Checklist
**Target:** First paid customer activation by 2026-07-21  
**Deployment:** Vercel (https://tdealer01-crypto-dsg-control-plane.vercel.app)

---

## 🎯 Deployment Phases

### Phase A: Pre-Deployment (Complete Locally First)
- [ ] Phase 1-4 testing passed locally (see REVENUE_ACTIVATION_QUICKSTART.md)
- [ ] typecheck passes: `npm run typecheck`
- [ ] build succeeds: `npm run build`
- [ ] tests pass: `npm run test`
- [ ] All code committed to branch: `claude/dsg-revenue-layer-activation-1f9uws`

### Phase B: Environment Variables (Vercel)

#### Required: Billing
- [ ] `STRIPE_SECRET_KEY` = Live secret key (`rk_live_...` or `sk_test_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` = Webhook signing secret from Stripe Dashboard
- [ ] `STRIPE_PRICE_PRO_MONTHLY` = Pro plan monthly price ID
- [ ] `STRIPE_PRICE_PRO_YEARLY` = Pro plan yearly price ID
- [ ] `STRIPE_PRICE_BUSINESS_MONTHLY` = Business plan monthly price ID (if offering)
- [ ] `STRIPE_PRICE_ENTERPRISE_MONTHLY` = Enterprise plan monthly price ID (if offering)
- [ ] `OVERAGE_RATE_USD` = Metered billing rate (e.g., "0.001" for $0.001/execution)
- [ ] `STRIPE_METER_ID` = Stripe meter ID for usage-based billing

#### Required: Cron Security
- [ ] `CRON_SECRET` = Random secret for `/api/cron/*` endpoints (fail-closed when missing)

#### Required: Rate Limiting
- [ ] `UPSTASH_REDIS_REST_URL` = Upstash Redis endpoint (https://real-snapper-134446.upstash.io)
- [ ] `UPSTASH_REDIS_REST_TOKEN` = Upstash Redis authentication token

#### Required: Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = Production Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Supabase service role key (server-side only)

#### Optional: Notifications
- [ ] `RESEND_API_KEY` = Email service (for checkout confirmations)
- [ ] `TELEGRAM_BOT_TOKEN` = Telegram bot (for founder alerts)
- [ ] `TELEGRAM_CHAT_ID` = Telegram chat ID (for founder alerts)

**How to add to Vercel:**
1. Go to **Vercel Dashboard** → Project → **Settings** → **Environment Variables**
2. Add each variable with **Production**, **Preview**, **Development** scopes as needed
3. Click **Save**
4. Trigger redeploy: **Deployments** → **Redeploy** (latest commit)

---

### Phase C: Database Migrations (Supabase)

#### Apply Billing Schema Migrations
1. Go to **Supabase Dashboard** → Your Project → **Migrations**
2. Click **Deploy** to apply all pending migrations

**Migrations to apply:**
- `20260323110000_billing_checkout_flow` (customers, subscriptions, events tables)
- `20260402_billing_quota_in_rpc` (quota calculation RPC)
- `20260523000000_billing_meter_outbox` (meter event tracking)
- `20260527000001_dsg_mcp_api_billing` (MCP subscriptions)
- `20260613000001_billing_meter_outbox_rls_and_monitoring` (RLS policies, monitoring)
- `20260629000000_create_payment_ledger` (audit trail table)
- `20260704160000_fix_payment_summary_monitoring_metrics_security_invoker` (monitoring fixes)

**Verify Migrations Applied:**
```sql
SELECT name, status FROM schema_migrations 
WHERE name LIKE '%billing%' OR name LIKE '%payment%' OR name LIKE '%meter%'
ORDER BY name DESC;
```

Expected: All 7 migrations should show `status = 'applied'`

---

### Phase D: Stripe Configuration

#### Webhook Setup
1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter:
   - **Endpoint URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe`
   - **Events:** Select these:
     - `checkout.session.completed` (order creation)
     - `invoice.payment_succeeded` (payment receipt)
     - `customer.subscription.updated` (subscription changes)
     - `customer.subscription.deleted` (cancellations)
4. Copy **Signing secret** (starts with `whsec_`)
5. Add to Vercel: `STRIPE_WEBHOOK_SECRET = <signing secret>`

#### Price Configuration
1. Go to **Stripe Dashboard** → **Products**
2. Find or create:
   - Product: **DSG Control Plane - Pro**
     - Monthly: $99/mo (copy price ID → `STRIPE_PRICE_PRO_MONTHLY`)
     - Yearly: $990/yr (copy price ID → `STRIPE_PRICE_PRO_YEARLY`)
   - Product: **DSG Control Plane - Enterprise** (if offered)
     - Monthly: $X/mo (copy price ID → `STRIPE_PRICE_ENTERPRISE_MONTHLY`)

3. Verify pricing in:
   - `lib/billing/pricing-catalog.ts` (TypeScript source of truth)
   - Supabase: `SELECT * FROM billing_plans;` (if applicable)

---

### Phase E: Deployment & Smoke Tests

#### Step 1: Deploy to Vercel
```bash
git push origin claude/dsg-revenue-layer-activation-1f9uws
# Vercel will automatically build and deploy to preview URL

# OR manually trigger:
# Vercel Dashboard → Deployments → Redeploy latest
```

#### Step 2: Verify Deployment
```bash
# Check deployment health
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check billing routes
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro"}'  # Should 401 (auth required) not 500 (error)

# Check cron availability
curl -i -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/cron/billing-sync \
  -H "Authorization: Bearer $CRON_SECRET"  # Should 401 (no auth) or 200 (success)
```

#### Step 3: Live Checkout Test
1. Visit: **https://tdealer01-crypto-dsg-control-plane.vercel.app/pricing**
2. Click "Get Started"
3. **DO NOT** use real card (use Stripe test card):
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/35`
   - CVC: `123`
4. Verify:
   - Checkout session created (check Stripe Dashboard → Payments)
   - Webhook received (check Stripe Dashboard → Developers → Webhooks → Events)
   - Order in Supabase: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;`

#### Step 4: Monitor Cron Jobs
1. Vercel Dashboard → **Crons** tab
2. Verify these run on schedule:
   - `/api/cron/billing-sync` — every 5 minutes
   - `/api/cron/flush-meter-outbox` — every 5 minutes
   - `/api/cron/reconcile-meter` — daily 4 AM UTC

3. Check logs:
   ```bash
   vercel logs [production-url] --source function
   ```

---

## ✅ Pre-Launch Checklist

### Stripe Configuration
- [ ] Live account created at https://stripe.com
- [ ] API keys copied (Secret Key: `rk_live_...`)
- [ ] Webhook endpoint configured and receiving events
- [ ] Pricing tiers created (Pro, Business, Enterprise as needed)
- [ ] Test webhook delivered successfully (check Events page)

### Vercel Environment
- [ ] All 8+ env vars added to Production environment
- [ ] Deployment shows "Ready" status
- [ ] No build errors in build logs
- [ ] Function logs available and clean

### Database (Supabase)
- [ ] All 7 billing migrations applied
- [ ] Schema verified: `billing_customers`, `billing_subscriptions`, `orders`, etc.
- [ ] RLS policies active (check Security → Policies)
- [ ] Service role has INSERT/UPDATE/SELECT on billing tables

### Live Testing
- [ ] Checkout route responds (401 without auth is OK)
- [ ] Webhook endpoint receives test event
- [ ] Cron jobs fire on schedule (check logs)
- [ ] Test order appears in database
- [ ] Email notification sent (if RESEND_API_KEY set)

### Documentation
- [ ] Revenue activation docs updated
- [ ] Team notified of go-live
- [ ] Customer communication ready (email template, announcement)
- [ ] Incident response plan in place (what if webhook fails?)

---

## 🚨 Rollback Plan

**If checkout breaks in production:**

1. **Immediate:** Set maintenance mode
   ```bash
   # Redirect pricing → "Maintenance" page
   # Update next.config.js redirects
   ```

2. **Debug:** Check logs
   ```bash
   vercel logs [url] --since 1h
   # Look for: STRIPE_SECRET_KEY errors, Webhook signature errors
   ```

3. **Revert:** If code issue
   ```bash
   git revert <commit-hash>
   git push origin main
   # Vercel redeploys automatically
   ```

4. **Restore:** If config issue
   ```bash
   # Vercel Dashboard → Environment Variables
   # Verify STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET are set
   # Redeploy latest: Deployments → Redeploy
   ```

5. **Notify:** Send status update
   - Slack: #revenue-activation
   - Customer: "We're working on checkout issues, ETA 1 hour"

---

## 📊 Success Metrics (Post-Launch)

| Metric | Target | Monitor |
|--------|--------|---------|
| Checkout success rate | >95% | Stripe Dashboard → Payments |
| Webhook delivery | 100% | Stripe → Webhooks → Events |
| Order sync latency | <5 min | Supabase logs, billing-sync function |
| Cron job reliability | 100% | Vercel Crons, Function logs |
| Customer acquisition | 1/day | Supabase: `SELECT COUNT(*) FROM users WHERE created_at > NOW() - '1 day'::interval;` |
| Revenue | $99+ | Stripe Dashboard → Income |

---

## 🔐 Security Verification

Before launch, verify:

- [ ] `.env.local` is in `.gitignore` (never committed)
- [ ] No secrets in commit history: `git log --all -S "sk_test_" -S "whsec_"`
- [ ] STRIPE_SECRET_KEY uses production key (rk_live_...) not test (sk_test_...)
- [ ] Webhook signature validation active in code
- [ ] CRON_SECRET is random and strong (min 32 chars)
- [ ] Rate limiting enabled (20 req/min on checkout)
- [ ] RLS policies prevent unauthorized access to billing data

---

## 📞 Escalation Path

**During Launch Issues:**
1. **First 10 min:** Check Vercel logs for deployment errors
2. **10-30 min:** Check Stripe Dashboard for webhook failures
3. **30+ min:** Check Supabase logs for database connectivity
4. **> 1 hour:** Page on-call engineer

**Post-Launch Monitoring:**
- Slack: #billing-alerts (configured by MONITORING_SLACK_WEBHOOK if set)
- Stripe Dashboard: Real-time payment monitoring
- Vercel Analytics: Function execution times

---

## 📅 Timeline

| Date | Time | Action | Owner | Status |
|------|------|--------|-------|--------|
| 2026-07-19 | 15:00 | Phase 1-4 testing | Claude Code | ✅ DONE |
| 2026-07-20 | 09:00 | Env vars setup in Vercel | DevOps | → NEXT |
| 2026-07-20 | 10:00 | DB migrations applied | DevOps | → NEXT |
| 2026-07-20 | 11:00 | Webhook configured | Finance | → NEXT |
| 2026-07-20 | 12:00 | Live checkout test | Product | → NEXT |
| 2026-07-20 | 14:00 | First customer invite | Sales | → NEXT |
| 2026-07-21 | 09:00 | Monitor first payment | Finance | → NEXT |

---

**Generated:** 2026-07-19  
**Target Deployment:** 2026-07-20 12:00 UTC  
**Target First Revenue:** 2026-07-21 23:59 UTC
