# DSG Stripe App - Deployment Checklist

**Version**: 1.0.0  
**Phase**: 8 - Deployment & Marketplace Registration  
**Timeline**: 2 weeks

---

## Pre-Deployment Verification

### Code Quality

- [ ] All Phase 7 tests passing: `npm run test:integration`
- [ ] TypeScript check: 0 errors
  ```bash
  npm run type-check
  ```
- [ ] No ESLint errors
  ```bash
  npm run lint
  ```
- [ ] npm audit: 0 vulnerabilities
  ```bash
  npm audit --audit-level=high
  ```
- [ ] Build succeeds locally
  ```bash
  npm run build
  ```
- [ ] Build output is not in git
  ```bash
  echo "dist/" >> .gitignore
  ```

### Documentation

- [ ] SETUP.md complete and accurate
- [ ] API.md endpoint reference complete
- [ ] ARCHITECTURE.md technical details correct
- [ ] DEPLOYMENT.md deployment steps verified
- [ ] README.md updated with production info
- [ ] All docs reference correct production URLs

### Security Audit

- [ ] No secrets in code (grep for sk_, whsec_, etc.)
- [ ] .env.production in .gitignore
- [ ] No API keys in version control
- [ ] CORS headers configured in vercel.json
- [ ] CSP headers in stripe-app.json
- [ ] Webhook signature validation implemented
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using parameterized queries)

### Database Preparation

- [ ] Supabase project created
- [ ] Database migrations reviewed for correctness
- [ ] Migration files idempotent and safe
- [ ] Backup strategy documented
- [ ] RLS policies designed (not yet enabled)
- [ ] Indexes planned for performance
- [ ] Connection pooling configured

### Configuration Files

- [ ] vercel.json complete with all env vars
- [ ] .env.production.example has all required vars
- [ ] stripe-app.json OAuth URIs correct
- [ ] stripe-app.prod.json created for production
- [ ] package.json scripts working
- [ ] build/start commands tested

---

## Environment Setup (Day 1)

### Credentials Collection

- [ ] Stripe Secret Key: `sk_live_xxxxx` or `sk_test_xxxxx`
  - Source: https://dashboard.stripe.com/apikeys
  - Verified: yes / no
- [ ] Stripe Webhook Secret: `whsec_xxxxx`
  - Source: https://dashboard.stripe.com/webhooks
  - Verified: yes / no
- [ ] Stripe OAuth Client ID: `ca_xxxxx`
  - Source: https://dashboard.stripe.com/apps/settings
  - Verified: yes / no
- [ ] Stripe OAuth Client Secret: [secret]
  - Source: https://dashboard.stripe.com/apps/settings
  - Verified: yes / no
- [ ] DSG API Key: [key]
  - Source: DSG Control Plane dashboard
  - Verified: yes / no
- [ ] Supabase URL: `https://[project].supabase.co`
  - Source: https://app.supabase.com
  - Verified: yes / no
- [ ] Supabase Service Role Key: [key]
  - Source: https://app.supabase.com/project/[project]/settings/api
  - Verified: yes / no
- [ ] Upstash Redis URL: `https://[db].upstash.io`
  - Source: https://console.upstash.com
  - Verified: yes / no
- [ ] Upstash Redis Token: [token]
  - Source: https://console.upstash.com
  - Verified: yes / no
- [ ] Sentry DSN (optional): `https://[key]@sentry.io/[project]`
  - Source: https://sentry.io
  - Verified: yes / no

### Local Build Test

```bash
cd packages/stripe-app
npm ci
npm run build
# Expected: ✓ Build succeeds, 0 errors
```

- [ ] Build succeeds locally
- [ ] No warnings in build output
- [ ] Dist folder created with assets
- [ ] Size of build reasonable (<100 MB)

### Environment Files

- [ ] .env.production created (not committed)
- [ ] All credentials filled in correctly
- [ ] File not added to git: `git status | grep -v .env`
- [ ] Permissions restricted to team: `chmod 600 .env.production`

---

## Vercel Deployment (Day 1-2)

### Vercel Setup

- [ ] Vercel account created
- [ ] Organization selected/created
- [ ] Vercel CLI installed: `vercel --version`
- [ ] Vercel CLI authenticated: `vercel login`

### Project Creation

```bash
cd packages/stripe-app
vercel --prod
# Project name: dsg-stripe-app
# Framework: Next.js
# Source: Current directory
```

- [ ] Vercel project created
- [ ] Project linked: `vercel project info`
- [ ] Production domain assigned: `dsg-stripe-app.vercel.app`

