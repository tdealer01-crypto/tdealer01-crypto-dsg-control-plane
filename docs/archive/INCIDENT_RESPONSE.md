# INCIDENT RESPONSE PROCEDURES

Complete operational procedures for responding to production incidents in DSG ONE / ProofGate Control Plane.

For baseline incident classification, see `docs/RUNBOOK_INCIDENT_RESPONSE.md`.
For deployment procedures, see `docs/DEPLOYMENT_RUNBOOK.md`.

---

## Severity Classification

- **SEV-1**: Complete service outage, core runtime disabled, or critical data loss
  - Response time: Immediate (< 5 minutes)
  - Escalation: Page on-call engineer, notify product owner
  
- **SEV-2**: Partial degradation (slow responses, intermittent errors, billing delays)
  - Response time: < 15 minutes
  - Escalation: Notify on-call engineer and team lead
  
- **SEV-3**: Non-critical issues with workaround available
  - Response time: < 1 hour
  - Escalation: Log ticket, discuss in next standup

---

## Immediate Incident Detection

### Check service health (< 2 minutes)

```bash
# 1. Public health check
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Expected:
# {
#   "ok": true,
#   "timestamp": "2026-06-07T12:34:56Z",
#   "environment": "production"
# }

# 2. Core monitor check
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# Expected:
# {
#   "readiness_status": "ready",
#   "dsg_core_mode": "remote",
#   "supabase_connected": true
# }

# 3. Authenticated service check (requires API key)
curl -s -H "Authorization: Bearer <API_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage | jq .
```

### Check system status pages

```bash
# Vercel status
# https://vercel.com/statuspage
# Look for: Control Plane deployment region status

# Supabase status
# https://supabase.com/status
# Look for: Target project region status

# Stripe status
# https://status.stripe.com
# Look for: API availability
```

### Collect error data

```bash
# 1. Check Vercel deployment logs
npx vercel ls                                    # List recent deployments
npx vercel logs <most-recent-deployment-url>    # View logs

# 2. Check Supabase logs
# Dashboard → Logs → Database (for query errors)
# Dashboard → Logs → Edge Functions (for function errors)

# 3. Check error aggregation (if Sentry configured)
# https://sentry.io/organizations/<org>/issues/
# Filter by project: tdealer01-crypto-dsg-control-plane
# Sort by: Most recent events
```

---

## INCIDENT PLAYBOOK: Service Outage (Vercel Deployment Failed)

**Symptom:** All endpoints return 5xx errors or connection refused; `/api/health` fails

### Phase 1: Triage (< 5 minutes)

```bash
# 1. Check deployment status
npx vercel ls                                      # What's deployed?
npx vercel logs <deployment-id>                   # Build logs

# 2. Check Vercel dashboard for common issues
# https://vercel.com/teams/<team>/projects/tdealer01-crypto-dsg-control-plane
# Look for: Failed build, canceled deployment, missing env vars

# 3. Classify the failure
```

### Phase 2: Root Cause Analysis

#### Cause A: Build failed (environment variables missing)

```bash
# Check for missing required vars
npx vercel env ls production | grep -i supabase
npx vercel env ls production | grep -i dsg_core
npx vercel env ls production | grep -i app_url

# Add missing variables
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add APP_URL production
npx vercel env add DSG_CORE_MODE production

# Redeploy
npx vercel --prod
```

#### Cause B: Deployment canceled (unverified commit)

```bash
# If Vercel shows "unverified commit" error

# Option 1: Use GitHub Actions bypass
# Go to: GitHub → Actions → Vercel Production CLI Bypass → Run workflow
# Input: ref = main

# Option 2: Deploy directly with CLI
npx vercel --prod

# Verify health after deploy
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
```

#### Cause C: TypeScript compilation error

```bash
# Check build logs for TypeScript errors
npx vercel logs <deployment-id> | grep -i "error\|typescript"

# Local verification
npm run typecheck
npm run build

# Fix errors, commit, and redeploy
npm run deploy:prod
```

#### Cause D: Database migration not applied

