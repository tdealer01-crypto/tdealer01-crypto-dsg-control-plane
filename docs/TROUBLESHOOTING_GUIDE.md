# TROUBLESHOOTING GUIDE

Diagnostic and resolution procedures for common issues in DSG ONE / ProofGate Control Plane.

For emergency incident response, see `docs/INCIDENT_RESPONSE.md`.
For deployment procedures, see `docs/DEPLOYMENT_RUNBOOK.md`.

---

## Quick Diagnostics

### 1. Health Check (Start Here)

Run these checks first to identify the problem:

```bash
# Public health endpoint
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Expected response:
# {
#   "ok": true,
#   "timestamp": "2026-06-07T12:34:56Z",
#   "environment": "production"
# }

# If this fails:
# - Service may be down
# - Vercel deployment may have failed
# - See: "Service Outage" section below
```

### 2. Core Monitor Check

```bash
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# Expected response:
# {
#   "readiness_status": "ready",
#   "dsg_core_mode": "remote",
#   "supabase_connected": true,
#   "timestamp": "2026-06-07T12:34:56Z"
# }

# If Supabase shows false:
# - Database connection issue
# - See: "Database Connection Failures" section below

# If readiness_status shows unhealthy:
# - DSG Core may be down
# - See: "DSG Core Issues" section below
```

### 3. Application Health

```bash
# Check for critical errors in logs
npx vercel logs https://tdealer01-crypto-dsg-control-plane.vercel.app | grep -i "error\|fatal\|exception"

# Check deployment status
npx vercel inspect https://tdealer01-crypto-dsg-control-plane.vercel.app

# If errors found:
# - Identify error pattern
# - See matching section below
```

---

## Common Issues & Solutions

### Issue: Service Outage (All endpoints returning 5xx errors)

**Diagnosis:**
```bash
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
# Returns: 500 Internal Server Error or Connection refused
```

**Root Causes & Fixes:**

#### Cause 1: Vercel deployment failed

```bash
# Check deployment status
npx vercel ls

# Check build logs
npx vercel logs <deployment-id>

# Look for: Build errors, timeout, missing variables

# Fix options:
# 1. Rollback to last good deployment
#    Vercel Dashboard → Deployments → Previous → Set as production

# 2. Fix and redeploy
#    See: docs/DEPLOYMENT_RUNBOOK.md → Deploy to Production
```

#### Cause 2: Environment variables missing

```bash
# Check required variables
npx vercel env ls production | grep NEXT_PUBLIC_SUPABASE
npx vercel env ls production | grep SUPABASE_SERVICE_ROLE

# Should see both NEXT_PUBLIC_SUPABASE_URL and _KEY

# If missing:
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel --prod
```

#### Cause 3: Database migrations not applied

```bash
# Check if migrations are pending
supabase link --project-ref <PROJECT_REF>
supabase db push --dry-run

# Apply pending migrations
supabase db push

# Redeploy
npx vercel --prod
```

**See also:** `docs/RUNBOOK_DEPLOY.md` → Service Outage section

---

### Issue: "Cannot connect to Supabase" Error

**Symptoms:**
- API endpoints return database connection errors
- `/api/core/monitor` shows `supabase_connected: false`
- Application logs show "ECONNREFUSED" or "network timeout"

**Diagnosis:**
```bash
# 1. Check Supabase project status
# https://supabase.com/status

# 2. Test Supabase connectivity directly
curl -s -H "apikey: <ANON_KEY>" \
  "https://<PROJECT>.supabase.co/rest/v1/health" | jq .

# 3. Check environment variables
npx vercel env ls production | grep SUPABASE
```

**Solutions:**

#### Solution 1: Verify connection string

```bash
# Check URL format (should be https://PROJECT.supabase.co)
npx vercel env ls production | grep NEXT_PUBLIC_SUPABASE_URL

# If incorrect format, update:
npx vercel env add NEXT_PUBLIC_SUPABASE_URL "https://<project>.supabase.co"
npx vercel --prod
```

#### Solution 2: Verify API keys