### Environment Variables

Option A: Via CLI
```bash
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_APP_CLIENT_ID
vercel env add STRIPE_APP_CLIENT_SECRET
vercel env add DSG_API_KEY
vercel env add DSG_API_URL
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add SENTRY_DSN  # optional
```

Option B: Via Dashboard
```
Settings → Environment Variables → Add each variable from .env.production
Ensure "Production" environment selected
```

- [ ] All environment variables added
- [ ] Variables verified: `vercel env list`
- [ ] No values printed in logs: `vercel logs`
- [ ] Variables match .env.production exactly

### Initial Deployment

```bash
vercel --prod
```

- [ ] Deployment triggered
- [ ] Build succeeded in Vercel logs
- [ ] Production URL live: `curl https://dsg-stripe-app.vercel.app/api/health`

### Deployment Verification

```bash
# Health check
curl https://dsg-stripe-app.vercel.app/api/health
# Expected: { "status": "healthy", "version": "1.0.0" }
```

- [ ] Health endpoint returns 200
- [ ] Readiness endpoint returns { "ready": true, ... }
- [ ] No 500 errors in function logs
- [ ] Database connectivity OK
- [ ] Redis connectivity OK

---

## Database Setup (Day 2)

### Supabase Connection

- [ ] Supabase project exists
- [ ] Service role key obtained
- [ ] Database connection tested:
  ```bash
  psql postgresql://[user]:[pass]@[host]/[db] -c "\dt"
  ```

### Migration Execution

Run migrations in order:

```bash
# Via Supabase CLI
supabase migration up --project-id YOUR_PROJECT_ID

# Or via SQL Editor, run each migration file
```

- [ ] 001_create_stripe_accounts.sql applied
- [ ] 002_create_governance_policies.sql applied
- [ ] 003_create_operation_audit.sql applied
- [ ] 004_create_pending_reviews.sql applied
- [ ] 005_create_decision_proofs.sql applied
- [ ] 006_create_indexes.sql applied
- [ ] 007_create_rls_policies.sql applied

### Index Creation

```sql
CREATE INDEX idx_policies_account_priority ON governance_policies(stripe_account_id, priority);
CREATE INDEX idx_audit_account_date ON operation_audit(stripe_account_id, created_at);
CREATE INDEX idx_audit_decision ON operation_audit(decision);
CREATE INDEX idx_pending_status ON pending_reviews(status, created_at);
CREATE INDEX idx_proofs_hash ON decision_proofs(proof_hash);
CREATE INDEX idx_proofs_parent ON decision_proofs(parent_proof_hash);
```

- [ ] All indexes created
- [ ] Indexes verified: `SELECT * FROM pg_indexes WHERE tablename = 'governance_policies';`

### RLS Configuration

```sql
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_proofs ENABLE ROW LEVEL SECURITY;
```

- [ ] RLS enabled on all tables
- [ ] RLS policies created (from migration)
- [ ] RLS policies tested

### Database Verification

```bash
# Test connection from deployed app
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://dsg-stripe-app.vercel.app/api/stripe-app/test
```

- [ ] Database connection successful
- [ ] All tables accessible
- [ ] Row-level security enforced
- [ ] Backups configured (Supabase automatic)

---

## Stripe Configuration (Day 3)

### App Account Creation

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

- [ ] Stripe app account created
- [ ] App name: DSG Governance Gate
- [ ] Support email: t.dealer01@dsg.pics
- [ ] App category: Compliance

### OAuth Configuration

```
In Stripe Dashboard → Apps → [Your App] → OAuth Settings:
```

- [ ] OAuth Client ID generated: `ca_xxxxx`
- [ ] OAuth Client Secret generated
- [ ] Redirect URI 1: `https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback`
- [ ] Redirect URI 2: `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
- [ ] Both redirect URIs configured
- [ ] OAuth scopes defined

### Webhook Configuration

```
In Stripe Dashboard → Webhooks:
1. Add endpoint
2. Endpoint URL: https://dsg-stripe-app.vercel.app/api/stripe-app/webhook/events
3. Version: Latest stable
4. Events:
   - charge.succeeded
   - charge.failed
   - charge.dispute.created
   - charge.refunded
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payout.created
   - payout.failed
   - refund.created