```bash
# Check if migrations are pending
supabase link --project-ref <PROJECT_REF>
supabase db push --dry-run                      # Show pending migrations

# Apply migrations
supabase db push

# Redeploy Vercel to pick up schema changes
npm run deploy:prod
```

### Phase 3: Mitigation

#### If recent good deployment exists

```bash
# View deployment history
npx vercel ls

# Rollback to last known good (See RUNBOOK_ROLLBACK.md)
# Vercel dashboard → Deployments → Previous deployment → Set as production
# Or:
npx vercel alias set <old-deployment-url> tdealer01-crypto-dsg-control-plane.vercel.app

# Verify rollback
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
```

#### If immediate fix not possible

```bash
# Put up maintenance page (if configured)
# Or notify users of degraded service

# Create incident ticket with:
# - Timestamp of failure
# - Last known good deployment
# - Error messages from Vercel logs
# - Attempted fixes
# - Next steps (rollback / fix timeline)
```

### Phase 4: Recovery

```bash
# 1. Re-test after fix/rollback
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# 2. Check Supabase connectivity
curl -s -H "Authorization: Bearer <API_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage | jq .

# 3. Run full readiness gate
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app

# 4. Declare incident resolved when:
# - All health checks green
# - No elevated error rate in logs
# - User traffic returning to normal
```

---

## INCIDENT PLAYBOOK: Database Connection Failures

**Symptom:** Supabase query timeouts, connection pool exhausted, or auth failures

### Phase 1: Immediate Checks (< 5 minutes)

```bash
# 1. Check Supabase project status
# https://supabase.com/status
# Look for: Target project region (e.g., us-east-1)

# 2. Test direct connection
psql "postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/postgres" \
  -c "SELECT version();"

# 3. Check connection pool status (if accessible)
psql "postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/postgres" \
  -c "SELECT count(*) as connection_count FROM pg_stat_activity;"
```

### Phase 2: Root Cause Analysis

#### Cause A: Connection string misconfigured

```bash
# Verify connection string in Vercel env vars
npx vercel env ls production | grep -i supabase

# Check format:
# NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
# SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Test connection directly
curl -s -H "apikey: <ANON_KEY>" \
  "https://<SUPABASE_URL>/rest/v1/rpc/health_check" | jq .

# If fails: Update connection strings
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npm run deploy:prod
```

#### Cause B: Network whitelist / IP restrictions

```bash
# Check if Vercel IP is whitelisted in Supabase
# Supabase Dashboard → Project Settings → Network → IP Whitelist

# Vercel IPs are dynamic; whitelist entire region:
# Add: 0.0.0.0/0 (allow all) OR
# Add: Vercel IP ranges from: https://vercel.com/guides/how-to-allowlist-vercel-ip-addresses

# After whitelisting, test connection
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
```

#### Cause C: Connection pool exhausted

```bash
# Check active connections
psql "postgresql://..." \
  -c "SELECT pid, usename, application_name, state FROM pg_stat_activity;"

# Count by application
psql "postgresql://..." \
  -c "SELECT application_name, COUNT(*) FROM pg_stat_activity GROUP BY application_name;"

# Kill idle connections (if needed)
psql "postgresql://..." \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
      WHERE state = 'idle' AND query_start < now() - interval '5 minutes';"

# Restart application to force new connections
npm run deploy:prod
```

#### Cause D: Database running out of disk space

```bash
# Check disk usage via Supabase dashboard
# Home → Storage Usage

# Check table sizes
psql "postgresql://..." \
  -c "SELECT schemaname, tablename, 
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
      FROM pg_tables WHERE schemaname='public' 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Free space: Archive or delete old logs/events
# If critical: Upgrade Supabase plan for more storage
```

### Phase 3: Mitigation

```bash
# 1. Restart application to reset connection pool
npm run deploy:prod

# 2. If still failing and Supabase is healthy:
# - Scale back traffic (disable non-essential features)
# - Enable read replica if available
# - Check for slow queries:

psql "postgresql://..." \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements 
      ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Optimize queries or add indexes
# - Check for missing indexes on frequently queried columns
# - Review RLS policies for unnecessary joins

# 4. If recovery is delayed:
# - Implement graceful degradation (cache layer)
# - Return cached responses instead of fresh queries
```

