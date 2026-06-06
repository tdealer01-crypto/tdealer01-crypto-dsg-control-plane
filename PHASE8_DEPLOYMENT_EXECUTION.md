# Phase 8: Deployment Execution Guide (Step-by-Step)
## From PR #700 Merge → Production Green

**Target**: Get Stripe App deployed to Vercel and green ✅

---

## Pre-Deployment Checklist (Before Starting)

### 1. **Verify PR Merge** (Required first)
```bash
# Switch to main branch
git checkout main

# Verify PR #700 is merged
git log --oneline -5
# Should show: "feat: Complete Stripe App integration (9 phases) - Setup to Marketplace Ready"

# Pull latest
git pull origin main
```

### 2. **Verify Stripe Credentials** (Get from Stripe Dashboard)
```
Required:
□ Stripe Live API Key (sk_live_...)
□ Stripe Live Publishable Key (pk_live_...)
□ OAuth Client ID (from Stripe Dashboard → Apps → OAuth)
□ OAuth Client Secret (same location)
□ Webhook Signing Secret (whsec_live_...)

Save these — you'll need them for Vercel environment setup
```

### 3. **Verify Supabase Credentials** (Get from Supabase Dashboard)
```
Required:
□ Supabase Project URL (https://xxx.supabase.co)
□ Supabase Service Role Key (supabase_service_role_key_xxx)
□ Database Password (saved from project creation)

Save these securely
```

### 4. **Verify Upstash Redis** (Get from Upstash Dashboard)
```
Required:
□ Upstash Redis URL (redis://default:xxx@...)
□ Upstash Redis Token (if auth required)

Optional but recommended for cache performance
```

---

## Deployment Steps (Execute in Order)

### **STEP 1: Setup Vercel Project** (5-10 minutes)

```bash
# 1. Go to Vercel Dashboard
# https://vercel.com/dashboard

# 2. Click "Add New" → "Project"
# 3. Import Repository: tdealer01-crypto-dsg-control-plane
# 4. Deploy Settings:
#    - Framework: Next.js
#    - Root Directory: . (current directory)
#    - Build Command: npm run build
#    - Output Directory: .next
#    - Install Command: npm ci

# 5. Click "Deploy" (initial deploy will happen)
#    Wait for build to complete (usually 2-3 minutes)
```

**Verify**: Initial deploy should either ✅ pass or show 🔴 missing env vars error (that's OK, we'll fix it)

---

### **STEP 2: Setup Environment Variables in Vercel** (10-15 minutes)

Go to **Vercel Dashboard → Project → Settings → Environment Variables**

Add these 11 variables:

```
STRIPE_API_KEY=sk_live_[YOUR_LIVE_API_KEY]
STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_LIVE_PUBLISHABLE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_live_[YOUR_WEBHOOK_SIGNING_SECRET]
STRIPE_OAUTH_CLIENT_ID=[YOUR_OAUTH_CLIENT_ID]
STRIPE_OAUTH_CLIENT_SECRET=[YOUR_OAUTH_CLIENT_SECRET]

SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
SUPABASE_ANON_KEY=[PUBLIC_ANON_KEY from Supabase]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY from Supabase]

UPSTASH_REDIS_URL=redis://default:[TOKEN]@[HOST]:[PORT]

DSG_API_KEY=[YOUR_DSG_CONTROL_PLANE_API_KEY]
```

**Important**: 
- ✅ Select "Production" environment for these variables
- ✅ Do NOT check "Encrypt" unless Vercel asks (Vercel encrypts by default)
- ❌ Never paste secrets in Slack, email, or commit messages

**Verify**: All 11 variables show in the list ✅

---

### **STEP 3: Trigger Rebuild in Vercel** (5 minutes)

Go to **Vercel Dashboard → Project → Deployments**

Click on the latest deployment → Click "Redeploy" button

This will rebuild with all environment variables.

**Watch the build log**:
```
✅ Build starts
✅ npm ci completes
✅ npm run typecheck completes
✅ npm run build completes
✅ Deployment successful
```

**If build fails**: 
- Check build log for error (usually missing env vars or TypeScript errors)
- Fix in this order:
  1. Missing env var → Add to Vercel
  2. TypeScript error → Check IMPLEMENTATION_GUIDANCE.md Phase 5
  3. Network error → Contact Vercel support

