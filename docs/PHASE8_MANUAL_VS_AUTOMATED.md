# Phase 8: Manual vs Automated Steps

**Purpose:** Clarify which setup steps require hands-on browser/dashboard work (manual) and which can be scripted (automated).

---

## Quick Summary

| Category | Count | Time | Who |
|----------|-------|------|-----|
| **Manual Steps** (browser/dashboard) | 9 | ~20 min | You |
| **Automated Steps** (CLI/scripts) | 12 | ~10 min | Scripts |
| **Total** | 21 | ~30 min | Mixed |

---

## Manual Steps (Require Browser/Dashboard)

These steps require you to log into external dashboards and make configurations that cannot be scripted. You must complete these yourself.

### 1. Gather Supabase Credentials

**When:** Phase 1  
**Where:** https://supabase.com/dashboard  
**Time:** 2 min  
**Why Manual:** Credentials are sensitive; no safe way to automate credential retrieval.

**Steps:**
1. Go to your Supabase project
2. Click Settings → API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

**Verification:**
- [ ] All three values are visible and copied

---

### 2. Gather Stripe Credentials

**When:** Phase 1  
**Where:** https://dashboard.stripe.com  
**Time:** 3 min  
**Why Manual:** API keys are sensitive and tied to your Stripe account.

**Steps:**
1. Go to Developers → API keys
2. Copy Secret key → `STRIPE_SECRET_KEY`
3. Go to Products, find Pro and Business pricing tiers
4. Copy each price ID → `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`

**Verification:**
- [ ] Secret key starts with `sk_test_` or `sk_live_`
- [ ] Price IDs start with `price_`

---

### 3. Gather Upstash Redis Credentials

**When:** Phase 1  
**Where:** https://console.upstash.com  
**Time:** 2 min  
**Why Manual:** Sensitive credentials requiring account access.

**Steps:**
1. Go to your Upstash database
2. Click REST API
3. Copy:
   - URL → `UPSTASH_REDIS_REST_URL`
   - Token → `UPSTASH_REDIS_REST_TOKEN`

**Verification:**
- [ ] URL starts with `https://`
- [ ] Token is alphanumeric

---

### 4. Gather Resend Credentials

**When:** Phase 1  
**Where:** https://resend.com/api-keys  
**Time:** 1 min  
**Why Manual:** API keys are account-specific.

**Steps:**
1. Go to API Keys
2. Copy any token → `RESEND_API_KEY`

**Verification:**
- [ ] Token starts with `re_`

---

### 5. Set Environment Variables in Vercel

**When:** Phase 2  
**Where:** https://vercel.com/dashboard  
**Time:** 8 min  
**Why Manual:** Vercel environment variables are sensitive and tied to your project. No CLI alternative that avoids password prompt.

