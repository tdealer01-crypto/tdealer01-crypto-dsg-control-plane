# DSG Stripe App - Deployment Guide

**Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**Target Audience**: DevOps engineers, deployment engineers

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Stripe App Deployment](#stripe-app-deployment)
6. [Database Setup](#database-setup)
7. [Verification](#verification)
8. [Rollback](#rollback)
9. [Troubleshooting](#troubleshooting)
10. [Monitoring Setup](#monitoring-setup)

---

## Deployment Overview

### Architecture

```
┌─────────────────────────────────────┐
│       Stripe Marketplace            │
│  (Distribution)                     │
└─────────────────────────────────────┘
              │
              │ Installation & Webhooks
              │
┌─────────────────────────────────────┐
│   Vercel (dsg-stripe-app)           │
│  - API Routes                        │
│  - OAuth Handler                     │
│  - Webhook Receiver                  │
│  - Policy Evaluator                  │
└────────────┬────────────────────────┘
             │
             │ Database Queries
             │
┌────────────▼────────────────────────┐
│  Supabase (Database)                │
│  - Policies                          │
│  - Audit Trail                       │
│  - Accounts                          │
└─────────────────────────────────────┘
             │
             │ Cache Queries
             │
┌────────────▼────────────────────────┐
│  Upstash Redis (Cache)              │
│  - Policies                          │
│  - Sessions                          │
└─────────────────────────────────────┘
```

### Deployment Sequence

1. **Prepare**: Collect credentials and environment variables
2. **Build**: Create production build locally
3. **Deploy Vercel**: Push to Vercel, add secrets
4. **Setup Database**: Apply migrations, create indexes
5. **Deploy Stripe**: Register app, deploy manifest
6. **Verify**: Run health checks and smoke tests
7. **Monitor**: Setup error tracking and analytics

---

## Prerequisites

### Required Accounts & Access

1. **Vercel Account**
   - Verified email
   - CLI access
   - Project creation permission

2. **Stripe Account**
   - Live or test mode enabled
   - API keys generated
   - Webhook signing secret created

3. **Supabase Project**
   - Database created
   - Service role key
   - Migrations applied

4. **Upstash Account**
   - Redis database created
   - REST endpoint configured

5. **Sentry Account** (optional)
   - Project created
   - DSN generated

### Required Tools

```bash
# Install Vercel CLI
npm install -g vercel

# Install Stripe CLI
brew install stripe/stripe-cli/stripe   # macOS
# or download from https://stripe.com/docs/stripe-cli

# Verify installations
vercel --version
stripe --version
npm --version
```

### Required Credentials

Gather the following **before deployment**:

```
STRIPE_SECRET_KEY              # sk_live_xxx or sk_test_xxx
STRIPE_WEBHOOK_SECRET          # whsec_xxx
STRIPE_APP_CLIENT_ID           # ca_xxxxx
STRIPE_APP_CLIENT_SECRET       # [secret]
DSG_API_KEY                    # [api-key]
DSG_API_URL                    # https://tdealer01-crypto-dsg-control-plane.vercel.app
SUPABASE_URL                   # https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY      # [service-role-key]
UPSTASH_REDIS_REST_URL         # https://[db].upstash.io
UPSTASH_REDIS_REST_TOKEN       # [token]
SENTRY_DSN                     # https://[key]@sentry.io/[project] (optional)
```

---

## Environment Setup

### Step 1: Create .env.production File

Copy the template and fill in actual values:

```bash
cd packages/stripe-app

# Copy template
cp .env.production.example .env.production

# Edit with your credentials (NEVER commit this file)
nano .env.production
```

**File: .env.production**
```bash
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET
STRIPE_APP_CLIENT_ID=ca_YOUR_ACTUAL_ID
STRIPE_APP_CLIENT_SECRET=YOUR_ACTUAL_SECRET
DSG_API_KEY=YOUR_ACTUAL_KEY
DSG_API_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
UPSTASH_REDIS_REST_URL=https://YOUR_DB.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN
NODE_ENV=production
LOG_LEVEL=info
```

**Important**: 
- Never commit `.env.production`
- Add to `.gitignore` (already done)
- Store securely, only accessible to deployment team

### Step 2: Verify Credentials

```bash
# Test Stripe key
stripe api-key-info --api-key sk_live_xxx

# Test Supabase connection
curl -i https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Test Upstash connection
curl https://YOUR_DB.upstash.io/ping \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Vercel Deployment

### Step 1: Login to Vercel

```bash
vercel login
# Follow prompts to authenticate
```

### Step 2: Create Vercel Project

```bash
cd packages/stripe-app

vercel --prod
# Follow prompts:
# ? Set up and deploy "stripe-app"? YES
# ? Which scope? [Your Organization]
# ? Link to existing project? NO
# ? What's your project name? dsg-stripe-app
# ? In which directory is your code? ./
# ? Want to modify vercel.json? NO
```

### Step 3: Add Environment Variables

Option A: Via Vercel Dashboard
```
1. Go to https://vercel.com/dashboard
2. Select project: dsg-stripe-app
3. Go to Settings → Environment Variables
4. Add each variable from .env.production
5. Select "Production" environment
6. Click "Save"
```

Option B: Via Vercel CLI
```bash
vercel env add STRIPE_SECRET_KEY
# Enter value when prompted

vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_APP_CLIENT_ID
vercel env add STRIPE_APP_CLIENT_SECRET
vercel env add DSG_API_KEY
vercel env add DSG_API_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add SENTRY_DSN  # Optional

# Verify
vercel env list
```

### Step 4: Trigger Deployment

```bash
# Option A: Deploy current branch
vercel --prod

# Option B: Deploy from git push
git push origin main
# (if Vercel is connected to GitHub)

# Check deployment status
vercel list
vercel status
```

**Expected output**:
```
✓ Project dsg-stripe-app deployed successfully
  Production: https://dsg-stripe-app.vercel.app
  Git: https://github.com/dsg-pics/tdealer01-crypto-dsg-control-plane.git
```

### Step 5: Verify Vercel Deployment

```bash
# Health check
curl https://dsg-stripe-app.vercel.app/api/health
# Expected: { "status": "healthy", "version": "1.0.0" }

# Readiness check
curl https://dsg-stripe-app.vercel.app/api/readiness
# Expected: { "ready": true, ... }

# Check function logs
vercel logs https://dsg-stripe-app.vercel.app
```

---

## Database Setup

### Step 1: Apply Migrations

```bash
# Navigate to repo root
cd /path/to/tdealer01-crypto-dsg-control-plane

# Apply migrations using Supabase CLI
supabase migration up --project-id YOUR_PROJECT_ID

# Or via Supabase Dashboard:
# 1. Go to https://app.supabase.com
# 2. Select project
# 3. Go to SQL Editor
# 4. Run migration scripts from supabase/migrations/
```

**Migrations to apply**:
1. `001_create_stripe_accounts.sql`
2. `002_create_governance_policies.sql`
3. `003_create_operation_audit.sql`
4. `004_create_pending_reviews.sql`
5. `005_create_decision_proofs.sql`
6. `006_create_indexes.sql`
7. `007_create_rls_policies.sql`

### Step 2: Create Indexes

```sql
-- From Supabase SQL Editor, run:

CREATE INDEX IF NOT EXISTS idx_policies_account_priority 
  ON governance_policies(stripe_account_id, priority);

CREATE INDEX IF NOT EXISTS idx_audit_account_date 
  ON operation_audit(stripe_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_decision 
  ON operation_audit(decision);

CREATE INDEX IF NOT EXISTS idx_pending_status 
  ON pending_reviews(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proofs_hash 
  ON decision_proofs(proof_hash);

CREATE INDEX IF NOT EXISTS idx_proofs_parent 
  ON decision_proofs(parent_proof_hash);
```

### Step 3: Enable RLS

```sql
-- Enable RLS on all tables
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_proofs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (see ARCHITECTURE.md for details)
```

### Step 4: Verify Database

```bash
# Connect to Supabase database
psql postgresql://[user]:[password]@[host]/[database]

# Check tables exist
\dt

# Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'governance_policies';

# Check row counts
SELECT COUNT(*) FROM governance_policies;
SELECT COUNT(*) FROM operation_audit;
```

---

## Stripe App Deployment

### Step 1: Create Stripe App Account

```
1. Go to https://dashboard.stripe.com/apps
2. Click "Create an app"
3. Fill in:
   App Name: DSG Governance Gate
   Description: Pre-execution governance gates for Stripe operations
   Category: Compliance
   Support Email: t.dealer01@dsg.pics
   Website: https://dsg.pics
   Icon: Upload 300x300 PNG
4. Save
```

### Step 2: Configure OAuth

```
In Stripe Dashboard → Apps → [Your App] → OAuth Settings:

Client ID: [auto-generated, e.g., ca_xxxxx]
Client Secret: [Generate via dashboard]

Redirect URIs:
  https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback
  https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
```

### Step 3: Create Stripe Webhook

```
In Stripe Dashboard → Webhooks:

1. Click "Add endpoint"
2. Endpoint URL: https://dsg-stripe-app.vercel.app/api/stripe-app/webhook/events
3. Version: Latest stable API version
4. Events to send:
   - charge.succeeded
   - charge.failed
   - charge.dispute.created
   - charge.refunded
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payout.created
   - payout.failed
   - refund.created
5. Click "Create endpoint"
6. Copy Signing secret
7. Update STRIPE_WEBHOOK_SECRET environment variable:
   vercel env add STRIPE_WEBHOOK_SECRET whsec_xxx
```

### Step 4: Deploy Stripe App Manifest

Update `stripe-app.json`:

```json
{
  "app_id": "com.governance.dsg",
  "name": "DSG Governance Gate",
  "allowed_redirect_uris": [
    "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback",
    "https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback"
  ],
  "ui_extension": {
    "content_security_policy": {
      "connect-src": [
        "https://dsg-stripe-app.vercel.app/",
        "https://tdealer01-crypto-dsg-control-plane.vercel.app/"
      ]
    }
  }
}
```

Deploy:

```bash
stripe login
stripe apps deploy

# Verify
stripe apps list
```

---

## Verification

### Step 1: Health Checks

```bash
# API health
curl https://dsg-stripe-app.vercel.app/api/health
# Expected: HTTP 200, { "status": "healthy" }

# Readiness
curl https://dsg-stripe-app.vercel.app/api/readiness
# Expected: { "ready": true, "checks": { "database": "ok", ... } }

# Test account endpoint
curl -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  https://dsg-stripe-app.vercel.app/api/stripe-app/account
# Expected: HTTP 200, account details
```

### Step 2: Webhook Test

```bash
# Send test event via Stripe CLI
stripe trigger charge.succeeded \
  --stripe-account acct_YOUR_ACCOUNT \
  --api-key sk_test_YOUR_KEY

# Check webhook delivery in Stripe Dashboard
# (should see successful delivery)
```

### Step 3: OAuth Flow Test

```bash
# 1. Navigate to authorize endpoint
curl -X GET \
  "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://your-app.com/callback&scope=charge_read"

# 2. Should redirect to Stripe login
# 3. After login, should redirect to callback with code
# 4. Exchange code for token via callback handler
```

### Step 4: Policy Evaluation Test

```bash
curl -X POST https://dsg-stripe-app.vercel.app/api/stripe-app/gateway/evaluate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_account_id": "acct_YOUR_ACCOUNT",
    "operation": {
      "type": "charge.create",
      "action": "charge_write"
    },
    "context": {
      "amount_cents": 10000,
      "currency": "usd"
    }
  }'

# Expected: HTTP 200, { "decision": "ALLOW" | "REVIEW" | "BLOCK", ... }
```

### Step 5: Audit Trail Test

```bash
curl "https://dsg-stripe-app.vercel.app/api/stripe-app/audit/operations?stripe_account_id=acct_YOUR_ACCOUNT" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: HTTP 200, list of operations
```

---

## Rollback

### Rollback Vercel Deployment

```bash
# View deployments
vercel list

# Rollback to previous
vercel rollback

# Or deploy specific commit
git checkout <commit-sha>
npm run build
vercel --prod --force
```

### Rollback Database

```bash
# List migrations
supabase migration list --project-id YOUR_PROJECT_ID

# Rollback last migration
supabase migration down --project-id YOUR_PROJECT_ID

# Or via Supabase Dashboard:
# 1. SQL Editor
# 2. Run rollback script
```

---

## Troubleshooting

### Issue: Deployment Fails with "Command Timeout"

**Cause**: npm install taking too long

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Retry deploy
vercel --prod --force
```

### Issue: Health Check Returns 503

**Cause**: Database or Redis not accessible

**Solution**:
1. Verify Supabase connection:
   ```bash
   curl https://YOUR_PROJECT.supabase.co/rest/v1/
   ```
2. Verify Upstash connection:
   ```bash
   curl https://YOUR_DB.upstash.io/ping
   ```
3. Check environment variables are set:
   ```bash
   vercel env list
   ```
4. Redeploy:
   ```bash
   vercel --prod --force
   ```

### Issue: Webhook Signature Validation Fails

**Cause**: STRIPE_WEBHOOK_SECRET mismatch

**Solution**:
1. Get correct secret from Stripe Dashboard:
   - Webhooks → [Your Endpoint] → Signing Secret
2. Update environment variable:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET whsec_CORRECT_VALUE
   ```
3. Redeploy:
   ```bash
   vercel --prod
   ```

### Issue: OAuth Redirect URI Mismatch

**Cause**: Redirect URI in Stripe settings doesn't match code

**Solution**:
1. Get registered URI from Stripe Dashboard:
   - Apps → OAuth Settings
2. Update in stripe-app.json:
   ```json
   "allowed_redirect_uris": [
     "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback"
   ]
   ```
3. Redeploy:
   ```bash
   stripe apps deploy
   ```

### Issue: Database Connection Pool Exhausted

**Cause**: Too many concurrent connections

**Solution**:
1. Increase Vercel function memory:
   - vercel.json → functions → memory: 1024
2. Reduce concurrent deployments:
   - Vercel Dashboard → Settings → Deployments
3. Use connection pooling:
   - Supabase → Project Settings → Connection Pooling

---

## Monitoring Setup

### Step 1: Enable Vercel Analytics

```bash
# Analytics is enabled by default
# View in Vercel Dashboard → Analytics

# Metrics:
# - Function execution time
# - Memory usage
# - Error rates
# - Request distribution
```

### Step 2: Configure Sentry (Optional)

```bash
# Install Sentry
npm install @sentry/node

# Add to environment variables
vercel env add SENTRY_DSN https://YOUR_DSN@sentry.io/PROJECT

# Add to code (already done in handler)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1
});
```

### Step 3: Configure Supabase Monitoring

```
1. Go to Supabase Dashboard → [Project] → SQL Editor
2. Query performance:
   SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC;
3. Table sizes:
   SELECT 
     tablename, 
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables;
4. Slow queries:
   SET log_min_duration_statement = 1000; -- Log queries > 1s
```

### Step 4: Setup Alerts

**Vercel**:
1. Dashboard → Project Settings → Alerts
2. Configure for:
   - Deployment failure
   - High error rate
   - High latency

**Supabase**:
1. Database → Logs → Query Performance
2. Set threshold: > 100ms query time

**Sentry**:
1. Alerts → Create Alert Rule
2. Configure for:
   - Error spike
   - Critical errors
   - Performance degradation

---

## Production Checklist

- [ ] All credentials gathered and verified
- [ ] .env.production created (not committed)
- [ ] Vercel project created
- [ ] Environment variables added to Vercel
- [ ] Vercel deployment successful
- [ ] Health check passing
- [ ] Database migrations applied
- [ ] Database indexes created
- [ ] RLS policies enabled
- [ ] Stripe app account created
- [ ] OAuth credentials configured
- [ ] Webhook endpoint created and verified
- [ ] Stripe app manifest deployed
- [ ] Webhook test event processed successfully
- [ ] OAuth flow tested
- [ ] Gateway evaluation endpoint tested
- [ ] Audit trail recording verified
- [ ] Sentry configured (optional)
- [ ] Vercel Analytics enabled
- [ ] Supabase monitoring setup
- [ ] Alerts configured
- [ ] Runbook created
- [ ] Team trained on deployment

---

## Quick Reference

### Common Commands

```bash
# Deploy
vercel --prod

# View logs
vercel logs https://dsg-stripe-app.vercel.app

# Add environment variable
vercel env add VAR_NAME

# List environments
vercel env list

# View project settings
vercel project info

# View deployments
vercel list

# Rollback
vercel rollback
```

### Useful URLs

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Console**: https://app.supabase.com
- **Upstash Console**: https://console.upstash.com
- **Sentry Dashboard**: https://sentry.io/organizations/YOUR_ORG

---

**Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**Status**: Production Ready