### Phase 4: Recovery

```bash
# 1. Verify connectivity restored
curl -s -H "Authorization: Bearer <API_KEY>" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage | jq .

# 2. Monitor connection count
# Check via dashboard every 5 minutes

# 3. Clear any degraded-mode flags
# If graceful degradation was enabled, turn it off

# 4. Run full readiness check
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

---

## INCIDENT PLAYBOOK: Stripe API Failures

**Symptom:** Webhook processing fails, payment processing times out, or Stripe sync errors

### Phase 1: Immediate Checks (< 5 minutes)

```bash
# 1. Check Stripe API status
# https://status.stripe.com

# 2. Verify webhook endpoint is configured
# Stripe Dashboard → Developers → Webhooks
# Check: Endpoint URL and signing secret match production config

# 3. Test Stripe connectivity
curl -s https://api.stripe.com/v1/account \
  -u "<STRIPE_SECRET_KEY>:" | jq .

# Expected: Account details, no errors
```

### Phase 2: Root Cause Analysis

#### Cause A: Stripe API key invalid or expired

```bash
# Verify key in Vercel
npx vercel env ls production | grep STRIPE

# Test key validity
curl -s https://api.stripe.com/v1/account \
  -u "<STORED_KEY>:" | jq .

# If invalid:
# 1. Go to Stripe Dashboard → Developers → API keys
# 2. Copy new Secret Key
# 3. Update in Vercel:
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add STRIPE_WEBHOOK_SECRET production

# 4. Redeploy
npm run deploy:prod
```

#### Cause B: Webhook endpoint not registered

```bash
# Check webhook in Stripe Dashboard
# Developers → Webhooks → Find endpoint for production URL

# If missing:
# 1. Create new webhook endpoint
# 2. Set URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe
# 3. Copy signing secret
# 4. Store in Vercel: STRIPE_WEBHOOK_SECRET
# 5. Enable required events: charge.succeeded, charge.failed, customer.subscription.*

# 6. Test webhook
stripe listen --forward-to https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe
stripe trigger charge.succeeded
```

#### Cause C: Webhook signature validation failing

```bash
# Check logs for signature mismatch
npx vercel logs <deployment-id> | grep -i "signature\|webhook"

# Verify signing secret hasn't changed:
# Stripe → Developers → Webhooks → Click endpoint → Signing secret

# If changed:
# 1. Copy new signing secret
# 2. Update: npx vercel env add STRIPE_WEBHOOK_SECRET production
# 3. Redeploy: npm run deploy:prod

# 4. Replay failed events in Stripe dashboard
```

#### Cause D: Price IDs misconfigured

```bash
# Verify price IDs in Vercel
npx vercel env ls production | grep STRIPE_PRICE

# Expected:
# STRIPE_PRICE_PRO=price_xxxxx
# STRIPE_PRICE_BUSINESS=price_xxxxx

# Verify prices exist in Stripe
curl -s https://api.stripe.com/v1/prices/price_xxxxx \
  -u "<STRIPE_SECRET_KEY>:" | jq .

# If missing or wrong:
# 1. Get correct price IDs from Stripe Dashboard
# 2. Update in Vercel:
npx vercel env add STRIPE_PRICE_PRO production
npx vercel env add STRIPE_PRICE_BUSINESS production
# 3. Redeploy
npm run deploy:prod
```

#### Cause E: Rate limit exceeded

```bash
# Check if rate-limited (Stripe API returns 429)
npx vercel logs <deployment-id> | grep "429\|rate limit"

# Check Stripe usage dashboard
# Developers → API Dashboard → Requests

# If rate limited:
# - Space out requests in application code
# - Batch API calls where possible
# - Consider upgrading Stripe plan for higher limits
```

### Phase 3: Mitigation

```bash
# 1. Temporarily disable non-critical Stripe calls
# - Queue webhook processing instead of synchronous
# - Delay reconciliation tasks

# 2. Implement exponential backoff for retries
# - First retry: 1 second delay
# - Second retry: 2 second delay
# - Third retry: 4 second delay

