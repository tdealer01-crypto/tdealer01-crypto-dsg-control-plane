# Environment Variables Setup Checklist

Complete this checklist to properly configure the system for development and production.

## Pre-Setup (Everyone)

- [ ] Read `docs/ENV_SETUP_COMPLETE.md` for full documentation
- [ ] Understand which environment you're setting up (dev vs production)
- [ ] Ensure you have access to required credentials (Supabase, Stripe, etc.)

---

## Development Setup (.env.local)

### Step 1: Prepare Credentials

**Supabase Project:**
- [ ] Create Supabase project at https://supabase.com/dashboard
- [ ] Get Project URL from Settings → API
- [ ] Get Anon Key from Settings → API
- [ ] Get Service Role Key from Settings → API (keep secret!)

**Stripe (Test Mode):**
- [ ] Go to Stripe Dashboard → Developers → API keys
- [ ] Use **Test** (not Live) secret key for development
- [ ] Create test prices for each plan:
  - [ ] Pro monthly
  - [ ] Pro yearly
  - [ ] Business monthly
  - [ ] Business yearly
  - [ ] Enterprise monthly
  - [ ] Enterprise yearly
  - [ ] Meter for overage billing
- [ ] Copy price IDs (format: `price_1Tn...`)

**Anthropic:**
- [ ] Get API key from https://console.anthropic.com/dashboard/api-keys
- [ ] Ensure account has available credits

**GitHub:**
- [ ] Go to https://github.com/settings/tokens
- [ ] Create new token with `repo` + `user` scopes
- [ ] Copy token (save it somewhere safe)

**Other Services (Optional):**
- [ ] **Resend**: Get API key from https://resend.com/api-keys (email)
- [ ] **Telegram**: Get bot token from @BotFather, chat ID from @userinfobot (optional)

### Step 2: Create .env.local

```bash
# Copy template
cp .env.example .env.local

# Edit with your test credentials
nano .env.local
```

**Minimum values to fill in:**
```env
# Supabase (test project)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key

# Stripe (test mode keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
STRIPE_METER_EVENT_NAME=dsg_execution_overage
STRIPE_METER_ID=meter_...

# Cron (use any secure random string)
CRON_SECRET=your-secure-random-string-here

# AI
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...

# App URLs (for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Auth (any random string for local dev)
NEXTAUTH_SECRET=your-random-secret

# Optional but recommended
RESEND_API_KEY=re_...
MARKETING_OUTREACH_MODE=queue
```

### Step 3: Verify Setup

```bash
# Run verification script
./scripts/verify-env-setup.sh

# Check for missing REQUIRED variables
npm run typecheck

# Run tests
npm run test

# Start development server
npm run dev
```

### Step 4: Verify Runtime

```bash
# In another terminal, test endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/readiness

# Check agent status
curl http://localhost:3000/api/agent/status
```

**Success indicators:**
- [ ] `npm run dev` starts without "Missing Supabase" error
- [ ] `/api/health` returns `{"ok":true}`
- [ ] `/api/readiness` returns status information
- [ ] No console errors about missing env vars

---

## Production Setup (Vercel)

### Step 1: Prepare Production Credentials

**Critical:** Use **production** (not test) credentials for production environment.

**Supabase Production Project:**
- [ ] Create production Supabase project (separate from dev)
- [ ] Save Project URL, Anon Key, Service Role Key

**Stripe Live Account:**
- [ ] Ensure Stripe account is activated for live payments
- [ ] Use **Live** (not Test) secret key
- [ ] Create live products and prices:
  - [ ] DSG Pro (monthly + yearly)
  - [ ] DSG Business (monthly + yearly)
  - [ ] DSG Enterprise (monthly + yearly)
  - [ ] DSG Execution Overage (metered)
- [ ] Copy live price IDs

**Webhook Configuration:**
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Create endpoint: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/billing/webhook`
- [ ] Subscribe to events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `usage_record_summary.reported`
- [ ] Copy webhook signing secret

**Other Production Credentials:**
- [ ] Anthropic API key (production account with active billing)
- [ ] GitHub token (with sufficient scopes)
- [ ] Resend API key (if using email notifications)
- [ ] Cron secret (use secure random string)
- [ ] Telegram credentials (optional)

### Step 2: Set Environment Variables in Vercel

**Using the setup script (recommended):**

```bash
# 1. Set your .env.local with production values (or just the credentials you have)
nano .env.local

# 2. Set Vercel token
export VERCEL_TOKEN="your-vercel-token-from-https://vercel.com/account/tokens"

# 3. Run setup script (dry run first)
./scripts/set-vercel-env.sh production --dry-run

# 4. Verify output looks correct, then run for real
./scripts/set-vercel-env.sh production
```

**OR manually via CLI:**

```bash
npx vercel login
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... repeat for all required variables
npx vercel env ls production  # Verify
```

**OR via Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable for `Production` environment

### Step 3: Verify Environment Variables in Vercel

```bash
# List all production env vars
npx vercel env ls production

