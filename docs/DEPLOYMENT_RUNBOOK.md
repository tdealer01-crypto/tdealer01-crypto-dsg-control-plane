# DEPLOYMENT RUNBOOK: Quick Reference

This is a condensed operational reference for common deployment and maintenance tasks on DSG ONE / ProofGate Control Plane.

For comprehensive deployment procedures, see `docs/RUNBOOK_DEPLOY.md`.
For incident response, see `docs/INCIDENT_RESPONSE.md` and `docs/RUNBOOK_INCIDENT_RESPONSE.md`.
For rollback procedures, see `docs/RUNBOOK_ROLLBACK.md`.

---

## Pre-Deployment Checklist

- [ ] All PRs merged to `main` branch
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Integration tests pass: `npm run test:integration`
- [ ] TypeScript checks pass: `npm run typecheck`
- [ ] Build succeeds locally: `npm run build`
- [ ] Security headers verified: `npm run verify:security-headers`
- [ ] Review `RUNBOOK_DEPLOY.md` for environment-specific requirements

---

## 1. Deploy to Production (Vercel)

### Quick deploy (assumes env vars are set)

```bash
# Verify you're on main and synced
git checkout main
git pull origin main

# Deploy to production
npm run deploy:prod
# or: npx vercel --prod

# Verify deployment status
npx vercel ls
```

### Monitor deployment status

```bash
# Watch Vercel dashboard for build completion
# Check at: https://vercel.com/teams/<team>/projects/tdealer01-crypto-dsg-control-plane

# Or use Vercel CLI
npx vercel inspect <deployment-url>
```

### Common failure: Missing environment variables

If Vercel build fails with `Missing Supabase public environment variables`:

```bash
# Check which vars are missing
npx vercel env ls production

# Add missing vars (examples)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add APP_URL production
npx vercel env add NEXT_PUBLIC_APP_URL production
npx vercel env add DSG_CORE_MODE production

# Redeploy
npm run deploy:prod
```

### Unverified commit error

If deployment is canceled with "unverified commit" error:

1. Verify the commit is signed on GitHub.
2. Use CLI bypass deployment:

```bash
# Deploy directly without Git integration
npx vercel whoami  # verify credentials
npx vercel --prod
```

3. Or use the GitHub Actions bypass workflow:
   - Go to **GitHub Actions → Vercel Production CLI Bypass → Run workflow**
   - Input `ref: main`
   - Wait for health check to pass

---

## 2. Apply Supabase Database Migrations

### Automated migration (Supabase CLI)

```bash
# Link to your Supabase project
supabase link --project-ref <PROJECT_REF>

# Apply all pending migrations
supabase db push

# Verify migrations applied
supabase db pull  # check local matches remote
```

### Manual migration (Supabase Dashboard)

1. Go to **Supabase Dashboard → SQL Editor**
2. Open each migration file from `supabase/migrations/` in order
3. Copy the SQL and execute in the editor
4. Wait for completion before running the next migration

### Verify migration applied

```bash
# Check table exists
curl -X GET "https://<SUPABASE_URL>/rest/v1/<table_name>?limit=1" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>"

# Or query via psql
psql "postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/postgres" \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

### Runtime RPC drift recovery

If runtime requests fail with `runtime_commit_execution` missing:

```bash
# Apply runtime RPC fix directly
SUPABASE_DB_URL='postgres://...' ./scripts/apply-runtime-rpc-fix.sh

# Or via npm script
npm run ops:runtime-rpc-fix
```

---

## 3. Update Environment Variables

### Add/update variable in Vercel

```bash
# List current vars
npx vercel env ls production

# Add new variable
npx vercel env add VARIABLE_NAME production
# You'll be prompted to enter the value (not shown on screen)

# Remove variable
npx vercel env rm VARIABLE_NAME production

# Redeploy after env var changes
npm run deploy:prod
```

### Update secrets without redeploying

Environment variables take effect only on next deployment. If you need the change to take effect immediately:

```bash
# Update variable
npx vercel env add VARIABLE_NAME production

# Trigger a redeployment of current code
npm run deploy:prod
```

### Common variables to check

```bash
# Supabase configuration
npx vercel env ls production | grep -i supabase

# DSG Core configuration
npx vercel env ls production | grep -i dsg

# Stripe configuration
npx vercel env ls production | grep -i stripe

# App URL configuration
npx vercel env ls production | grep -i app_url
```

---

## 4. Restart/Redeploy Services

### Redeploy without code changes (e.g., after env var update)

```bash
# Full redeploy
npm run deploy:prod

# Or use Vercel CLI
npx vercel --prod

# Or from Vercel dashboard:
# Deployments → Click latest deployment → Redeploy
```

### Restart local dev server

```bash
# Kill any running Next.js dev server
pkill -f "next dev"