# 3. If Stripe API is down:
# - Use cached pricing data
# - Queue billing operations for later processing
# - Notify users of payment processing delays

# 4. Replay missed webhook events
# Stripe → Developers → Webhooks → Event logs
# Click event → Resend
```

### Phase 4: Recovery

```bash
# 1. Verify Stripe connectivity restored
curl -s https://api.stripe.com/v1/account \
  -u "<STRIPE_SECRET_KEY>:" | jq .

# 2. Check for webhook backlog
# Stripe Dashboard → Developers → Webhooks → Event logs

# 3. Replay any failed events (manually or via script)

# 4. Reconcile billing records
# Run: npm run ops:stripe-reconcile (if script exists)

# 5. Verify recent charges in Supabase
# Dashboard → SQL Editor
# SELECT * FROM billing_subscriptions ORDER BY created_at DESC LIMIT 10;

# 6. Monitor Stripe events for next 30 minutes
```

---

## INCIDENT PLAYBOOK: Webhook Processing Failures

**Symptom:** Webhook events not processed, stored procedures fail, or event backlog grows

### Phase 1: Immediate Checks (< 5 minutes)

```bash
# 1. Check webhook endpoint health
curl -s -X POST \
  -H "Content-Type: application/json" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe \
  -d '{"type":"test","data":{}}' -H "stripe-signature: test_signature"

# Expected: 401/403 (signature fails, which is OK for test)
# Bad: 500, timeout, or connection refused

# 2. Check Stripe webhook delivery failures
# Stripe Dashboard → Developers → Webhooks → Click endpoint
# Look for: Failed events, delivery status

# 3. Check Supabase for webhook processing errors
# Dashboard → Logs → Database
# Filter for: webhook, stripe, error
```

### Phase 2: Root Cause Analysis

#### Cause A: Webhook signature validation failing

```bash
# See "INCIDENT PLAYBOOK: Stripe API Failures" above for detailed steps

# Quick fix:
npx vercel env add STRIPE_WEBHOOK_SECRET production
npm run deploy:prod
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
```

#### Cause B: Request body parsing failing

```bash
# Check webhook handler for parsing errors
cat app/api/webhooks/stripe/route.ts | grep -A 10 "parseRequest\|readBody"

# Common issues:
# - Content-Type not application/json
# - Request body > max size (usually 1MB)
# - JSON not valid

# Test with valid JSON
curl -s -X POST \
  -H "Content-Type: application/json" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe \
  -d '{"type":"charge.succeeded","data":{"object":{"id":"ch_test"}}}' \
  -H "stripe-signature: fake_sig"
```

#### Cause C: Rate limiting blocks webhook processing

```bash
# Check if rate limiting is too strict
# Check: lib/security/rate-limiting.ts or similar

# Common issue: Webhook requests counted against user rate limit
# Solution: Whitelist webhook endpoints or use separate rate limit

# Verify rate limit config
npx vercel env ls production | grep -i rate
```

#### Cause D: Webhook handler timeout (>30 seconds)

```bash
# Check webhook handler execution time
npx vercel logs <deployment-id> | grep -i "webhook\|timeout"

# If handler takes > 30 seconds:
# - Move expensive operations to background job
# - Cache results instead of computing on-the-fly
# - Use async processing: save webhook data, process asynchronously

# Vercel function timeout is 30 seconds for Hobby/Pro plans
# Quick fix: Return 200 immediately, process asynchronously
```

#### Cause E: Database constraint violation in webhook handler

```bash
# Check Supabase logs for constraint violations
# Dashboard → Logs → Database
# Look for: "violates foreign key constraint", "unique constraint"

# View recent webhook processing errors
psql "postgresql://..." \
  -c "SELECT * FROM webhook_events WHERE status='failed' 
      ORDER BY created_at DESC LIMIT 10;"

# Check what constraints are failing
# Fix the handler logic or the data before processing

# Manually reprocess failed webhooks (if safe):
# UPDATE webhook_events SET status='pending' WHERE id IN (...)
# Then trigger reprocessing
```

### Phase 3: Mitigation

```bash
# 1. Disable webhook processing temporarily (if safe)
# Add: if (process.env.DISABLE_WEBHOOKS === 'true') return new Response(null, { status: 202 });

