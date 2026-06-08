# Post-Deployment Checklist

This checklist confirms all critical components are operational and configured for production use after deploying to Vercel.

**Deployment URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

**Completed By:** ________________  
**Date:** ________________  
**Verification Time:** ________________  

---

## Pre-Deployment

- [ ] **Code Review Approved** — All changes reviewed and approved per policy
- [ ] **CI/CD Pipeline Passed** — GitHub Actions workflows green (build, test, lint)
- [ ] **No Secrets in Code** — Verified no `.env`, API keys, or credentials in commit
- [ ] **Branch Merged** — All changes merged to `main` or deployment branch
- [ ] **Vercel Connected** — GitHub integration configured; deployments automated

---

## Vercel Deployment

- [ ] **Deployment Status: Ready** — Vercel dashboard shows "Ready" status
  - Navigate to: https://vercel.com/projects/tdealer01-crypto-dsg-control-plane
  - Verify: Deployment state = "Ready"
  - Verify: No build errors or warnings in deployment log

- [ ] **Build Completed Successfully** — `npm run build` completed without errors
  - Local verification: `npm run build`
  - Expected: ✅ All pages compiled
  - Expected: ✅ All API routes generated

- [ ] **Correct Commit Deployed** — Verify deployed Git commit matches expected version
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .version`
  - Expected: SHA matches the merge commit to `main`

---

## Environment & Configuration

- [ ] **All Environment Variables Present** — No missing required vars
  - Verify via readiness endpoint or Vercel dashboard:
    - `NEXT_PUBLIC_SUPABASE_URL` ✓
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
    - `SUPABASE_SERVICE_ROLE_KEY` ✓
    - `NEXTAUTH_SECRET` ✓
    - `DSG_CORE_MODE` ✓
    - `DSG_API_KEY` ✓
    - `STRIPE_SECRET_KEY` ✓ (if billing enabled)
    - `STRIPE_WEBHOOK_SECRET` ✓ (if billing enabled)
    - `UPSTASH_REDIS_REST_URL` ✓ (if rate limiting enabled)
    - `UPSTASH_REDIS_REST_TOKEN` ✓ (if rate limiting enabled)

- [ ] **No Secrets in Logs** — Verify environment variable values are never logged
  - Check Vercel deployment logs for exposed keys
  - Expected: ✅ No credentials visible

- [ ] **Environment-Specific Configuration** — Correct settings for deployment target
  - For production: `VERCEL_ENV=production`, strict readiness checks enabled
  - For preview: `VERCEL_ENV=preview`, readiness checks as configured

---

## Database & Data

- [ ] **Supabase Connection Verified** — Database is reachable and responsive
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .checks.supabaseServiceRole`
  - Expected: `{"ok":true}`
  - Alternative: Check `GET /api/agent/status` returns HTTP 200

- [ ] **Supabase Migrations Applied** — All pending migrations executed
  - Verify in Supabase dashboard:
    - Navigate to: Migrations tab
    - Expected: ✅ All migrations show "Success"
    - Expected: ✅ No "Pending" migrations
  - OR run: `supabase migration list --project-id <id>`

- [ ] **Database Tables Exist** — Key tables created and accessible
  - Required tables:
    - `organizations` ✓
    - `agents` ✓
    - `stripe_customers` ✓ (if billing enabled)
    - `stripe_app_accounts` ✓ (if billing enabled)
    - `audit_logs` ✓
    - `runtime_intents` ✓
    - `runtime_executions` ✓
  - Verify: Run query in Supabase SQL editor or via API test

- [ ] **Row-Level Security (RLS) Enabled** — Tables have appropriate RLS policies
  - Verify in Supabase dashboard for each table:
    - Expected: RLS toggle = "ON"
    - Expected: Policies restrict access by org/user

- [ ] **Database Indexes Created** — Performance indexes are in place
  - Run query to verify:
    ```sql
    SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public';
    ```
  - Expected: ✅ Indexes present on foreign keys and frequently queried columns

---

## Stripe Integration (if billing enabled)