# Clean build cache
rm -rf .next

# Restart dev server
npm run dev
# Available at http://localhost:3000
```

### Restart monitoring/health checks

Some internal checks may cache state. After fixing an issue:

```bash
# Clear Vercel edge cache (Vercel dashboard)
# Settings → Functions → Clear Build Cache

# Or: Redeploy (re-building forces cache clear)
npm run deploy:prod
```

---

## 5. Clear Cache (Redis/CDN)

### Clear Redis cache (if configured)

```bash
# Via Upstash dashboard (if using Upstash Redis)
# Project → Database → Flush Database

# Or via CLI (requires redis-cli)
redis-cli -u redis://<UPSTASH_TOKEN>@<UPSTASH_HOST>:<UPSTASH_PORT> FLUSHDB
```

### Clear Vercel edge cache

```bash
# Vercel automatically purges edge cache on deployment
# Manual purge via CLI:
npx vercel env inspect <deployment-url>  # no auto-purge option in CLI

# Use Vercel dashboard:
# Settings → Functions → Clear Build Cache
```

### Clear browser cache during testing

For local testing:
```bash
# Incognito mode / private browsing avoids local cache
# Or clear application storage:
# DevTools → Application → Clear storage
```

---

## 6. Check Logs in Vercel

### View deployment build logs

```bash
# List recent deployments
npx vercel ls

# View build logs for specific deployment
npx vercel logs <deployment-url>

# Or in Vercel dashboard:
# Deployments → Click deployment → Build logs tab
```

### View runtime logs (serverless functions)

```bash
# Vercel doesn't stream logs directly via CLI
# Use dashboard instead:
# Deployments → Click deployment → Runtime logs tab

# Or check Sentry integration if configured
# (requires SENTRY_AUTH_TOKEN in environment)
```

### Filter logs

```bash
# Search for specific error pattern
npx vercel logs <deployment-url> | grep -i "error\|timeout\|failed"

# Tail logs in real-time (Vercel dashboard only)
# Deployments → Runtime logs → Follow
```

---

## 7. Check Database Logs in Supabase

### View Supabase query logs

1. **Supabase Dashboard → Home → Query logs**
   - Real-time feed of recent queries
   - Filter by time, status, duration

2. **PostgreSQL logs**
   - Supabase Dashboard → Logs → Database
   - See slow queries, connection issues

### Check query performance

```sql
-- Identify slow queries (Supabase SQL editor)
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check RLS policy enforcement

```sql
-- Verify RLS is enabled on table
SELECT * FROM pg_tables WHERE tablename = '<table_name>';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = '<table_name>';

-- Test RLS with specific role
SET ROLE authenticated;
SELECT * FROM <table_name> LIMIT 1;
RESET ROLE;
```

### Monitor connection pool

```sql
-- Check active connections
SELECT 
  usename,
  application_name,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;

-- Kill hung connection (if needed)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE pid <> pg_backend_pid() AND usename = 'postgres';
```

---

## 8. Test Endpoints Quickly

### Health check (public, no auth)

```bash
# Basic availability check
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Expected response:
# {
#   "ok": true,
#   "timestamp": "2026-06-07T...",
#   "environment": "production"
# }
```

### Readiness check (monitoring dependencies)

```bash
# Check DSG Core connectivity
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# Expected response:
# {
#   "readiness_status": "ready",
#   "dsg_core_mode": "remote",
#   "supabase_connected": true,
#   "timestamp": "2026-06-07T..."
# }
```

### Usage check (authenticated)

```bash
# Requires valid API key
curl -s -H "Authorization: Bearer <API_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage | jq .

# Expected response:
# {
#   "period": "2026-06",
#   "usage": {
#     "executions": 150,
#     "queries": 300
#   },
#   "limits": {
#     "executions": 10000,
#     "queries": 50000
#   }
# }
```

### Execute a test intent

```bash
# Test runtime execution path
curl -s -X POST \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
  -d '{
    "agent_id": "<AGENT_ID>",
    "action": "test_action",
    "input": {},
    "context": {}
  }' | jq .

# Look for: decision field, no errors, usage tracked
```

### Test webhook endpoint (POST)

```bash
# Test webhook handling
curl -s -X POST \
  -H "Content-Type: application/json" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe \
  -d '{"type":"charge.succeeded","data":{"object":{"id":"ch_test"}}}' \
  -H "stripe-signature: <SIGNATURE>" | jq .
```

### Quick smoke test suite

```bash
# Run all endpoint checks quickly
bash scripts/health-check.sh

# Or the comprehensive go/no-go gate
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

---

## 9. Debug Webhook Signature Errors

### Stripe webhook signature validation failed

**Symptom:** Webhook endpoint returns 401/403, "Invalid signature"

**Check 1: Verify webhook secret in environment**

```bash
# Confirm STRIPE_WEBHOOK_SECRET exists in Vercel
npx vercel env ls production | grep STRIPE

