# Phase 8 Quick Start Guide — DSG ONE Control Plane

**Goal:** Deploy DSG ONE / ProofGate Control Plane to production on Vercel in 3 organized phases.

**Time estimate:** 45 minutes (manual steps) + 10 minutes (automated verification)

---

## Quick 3-Step Summary

| Phase | Action | Time | Manual/Automated |
|-------|--------|------|------------------|
| **Phase 1** | Gather credentials & create `.env.local` | 10 min | Manual |
| **Phase 2** | Deploy to Vercel & set env vars | 20 min | Manual + Automated |
| **Phase 3** | Run migrations & verify endpoints | 15 min | Automated |

---

## Phase 1: Credential Gathering (10 min)

**Goal:** Collect all 11 required credentials and create `.env.local` for local testing.

### Collect These 11 Credentials

Open these services and save credentials to a secure file:

1. **Supabase** (https://supabase.com/dashboard)
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` — Project → Settings → API → Project URL
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project → Settings → API → anon public key
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` — Project → Settings → API → service_role secret key

2. **Stripe** (https://dashboard.stripe.com)
   - [ ] `STRIPE_SECRET_KEY` — Developers → API keys → Secret key (starts with `sk_`)
   - [ ] `STRIPE_WEBHOOK_SECRET` — Webhooks → Create/View endpoint details → Signing secret

3. **Upstash Redis** (https://console.upstash.com)
   - [ ] `UPSTASH_REDIS_REST_URL` — Database → REST API → URL
   - [ ] `UPSTASH_REDIS_REST_TOKEN` — Database → REST API → Token

4. **Resend** (https://resend.com/api-keys)
   - [ ] `RESEND_API_KEY` — API Keys → Copy any token

5. **App Identity**
   - [ ] `CRON_SECRET` — Generate: `openssl rand -hex 32`

6. **Stripe Price IDs** (https://dashboard.stripe.com/products)
   - [ ] `STRIPE_PRICE_PRO` — Product → Pro pricing tier → Price ID (starts with `price_`)
   - [ ] `STRIPE_PRICE_BUSINESS` — Product → Business pricing tier → Price ID

### Create `.env.local`

```bash
# Copy from .env.example
cp .env.example .env.local

# Edit and fill in all 11 values:
nano .env.local
# or
code .env.local
```

### Verify Credentials

```bash
# Check .env.local syntax (should not print any errors)
bash -n .env.local

# Verify key formats
grep "NEXT_PUBLIC_SUPABASE_URL=" .env.local
grep "STRIPE_SECRET_KEY=" .env.local
grep "STRIPE_WEBHOOK_SECRET=" .env.local
grep "CRON_SECRET=" .env.local
```

### Next: Phase 2

---

## Phase 2: Deploy to Vercel (20 min)

**Goal:** Push code to `main`, trigger Vercel deployment, and set all 11 credentials in production environment.

### 2.1 Push Code to Main

```bash
git checkout main
git pull origin main

# If you made local changes, commit or stash them
git status

# Push to main (Vercel will auto-deploy)
git push origin main
```

### 2.2 Monitor Vercel Deployment

Go to **Vercel Dashboard → Project → Deployments**

- [ ] Deployment status changes to **Ready** (wait 3-5 minutes)
- [ ] Note the **Production URL** (usually `https://tdealer01-crypto-dsg-control-plane.vercel.app`)

### 2.3 Set Environment Variables in Vercel

**Important:** Set these in **Vercel Dashboard → Project Settings → Environment Variables** with **Scope: Production**.

Use the **11 credentials** from Phase 1 above. Add one by one or use the CLI:

```bash
# Option A: Via Vercel Dashboard (safer, visual)
# Go to Project Settings → Environment Variables
# Click "Add" and fill in each value
# Scope: Production

# Option B: Via Vercel CLI (faster)
npm install -g vercel
vercel login

# Set each var (replace VALUES with actual credentials)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add RESEND_API_KEY production
vercel env add STRIPE_PRICE_PRO production
vercel env add STRIPE_PRICE_BUSINESS production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add APP_URL production
vercel env add DSG_CORE_MODE production

# Verify all vars are set
vercel env ls production
```

### 2.4 Trigger Rebuild

**Option A:** In Vercel Dashboard
- Go to **Deployments → Latest deployment → Redeploy**

**Option B:** Via CLI
```bash
vercel --prod
```

### 2.5 Verify Deployment is Ready

```bash
# Wait for status to change to "Ready" in Vercel Dashboard
# Then test health endpoint:

curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
# Expected: { "ok": true, ... }
```

If health check fails, see **Troubleshooting** section below.

### Next: Phase 3

---

## Phase 3: Verify & Activate (15 min)

**Goal:** Run Supabase migrations, verify all endpoints, and confirm GO status.

### 3.1 Run Supabase Migrations

```bash
# Prerequisite: Supabase CLI installed
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations to production
supabase db push

# Alternative: Manual SQL in Supabase Dashboard
# Go to SQL Editor, copy each file from supabase/migrations/ in order
```

### 3.2 Set Supabase Auth URLs (Manual)

In **Supabase Dashboard → Authentication → URL Configuration**:

- [ ] **Site URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- [ ] **Redirect URLs:** Add `https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm`

### 3.3 Configure Stripe Webhook (Manual)

In **Stripe Dashboard → Webhooks**:

1. Create new endpoint for `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook`
2. Select events: `customer.subscription.*`, `invoice.payment_action_required`, `meter.error_occurred`
3. Copy **Signing secret** → Set as `STRIPE_WEBHOOK_SECRET` in Vercel (done in Phase 2)

### 3.4 Run Automated Verification

```bash
# Test all endpoints (requires Vercel production URL)
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app

# Full deployment verification
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Smoke test suite
./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
```

### 3.5 Test First Login (Manual)

```bash
open https://tdealer01-crypto-dsg-control-plane.vercel.app/login
# or
termux-open-url https://tdealer01-crypto-dsg-control-plane.vercel.app/login
```

1. Click **Start Free Trial** tab
2. Enter test email (from secure vault)
3. Enter workspace name: `DSG Ops`
4. Click **Start free trial**
5. Check email for magic link → click to confirm

---

## GO / NO-GO Decision Framework

### GO Checklist (All Required)

- [ ] Vercel deployment status: **Ready**
- [ ] `curl /api/health` returns `ok: true`
- [ ] `curl /api/readiness` returns `status: ready`
- [ ] `curl /api/agent/status` returns deployed commit info
- [ ] Supabase migrations applied successfully
- [ ] Stripe webhook created and signing secret set
- [ ] Supabase auth URLs configured
- [ ] First login succeeds (email magic link works)
- [ ] `npm run go:no-go <url>` passes with 0 failures

### NO-GO Indicators (Any of These = STOP)

- [ ] Vercel deployment stuck in `Error` state
- [ ] Health checks return HTTP 500 or `ok: false`
- [ ] Supabase migrations failed
- [ ] Missing critical environment variables (check `/api/readiness`)
- [ ] Stripe webhook verification fails
- [ ] Email magic link not working (check Resend API key)

---

## Quick Reference: All Scripts

| Script | Purpose | Run When |
|--------|---------|----------|
| `npm run go:no-go <url>` | Full production gate check | Before claiming GO status |
| `./scripts/deployment-verification.sh <url>` | Detailed verification report | Troubleshooting deployment |
| `./scripts/smoke-test-suite.sh <url>` | API endpoint smoke tests | After Vercel rebuild |
| `npm run test` | Unit & integration tests | Before committing code |
| `npm run build` | Verify Next.js build succeeds | Before deploying |

---

## Troubleshooting Quick Links

### Issue: Deployment Stuck in `Error` State

**Check 1: Missing Supabase Public Keys**
```bash
# These MUST be set in Vercel for build to succeed
vercel env ls production | grep NEXT_PUBLIC_SUPABASE

# Add if missing:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

**Check 2: Unverified Commit (GitHub)**
```bash
# Verify commit is signed in GitHub web UI
# If not, either:
# 1. Disable "Require verified commits" in Vercel (Project Settings → Git)
# 2. Create new commit from verified account
# 3. Use GitHub Actions manual deployment bypass
```

### Issue: Health Endpoint Returns Error

```bash
# Get full readiness report
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .

# Check which checks are failing:
# - env: environment variables missing?
# - supabaseServiceRole: wrong service role key?
# - nextAuthSecret: NEXTAUTH_SECRET not set?

# Compare with your Vercel env vars:
vercel env ls production
```

### Issue: Magic Link Email Not Working

```bash
# Verify RESEND_API_KEY is set
vercel env ls production | grep RESEND

# Check Resend dashboard for delivery status
# Go to https://resend.com/emails

# Verify Supabase email auth is enabled
# Supabase → Authentication → Providers → Email (should be ON)
```

### Issue: Stripe Webhook Not Receiving Events

```bash
# Verify webhook was created in Stripe Dashboard
# Go to Webhooks → Find endpoint → Check status

# Verify signing secret matches
vercel env ls production | grep STRIPE_WEBHOOK_SECRET

# Check Vercel Function Logs for webhook errors
# Vercel Dashboard → Function Logs → Filter for stripe/webhook

# Check Stripe webhook history for failed attempts
```

---

## Environment Variable Checklist

### Required Now (13 vars)

| Variable | Scope | From |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Supabase |
| `STRIPE_SECRET_KEY` | Production | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Production | Stripe |
| `STRIPE_PRICE_PRO` | Production | Stripe |
| `STRIPE_PRICE_BUSINESS` | Production | Stripe |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash |
| `RESEND_API_KEY` | Production | Resend |
| `CRON_SECRET` | Production | Generated |
| `NEXT_PUBLIC_APP_URL` | Production | Manual: `https://tdealer01-crypto-dsg-control-plane.vercel.app` |
| `APP_URL` | Production | Manual: `https://tdealer01-crypto-dsg-control-plane.vercel.app` |
| `DSG_CORE_MODE` | Production | Manual: `internal` |

### Optional (Set Later)

- `ANTHROPIC_API_KEY` — Only for advanced agent features
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET` — Only for GitHub integration

---

## What's Next After GO?

1. **Smoke test production:** `npm run go:no-go <production-url>`
2. **Create first agent** in dashboard
3. **Test execution flow** with a simple policy
4. **Monitor logs** for errors: Vercel Function Logs
5. **Document any custom policies** in your org wiki

---

## Timeline Estimate

| Phase | Step | Time |
|-------|------|------|
| 1 | Gather credentials | 5 min |
| 1 | Create `.env.local` | 5 min |
| 2 | Push to main | 2 min |
| 2 | Wait for Vercel deployment | 5 min |
| 2 | Set env vars in Vercel | 8 min |
| 2 | Trigger rebuild | 3 min |
| 3 | Run Supabase migrations | 3 min |
| 3 | Configure Stripe webhook (manual) | 5 min |
| 3 | Verify endpoints | 5 min |
| 3 | Test first login | 3 min |
| **Total** | | **47 min** |

---

## Support & Escalation

| Issue | Check First | Escalate To |
|-------|-------------|-------------|
| Vercel deployment failing | `docs/RUNBOOK_DEPLOY.md` | Vercel Support |
| Supabase auth broken | `docs/OPERATOR_SETUP_CHECKLIST.md` | Supabase Support |
| Stripe webhook not delivering | Stripe webhook dashboard | Stripe Support |
| Email not sending | Resend dashboard logs | Resend Support |
| Can't login after setup | `docs/RUNBOOK_DEPLOY.md` Step 6 | Check SMTP in Supabase |

---

## Detailed Guides (Bookmarks)

- **Full deployment runbook:** `docs/RUNBOOK_DEPLOY.md`
- **Operator setup checklist:** `docs/OPERATOR_SETUP_CHECKLIST.md`
- **Vercel env setup guide:** `docs/VERCEL_ENV_SETUP.md`
- **Manual vs automated steps:** `docs/PHASE8_MANUAL_VS_AUTOMATED.md`
- **Scripts reference:** `scripts/SCRIPTS_REFERENCE.md`
- **Phase 8 interactive checklist:** `scripts/phase8-setup-checklist.txt`

---

**Last Updated:** 2026-06-07  
**Status:** Setup-Ready  
**GO Claim Boundary:** Requires live evidence from all verification steps above.