---

### **STEP 4: Setup Supabase Database** (15-20 minutes)

```bash
# 1. Install Supabase CLI (one-time)
npm install -g supabase

# 2. Link to your Supabase project
supabase link --project-ref [YOUR_PROJECT_REF]
# (Get PROJECT_REF from Supabase Dashboard → Settings → General)

# 3. Run migrations
supabase migrations list
# Should show all pending migrations

# 4. Push migrations to production
supabase db push
# Or use Supabase Dashboard → SQL Editor to run manually:
# - Copy content from supabase/migrations/20260606185643_stripe_app_tables.sql
# - Paste into SQL Editor
# - Click Execute

# 5. Verify tables exist
supabase db tables
# Should show:
# - stripe_app_accounts
# - stripe_operation_policies
# - stripe_operation_audits
```

**Verify RLS Policies**:
```bash
supabase policies list
# Should show policies for each table
```

---

### **STEP 5: Configure Stripe Webhook Endpoint** (5 minutes)

Go to **Stripe Dashboard → Webhooks → Add Endpoint**

```
Webhook URL: https://[YOUR_VERCEL_URL]/api/stripe/webhook/events
Events to send:
  ✓ charge.created
  ✓ charge.updated
  ✓ payout.created
  ✓ payout.updated
  ✓ refund.created

Click "Add endpoint"
```

**Copy Signing Secret**:
- Stripe will display the webhook signing secret
- Add to Vercel as `STRIPE_WEBHOOK_SECRET=whsec_live_...`

---

### **STEP 6: Configure Stripe OAuth** (5 minutes)

Go to **Stripe Dashboard → Settings → OAuth**

```
Redirect URIs:
  https://[YOUR_VERCEL_URL]/api/stripe/oauth/callback
  https://[YOUR_VERCEL_URL]/stripe/oauth/callback

Save settings
```

**Verify OAuth Credentials**:
```bash
echo $STRIPE_OAUTH_CLIENT_ID    # Should print client ID
echo $STRIPE_OAUTH_CLIENT_SECRET # Should print client secret
```

---

### **STEP 7: Verify Production Deployment** (5-10 minutes)

```bash
# Test health endpoint
curl -s https://[YOUR_VERCEL_URL]/api/health | jq

# Expected response:
{
  "status": "ok",
  "environment": "production",
  "database": "connected",
  "redis": "connected"
}

# If database or redis shows "disconnected":
# - Check environment variables in Vercel
# - Check Supabase project status
# - Check Upstash Redis status
```

---

### **STEP 8: Test API Endpoint** (5 minutes)

```bash
# Get DSG API key from your Control Plane
DSG_KEY="[YOUR_DSG_CONTROL_PLANE_API_KEY]"

# Test policy list endpoint
curl -s \
  -H "Authorization: Bearer $DSG_KEY" \
  https://[YOUR_VERCEL_URL]/api/stripe/policies/list | jq

# Expected response:
{
  "policies": [],
  "total": 0,
  "page": 1
}

# If you get 401 Unauthorized:
# - Check DSG_API_KEY is correct
# - Verify Authorization header is "Bearer [KEY]"
```

---

### **STEP 9: Send Test Webhook** (5 minutes)

```bash
# Method 1: Use Stripe CLI (if available locally)
stripe trigger charge.created --stripe-account=acct_live_[YOUR_ACCOUNT]

# Method 2: Use Stripe Dashboard Webhook Testing
# Go to Stripe Dashboard → Webhooks → [Your endpoint]
# Click "Send test event" → Choose charge.created → Send

# Verify webhook arrived:
# - Check Vercel logs: Deployments → [Latest] → Runtime logs
# - Should see webhook processed
# - Should see audit trail entry in Supabase

# Verify in Supabase:
# - Go to Supabase Dashboard → SQL Editor
# - Run: SELECT * FROM stripe_operation_audits LIMIT 1;
# - Should show the test event
```

---

### **STEP 10: Final Status Check** (5 minutes)

Run this verification script:

```bash
#!/bin/bash
# save as verify-deployment.sh

VERCEL_URL="https://[YOUR_VERCEL_URL]"
DSG_KEY="[YOUR_DSG_API_KEY]"

echo "=== DEPLOYMENT VERIFICATION ==="
echo ""

# 1. Health check
echo "1. Health Check:"
curl -s $VERCEL_URL/api/health | jq .status
echo ""

# 2. Policies endpoint
echo "2. Policies Endpoint:"
curl -s -H "Authorization: Bearer $DSG_KEY" \
  $VERCEL_URL/api/stripe/policies/list | jq '.total'
echo ""

# 3. Audit endpoint
echo "3. Audit Endpoint:"
curl -s -H "Authorization: Bearer $DSG_KEY" \
  $VERCEL_URL/api/stripe/audit/operations | jq '.total'
echo ""

echo "=== IF ALL SHOWS GREEN, DEPLOYMENT SUCCESSFUL ==="
```

---

## Deployment Status Matrix

| Component | Check | Status | Fix |
|-----------|-------|--------|-----|
| Vercel Build | `npm run build` success | ✅/🔴 | See build log |
| Environment Variables | All 11 present | ✅/🔴 | Add missing vars |
| Supabase Connection | Health endpoint `database: connected` | ✅/🔴 | Check Supabase project |
| Redis Connection | Health endpoint `redis: connected` | ✅/🔴 | Check Upstash URL/token |
| Stripe Webhook | Webhook endpoint receives events | ✅/🔴 | Configure in Stripe Dashboard |
| OAuth Config | Redirect URIs registered | ✅/🔴 | Add in Stripe Dashboard |
| API Routes | All 5 endpoints responding | ✅/🔴 | Check route implementation |

---

## Troubleshooting

### Error: "Cannot find module @dsg-platform/sdk"
```
Cause: Workspace package not found
Fix: Ensure stripe-app package.json has: "@dsg-platform/sdk": "workspace:*"
     Run: npm install
```

### Error: "Supabase connection timeout"
```
Cause: Project paused or network issue
Fix:  1. Check Supabase Dashboard → Project Status
     2. Verify SUPABASE_URL is correct
     3. Test locally: psql $SUPABASE_URL -c "SELECT 1"
```

### Error: "Invalid Stripe webhook signature"
```
Cause: Wrong webhook secret
Fix:  1. Get correct secret from Stripe Dashboard → Webhooks
     2. Update Vercel environment variable
     3. Trigger redeploy
```

### Error: "DSG API call failed (401)"
```
Cause: Missing or wrong DSG_API_KEY
Fix:  1. Verify DSG_API_KEY in Vercel
     2. Check it's your actual control plane API key
     3. Ensure Authorization header format: "Bearer [KEY]"
```

### Build takes >5 minutes
```
Cause: Cold build or dependency issues
Fix:  1. Check for large dependencies (npm install size)
     2. Reduce node_modules with: npm ci --only=production
     3. Consider splitting into smaller builds
```

---

## Success Criteria (All Must Be Green ✅)

- ✅ Vercel deployment shows "Ready"
- ✅ `npm run build` completes successfully
- ✅ Health endpoint returns `"database": "connected"`
- ✅ Health endpoint returns `"redis": "connected"`
- ✅ Stripe webhook endpoint configured and receiving events
- ✅ OAuth redirect URIs registered in Stripe
- ✅ All 7 API routes respond to requests
- ✅ Test webhook creates audit trail entry in Supabase
- ✅ Policy list endpoint returns empty list (no policies yet)

---

## Post-Deployment (Once Green ✅)

Once all checks are green:

1. **Update DSG Control Plane**: Register Stripe App URL in your control plane settings
2. **Start Phase 5 Implementation**: Implement API handlers (see IMPLEMENTATION_GUIDANCE.md)
3. **Start Phase 7 Testing**: Populate test stubs with fixtures
4. **Monitor Logs**: Watch Vercel logs for any runtime errors

---

## Reference

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Dashboard**: https://app.supabase.com
- **Upstash Console**: https://console.upstash.com
- **Implementation Guide**: IMPLEMENTATION_GUIDANCE.md
- **Deployment Checklist**: DEPLOYMENT_CHECKLIST.md

---

**Execution Time**: ~1 hour (10 steps × 5-10 minutes each)

**Next**: Monitor logs for 24 hours, then proceed with Phase 5 implementation

https://claude.ai/code/session_01TSwfdBaYLgXoNfRy2W1Uhq