**Steps:**
1. Go to Project Settings → Environment Variables
2. For each of these 13 variables:
   - Click "Add"
   - Paste variable name and value
   - Set Scope to "Production"
   - Click "Save"

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_BUSINESS
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
CRON_SECRET
NEXT_PUBLIC_APP_URL
APP_URL
DSG_CORE_MODE
```

**Verification:**
- [ ] All 13 variables appear in `vercel env ls production`

**Alternative (CLI):**
```bash
# If you prefer CLI instead of web UI:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# (will prompt for value interactively)
```

---

### 6. Configure Supabase Auth URLs

**When:** Phase 3  
**Where:** https://supabase.com/dashboard  
**Time:** 2 min  
**Why Manual:** Account-specific auth configuration that cannot be scripted safely.

**Steps:**
1. Go to Authentication → URL Configuration
2. Set Site URL:
   ```
   https://tdealer01-crypto-dsg-control-plane.vercel.app
   ```
3. Add Redirect URL:
   ```
   https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm
   ```
4. Click Save

**Verification:**
- [ ] Both URLs appear in the configuration list

---

### 7. Create Stripe Webhook Endpoint

**When:** Phase 3  
**Where:** https://dashboard.stripe.com/webhooks  
**Time:** 3 min  
**Why Manual:** Webhook creation is a one-time account configuration.

**Steps:**
1. Go to Webhooks
2. Click "Create new endpoint"
3. Paste endpoint URL:
   ```
   https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook
   ```
4. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_action_required
   - meter.error_occurred
5. Click "Create endpoint"
6. Copy the Signing secret (starts with `whsec_`)

**Verification:**
- [ ] Endpoint shows "Active" status
- [ ] Signing secret is visible and copied

---

### 8. Update Stripe Webhook Secret in Vercel

**When:** Phase 3 (after creating webhook)  
**Where:** https://vercel.com/dashboard  
**Time:** 1 min  
**Why Manual:** Must use the signing secret from the newly created webhook.

**Steps:**
1. Go to Project Settings → Environment Variables
2. Find or create `STRIPE_WEBHOOK_SECRET`
3. Paste the signing secret from Step 7
4. Click Save

**Alternative (CLI):**
```bash
vercel env add STRIPE_WEBHOOK_SECRET production
# (paste signing secret when prompted)
vercel --prod  # rebuild
```

**Verification:**
- [ ] Variable appears in `vercel env ls production`

---

### 9. Test First Login

**When:** Phase 3 (final verification)  
**Where:** https://tdealer01-crypto-dsg-control-plane.vercel.app/login  
**Time:** 5 min  
**Why Manual:** Requires interactive email verification flow.

**Steps:**
1. Open https://tdealer01-crypto-dsg-control-plane.vercel.app/login
2. Click "Start Free Trial" tab
3. Enter your test email (from secure vault, NOT your GitHub email)
4. Enter workspace name: `DSG Ops`
5. Click "Start free trial"
6. Check your email inbox (may take 2-5 seconds)
7. Click the magic link in the email from noreply@resend.dev
8. Verify you're logged in to the dashboard

**Verification:**
- [ ] You see the dashboard home page
- [ ] Navigation shows: Agents, Policies, Usage, Executions, etc.
- [ ] Workspace name shows `DSG Ops`

---

## Automated Steps (CLI & Scripts)

These steps can be fully automated via command-line tools and scripts. Run them from your terminal.

### 1. Generate CRON_SECRET

**When:** Phase 1  
**Where:** Your terminal  
**Time:** < 1 min  
**Script:** `openssl rand -hex 32`

```bash
# Generate
CRON_SECRET=$(openssl rand -hex 32)
echo $CRON_SECRET

# Add to .env.local
echo "CRON_SECRET=$CRON_SECRET" >> .env.local
```

**Verification:**
- [ ] Output is 64 hex characters (0-9, a-f)

---

### 2. Create .env.local File

**When:** Phase 1  
**Where:** Repository root  
**Time:** 1 min  
**Script:** `cp .env.example .env.local`

```bash
# Copy template
cp .env.example .env.local

# Edit with your values (manual step)
nano .env.local

# Verify syntax
bash -n .env.local

# Verify .gitignore has it
grep .env.local .gitignore
```

**Verification:**
- [ ] File exists: `ls -la .env.local`
- [ ] No syntax errors from `bash -n`

---

### 3. Push Code to Main

**When:** Phase 2  
**Where:** Git  
**Time:** 1 min  
**Script:** Standard git commands

```bash
# Check status
git status

# If no changes, just pull
git pull origin main

# If you have changes, commit
git add <changed files>
git commit -m "Your commit message"

# Push to main
git push origin main
```

**Verification:**
- [ ] GitHub shows your commit on main branch
- [ ] Vercel auto-deployment starts (watch Deployments tab)

---

### 4. Wait for Vercel Deployment

**When:** Phase 2  
**Where:** Vercel Dashboard  
**Time:** 3-5 min (wait, no action)  
**What to do:** Watch Deployments tab

```bash
# Check status via CLI
vercel list

# Check specific deployment
vercel list --since 2026-06-07
```

**Verification:**
- [ ] Deployment status changes to "Ready" in Vercel UI
- [ ] CLI shows deployment with state "ready"

---

### 5. Verify Environment Variables in Vercel

**When:** Phase 2 (after setting vars)  
**Where:** CLI  
**Time:** < 1 min  
**Script:** `vercel env ls production`

```bash
# List all production env vars
vercel env ls production

