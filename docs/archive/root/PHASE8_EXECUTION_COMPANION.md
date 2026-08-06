# Phase 8: Deployment Execution Companion
## Complete Step-by-Step Guide with Ready-to-Run Commands

**Estimated Duration:** 2-4 hours  
**Branch:** `claude/stripe-apps-cli-setup-1UnVr`  
**Status:** All code + guides ready ✅

---

## 📋 PRE-EXECUTION CHECKLIST

Before you start, gather these credentials:

```bash
# From Stripe Dashboard → API Keys
STRIPE_API_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx

# From Stripe Dashboard → Apps → OAuth
STRIPE_OAUTH_CLIENT_ID=ca_xxxxxxxxxxxx
STRIPE_OAUTH_CLIENT_SECRET=xxxxxxxxxxxx

# From Stripe Dashboard → Webhooks
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxx

# From Supabase Dashboard → Settings → API
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxx

# From Upstash Console (optional but recommended)
UPSTASH_REDIS_URL=redis://default:xxxxxxxxxxxx@xxxxxxxxxxxx:xxxxx

# From DSG Control Plane
DSG_API_KEY=dsg_xxxxxxxxxxxx
```

---

## ⏱️ TIMELINE: T-0 TO LAUNCH

### **T-24 Hours: Preparation**
- [ ] Gather all credentials (see above)
- [ ] Verify Stripe account is live (not test mode)
- [ ] Verify Supabase project exists
- [ ] Read `docs/DEPLOYMENT_VERCEL_SETUP.md`
- [ ] Read `docs/PHASE8_COMPLETION_CHECKLIST.md`

### **T-4 Hours: Environment Setup**

#### Step 1: Validate Environment Variables

```bash
# Create a temporary .env.local file (DO NOT COMMIT)
cat > .env.local << 'EOF'
STRIPE_API_KEY=sk_live_[YOUR_KEY]
STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_KEY]
STRIPE_WEBHOOK_SECRET=whsec_live_[YOUR_KEY]
STRIPE_OAUTH_CLIENT_ID=[YOUR_CLIENT_ID]
STRIPE_OAUTH_CLIENT_SECRET=[YOUR_CLIENT_SECRET]
SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
UPSTASH_REDIS_URL=redis://default:[TOKEN]@[HOST]:[PORT]
DSG_API_KEY=[YOUR_DSG_KEY]
NODE_ENV=production
EOF

# Validate the .env file exists and has all required keys
./scripts/setup-vercel-env.sh .env.local
```

**Expected Output:**
```
✓ All required environment variables present
✓ Stripe API key format valid (sk_live_)
✓ Supabase URL format valid
✓ DSG API key present
```

---

### **T-2 Hours: Build Verification**

#### Step 2: Verify Build Works Locally

```bash
# Install dependencies
npm ci

# TypeCheck
npm run typecheck

# Build for production
npm run build
```

**Expected Output:**
```
✓ Compiled successfully in 62s
```

If build fails:
```bash
# Check for TypeScript errors
npm run typecheck 2>&1 | grep "error TS"

# See full build output
npm run build 2>&1 | tail -50
```

---

### **T-1 Hour: Pre-Flight Checks**

#### Step 3: Local Health Checks

```bash
# Start local dev server in background
npm run dev &
DEV_PID=$!

# Give it 10 seconds to start
sleep 10

# Test local health endpoint
curl -s http://localhost:3000/api/health | jq .

# Stop dev server
kill $DEV_PID
```

**Expected Output:**
```json
{
  "status": "ok",
  "environment": "development",
  "database": "check_manually",
  "redis": "check_manually"
}
```

---

## 🚀 MAIN EXECUTION: T-0 TO T+1H

### **T-0: Deploy to Vercel**

#### Step 4: Create Vercel Project