```bash
# Get correct keys from Supabase dashboard
# Settings → API keys → Copy anon key and service role key

# Update in Vercel
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel --prod
```

#### Solution 3: Check network whitelist

```bash
# Vercel IPs may be blocked
# Go to: Supabase Dashboard → Project Settings → Network
# Look for: IP whitelist restrictions

# If set, add Vercel's IP ranges:
# https://vercel.com/guides/how-to-allowlist-vercel-ip-addresses

# Or allow all (less secure):
# Whitelist: 0.0.0.0/0
```

#### Solution 4: Check connection pool

```bash
# Connect directly to check pool status
psql "postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/postgres" \
  -c "SELECT count(*) as active_connections FROM pg_stat_activity;"

# If near limit (usually 100 for free tier):
# - Restart application to reset connections
npx vercel --prod

# - Or upgrade Supabase plan for higher limit
```

#### Solution 5: Check if database is online

```bash
# Verify tables exist
curl -s -H "apikey: <ANON_KEY>" \
  "https://<PROJECT>.supabase.co/rest/v1/" | jq .

# Should return list of tables, not error
```

**See also:** `docs/INCIDENT_RESPONSE.md` → Database Connection Failures

---

### Issue: "Invalid API Key" or "Unauthorized" Errors

**Symptoms:**
- `/api/usage` returns 401 Unauthorized
- `/api/execute` returns "Invalid API key"
- User authentication fails with cryptic error

**Diagnosis:**
```bash
# Check if auth is working at all
curl -s -H "Authorization: Bearer test_key" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage

# Should return 401 (expected for invalid key)
# Not 500 (server error)
```

**Solutions:**

#### Solution 1: Verify API key format

```bash
# API keys should start with specific prefix (check docs)
# Example: dsg_sk_... or similar

# Test with known good key:
curl -s -H "Authorization: Bearer <VALID_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage | jq .

# Should return usage data, not error
```

#### Solution 2: Check if key is expired or revoked

```bash
# Keys can expire or be manually revoked
# Check in Supabase:
# Dashboard → Authentication → Users (or similar)
# Look for: Key revocation status, expiry date

# Generate new API key if needed
```

#### Solution 3: Verify authentication middleware

```bash
# Check that Supabase session is working
# Try login at: https://tdealer01-crypto-dsg-control-plane.vercel.app/login

# If login fails:
# 1. Check Supabase Auth provider is enabled
#    Dashboard → Authentication → Providers
# 2. Check email is whitelisted (if restricted)
# 3. Check SMTP configuration for password reset emails
```

#### Solution 4: Check RLS policies

```bash
# RLS policies may block access even with valid auth
# Verify in Supabase:

SELECT * FROM pg_policies WHERE tablename = 'target_table';

-- Check policy logic
-- Example: User can only see own data (may block admin access)

-- Temporary fix: Create bypass policy for testing
CREATE POLICY "admin_bypass" ON target_table
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

**See also:** `docs/DEPLOYMENT_RUNBOOK.md` → Login/Magic-Link Troubleshooting

---

### Issue: Webhook Failures (Stripe, etc.)

**Symptoms:**
- Stripe webhook events not processed
- Webhook handler returns 500 errors
- Event backlog in Stripe dashboard

**Diagnosis:**
```bash
# Check Stripe event delivery logs
# Stripe Dashboard → Developers → Webhooks → Click endpoint

# Look for: Failed events, error messages

# Test webhook endpoint locally
curl -s -X POST \
  -H "Content-Type: application/json" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe \
  -d '{"type":"test.event"}' \
  -H "stripe-signature: test"

# Expected: 400/401 (invalid signature is OK)
# Bad: 500 error, timeout, or connection refused
```

**Solutions:**

#### Solution 1: Verify webhook signature secret

```bash
# Check Stripe webhook signing secret
# Stripe Dashboard → Developers → Webhooks → Click endpoint
# Copy: Signing secret

# Update in Vercel
npx vercel env add STRIPE_WEBHOOK_SECRET production
# (paste the secret when prompted, not shown on screen)