- [ ] **Stripe API Key Valid** — Secret key is active and not restricted
  - Command (requires `STRIPE_SECRET_KEY` set locally):
    ```bash
    curl https://api.stripe.com/v1/customers \
      -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
      --head
    ```
  - Expected: HTTP 200 OK

- [ ] **Webhook Endpoint Configured** — Stripe sends events to our endpoint
  - In Stripe Dashboard:
    - Navigate to: Settings > Webhooks
    - Verify endpoint URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe`
    - Verify: Status = "Active"
    - Verify: Events subscribed: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`

- [ ] **Webhook Secret Configured** — `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
  - In Stripe Dashboard > Webhooks:
    - Verify signing secret matches `STRIPE_WEBHOOK_SECRET` env var
    - Expected: ✅ Secrets match (never print actual value)

- [ ] **Test Webhook Received** — Can trigger and observe test event
  - In Stripe Dashboard > Webhooks:
    - Click endpoint
    - Click "Send test event"
    - Select event type (e.g., `customer.subscription.updated`)
    - Verify: "Request successful" message

- [ ] **Webhook Event Logged** — Event appears in application audit log
  - Check Supabase:
    ```sql
    SELECT * FROM audit_logs WHERE event_type LIKE '%stripe%' ORDER BY created_at DESC LIMIT 1;
    ```
  - Expected: ✅ Recent webhook event recorded

- [ ] **Pricing Plans Available** — Stripe pricing IDs are configured
  - Verify: `STRIPE_PRICE_PRO` and `STRIPE_PRICE_BUSINESS` env vars set
  - Verify in Stripe Dashboard: Both price IDs exist and are active

---

## OAuth & Authentication

- [ ] **NEXTAUTH_SECRET Set** — OAuth session encryption key configured
  - Verify: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .checks.nextAuthSecret`
  - Expected: `{"ok":true}`

- [ ] **OAuth Providers Configured** — Social login providers working
  - Supported providers:
    - GitHub OAuth (if `GITHUB_APP_ID` set) ✓
    - Google OAuth (if configured) ✓
  - For each provider:
    - Verify credentials in Vercel env vars (names only, no values)
    - Verify callback URL matches: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/auth/callback/<provider>`

- [ ] **Redirect URIs Registered** — OAuth callback URLs allowed
  - For GitHub OAuth:
    - Navigate to: GitHub App settings
    - Verify: Callback URL = `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/auth/callback/github`
  - For Google OAuth:
    - Navigate to: Google Cloud Console > OAuth 2.0 Client IDs
    - Verify: Redirect URI = `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/auth/callback/google`

- [ ] **Session Cookies Secure** — Sessions use secure, HttpOnly cookies
  - Verify via browser dev tools after login:
    - Expected: ✅ Cookies marked HttpOnly
    - Expected: ✅ Cookies marked Secure (HTTPS only)
    - Expected: ✅ SameSite policy set

---

## API Health & Readiness

- [ ] **Health Endpoint Returns OK** — `/api/health` responds with expected structure
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .`
  - Expected: HTTP 200 with status data

- [ ] **Agent Status Endpoint Operational** — `/api/agent/status` returns deployment info
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .`
  - Expected: HTTP 200 with `ok: true`, `repo`, `version`, `env`, `ts`, `checks`

- [ ] **Readiness Endpoint Comprehensive** — `/api/readiness` shows all system checks
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .`
  - Expected: HTTP 200
  - Expected: `ok: true` (all critical checks passed)
  - Expected: `checks.env.ok: true`
  - Expected: `checks.supabaseServiceRole.ok: true`
  - Expected: `checks.dsgCoreConfig.ok: true`

- [ ] **Response Times Acceptable** — Endpoints respond within SLA
  - Run: `./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app`
  - Expected: ✅ All checks passed
  - Expected: ✅ Response times < 500ms

- [ ] **Error Handling Works** — API returns proper error responses
  - Test 404: `curl -s -o /dev/null -w "%{http_code}" https://tdealer01-crypto-dsg-control-plane.vercel.app/api/nonexistent`
  - Expected: HTTP 404
  - Test 401 (if auth required): Test without auth token
  - Expected: HTTP 401 or 403