# It should show:
# STRIPE_WEBHOOK_SECRET [redacted]

# If missing, add it
npx vercel env add STRIPE_WEBHOOK_SECRET production
# Paste your webhook secret (not shown on screen)

# Redeploy
npm run deploy:prod
```

**Check 2: Verify Stripe webhook endpoint is registered**

```bash
# Log into Stripe Dashboard
# Settings → Webhooks → Click webhook endpoint

# Verify:
# - Endpoint URL is correct (https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe)
# - Signing secret matches STRIPE_WEBHOOK_SECRET in Vercel
# - Webhook is enabled (toggle is ON)
# - Events are checked: charge.succeeded, charge.failed, etc.
```

**Check 3: Verify webhook payload parsing**

```bash
# Enable debug logging (add to .env.local for local testing)
# DEBUG=dsg:webhook,dsg:stripe

# Restart dev server
npm run dev

# Test webhook with signature (Stripe CLI recommended)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger charge.succeeded

# Check logs for parsing errors
```

**Check 4: Verify request body size limits**

```bash
# Webhook route should allow large payloads
# Check: app/api/webhooks/stripe/route.ts

# If request body parsing fails:
# - Verify JSON payload is valid
# - Check request size < 10MB (Vercel limit)
# - Check Content-Type header is application/json
```

**Check 5: Common signature validation issues**

| Issue | Check | Fix |
|-------|-------|-----|
| Signature mismatch | Stripe secret was rotated | Update STRIPE_WEBHOOK_SECRET in Vercel |
| 401 Unauthorized | STRIPE_WEBHOOK_SECRET missing | Add it via `npx vercel env add` and redeploy |
| 403 Forbidden | Access control / RLS policy | Check route handler auth logic |
| Timeout (504) | Webhook processing takes > 30s | Optimize handler or move work to background job |
| 400 Bad Request | JSON parsing failed | Check Content-Type and payload format |

**Check 6: Webhook replay (if events were missed)**

```bash
# In Stripe Dashboard:
# Settings → Webhooks → Click endpoint → Event logs

# Find failed event
# Click event → Resend

# Or resend via CLI:
stripe events resend evt_xxxxx
```

**Check 7: Test webhook locally**

```bash
# Use Stripe CLI to forward webhooks to local server
npm run dev
# In another terminal:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger charge.succeeded

# Check terminal for logs
```

---

## 10. Deployment Readiness Gate

### Run full readiness check before production

```bash
# Comprehensive pre-deploy validation
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app

# This checks:
# - Health endpoint (public)
# - Core monitor (DSG Core connectivity)
# - Usage endpoint (authenticated)
# - Execution path (runtime)
# - Database connectivity
# - Stripe configuration
# - Security headers

# Expected output: All checks GREEN
```

### If readiness gate fails

1. **Identify which check failed** (check script output)
2. **Review the specific failure**:
   - Health endpoint 500? → Check Vercel logs
   - Core monitor unhealthy? → Check DSG Core deployment
   - Usage 401? → Check API authentication
   - Database error? → Check Supabase connectivity
3. **Fix the root cause** (see section relevant to failure)
4. **Re-run readiness gate**

---

## Quick Reference: Common Commands

```bash
# Deployment
npm run deploy:prod                    # Deploy to production
npm run deploy:preview                 # Deploy preview
npm run build                          # Local build test
npm run typecheck                      # Type validation

# Verification
npm run go:no-go <url>                # Full readiness check
npm run verify:security-headers        # Security validation
npm run verify:live-env                # Live environment check

# Testing
npm run test                           # All tests
npm run test:unit                      # Unit tests only
npm run test:integration               # Integration tests
npm run test:e2e:live                  # E2E against real DB
npm run test:coverage                  # Coverage report

# Environment
npx vercel env ls production           # List prod env vars
npx vercel env add VAR production      # Add env var
npx vercel logs <url>                  # View deployment logs

# Database
npm run db:types                       # Regenerate Supabase types
npm run ops:runtime-rpc-fix            # Fix runtime RPC
supabase db push                       # Apply migrations

# Monitoring
curl -s <url>/api/health | jq .        # Health check
curl -s <url>/api/core/monitor | jq .  # Core monitor
```

---

## Need Help?

- **Deployment issues**: See `docs/RUNBOOK_DEPLOY.md`
- **Rollback**: See `docs/RUNBOOK_ROLLBACK.md`
- **Incident response**: See `docs/INCIDENT_RESPONSE.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING_GUIDE.md`
- **Vercel CLI docs**: `npx vercel help`
- **Supabase CLI docs**: `supabase help`