# Redeploy
npx vercel --prod
```

#### Solution 2: Check webhook endpoint URL

```bash
# Verify in Stripe dashboard
# Endpoint URL should be: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe

# If wrong:
# 1. Delete old webhook endpoint
# 2. Create new one with correct URL
# 3. Copy new signing secret
# 4. Update STRIPE_WEBHOOK_SECRET in Vercel
```

#### Solution 3: Check request body parsing

```bash
# Webhook handler may fail to parse JSON
# Check handler code: app/api/webhooks/stripe/route.ts

# Common issues:
# - Content-Type not application/json
# - Request body size > limit (usually 1MB)
# - JSON parse error

# Test with valid JSON
curl -s -X POST \
  -H "Content-Type: application/json" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe \
  -d '{"type":"charge.succeeded","data":{"object":{"id":"ch_test"}}}' \
  -H "stripe-signature: fake_sig"

# Should return JSON response, not HTML error
```

#### Solution 4: Check rate limiting

```bash
# Webhook endpoint may be rate limited
# Check: app/api/webhooks/stripe/route.ts
# Look for: rate limit configuration

# If rate limited:
# - Whitelist webhook endpoint
# - Or increase rate limit for webhook source IP

# Temporary fix:
npx vercel env add WEBHOOK_RATE_LIMIT_DISABLED true production
npm run deploy:prod

# Then re-enable after fixing underlying issue
```

#### Solution 5: Replay failed webhooks

```bash
# Stripe Dashboard → Developers → Webhooks → Event logs
# Find failed event → Click it → Resend

# Or via CLI:
stripe events resend evt_xxxxx
```

**See also:** `docs/INCIDENT_RESPONSE.md` → Webhook Processing Failures

---

### Issue: Slow Response Times (High Latency)

**Symptoms:**
- API responses take > 5 seconds
- Some endpoints timeout (504 Gateway Timeout)
- Users report service feels slow

**Diagnosis:**
```bash
# Measure response time
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Should respond in < 1 second
# If > 5 seconds: Likely a slow query or cold start

# Check which endpoints are slow
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/executions

# Compare times to identify slow endpoint
```

**Solutions:**

#### Solution 1: Clear Redis cache (cold start)

```bash
# First request after deploy is slower (cold start)
# This is normal for serverless

# Mitigation: Pre-warm with cron job
# Add to vercel.json: "crons": [{"path": "/api/health", "schedule": "0 */12 * * *"}]

# Or manually ping after deploy:
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

#### Solution 2: Optimize database queries

```bash
# Identify slow queries
psql "postgresql://..." \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements 
      WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze slow query
psql "postgresql://..." \
  -c "EXPLAIN ANALYZE SELECT ... [your slow query];"

# Look for: Sequential scans on large tables, missing indexes

# Add index for frequently queried columns
psql "postgresql://..." \
  -c "CREATE INDEX CONCURRENTLY idx_table_column ON public.table(column);"
```

#### Solution 3: Check Redis connectivity

```bash
# If using Redis, slow connection causes latency
redis-cli -u "redis://<TOKEN>@<HOST>:<PORT>" ping
# Should respond with PONG immediately

# If slow or times out:
# - Check Redis memory usage (near limit?)
# - Check network latency to Redis region
# - Clear Redis cache: FLUSHDB

# Temporary fix: Disable Redis
npx vercel env add REDIS_DISABLED true production
npm run deploy:prod

# Then monitor latency without Redis
```

#### Solution 4: Check for N+1 query patterns

```bash
# RLS policies can cause extra queries
# Each row may trigger additional auth checks

# Profile with RLS disabled (test only):
ALTER TABLE public.target_table DISABLE ROW LEVEL SECURITY;
-- Run slow query, check query count
ALTER TABLE public.target_table ENABLE ROW LEVEL SECURITY;

-- Optimize RLS policies to reduce queries
-- Or use efficient row caching
```

#### Solution 5: Upgrade Vercel plan