# Count them (should be ≥ 13)
vercel env ls production | wc -l
```

**Verification:**
- [ ] All 13+ required variables appear
- [ ] No errors or timeouts

---

### 6. Trigger Vercel Rebuild

**When:** Phase 2 (after setting env vars)  
**Where:** CLI or Vercel UI  
**Time:** 3-5 min  
**Script:** `vercel --prod`

```bash
# Option A: CLI
vercel --prod

# Option B: Vercel UI
# Go to Deployments → Latest deployment → Redeploy button
```

**Verification:**
- [ ] Deployment status changes to "Ready"
- [ ] CLI outputs deployment URL

---

### 7. Test Health Endpoint

**When:** Phase 2 (after rebuild)  
**Where:** CLI  
**Time:** < 1 min  
**Script:** `curl` with jq

```bash
# Test health
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Expected output:
# {
#   "ok": true,
#   "checks": {...},
#   ...
# }
```

**Verification:**
- [ ] HTTP 200 response
- [ ] JSON contains `"ok": true`

---

### 8. Run Supabase Migrations

**When:** Phase 3  
**Where:** CLI  
**Time:** 2 min  
**Script:** Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Verify (in Supabase SQL Editor):
SELECT * FROM pg_migrations;
```

**Verification:**
- [ ] Migration command completes without errors
- [ ] Supabase SQL Editor shows ~14 migrations with status "Success"

---

### 9. Go/No-Go Gate Check

**When:** Phase 3 (final verification)  
**Where:** CLI  
**Time:** 2 min  
**Script:** `npm run go:no-go`

```bash
# Run comprehensive check
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app

# Expected output:
# ✅ /terms -> HTTP 200
# ✅ /privacy -> HTTP 200
# ✅ /api/health -> HTTP 200 ok=true
# ... (all checks should have ✅)
```

**Verification:**
- [ ] All checks pass with ✅
- [ ] No ❌ failures
- [ ] Exit code is 0

---

### 10. Deployment Verification Script

**When:** Phase 3 (detailed report)  
**Where:** CLI  
**Time:** 1 min  
**Script:** `./scripts/deployment-verification.sh`

```bash
# Run full verification
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Expected output:
# ✅ Deployment is responding (HTTP 200)
# ✅ Readiness endpoint responding
# ... (detailed checks)
# ✅ DEPLOYMENT VERIFICATION PASSED
```

**Verification:**
- [ ] Summary shows: "Passed checks > 0, Critical failures = 0"
- [ ] Final output: "✅ DEPLOYMENT VERIFICATION PASSED"

---

### 11. Smoke Test Suite

**When:** Phase 3 (optional detailed tests)  
**Where:** CLI  
**Time:** 2 min  
**Script:** `./scripts/smoke-test-suite.sh`

```bash
# Run smoke tests
./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Expected output:
# [PASS] GET /api/health
# [PASS] GET /api/readiness
# ... (more tests)
# VERIFICATION COMPLETE - All 10 tests passed
```

**Verification:**
- [ ] Summary shows: "TESTS_PASSED > 0, TESTS_FAILED = 0"
- [ ] Final output: "All tests passed" or similar

---

### 12. Run Local Tests (Optional)

**When:** Phase 3 (optional pre-commit verification)  
**Where:** CLI  
**Time:** 3 min  
**Script:** `npm run test`