# Set temporarily:
npx vercel env add DISABLE_WEBHOOKS true production
npm run deploy:prod

# 2. Queue failed events for later processing
# Save webhook payload to database with status='pending'
# Process asynchronously via cron job

# 3. Pause dependent processes
# Stop billing reconciliation or sync jobs until webhooks catch up

# 4. Alert Stripe team if endpoint is down
# Consider alternative webhook delivery (direct polling)
```

### Phase 4: Recovery

```bash
# 1. Fix underlying issue (signature, timeout, constraints)

# 2. Remove temporary disables
npx vercel env rm DISABLE_WEBHOOKS production
npm run deploy:prod

# 3. Replay failed webhook events
# Stripe Dashboard → Developers → Webhooks → Event logs
# Select failed events → Resend

# 4. Process any queued webhook data
# Run: npm run ops:webhook-backlog-process (if script exists)

# 5. Verify recent webhook activity
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# 6. Monitor webhook logs for next hour
npx vercel logs <deployment-id> | grep -i webhook | tail -20
```

---

## INCIDENT PLAYBOOK: High Latency / Timeouts

**Symptom:** Requests take > 5 seconds, some endpoints timeout (504), users report slowness

### Phase 1: Immediate Checks (< 5 minutes)

```bash
# 1. Check endpoint response times
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor | jq .

# 2. Check Vercel function metrics
npx vercel inspect <current-deployment-url>
# Look for: CPU time, memory usage, duration

# 3. Check Supabase query performance
# Dashboard → Logs → Database
# Look for: Long-running queries, slow query log

# 4. Check network latency
ping https://tdealer01-crypto-dsg-control-plane.vercel.app
curl -w "@curl-format.txt" -o /dev/null -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

### Phase 2: Root Cause Analysis

#### Cause A: Redis/cache connection slow or down

```bash
# Check Redis status (if using Upstash)
# Upstash Dashboard → Metrics

# Test Redis connection
redis-cli -u "redis://<TOKEN>@<HOST>:<PORT>" ping
# Expected: PONG

# If slow or down:
# - Check Redis memory usage (near limit?)
# - Check network latency to Redis
# - Consider regional Redis instance closer to Vercel

# Temporary fix: Disable caching
npx vercel env add REDIS_DISABLED true production
npm run deploy:prod

# Then test response times again
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

#### Cause B: Slow database queries

```bash
# Identify slow queries
psql "postgresql://..." \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements 
      WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze slow query plan
psql "postgresql://..." \
  -c "EXPLAIN ANALYZE SELECT ... [your slow query];"

# Look for: Sequential scans on large tables, missing indexes

# Add missing indexes
# Example:
psql "postgresql://..." \
  -c "CREATE INDEX idx_table_column ON public.table(column) CONCURRENTLY;"

# Monitor after adding index
# SELECT query, mean_exec_time FROM pg_stat_statements WHERE query LIKE '%table%' ORDER BY mean_exec_time DESC;
```

#### Cause C: RLS policies causing N+1 queries

```bash
# Check for complex RLS policies
# Dashboard → SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'target_table';

# RLS policies can cause additional queries
# Solution: Simplify policies or use row-level caching

# Verify query count before/after
psql "postgresql://..." -c "SELECT count(*) as query_count FROM pg_stat_statements;"

# If RLS is culprit:
# - Temporarily disable RLS for testing (NOT for production)
# - Profile queries with RLS disabled
# - Optimize policy logic
```

#### Cause D: Function timeout (execution takes > 30 seconds)

```bash
# Check Vercel function timeout
npx vercel inspect <deployment-url>
# Look for: Duration, timeout setting

# If function times out:
# - Move work to background job (cron)
# - Cache results and serve cached data
# - Paginate results to reduce computation

# Check specific slow routes
cat app/api/[slow-route]/route.ts
# Look for: Expensive loops, unoptimized queries, external API calls
```

#### Cause E: Cold start latency (first request after deploy)

```bash
# Cold starts add 100-500ms to first request
# This is normal for serverless; can't be eliminated