```bash
# Hobby plan has lower concurrency limits
# Pro plan allows more simultaneous functions

# Check current plan:
npx vercel billing ls

# Upgrade if needed (not automated via CLI)
# Vercel Dashboard → Settings → Billing
```

**See also:** `docs/INCIDENT_RESPONSE.md` → High Latency / Timeouts

---

### Issue: "Runtime Commit RPC Missing" Error

**Symptoms:**
- Execute endpoint returns: "Runtime commit RPC is missing"
- Recent Supabase migration applied but error persists
- PostgREST schema cache not updated

**Diagnosis:**
```bash
# Verify runtime_commit_execution function exists
psql "postgresql://..." \
  -c "SELECT * FROM information_schema.routines 
      WHERE routine_name = 'runtime_commit_execution';"

# Should return 1 row
```

**Solutions:**

#### Solution 1: Re-apply runtime RPC migration

```bash
# Apply the fix directly
SUPABASE_DB_URL='postgres://...' ./scripts/apply-runtime-rpc-fix.sh

# Or via npm
npm run ops:runtime-rpc-fix

# This re-applies migration + reloads schema cache
```

#### Solution 2: Manual schema cache reload

```bash
# Connect to Supabase and force reload
psql "postgresql://..." \
  -c "NOTIFY pgrst, 'reload schema';"

# Wait 10 seconds for cache to reload
sleep 10

# Test function exists
curl -s -X POST \
  -H "Authorization: Bearer <API_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
  -d '{"agent_id":"test"}' | jq .
```

#### Solution 3: Verify function definition

```bash
# Check function has correct signature
psql "postgresql://..." \
  -c "SELECT pg_get_functiondef(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'runtime_commit_execution';"

# Should show a function with >= 17 arguments
# If wrong signature: Manually update function definition from migration file
```

#### Solution 4: Redeploy application

```bash
# Sometimes Vercel edge cache causes issues
npm run deploy:prod

# Or force re-check of function
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
```

**See also:** `docs/RUNBOOK_DEPLOY.md` → Runtime RPC drift recovery

---

### Issue: "Permission Denied" on Database Objects

**Symptoms:**
- RLS policies reject all queries
- "Current user does not have permission" errors
- Service role key can query, but regular auth cannot

**Diagnosis:**
```bash
# Check RLS policy for table
psql "postgresql://..." \
  -c "SELECT * FROM pg_policies WHERE tablename = 'target_table';"

# Check if RLS is enabled
psql "postgresql://..." \
  -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables 
      WHERE tablename = 'target_table';"

# rowsecurity should be 't' (true)
```

**Solutions:**

#### Solution 1: Verify RLS policy allows read

```bash
-- Check policy logic
SELECT * FROM pg_policies WHERE tablename = 'target_table';

-- Example: Policy that blocks public read
-- WHERE (current_user_id() = user_id)
-- This allows users to only see their own rows

-- Fix: Add policy for service role
CREATE POLICY "service_role_bypass" ON target_table
  FOR SELECT
  USING (current_setting('role') = 'service_role');
```

#### Solution 2: Check auth role setup

```bash
-- Verify authenticated role is correct
SELECT * FROM information_schema.role_table_grants 
WHERE table_name = 'target_table';

-- Should show grants for 'authenticated' role

-- Grant missing permissions
GRANT SELECT ON target_table TO authenticated;
GRANT INSERT ON target_table TO authenticated;
GRANT UPDATE ON target_table TO authenticated;
```

#### Solution 3: Test with service role

```bash
# Service role key has full permissions
# If this works but authenticated role fails:
# - RLS policy is too restrictive
# - Or auth context is not set properly

curl -s -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage | jq .

# If this works but regular API key fails:
# - Enable RLS debugging:
SET log_statement = 'all';
SET log_rls = on;
-- Then check logs for RLS policy evaluation
```

---

### Issue: Build Fails with "TypeScript Errors"

**Symptoms:**
- `npm run build` fails
- Vercel deployment canceled with "Build error"
- Error mentions "Type is not assignable"