5. Create endpoint
6. Copy signing secret: whsec_xxx
```

- [ ] Webhook endpoint created
- [ ] Endpoint URL: https://dsg-stripe-app.vercel.app/api/stripe-app/webhook/events
- [ ] All required events selected
- [ ] Signing secret obtained: `whsec_xxx`
- [ ] Signing secret matches STRIPE_WEBHOOK_SECRET environment var

### Stripe App Manifest

```bash
# Update stripe-app.prod.json with production URLs:
# - OAuth URIs
# - CSP connect-src URLs
# - Post-install action URL
```

- [ ] stripe-app.prod.json updated
- [ ] All URLs point to production domains
- [ ] Manifest syntax valid (JSON validates)

### Manifest Deployment

```bash
stripe login
stripe apps deploy --validate
# Expected: ✓ Manifest is valid

stripe apps deploy
# Expected: ✓ App deployed successfully
```

- [ ] Stripe CLI installed
- [ ] Stripe account authenticated
- [ ] Manifest validation passes
- [ ] Manifest deployed successfully
- [ ] App version: 1.0.0

---

## Testing & Verification (Day 4-5)

### Health Checks

```bash
# API health
curl https://dsg-stripe-app.vercel.app/api/health
# Expected: { "status": "healthy", "version": "1.0.0" }

# Readiness
curl https://dsg-stripe-app.vercel.app/api/readiness
# Expected: { "ready": true, "checks": { ... } }
```

- [ ] /api/health returns 200
- [ ] /api/readiness returns 200
- [ ] Database connectivity: OK
- [ ] Redis connectivity: OK
- [ ] Stripe connectivity: OK

### OAuth Flow Test

1. Initiate OAuth:
```bash
curl -X GET \
  "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/authorize?response_type=code&client_id=ca_xxxxx&redirect_uri=https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback&scope=charge_read+charge_write"
```

- [ ] Authorization endpoint accessible
- [ ] Redirects to Stripe OAuth
- [ ] Code received in callback
- [ ] Token exchange succeeds
- [ ] JWT token issued
- [ ] Token stored in session/database

### Policy Evaluation Test

```bash
curl -X POST https://dsg-stripe-app.vercel.app/api/stripe-app/gateway/evaluate \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_account_id": "acct_XXXXXXXXX",
    "operation": { "type": "charge.create", "action": "charge_write" },
    "context": { "amount_cents": 10000, "currency": "usd" }
  }'
# Expected: { "decision": "ALLOW" | "REVIEW" | "BLOCK", "proof": { ... } }
```

- [ ] Gateway endpoint accessible
- [ ] Returns decision (ALLOW/REVIEW/BLOCK)
- [ ] Proof hash generated
- [ ] Timestamp recorded
- [ ] No database errors in logs

### Webhook Test

```bash
# Send test Stripe event
stripe trigger charge.succeeded \
  --stripe-account acct_XXXXXXXXX \
  --api-key sk_test_XXXXXXXXXXX

# Verify webhook received
curl https://dsg-stripe-app.vercel.app/api/stripe-app/webhook/events \
  -X POST \
  -H "Stripe-Signature: ..." \
  -d '{"type": "charge.succeeded", ...}'
```

- [ ] Webhook endpoint callable
- [ ] Signature validation passes
- [ ] Event processed without errors
- [ ] Audit trail updated
- [ ] Webhook logs show 200 response

### Audit Trail Test

```bash
curl "https://dsg-stripe-app.vercel.app/api/stripe-app/audit/operations?stripe_account_id=acct_XXXXXXXXX" \
  -H "Authorization: Bearer $TEST_TOKEN"
# Expected: { "operations": [ ... ] }
```

- [ ] Audit endpoint accessible
- [ ] Returns list of operations
- [ ] Decision recorded
- [ ] Proof hash present
- [ ] Timestamp correct

---

## Documentation Completion (Day 5-6)

### User Documentation

- [ ] SETUP.md complete
  - [ ] Installation steps clear
  - [ ] Permission explanations included
  - [ ] Configuration walkthrough provided
  - [ ] Troubleshooting section present
  - [ ] Support contact included

- [ ] API.md complete
  - [ ] All endpoints documented
  - [ ] Request/response examples provided
  - [ ] Error codes documented
  - [ ] Rate limits specified
  - [ ] Authentication explained

- [ ] ARCHITECTURE.md complete
  - [ ] System overview included
  - [ ] Data flow diagrams present
  - [ ] Component breakdown provided
  - [ ] Security architecture explained
  - [ ] Scalability considerations included

- [ ] DEPLOYMENT.md complete
  - [ ] Prerequisites listed
  - [ ] Step-by-step instructions provided
  - [ ] Verification commands included
  - [ ] Troubleshooting guide included
  - [ ] Rollback procedures documented

### Marketplace Listing

- [ ] App icon: 300x300 PNG created
- [ ] Screenshot 1: Dashboard overview
- [ ] Screenshot 2: Policy creation
- [ ] Screenshot 3: Audit trail
- [ ] App description: 100-200 words
- [ ] Support email: t.dealer01@dsg.pics
- [ ] Website: https://dsg.pics
- [ ] Privacy policy: URL provided
- [ ] Terms of service: URL provided

---

## Marketplace Submission (Day 6-7)

### Stripe Marketplace Review

```
In Stripe Dashboard → Apps → [Your App] → Publish:

1. Fill in marketplace details:
   - App name: DSG Governance Gate
   - Category: Compliance
   - Description: [Full marketing copy]
   - Support Email: t.dealer01@dsg.pics
   
2. Upload assets:
   - Icon: 300x300 PNG
   - Screenshot 1
   - Screenshot 2
   - Screenshot 3

3. Review submission checklist
4. Submit for review
5. Status: Pending Review
```

- [ ] Marketplace details complete
- [ ] All assets uploaded (icon, screenshots)
- [ ] Description review-ready
- [ ] Support email verified
- [ ] Privacy policy provided
- [ ] Terms of service provided
- [ ] Submission guidelines reviewed
- [ ] App submitted for Stripe review

### Review Timeline

- [ ] Submission date recorded
- [ ] Expected review completion: +2-4 weeks
- [ ] Contact information verified for review feedback
- [ ] Approval notification: [pending]

---

## Production Monitoring Setup (Week 2)

### Error Tracking

- [ ] Sentry configured
  - [ ] SENTRY_DSN set in environment
  - [ ] DSN verified active
  - [ ] Error capture working
  - [ ] Test error sent: `throw new Error('test')`
  - [ ] Error appears in Sentry dashboard

### Performance Monitoring

- [ ] Vercel Analytics enabled
  - [ ] Metrics collected
  - [ ] Dashboard accessible
  - [ ] Key metrics visible (latency, errors)

- [ ] Supabase monitoring enabled
  - [ ] Query performance tracked
  - [ ] Slow query detection working
  - [ ] Database size monitored
  - [ ] Backup status OK

### Alerting

- [ ] Deployment failure alerts configured
- [ ] High error rate alerts configured (>1%)
- [ ] High latency alerts configured (>1s)
- [ ] Database alerts configured (connection failures)
- [ ] Redis alerts configured (connection failures)
- [ ] Webhook delivery alerts configured
- [ ] Alert recipients: t.dealer01@dsg.pics

### Logging

- [ ] Application logs accessible: `vercel logs`
- [ ] Log retention: 7+ days
- [ ] Structured logging in place
- [ ] Sensitive data excluded from logs
- [ ] Log rotation configured

---

## Go-Live Readiness (Week 2+)

### Final Verification

- [ ] Health check: passing
- [ ] All endpoints responding
- [ ] Database: queries fast (<100ms P99)
- [ ] Cache: hit rate >80%
- [ ] Error rate: <0.1%
- [ ] Webhook delivery: >99% success

### Team Training

- [ ] DevOps team trained on deployment
- [ ] Support team trained on troubleshooting
- [ ] Product team trained on features
- [ ] Management briefed on launch timeline

### Incident Response

- [ ] Runbook created for common issues
- [ ] Escalation path defined
- [ ] Rollback procedure documented
- [ ] Backup/recovery procedure documented

### Go-Live

- [ ] Stripe review: **APPROVED**
- [ ] App live in Stripe Marketplace
- [ ] First customer installation: SUCCESS
- [ ] Audit trail recording: VERIFIED
- [ ] Operations gating: WORKING
- [ ] Approval workflow: TESTED
- [ ] Monitoring: ACTIVE

---

## Post-Launch (Week 3+)

- [ ] First customer onboarded
- [ ] Policies created and activated
- [ ] Operations gating active
- [ ] Audit trail recording
- [ ] No critical issues in first week
- [ ] Performance metrics stable
- [ ] Customer support responsive
- [ ] Marketplace rating: 4.0+ (once reviews available)

---

## Phase 8 Completion

**Status**: [Not Started / In Progress / Complete]

**Completion Date**: _______________

**Sign-off**:
- DevOps Lead: _________________ Date: _______
- Product Manager: _________________ Date: _______
- CEO: _________________ Date: _______

---

## Notes

```
[Space for deployment notes, issues encountered, resolutions applied]

```

---

**Checklist Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**Next Review**: After Phase 8 completion