---

## Security & Headers

- [ ] **Security Headers Present** — All critical security headers configured
  - Verify headers:
    - Command: `curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health`
    - Expected: ✅ `Content-Security-Policy` present
    - Expected: ✅ `X-Content-Type-Options: nosniff`
    - Expected: ✅ `X-Frame-Options: DENY` or `SAMEORIGIN`
    - Expected: ✅ `Strict-Transport-Security` (HSTS)

- [ ] **CORS Configured Correctly** — Cross-origin requests work as expected
  - Verify CORS headers:
    - Command: `curl -I -X OPTIONS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute`
    - Expected: ✅ `Access-Control-Allow-Origin` present (or `*` for public)
    - Expected: ✅ `Access-Control-Allow-Methods` includes needed methods

- [ ] **HTTPS Enforced** — All traffic redirects to HTTPS
  - Command: `curl -I http://tdealer01-crypto-dsg-control-plane.vercel.app/`
  - Expected: HTTP 301/308 redirect to HTTPS

- [ ] **No Sensitive Data in Logs** — Logs don't contain secrets or PII
  - Check Vercel Function logs:
    - Expected: ✅ No API keys, passwords, or tokens logged
    - Expected: ✅ No user email or personal data in error messages

---

## Rate Limiting

- [ ] **Rate Limiting Configured** — Upstash Redis connected (if enabled)
  - Verify: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set
  - OR: Rate limiting intentionally disabled for this environment

- [ ] **Rate Limit Headers Present** — API responses include limit info
  - Run rapid requests and check headers:
    ```bash
    for i in {1..5}; do
      curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | grep -i ratelimit
    done
    ```
  - Expected: ✅ Rate limit headers present (`RateLimit-Limit`, `RateLimit-Remaining`, etc.)

- [ ] **Rate Limits Working** — Excessive requests are throttled
  - Test: Send > configured limit of requests in short period
  - Expected: ✅ 429 (Too Many Requests) response after limit exceeded

---

## DSG Core Integration

- [ ] **DSG Core Configured** — Mode and connectivity verified
  - Verify: `DSG_CORE_MODE` env var set (`internal` or `remote`)
  - If `remote` mode:
    - Verify: `DSG_CORE_URL` env var set
    - Verify: `DSG_CORE_API_KEY` env var set
    - Test connectivity: `curl -s $DSG_CORE_URL/health`

- [ ] **DSG Core Health Check** — Control plane can reach DSG Core
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .checks.dsgCoreHealth`
  - Expected: `{"ok":true}` or informational if not probed

- [ ] **Policy Manifest Accessible** — DSG policies endpoint working
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/policies/manifest | jq . | head -20`
  - Expected: HTTP 200 with policy manifest

---

## Finance Governance (if enabled)

- [ ] **Finance Governance Enabled** — Feature flag confirmed
  - Verify: `DSG_FINANCE_GOVERNANCE_ENABLED=true` env var set
  - OR: Feature intentionally disabled for this deployment

- [ ] **Finance Backend Health** — Finance governance services operational
  - Command: `curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .checks.financeGovernanceBackend`
  - Expected: `{"ok":true}`

- [ ] **Finance Tables Exist** — Supabase tables for billing/usage
  - Verify in Supabase:
    - Tables: `stripe_customers`, `stripe_app_accounts`, `usage_metrics`
    - All tables present: ✓

---

## Webhooks & Integrations

- [ ] **Webhook Endpoints Accessible** — Webhook routes reachable
  - Test endpoint:
    - Command: `curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/webhook/inbox`
    - Expected: HTTP 404 or 405 (not 500) — endpoint exists

- [ ] **Webhook Secret Validation** — Webhook signatures can be verified
  - Verify: Code implements signature validation
  - File: `app/api/webhooks/**/route.ts`
  - Expected: ✅ Signature validation implemented

- [ ] **Test Webhook Processed** — Sample webhook event handled correctly
  - Trigger test webhook from Stripe or webhook provider
  - Verify: Event logged in audit_logs table
  - Expected: ✅ Event recorded with correct structure