# Mitigation:
# - Use Vercel Analytics to track cold starts
# - Pre-warm functions with cron job pings
# - Accept slight latency increase for first few requests after deploy

# Test if cold start is the issue
npm run deploy:prod
sleep 30  # Wait for function to cool down
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health  # Should be faster

# If second request is fast, it's a cold start
```

### Phase 3: Mitigation

```bash
# 1. Implement response caching for slow endpoints
# Add: Cache-Control: public, max-age=60

# 2. Reduce query scope
# - Add pagination
# - Filter results before returning
# - Limit joins

# 3. Implement request deduplication
# - Cache identical requests for 1-5 seconds
# - Prevent thundering herd on cold starts

# 4. Scale up resources
# - Upgrade Supabase plan (faster compute)
# - Upgrade Vercel plan (more function concurrency)
# - Add Redis for caching (if not already)

# 5. If issue is persistent, rollback to previous deploy
npm run deploy:prod  # Or rollback via Vercel dashboard
```

### Phase 4: Recovery

```bash
# 1. Verify response times improved
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
time curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor

# 2. Monitor database performance
# Dashboard → Logs → Database (next 30 minutes)

# 3. Monitor Vercel function metrics
# Deployments → Click deployment → Metrics

# 4. If latency still high:
# - Check for new traffic spike (DDoS?)
# - Check for new long-running job (batch process?)
# - Investigate application code changes in last deployment

# 5. Document root cause and improvements made
```

---

## INCIDENT PLAYBOOK: Security Incidents

**Symptom:** Unauthorized access, API key compromised, or suspicious activity detected

### Phase 1: Immediate Containment (< 2 minutes)

```bash
# 1. ROTATE COMPROMISED API KEYS IMMEDIATELY
npx vercel env ls production | grep -i key | grep -v "NEXT_PUBLIC"

# For each secret key (Stripe, Supabase, etc.):
# 1. Go to service dashboard and generate new key
# 2. Update in Vercel: npx vercel env add <KEY_NAME> production
# 3. Redeploy: npm run deploy:prod

# 2. Rotate webhook secrets (Stripe, etc.)
npx vercel env add STRIPE_WEBHOOK_SECRET production
npm run deploy:prod

# 3. Disable affected services (if compromised)
npx vercel env add SERVICE_DISABLED true production
npm run deploy:prod
```

### Phase 2: Investigation

```bash
# 1. Review access logs
# Dashboard → Logs → Request logs
# Filter for: Unusual IPs, repeated 401/403, rapid requests

# 2. Check audit logs in Supabase
# Dashboard → Logs → Database
# Look for: Unexpected DELETE/UPDATE operations, ALTER TABLE changes

# 3. Check Vercel deployment history
npx vercel ls
# Look for: Unauthorized deployments, code changes you didn't make

# 4. Review GitHub commit history
git log --oneline -20
# Look for: Unexpected commits, pushes from unknown authors

# 5. Check for data exfiltration
# Look for: Large exports, API usage spike, unusual queries
psql "postgresql://..." \
  -c "SELECT * FROM pg_stat_statements 
      WHERE query LIKE '%SELECT%' 
      ORDER BY calls DESC LIMIT 20;"
```

### Phase 3: Incident Response

#### If API key was exposed

```bash
# 1. Rotate the key immediately
# See Phase 1 above

# 2. Review API usage from compromised key
# Check logs for: What data was accessed, when, from which IPs

# 3. Check for abuse
# - Unexpected charges on Stripe
# - Database queries consuming quota
# - External API calls made on your account

# 4. If data was accessed:
# - Assess what data was exposed
# - Notify affected users if necessary
# - Document incident in security log

# 5. Reset the key across all services
# Don't just rotate in Vercel; update everywhere it's used
```

#### If unauthorized database access

```bash
# 1. Audit who has database access
psql "postgresql://..." \
  -c "SELECT grantee, privilege_type FROM information_schema.table_privileges 
      WHERE table_name='public';"

# 2. Review RLS policies
SELECT * FROM pg_policies;

# 3. Revoke unauthorized access
psql "postgresql://..." \
  -c "REVOKE <privilege> ON <table> FROM <role>;"