# Should include all CRITICAL and REQUIRED vars (see ENV_SETUP_COMPLETE.md)
```

### Step 4: Deploy

```bash
# Option 1: Push to main (if Git integration enabled)
git push origin main

# Option 2: Deploy directly
npx vercel --prod
```

### Step 5: Verify Production Deployment

```bash
# Health check
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Readiness check (includes all dependencies)
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness

# Agent status
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

**Success indicators:**
- [ ] `/api/health` returns `{"ok":true}`
- [ ] `/api/readiness` shows all systems ready
- [ ] Vercel deployment shows "Ready" status
- [ ] No error logs in Vercel Functions
- [ ] Stripe webhook shows successful endpoint connection

---

## Production Activation (Revenue Track A)

After environment variables are configured, complete these steps to activate revenue:

### Step 1: Apply Supabase Migrations
- [ ] Run: `supabase db push --linked` (or apply via Supabase dashboard)
- [ ] Specifically apply: `20260703150000_outreach_approvals.sql`

### Step 2: Verify Stripe Webhook
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Confirm endpoint URL is: `/api/billing/webhook`
- [ ] Status shows "Enabled" and recent "Sent" events
- [ ] Remove any old `/api/stripe/webhook` endpoints if present

### Step 3: Test Checkout Flow
- [ ] Create test subscription: `POST /api/billing/checkout` (test mode)
- [ ] Confirm Stripe session creates
- [ ] Check Supabase `billing_customers` table for entry
- [ ] Check webhook logs for event processing

### Step 4: Verify Cron Jobs
- [ ] Manually trigger one cron with: `curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/...`
- [ ] Check logs for successful execution
- [ ] Verify data written to database

### Step 5: Enable Marketing Outreach
- [ ] Confirm `MARKETING_OUTREACH_MODE=queue` is set
- [ ] Test email sending: post to `/api/email/send` (if available)
- [ ] Verify email appears (or check Resend logs if email disabled)

---

## Safety Checks

### Before Going Live
- [ ] `.env.local` is in `.gitignore` and not committed ✓
- [ ] No secrets hardcoded in source code ✓
- [ ] Production keys are different from test keys ✓
- [ ] Webhook endpoint is verified in Stripe ✓
- [ ] All CRITICAL variables are set ✓
- [ ] Supabase migrations are applied ✓
- [ ] Health/readiness endpoints return 200 ✓

### Ongoing
- [ ] Monitor `/api/health` for availability (use monitoring tool)
- [ ] Check webhook logs for processing issues (Stripe Dashboard)
- [ ] Review error logs in Vercel (Functions → Logs)
- [ ] Test checkout flow monthly
- [ ] Rotate API keys quarterly

---

## Troubleshooting

### "Missing Supabase public environment variables"
- [ ] Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Verify Vercel production env vars are set (`npx vercel env ls production`)
- [ ] Rebuild: `npx vercel --prod`

### "Cron endpoint returns 401/503"
- [ ] Verify `CRON_SECRET` is set
- [ ] Use exact secret in Authorization header: `Bearer $CRON_SECRET`
- [ ] Check Vercel Functions logs for errors

### "Webhook signature verification failed"
- [ ] Confirm `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- [ ] Verify endpoint URL matches exactly: `/api/billing/webhook`
- [ ] Check webhook logs in Stripe for error details

### "Stripe checkout fails with missing price ID"
- [ ] Verify all `STRIPE_PRICE_*` variables are set
- [ ] Ensure price IDs are from **same** Stripe account as `STRIPE_SECRET_KEY`
- [ ] Test with: `curl -s https://.../api/billing/checkout | jq .`

### "API key invalid or rate limited"
- [ ] Verify API key hasn't expired
- [ ] Check billing status on respective service (Anthropic, GitHub, Stripe)
- [ ] Wait 60 seconds before retrying

---

## Related Documentation

- [ENV_SETUP_COMPLETE.md](./ENV_SETUP_COMPLETE.md) — Full variable reference
- [docs/revenue/TRACK_A_ACTIVATION_STATUS.md](./revenue/TRACK_A_ACTIVATION_STATUS.md) — Revenue activation steps
- [docs/PACKAGES_PRICING_MARKETPLACE_STRIPE_2026-06-20.md](./PACKAGES_PRICING_MARKETPLACE_STRIPE_2026-06-20.md) — Pricing & Stripe mapping
- [ENVIRONMENT_SETUP_GUIDE.md](./ENVIRONMENT_SETUP_GUIDE.md) — Basic environment setup

## Support

If you encounter issues:

1. Check the relevant documentation section above
2. Review Vercel/Supabase/Stripe dashboard logs
3. Verify all env vars are set: `npx vercel env ls production`
4. Test individual endpoints with curl
5. Check console/function logs for error messages