---

## Deployment Verification Tools

- [ ] **Health Check Script Passes** — Automated verification script confirms all checks
  - Run: `./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app`
  - Expected: ✅ Exit code 0 (all checks passed)

- [ ] **Deployment Verification Script Passes** — Comprehensive verification confirms setup
  - Run: `./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app`
  - Expected: ✅ Exit code 0 (all critical checks passed)

- [ ] **Manual Go/No-Go Gate Passes** — Standard deployment gate confirms readiness
  - Run: `npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app`
  - Expected: ✅ All endpoints respond with correct status codes

---

## User Access & Operations

- [ ] **Dashboard Accessible** — Operator UI loads and functions
  - Navigate to: `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard`
  - Expected: ✅ Page loads without errors
  - Expected: ✅ Redirects to login if not authenticated

- [ ] **Authentication Flow Works** — Can login and access dashboard
  - Test: Login with test account
  - Expected: ✅ Login succeeds
  - Expected: ✅ Dashboard displays operator UI
  - Expected: ✅ Can access protected routes

- [ ] **API Key Management Works** — Can create and manage API keys
  - Navigate to: Settings or API Keys page
  - Expected: ✅ Can create new API key
  - Expected: ✅ Key appears in list
  - Expected: ✅ Key can be used for authenticated requests

---

## Monitoring & Alerting

- [ ] **Vercel Monitoring Enabled** — Error tracking and performance monitoring active
  - Verify: Vercel dashboard shows live metrics
  - Expected: ✅ Build time tracked
  - Expected: ✅ Runtime errors visible
  - Expected: ✅ Performance metrics available

- [ ] **Sentry (or Error Tracking) Configured** — Errors reported to monitoring service
  - Verify: `SENTRY_*` or error service env vars set (if used)
  - OR: Error tracking intentionally not enabled for this environment

- [ ] **Log Aggregation Configured** — Logs accessible for debugging
  - Verify: Vercel Function logs accessible
  - Verify: Supabase query logs accessible
  - Expected: ✅ Can debug runtime issues

- [ ] **Alerts Configured** — Team notified of critical issues
  - Verify notification settings:
    - Expected: ✅ Build failures alert team
    - Expected: ✅ Deployment errors alert team
    - Expected: ✅ High error rate triggers alert (optional)

---

## Documentation & Runbook

- [ ] **Deployment Runbook Accessible** — Team has deployment procedures
  - File: `docs/RUNBOOK_DEPLOY.md`
  - Expected: ✅ File exists and is up-to-date
  - Expected: ✅ Deployment steps clearly documented

- [ ] **Monitoring Guide Configured** — Team knows how to monitor production
  - File: `docs/MONITORING_SETUP.md`
  - Expected: ✅ Monitoring procedures documented
  - Expected: ✅ Alert thresholds defined

- [ ] **Incident Response Plan Ready** — Team prepared for issues
  - Expected: ✅ Team has rollback procedures documented
  - Expected: ✅ Team knows who to contact for critical issues
  - Expected: ✅ Escalation path defined

---

## Sign-Off

All items above have been verified by authorized personnel. This deployment is confirmed as production-ready.

**Verified By:** ________________ (Name & Title)

**Date:** ________________

**Time Completed:** ________________

**Notes/Known Limitations:**

```
[Add any deviations, temporary workarounds, or known issues]
```

---

## Post-Deployment Actions

- [ ] Notify team of successful deployment
- [ ] Update deployment status in project management system
- [ ] Schedule post-deployment review (24-48 hours)
- [ ] Monitor error rates and performance metrics closely for first 24 hours
- [ ] Archive this checklist for audit trail

---

## Quick Reference Commands

```bash
# Health check
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Agent status
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .

# Readiness
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .

# Run health check script
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Run full deployment verification
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Stripe webhook test (requires key)
curl -u $STRIPE_SECRET_KEY: https://api.stripe.com/v1/customers --head

# Check security headers
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Owner:** DevOps / Platform Team