**Manual Action (Via Web Browser):**

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import repository: `tdealer01-crypto-dsg-control-plane`
4. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `.` (current)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm ci`
5. Click "Deploy"
6. Wait for initial deploy (2-3 minutes)

**Note:** Initial deploy will fail due to missing env vars (that's OK, we'll add them next)

---

#### Step 5: Add Environment Variables in Vercel

**Manual Action (Via Web Browser):**

1. In Vercel Dashboard, go to your project
2. Click "Settings" → "Environment Variables"
3. Add these 11 variables (select "Production" for each):

```
STRIPE_API_KEY = sk_live_[YOUR_KEY]
STRIPE_PUBLISHABLE_KEY = pk_live_[YOUR_KEY]
STRIPE_WEBHOOK_SECRET = whsec_live_[YOUR_KEY]
STRIPE_OAUTH_CLIENT_ID = [YOUR_CLIENT_ID]
STRIPE_OAUTH_CLIENT_SECRET = [YOUR_CLIENT_SECRET]
SUPABASE_URL = https://[YOUR_PROJECT].supabase.co
SUPABASE_ANON_KEY = [YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY = [YOUR_SERVICE_ROLE_KEY]
UPSTASH_REDIS_URL = redis://default:[TOKEN]@[HOST]:[PORT]
DSG_API_KEY = [YOUR_DSG_KEY]
NODE_ENV = production
```

4. Click "Save"

---

#### Step 6: Trigger Rebuild

**Manual Action (Via Web Browser):**

1. In Vercel Dashboard, go to "Deployments"
2. Click the latest deployment
3. Click "Redeploy" button
4. Watch build log (should complete in 60-90 seconds)

**Expected:**
```
✓ Build starts
✓ npm ci completes
✓ npm run typecheck completes
✓ npm run build completes
✓ Deployment successful → Ready
```

**If build fails:**
```bash
# Check the exact error in Vercel build logs
# Common issues:
# 1. Missing env var → Add to Vercel Settings
# 2. TypeScript error → Check npm run typecheck output
# 3. Network error → Contact Vercel support
```

---

#### Step 7: Get Your Vercel URL

```bash
# After deployment is Ready, copy from Vercel Dashboard
# Format: https://[project-name].[team].vercel.app
VERCEL_URL="https://your-app-xxxxx.vercel.app"

# Save for next steps
echo "VERCEL_URL=$VERCEL_URL" >> .env.local
```

---

### **T+10 Min: Configure Stripe Webhooks**

#### Step 8: Create Webhook Endpoint

**Manual Action (Via Web Browser):**

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL:
   ```
   https://[YOUR_VERCEL_URL]/api/stripe/webhook/events
   ```
4. Select events:
   - ✓ charge.created
   - ✓ charge.updated
   - ✓ payout.created
   - ✓ payout.updated
   - ✓ refund.created
5. Click "Add endpoint"
6. Stripe shows signing secret (copy it)

**Update .env.local:**
```bash
# Replace the old webhook secret
sed -i "s/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=whsec_live_[NEW_SECRET]/" .env.local
```

---

### **T+15 Min: Configure Stripe OAuth**

#### Step 9: Register OAuth Redirect URIs

**Manual Action (Via Web Browser):**

1. Go to https://dashboard.stripe.com/settings/oauth
2. Add Redirect URIs:
   ```
   https://[YOUR_VERCEL_URL]/api/stripe/oauth/callback
   https://[YOUR_VERCEL_URL]/stripe/oauth/callback
   ```
3. Click "Save"

---

### **T+20 Min: Setup Supabase Database**

#### Step 10: Apply Database Migrations

```bash
# Install Supabase CLI (one-time)
npm install -g supabase

# Link to your Supabase project
# Get PROJECT_REF from: https://app.supabase.com → Settings → General
supabase link --project-ref [YOUR_PROJECT_REF]

# List pending migrations
supabase migrations list
# Should show: 20260606185643_stripe_app_tables.sql (pending)

# Apply migrations
supabase db push
# Confirms: 1 migration pushed successfully

# Verify tables created
supabase db tables
```

**Expected:**
```
stripe_app_accounts
stripe_operation_policies
stripe_operation_audits
```

---

### **T+30 Min: Verify Deployment**

#### Step 11: Run Health Checks

```bash
# Set your Vercel URL
VERCEL_URL="https://your-app-xxxxx.vercel.app"

# 1. Health endpoint
curl -s $VERCEL_URL/api/health | jq .

# Expected:
# {
#   "status": "ok",
#   "environment": "production",
#   "database": "connected",
#   "redis": "connected"
# }

# 2. Readiness endpoint
curl -s $VERCEL_URL/api/readiness | jq .

# 3. Agent status
curl -s $VERCEL_URL/api/agent/status | jq .
```

**If endpoints don't respond:**
```bash
# Check Vercel logs
# 1. Go to Vercel Dashboard
# 2. Click "Deployments" → Latest
# 3. Click "Runtime logs"
# 4. Look for errors

# Common issues:
# - "Cannot find module" → Missing env var
# - "ECONNREFUSED database" → Supabase URL wrong
# - "Unauthorized" → DSG_API_KEY wrong
```

---

#### Step 12: Test Stripe Webhook

```bash
# Option A: Using Stripe Dashboard
# 1. Go to https://dashboard.stripe.com/webhooks
# 2. Click your endpoint
# 3. Click "Send test event"
# 4. Select "charge.created"
# 5. Click "Send event"
# Wait 5 seconds

# Option B: Using CLI
stripe trigger charge.created --stripe-account=acct_live_[YOUR_ACCOUNT]

# Verify webhook was received
curl -s -H "Authorization: Bearer $DSG_API_KEY" \
  $VERCEL_URL/api/stripe/audit/operations | jq '.operations[0]'
```

**Expected:**
```json
{
  "id": "audit_xxx",
  "stripe_account_id": "acct_live_xxx",
  "operation_type": "charge",
  "dsg_decision": "ALLOW",
  "created_at": "2026-06-06T20:30:00Z"
}
```

---

### **T+45 Min: Test API Endpoints**

#### Step 13: Test All Routes

```bash
DSG_API_KEY="[YOUR_DSG_API_KEY]"
VERCEL_URL="https://your-app-xxxxx.vercel.app"

# Test 1: Policies List (requires auth)
curl -s -H "Authorization: Bearer $DSG_API_KEY" \
  $VERCEL_URL/api/stripe/policies/list | jq '.total'
# Expected: 0 (empty, no policies yet)

# Test 2: Audit Log (requires auth)
curl -s -H "Authorization: Bearer $DSG_API_KEY" \
  $VERCEL_URL/api/stripe/audit/operations | jq '.total'
# Expected: >= 1 (at least the test webhook)

# Test 3: Approvals (requires auth)
curl -s -H "Authorization: Bearer $DSG_API_KEY" \
  $VERCEL_URL/api/stripe/approvals/pending | jq '.total'
# Expected: 0 (no pending approvals)

# Test 4: OAuth Start
curl -s $VERCEL_URL/api/stripe/oauth/start | jq '.authorization_url'
# Expected: Stripe OAuth authorization URL
```

---

### **T+50 Min: Final Verification**

#### Step 14: Run GO-NO-GO Check

```bash
# Run automated verification
./scripts/go-no-go-check.sh $VERCEL_URL

# Expected output:
# ✓ Health endpoint: OK (response time: 245ms)
# ✓ Readiness endpoint: OK
# ✓ Stripe webhook endpoint: OK
# ✓ OAuth endpoint: OK
# ✓ Policies endpoint: OK
# ✓ Audit endpoint: OK
# ✓ Security headers: Present
# ✓ HTTPS: Enforced
# ✓ All latency targets met
#
# GO DECISION: ✅ GREEN - Ready for launch
```

---

#### Step 15: Run Smoke Tests

```bash
# Option A: Bash script (fast)
./scripts/smoke-test-suite.sh $VERCEL_URL $DSG_API_KEY
# Runs 15 tests in 30-60 seconds

# Option B: Vitest (comprehensive)
SMOKE_TEST_URL=$VERCEL_URL SMOKE_TEST_TOKEN=$DSG_API_KEY \
  npm run test tests/smoke/deployment.test.ts
```

---

## ✅ POST-DEPLOYMENT: T+1H ONWARD

### Step 16: Monitor for Issues

```bash
# Set up continuous monitoring
watch -n 60 'curl -s $VERCEL_URL/api/health | jq .'
# Runs health check every 60 seconds

# Check logs in Vercel
# 1. Vercel Dashboard → Deployments → Latest
# 2. Click "Runtime logs"
# 3. Watch for errors
```

---

### Step 17: Record Success Metrics

```bash
# Create success record
cat > PHASE8_SUCCESS.txt << 'EOF'
✅ Phase 8 Deployment Complete

Date: $(date)
Vercel URL: $VERCEL_URL
Build Status: Ready
Health Check: PASS
Webhook Test: PASS
API Tests: PASS
GO-NO-GO Status: GREEN

Next: Phase 9 - Stripe App Marketplace Registration
EOF

cat PHASE8_SUCCESS.txt
```

---

## 🚨 TROUBLESHOOTING

### Health Endpoint Returns "database: disconnected"

```bash
# Check Supabase connection
curl -s https://[YOUR_PROJECT].supabase.co/rest/v1/

# Verify env vars in Vercel
# Settings → Environment Variables → Check all 11 present

# Verify migrations applied
supabase migrations list
```

### Webhook Not Received

```bash
# Check webhook URL
# Vercel Dashboard → Settings → Environment Variables
# Verify STRIPE_WEBHOOK_SECRET is correct

# Test webhook signature
./scripts/test-stripe-webhook.sh \
  --url $VERCEL_URL/api/stripe/webhook/events \
  --secret $STRIPE_WEBHOOK_SECRET \
  --dry-run
```

### OAuth Redirect Fails

```bash
# Verify redirect URIs in Stripe Dashboard
# https://dashboard.stripe.com/settings/oauth
# Must match exactly:
#   https://[YOUR_VERCEL_URL]/api/stripe/oauth/callback
#   https://[YOUR_VERCEL_URL]/stripe/oauth/callback

# Test OAuth flow
curl -s "$VERCEL_URL/api/stripe/oauth/start" | jq '.authorization_url'
```

### Build Fails on Vercel

```bash
# Check build logs
# 1. Vercel Dashboard → Deployments
# 2. Click failed deployment
# 3. Click "Build logs"
# 4. Look for error

# Common fixes:
# - Missing env var: Add to Settings → Environment Variables
# - TypeScript error: npm run typecheck locally
# - Timeout: Check large dependencies
```

---

## 📊 PHASE 8 SUCCESS CRITERIA

All these must be ✅ GREEN before moving to Phase 9:

- [ ] Vercel deployment shows "Ready"
- [ ] `npm run build` completes without errors
- [ ] Health endpoint returns all "connected"
- [ ] Stripe webhook endpoint configured + test received
- [ ] OAuth redirect URIs registered
- [ ] Supabase migrations applied (tables exist)
- [ ] All 11 environment variables present in Vercel
- [ ] Audit trail entry created in Supabase
- [ ] DSG API integration working
- [ ] Security headers validated
- [ ] GO-NO-GO check returns GREEN

---

## 📋 QUICK REFERENCE

| Action | Command |
|--------|---------|
| Validate env vars | `./scripts/setup-vercel-env.sh .env.local` |
| Health check | `curl -s $VERCEL_URL/api/health \| jq .` |
| Full verification | `./scripts/deployment-verification.sh $VERCEL_URL` |
| GO-NO-GO decision | `./scripts/go-no-go-check.sh $VERCEL_URL` |
| Run smoke tests | `./scripts/smoke-test-suite.sh $VERCEL_URL $DSG_API_KEY` |
| Test webhook | `./scripts/test-stripe-webhook.sh --dry-run` |
| Check Vercel logs | Vercel Dashboard → Deployments → Latest → Runtime logs |
| Check Supabase | https://app.supabase.com → SQL Editor |

---

## ✨ NEXT STEPS

**After Phase 8 SUCCESS (GO-NO-GO = GREEN):**

1. Proceed to Phase 9: Stripe App Marketplace Registration
2. Read `docs/DEPLOYMENT_STRIPE_MARKETPLACE_REGISTRATION.md`
3. Submit app for review (2-4 week wait)
4. Launch to Stripe App Marketplace

**Estimated Phase 8 Total Time:** 2-4 hours  
**Estimated Phase 9 Total Time:** 4 weeks (Stripe review period)

---

**Status:** All code ready, all guides complete, ready to deploy! 🚀

Reference: https://claude.ai/code/session_01TSwfdBaYLgXoNfRy2W1Uhq