**Diagnosis:**
```bash
# Run local typecheck
npm run typecheck

# Should show same errors as Vercel build
```

**Solutions:**

#### Solution 1: Fix type errors

```bash
# Common issues:
# 1. Property does not exist on type
#    → Check spelling, check interface definition

# 2. Type 'X' is not assignable to type 'Y'
#    → Check types match, use type assertion if needed

# 3. Expected argument of type X, got Y
#    → Check function parameters

# Run type check and fix each error
npm run typecheck

# Commit fix and redeploy
npm run deploy:prod
```

#### Solution 2: Regenerate Supabase types

```bash
# If database schema changed
npm run db:types

# Then run typecheck again
npm run typecheck

# Commit changes
git add lib/database.types.ts
git commit -m "Regenerate Supabase types"
```

#### Solution 3: Check tsconfig

```bash
# Verify tsconfig.json includes correct files
cat tsconfig.json | grep -A 5 '"include"'

# Should include:
# - app/**/*
# - lib/**/*
# - tests/**/*
# - Excluding node_modules, dist, etc.
```

---

### Issue: Authentication Fails (Login Loop)

**Symptoms:**
- User clicks "Sign In" or "Sign Up"
- Redirected back to login page
- Error message: "unexpected error" or similar
- Magic link doesn't work

**Diagnosis:**
```bash
# 1. Check authentication endpoint health
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# 2. Check Supabase connectivity
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# 3. Check browser console for errors
# DevTools → Console → Look for error messages
```

**Solutions:**

#### Solution 1: Verify Supabase auth is enabled

```bash
# Check email auth provider is enabled
# Supabase Dashboard → Authentication → Providers → Email
# Toggle should be ON

# If off: Enable it
```

#### Solution 2: Check site URL configuration

```bash
# Supabase → Project Settings → Authentication → Site URL
# Should be: https://tdealer01-crypto-dsg-control-plane.vercel.app

# Redirect URLs should include:
# - https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/callback
# - https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm

# If wrong: Update in Supabase settings
```

#### Solution 3: Verify APP_URL in Vercel

```bash
# Check APP_URL is set
npx vercel env ls production | grep APP_URL

# Should show:
# APP_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
# or
# NEXT_PUBLIC_APP_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app

# If missing:
npx vercel env add APP_URL production
npx vercel --prod
```

#### Solution 4: Check email SMTP configuration

```bash
# Magic link emails may not send
# Supabase → Project Settings → Email Templates → SMTP
# Check: SMTP host, port, auth configured

# Or use Supabase Resend integration (easier)
# Supabase → Project Settings → Email → Switch to Resend
# Requires Resend API key

# Test by requesting magic link
# You should receive email within 60 seconds
```

#### Solution 5: Clear auth cookies

```bash
# Browser may have invalid session cookies
# DevTools → Application → Cookies
# Delete: auth, session-related cookies
# Then refresh and try login again
```

**See also:** `docs/RUNBOOK_DEPLOY.md` → Login/Magic-Link Troubleshooting

---

## Error Message Interpretation

### Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `ECONNREFUSED` | Database unreachable | Check Supabase status, verify connection string |
| `ETIMEDOUT` | Network timeout | Check firewall, network latency, connection pool |
| `Invalid JWT` | Auth token expired or invalid | Re-authenticate, check NEXT_PUBLIC_SUPABASE_ANON_KEY |
| `RLS violation` | Row-level security policy blocked | Check RLS policy, may need to grant permissions |
| `Foreign key constraint` | Referenced record not found | Check data integrity, verify parent record exists |
| `Unique constraint` | Duplicate value | Check for existing records with same key |
| `No such table` | Migration not applied | Run `supabase db push` |
| `Permission denied` | Missing database grant | Check role permissions, grant if needed |
| `Cold function start` | First request after deploy | Normal, second request will be faster |
| `Function timeout` | Handler took > 30 seconds | Optimize handler, move work to cron |

---

## How to Access Logs

### Vercel Logs

