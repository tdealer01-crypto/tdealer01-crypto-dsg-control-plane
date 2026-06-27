# Phase 8: Deployment & Marketplace Registration - Complete Execution Guide

**Timeline**: 2 weeks  
**Effort**: 90% work - deployment + Stripe review process  

**Prerequisites**: Phase 7 testing complete, all tests passing

---

## Overview

Phase 8:
1. ✅ Deploy backend to Vercel
2. ✅ Create Stripe App account
3. ✅ Generate OAuth credentials
4. ✅ Submit for Stripe review (2-4 weeks)

---

## Step 1: Create Production Environment Variables

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[from Supabase]
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_...
STRIPE_CLIENT_SECRET=[from Stripe]
UPSTASH_REDIS_REST_URL=[from Upstash]
UPSTASH_REDIS_REST_TOKEN=[from Upstash]
DSG_API_BASE=https://tdealer01-crypto-dsg-control-plane.vercel.app
```

---

## Step 2: Configure Vercel Deployment

```bash
# Create vercel.json for app configuration
cat > packages/stripe-app/vercel.json << 'EOF'
{
  "name": "dsg-stripe-app",
  "version": 1,
  "public": false,
  "alias": ["dsg-stripe-app"],
  "env": {
    "STRIPE_SECRET_KEY": "@stripe-secret-key-prod",
    "STRIPE_WEBHOOK_SECRET": "@stripe-webhook-secret-prod",
    "STRIPE_CLIENT_ID": "@stripe-client-id-prod",
    "STRIPE_CLIENT_SECRET": "@stripe-client-secret-prod",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url-prod",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-prod",
    "UPSTASH_REDIS_REST_URL": "@upstash-redis-url-prod",
    "UPSTASH_REDIS_REST_TOKEN": "@upstash-redis-token-prod",
    "DSG_API_BASE": "https://tdealer01-crypto-dsg-control-plane.vercel.app"
  },
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
EOF
```

---

## Step 3: Build & Test Production Build

```bash
cd packages/stripe-app

# Build
npm run build

# Verify no errors
echo $?  # Should be 0

# Test build output
ls -la dist/

# Run type check
npm run type-check
```

---

## Step 4: Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy
vercel --env-file .env.production

# Follow prompts:
# - Project name: dsg-stripe-app
# - Framework: Next.js
# - Source: Current directory

# Get deployment URL
# https://dsg-stripe-app.vercel.app
```

---

## Step 5: Verify Deployment

```bash
# Health check
curl https://dsg-stripe-app.vercel.app/api/health

# Webhook endpoint
curl -X POST https://dsg-stripe-app.vercel.app/api/stripe-app/webhook/events \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'

# Should get 401 (invalid signature) not 500 (error)
```

---

## Step 6: Create Stripe App Account

```bash
# 1. Go to: https://dashboard.stripe.com/apps

# 2. Click "Create an app"

# 3. Fill in details:
App Name: DSG Governance Gate
Description: Pre-execution governance gates for Stripe operations with deterministic audit trails
Category: Compliance
Support Email: t.dealer01@dsg.pics
Website: https://dsg-platform.com
Icon: <upload 300x300 PNG>

# 4. Save
```

---

## Step 7: Configure OAuth

```bash
# In Stripe App Dashboard:

# OAuth Settings
Client ID: ca_xxxxx (auto-generated)
Client Secret: [Generate from dashboard]
Redirect URIs:
  - https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback
  - https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
```

---

## Step 8: Update Stripe App Manifest

```bash
cat > packages/stripe-app/stripe-app.json << 'EOF'
{
  "id": "com.governance.dsg",
  "version": "1.0.0",
  "name": "DSG Governance Gate",
  "icon": "./icon.png",
  "distribution_type": "public",
  "sandbox_install_compatible": true,
  "stripe_api_access_type": "oauth",
  "allowed_redirect_uris": [
    "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback",
    "https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback"
  ],
  "permissions": [
    {
      "permission": "charge_read",
      "purpose": "Read charge details for governance policy evaluation"
    },
    {
      "permission": "charge_write",
      "purpose": "Apply governance decisions to charge operations"
    },
    {
      "permission": "payment_intent_read",
      "purpose": "Monitor payment intents for policy compliance"
    },
    {
      "permission": "payout_read",
      "purpose": "Track payouts for governance audit trail"
    },
    {
      "permission": "refund_read",
      "purpose": "Monitor refunds for compliance evidence"
    }
  ],
  "ui_extension": {
    "views": [
      {
        "viewport": "stripe.dashboard.charge.detail",
        "component": "ChargeGate"
      },
      {
        "viewport": "stripe.dashboard.payment_intent.detail",
        "component": "PaymentIntentGate"
      },
      {
        "viewport": "stripe.dashboard.payout.detail",
        "component": "PayoutGate"
      }
    ],
    "content_security_policy": {
      "connect-src": [
        "https://dsg-stripe-app.vercel.app/",
        "https://tdealer01-crypto-dsg-control-plane.vercel.app/"
      ],
      "purpose": "Connect to DSG governance API for policy evaluation and audit recording"
    }
  },
  "post_install_action": {
    "type": "external",
    "url": "https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/onboarding"
  },
  "constants": {
    "DSG_API_BASE": "https://tdealer01-crypto-dsg-control-plane.vercel.app"
  }
}
EOF
```

---

## Step 9: Validate Manifest

```bash
stripe apps deploy --validate

# Should output: ✓ Manifest is valid
```

---

## Step 10: Deploy to Stripe

```bash
# Connect Stripe account
stripe login

# Deploy app
stripe apps deploy

# Verify deployment
stripe apps list
# Should see: com.governance.dsg (v1.0.0)
```

---

## Step 11: Create Documentation

### SETUP.md

```bash
cat > packages/stripe-app/docs/SETUP.md << 'EOF'
# DSG Governance Gate - Setup Guide

## Installation

1. Go to [Stripe App Marketplace](https://marketplace.stripe.com)
2. Search for "DSG Governance Gate"
3. Click "Install"
4. Approve permissions
5. Redirect to DSG Control Plane for setup

## Permissions

This app requests access to:
- **Read Charges**: Evaluate governance policies
- **Write Charges**: Apply governance decisions
- **Read Payment Intents**: Monitor payment flows
- **Read Payouts**: Track fund movements
- **Read Refunds**: Monitor refund operations

## Configuration

1. **Connect Account**
   - Visit Control Plane dashboard
   - Navigate to Stripe App → Connect
   - Follow OAuth flow

2. **Create Policies**
   - Define rules (amount thresholds, rate limits)
   - Set actions (Allow, Review, Block)
   - Enable policies

3. **Monitor Operations**
   - View audit trail of all gated operations
   - Approve/reject pending reviews
   - Track compliance metrics

## Support

Email: t.dealer01@dsg.pics
EOF
```

### API.md

```bash
cat > packages/stripe-app/docs/API.md << 'EOF'
# DSG Stripe App - API Reference

## Endpoints

### Webhook Events
```
POST /api/stripe-app/webhook/events
```
Receives Stripe webhook events for policy evaluation.

### Gateway Evaluation
```
POST /api/stripe-app/gateway/evaluate
```
Evaluates operation against governance policies.

Request:
```json
{
  "action": "stripe.charge.create",
  "operation_type": "charge",
  "context": {
    "stripe_account_id": "acct_xxx",
    "amount_cents": 10000,
    "currency": "usd"
  }
}
```

Response:
```json
{
  "decision": "ALLOW",
  "reason": "Amount within policy limits",
  "proof": "hash_of_decision"
}
```

### Audit Trail
```
GET /api/stripe-app/audit/operations
```
List all gated operations with decisions.

### Policies
```
GET  /api/stripe-app/policies
POST /api/stripe-app/policies/create
```
Manage governance policies.

### OAuth
```
GET  /api/stripe-app/oauth/authorize
POST /api/stripe-app/oauth/callback
```
OAuth flow for account linking.
EOF
```

### ARCHITECTURE.md

```bash
cat > packages/stripe-app/docs/ARCHITECTURE.md << 'EOF'
# DSG Governance Gate - Architecture

## High-Level Flow

1. **User Action** → Stripe Dashboard UI
2. **Governance Gate** → Evaluate policy
3. **Decision** → ALLOW/BLOCK/REVIEW
4. **Execution** → Apply to Stripe operation
5. **Audit Trail** → Record in Supabase

## Key Components

### Frontend
- React 17 views for Dashboard
- DSG Control Plane dashboard pages
- OAuth integration

### Backend
- Hono server for API endpoints
- Stripe event adapters
- Policy evaluation engine
- Supabase persistence layer
- Redis cache for performance

### Database
- Stripe account linkage (RLS-protected)
- Operation policies (versioned)
- Audit trail (immutable)
- Decision proofs (hash-linked)

## Deployment

- Frontend: Vercel Edge Functions
- Backend: Vercel Serverless
- Database: Supabase PostgreSQL
- Cache: Upstash Redis

## Security

- OAuth 2.0 for account linking
- Webhook signature validation
- Row-Level Security (RLS)
- Encrypted secrets
- CORS/CSP headers
EOF
```

---

## Step 12: Submit for Marketplace Review

```bash
# In Stripe Dashboard:

# Go to: Apps → [Your App] → Publish

# Fill in:
App Name: DSG Governance Gate
Category: Compliance
Description: Pre-execution governance gates for Stripe operations
Support Email: t.dealer01@dsg.pics
Documentation: SETUP.md
Privacy Policy: (link)
Terms: (link)

# Upload:
Icon: 300x300 PNG
Screenshot 1: Dashboard overview
Screenshot 2: Policy creation
Screenshot 3: Audit trail

# Submit for Review
# Status: Pending Review (2-4 weeks)
```

---

## Step 13: Create Deployment Checklist

```bash
cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# Deployment Checklist

## Pre-Deployment
- [ ] All Phase 7 tests passing
- [ ] TypeScript check: 0 errors
- [ ] npm audit: 0 vulnerabilities
- [ ] Build succeeds: `npm run build`
- [ ] Production env vars configured
- [ ] Supabase migrations applied
- [ ] Redis cache configured

## Deployment
- [ ] Vercel deployment successful
- [ ] Health check passes: `/api/health`
- [ ] Webhook endpoint responds
- [ ] OAuth flow tested
- [ ] Stripe app manifest valid
- [ ] Stripe CLI deploy successful

## Stripe Marketplace
- [ ] App account created
- [ ] OAuth credentials generated
- [ ] Manifest deployed
- [ ] Documentation complete
- [ ] Screenshots uploaded
- [ ] Submitted for review
- [ ] Status: Pending (2-4 weeks)

## Monitoring
- [ ] Error logging: Sentry configured
- [ ] Performance monitoring: Vercel Analytics
- [ ] Webhook delivery: Stripe Dashboard
- [ ] Database queries: Supabase dashboard

## Go-Live
- [ ] First pilot customer installed
- [ ] Operations gating working
- [ ] Audit trail recording
- [ ] Marketplace approval received
EOF
```

---

## Step 14: Monitor Deployment

```bash
# Check Vercel deployment status
vercel --prod

# View logs
vercel logs -A

# Monitor Stripe webhook deliveries
# https://dashboard.stripe.com/webhooks → [Your App]

# Monitor database
# https://app.supabase.com → [Project] → Logs
```

---

## ✅ Phase 8 Completion Checklist

- [ ] Production build verified
- [ ] Deployed to Vercel successfully
- [ ] Health check passing
- [ ] Stripe App account created
- [ ] OAuth credentials configured
- [ ] Manifest validated and deployed
- [ ] Documentation complete (SETUP.md, API.md, ARCHITECTURE.md)
- [ ] Submitted for Stripe review
- [ ] Waiting for approval (2-4 weeks typical)
- [ ] Production monitoring configured
- [ ] Deployment checklist completed
- [ ] Ready for Phase 9 (Marketing)

---

## Timeline

- **Day 1**: Build, test, deploy to Vercel
- **Day 2-3**: Create Stripe app account, configure OAuth
- **Day 4-5**: Documentation and manifest validation
- **Day 6-7**: Submit for Stripe review
- **Week 2+**: Wait for Stripe review (2-4 weeks)

---

## Important Notes

- **Stripe Review**: Takes 2-4 weeks, Stripe tests security, UX, compliance
- **Test Account**: Can use test Stripe account during review
- **Production Launch**: Goes live automatically once approved
- **Monitoring**: Set up error tracking and performance monitoring