# 4. Reset database password
# Supabase Dashboard → Project Settings → Database
# Note: This will require updating SUPABASE_SERVICE_ROLE_KEY in Vercel
```

#### If unauthorized GitHub commits

```bash
# 1. Review recent commits
git log --oneline -20

# 2. If unauthorized commit found:
# Create a revert commit
git revert <commit-hash>
git push origin main

# 3. Check GitHub security settings
# Settings → Security & analysis → Review branch protection rules
# Ensure: Require status checks before merging

# 4. Check collaborators
# Settings → Collaborators
# Remove anyone who shouldn't have access

# 5. Review webhook delivery
# Settings → Webhooks
# Check: Who has deploy permissions
```

### Phase 4: Post-Incident

```bash
# 1. Update security procedures
# - Add IP whitelisting if not present
# - Implement API key rotation schedule
# - Add two-factor auth to all accounts

# 2. Enable security monitoring
npx vercel env add SECURITY_MONITORING true production
npm run deploy:prod

# 3. Document incident
# Create security incident report with:
# - What happened
# - When it was detected
# - Impact assessment
# - Actions taken
# - Preventive measures for future

# 4. Review with team
# Discuss incident in retro, update playbooks based on learnings

# 5. Monitor closely for next 7 days
# Check logs daily for any recurrence
```

---

## Incident Communication Template

### Initial Notification (first alert)

```
INCIDENT: [Service name] [SEV-1/2/3]
Time: [UTC timestamp]
Status: INVESTIGATING
Summary: [1-2 sentences of what's wrong]
Impact: [What users are affected, what's not working]
ETA: [Estimated time to resolution, if known]
```

### Status Update (every 15 minutes until resolved)

```
Status: [INVESTIGATING/MITIGATING/RECOVERING]
Latest findings: [What we learned in last 15 min]
Actions taken: [What we did to fix it]
Next steps: [What's happening next]
ETA: [Updated estimate]
```

### Resolution Notification (when fixed)

```
Status: RESOLVED
Root cause: [What actually caused the problem]
Timeline: [When incident started, peak impact, resolution]
Duration: [How long it lasted]
Impact summary: [How many users, which features]
Next steps: [Post-incident review scheduled for...]
```

---

## Incident Checklist

### During incident (active response)

- [ ] Declare incident severity (SEV-1/2/3)
- [ ] Page on-call engineer
- [ ] Start incident channel/call
- [ ] Initial triage (< 5 min)
- [ ] Root cause hypothesis (< 15 min)
- [ ] Mitigation started (< 30 min)
- [ ] Send status updates every 15 minutes
- [ ] Implement fix or rollback
- [ ] Verify resolution (multiple checks)

### After incident (30 minutes - 24 hours)

- [ ] Document root cause
- [ ] Document timeline and actions taken
- [ ] Identify prevention measures
- [ ] Schedule post-incident review
- [ ] Update runbooks with lessons learned
- [ ] Fix identified issues in code/config
- [ ] Deploy fixes to production
- [ ] Monitor closely for recurrence

### Post-incident review (within 3 days)

- [ ] Discuss what happened and why
- [ ] Discuss how it was detected and handled
- [ ] Discuss what could be improved
- [ ] Assign action items for prevention
- [ ] Update documentation/runbooks
- [ ] Share learnings with team

---

## Escalation Contacts

Update this section with actual team contact info:

| Role | Name | Slack | Phone | Email |
|------|------|-------|-------|-------|
| On-call Engineer | [Name] | @slack | +1-xxx-xxx-xxxx | email@example.com |
| Team Lead | [Name] | @slack | +1-xxx-xxx-xxxx | email@example.com |
| Product Owner | [Name] | @slack | +1-xxx-xxx-xxxx | email@example.com |
| Security Lead | [Name] | @slack | +1-xxx-xxx-xxxx | email@example.com |

---

## External Dependencies Status Pages

- **Vercel**: https://vercel.com/statuspage
- **Supabase**: https://supabase.com/status
- **Stripe**: https://status.stripe.com
- **GitHub**: https://www.githubstatus.com