```bash
# View deployment logs
npx vercel logs https://tdealer01-crypto-dsg-control-plane.vercel.app

# View logs for specific deployment
npx vercel logs <deployment-id>

# Stream logs in real-time
npx vercel logs --follow

# Filter logs
npx vercel logs | grep "error"
npx vercel logs | grep "timeout"
```

### Supabase Logs

1. **Query Logs**
   - Supabase Dashboard → Home → Query logs
   - Real-time feed of recent queries
   - Filter by duration, status

2. **Database Logs**
   - Supabase Dashboard → Logs → Database
   - Shows slow queries, lock waits, deadlocks

3. **Function Logs**
   - Supabase Dashboard → Logs → Edge Functions
   - Output from edge function executions

4. **Direct Database Query**
   ```bash
   psql "postgresql://..." \
     -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements 
         ORDER BY mean_exec_time DESC LIMIT 20;"
   ```

### GitHub Actions Logs

```bash
# View recent workflow runs
gh run list --repo <owner>/<repo> -L 10

# View specific workflow logs
gh run view <run-id> --log

# View job logs
gh run view <run-id> --job <job-id>
```

---

## Enable Debug Mode

### Environment Variable Debug Logging

```bash
# Add debug variable to Vercel
npx vercel env add DEBUG "dsg:*" production
npm run deploy:prod

# Then view logs with:
npx vercel logs | grep "dsg:"
```

### Local Debug Testing

```bash
# Set debug env locally
export DEBUG=dsg:*
npm run dev

# Make requests and watch console output
curl -s http://localhost:3000/api/health | jq .
```

### SQL Debug Logging

```bash
# Enable slow query log in Supabase
psql "postgresql://..." \
  -c "ALTER SYSTEM SET log_statement = 'all';"

psql "postgresql://..." \
  -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Reload configuration
psql "postgresql://..." \
  -c "SELECT pg_reload_conf();"

# View logs
# Supabase Dashboard → Logs → Database
```

---

## Escalation Procedures

### When to Escalate

| Situation | Who to Contact | Urgency |
|-----------|---|----------|
| Service completely down | On-call Engineer | Immediate (< 5 min) |
| Partial outage (some endpoints fail) | Team Lead | High (< 15 min) |
| Performance degradation | Team Lead | Medium (< 1 hour) |
| Security incident | Security Lead | Immediate (< 2 min) |
| Data loss / corruption | Team Lead + DBA | Immediate (< 5 min) |
| Compliance issue | Product Owner | High (< 30 min) |

### Escalation Template

```
INCIDENT: [Service Name]
Severity: SEV-1/2/3
Time: [ISO 8601 timestamp]
Status: [INVESTIGATING/MITIGATING/RESOLVED]

Summary:
[1-2 sentences describing the problem]

Impact:
[Which users are affected, which features are down]

Timeline:
- [HH:MM UTC] Issue detected
- [HH:MM UTC] Root cause identified
- [HH:MM UTC] Mitigation started
- [HH:MM UTC] Resolved

Root cause:
[What actually caused the problem]

Fix applied:
[What was done to fix it]

Next steps:
[Follow-up actions, post-incident review schedule]

Contact: [Name/Slack] for updates
```

---

## Support Channels

- **Slack channel**: #incidents or #support
- **Pagerduty**: https://pagerduty.com (if configured)
- **Incident channel**: Automatically created for SEV-1 incidents
- **Post-incident review**: Scheduled within 24 hours of resolution

---

## Additional Resources

- **Deployment Guide**: `docs/DEPLOYMENT_RUNBOOK.md`
- **Incident Response**: `docs/INCIDENT_RESPONSE.md`
- **Rollback Procedures**: `docs/RUNBOOK_ROLLBACK.md`
- **Production Readiness**: `docs/RUNBOOK_DEPLOY.md`

---

## Feedback & Improvements

If you find:
- Missing troubleshooting steps
- Incorrect solution
- New common issue to add

Please update this guide or create an issue with:
- Issue title
- Steps to reproduce
- Expected vs actual behavior
- Proposed solution