```bash
# Run unit + integration tests
npm run test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

**Verification:**
- [ ] Test output shows: "PASS" or "✓" for all tests
- [ ] No failures or errors
- [ ] Exit code is 0

---

## Timeline Comparison

### Manual-Heavy Approach (Using Dashboards)

| Step | Tool | Time | Notes |
|------|------|------|-------|
| Gather credentials | Supabase, Stripe, etc. | 10 min | Manual dashboard work |
| Create .env.local | Editor | 2 min | Fill in all values manually |
| Set env vars in Vercel | Vercel UI | 10 min | Manual clicking through web form |
| Configure auth URLs | Supabase UI | 2 min | Manual |
| Create Stripe webhook | Stripe UI | 3 min | Manual |
| Push code | Git/CLI | 2 min | Automated |
| Wait for deployment | (nothing) | 5 min | Just wait |
| Run migrations | CLI | 2 min | Automated |
| Verify endpoints | CLI | 3 min | Automated |
| Test login | Browser | 5 min | Manual |
| **Total** | Mixed | ~44 min | ~30 min manual, ~14 min automated |

### CLI-Heavy Approach (Using Vercel CLI)

| Step | Tool | Time | Notes |
|------|------|------|-------|
| Gather credentials | Dashboards | 10 min | Still manual (no way around) |
| Create .env.local | Editor + CLI | 2 min | Automated with openssl |
| Set env vars in Vercel | `vercel env add` | 5 min | CLI, but still interactive for values |
| Configure auth URLs | Supabase UI | 2 min | Still manual (no API support) |
| Create Stripe webhook | Stripe UI | 3 min | Still manual (one-time) |
| Push code | Git/CLI | 2 min | Automated |
| Wait for deployment | (nothing) | 5 min | Just wait |
| Run migrations | CLI | 2 min | Automated |
| Verify endpoints | CLI scripts | 3 min | Automated |
| Test login | Browser | 5 min | Manual |
| **Total** | Mixed | ~39 min | ~25 min manual, ~14 min automated |

---

## When to Use Manual vs Automated

### Use Manual When:

1. **First-time setup** — You need to understand each step
2. **Troubleshooting** — You need to see what's actually in the dashboards
3. **Credentials gathering** — No safe way to automate credential retrieval
4. **One-time configuration** — Stripe webhook, Supabase auth URLs

### Use Automated When:

1. **Verification** — After setup, run scripts to confirm everything works
2. **Repeated deployments** — Once setup is done, `git push` + `vercel --prod` is fully automated
3. **Testing** — Use CLI scripts to verify endpoints without manual checking
4. **Monitoring** — Run `npm run go:no-go` regularly to verify production health

---

## Checklist: Manual vs Automated

### Manual Steps You Must Do

- [ ] 1. Gather 11 credentials from external services
- [ ] 2. Set 13+ env vars in Vercel Dashboard (or use `vercel env add`)
- [ ] 3. Configure Supabase auth URLs
- [ ] 4. Create Stripe webhook endpoint
- [ ] 5. Test first login via browser

**Time:** ~20 minutes

### Automated Steps You Can Script

- [ ] 1. Generate CRON_SECRET: `openssl rand -hex 32`
- [ ] 2. Create .env.local: `cp .env.example .env.local`
- [ ] 3. Push to main: `git push origin main`
- [ ] 4. Wait for Vercel deployment: ~5 min (no action)
- [ ] 5. Run Supabase migrations: `supabase db push`
- [ ] 6. Verify endpoints: `npm run go:no-go <url>`
- [ ] 7. Run deployment verification: `./scripts/deployment-verification.sh <url>`
- [ ] 8. Run smoke tests: `./scripts/smoke-test-suite.sh <url>`

**Time:** ~10 minutes (or can be entirely automated in CI)

---

## Fully Automated Alternative (GitHub Actions)

If you want to automate everything except credential gathering, consider:

1. Store credentials as GitHub Secrets
2. Create GitHub Actions workflow that:
   - Sets Vercel env vars via CLI with GitHub Secrets
   - Pushes to main
   - Waits for Vercel deployment
   - Runs migrations via Supabase CLI
   - Verifies all endpoints
   - Reports pass/fail status

**Not included in this guide**, but possible future enhancement.

---

## Support Decision Tree

**I'm stuck on a manual step** → Go to the relevant dashboard (Supabase, Stripe, Vercel, Resend, Upstash) and contact their support.

**I'm stuck on an automated step** → Check the script output, review `PHASE8_QUICK_START.md` troubleshooting section, or escalate to the team.

**I'm not sure if a step is done** → Run the verification scripts:
- `npm run go:no-go <url>` — Comprehensive check
- `./scripts/deployment-verification.sh <url>` — Detailed report

---

## Key Takeaway

- **Manual steps (20 min):** Credential gathering, dashboard configuration, first login test
- **Automated steps (10 min):** Code push, migrations, endpoint verification
- **Total time:** ~30 minutes for first-time setup

After initial setup, future deployments are just:
```bash
git push origin main
vercel --prod  # optional, Git integration auto-triggers
npm run go:no-go <url>  # verify
```

---

**Last Updated:** 2026-06-07  
**Status:** Setup-Ready
