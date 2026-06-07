# Deployment Verification Matrix

This document describes all 15 verification checks performed by the comprehensive deployment verification suite and provides remediation guidance.

**Quick Reference:**
- **Full Checks:** `./scripts/full-deployment-check.sh <url>` (2-5 minutes)
- **Quick Check:** `./scripts/quick-health-check.sh <url>` (10 seconds)
- **Continuous Monitor:** `./scripts/continuous-monitor.sh <url>` (on-demand)

---

## Table of Contents

1. [Check Definitions](#check-definitions)
2. [Expected Results](#expected-results)
3. [Failure Interpretation](#failure-interpretation)
4. [GO/NO-GO Decision Tree](#gono-go-decision-tree)
5. [Remediation Procedures](#remediation-procedures)
6. [Environment Checklist](#environment-checklist)

---

## Check Definitions

### Check 1: Health Endpoint Responds

**What it checks:**
- The `/api/health` endpoint is reachable and returns HTTP 200
- JSON response contains valid health metadata

**Expected behavior:**
```
HTTP 200 OK
{
  "ok": true,
  "service": "dsg-control-plane",
  "timestamp": "2026-06-07T...",
  "core_ok": true,
  "db_ok": true,
  ...
}
```

**Verifies:**
- Deployment is live and routable
- Application process is running
- Basic JSON response format

---

### Check 2: Readiness Endpoint Responds

**What it checks:**
- The `/api/readiness` endpoint is reachable and returns HTTP 200
- Indicates whether the service is ready to accept traffic

**Expected behavior:**
```
HTTP 200 OK
{
  "ok": true,
  "checks": {
    "env": { "ok": true },
    "supabaseServiceRole": { "ok": true },
    ...
  },
  "timestamp": "2026-06-07T..."
}
```

**Verifies:**
- Service has completed startup initialization
- Environment variables are loaded
- Required dependencies are configured

---

### Check 3: Agent Status Endpoint Responds

**What it checks:**
- The `/api/agent/status` endpoint is reachable and returns HTTP 200
- Provides deployment identity and version information

**Expected behavior:**
```
HTTP 200 OK
{
  "repo": "tdealer01-crypto-dsg-control-plane",
  "commit": "abc123def...",
  "version": "1.2.3",
  "env": "production",
  "ts": "2026-06-07T..."
}
```

**Verifies:**
- Deployment commit is trackable
- Version information is accessible
- Environment is correctly configured

---

### Check 4: Database Connectivity

**What it checks:**
- Supabase database (PostgreSQL) is reachable and responsive
- Service can connect and run basic queries
- Connection pooling is working

**Expected behavior:**
- `db_ok: true` in `/api/health` response
- No connection timeouts
- Query latency < 500ms

**Verifies:**
- Database cluster is accessible from deployment
- Service role credentials are valid
- Network connectivity to database is available

---

### Check 5: Rate Limiter (Redis) Configured

**What it checks:**
- Upstash Redis rate limiter is configured and accessible
- Required environment variables are set
- Connection to Redis is established

**Expected behavior:**
```
"rateLimiter": {
  "ok": true,
  "detail": "configured; health endpoint does not consume limiter bucket"
}
```

**Verifies:**
- `UPSTASH_REDIS_REST_URL` is set
- `UPSTASH_REDIS_REST_TOKEN` is valid
- Rate limiting can be enforced on `/api/execute`

**Note:** Rate limiter is optional for some environments. If missing, execution endpoints will fail closed.

---

### Check 6: DSG Core Health

**What it checks:**
- Core governance/execution engine is operational
- Policy engine can initialize
- Remote core service (if configured) is reachable

**Expected behavior:**
- `core_ok: true` in `/api/health`
- Core service responds within timeout
- Policy evaluation is available

**Verifies:**
- Governance pipeline is ready
- Decision making engine is operational
- Core service connectivity is healthy

---

### Check 7: Execute Endpoint Accessible

**What it checks:**
- `/api/execute` route is defined and enforces security
- Bearer token authentication is required
- Endpoint is not returning 404

**Expected behavior:**
- GET returns HTTP 405 (Method Not Allowed) or 400/401 (auth required)
- POST requires Authorization header
- Route exists and is properly secured

**Verifies:**
- Governed execution path is deployed
- Security controls are in place
- Authentication enforcement is active

---

### Check 8: Webhook Endpoint Configured

**What it checks:**
- Stripe webhook endpoint is configured at `/api/webhooks/stripe`
- Webhook signature validation is enforced
- Endpoint exists and is protected

**Expected behavior:**
- Unauthenticated POST returns HTTP 400/401 (signature validation required)
- Invalid signature is rejected
- Valid Stripe events are accepted

**Verifies:**
- Billing webhook receiver is deployed
- Signature validation is active
- Stripe events can be processed

---

### Check 9: Auth Endpoints Responsive

**What it checks:**
- Authentication system endpoints are deployed
- Auth routes respond with appropriate codes
- Session/credential handling is available

**Expected behavior:**
- `/api/auth/session` responds with HTTP 200 (authenticated) or 401 (not authenticated)
- Auth endpoints do not return 404
- CORS handling is correct

**Verifies:**
- Authentication layer is available
- Session handling is operational
- Auth system is properly configured

---

### Check 10: Trust Surface Pages Accessible

**What it checks:**
- Legal/trust pages are deployed and accessible
- `/terms`, `/privacy`, `/security` are available
- Pages return HTTP 200

**Expected behavior:**
- All three pages return HTTP 200
- Pages contain valid HTML content
- No redirect loops

**Verifies:**
- Legal compliance pages are available
- Documentation site is healthy
- Public-facing pages are deployed

---

### Check 11: Security Headers Configured

**What it checks:**
- Critical security headers are present
- Content Security Policy is set
- Clickjacking protection is enabled
- Content type sniffing is prevented

**Expected headers:**
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`

**Expected behavior:**
- At least 2 of 3 headers present (some may be optional)
- Headers contain valid directives
- No header-related warnings

**Verifies:**
- Security controls are configured
- Protection against common web attacks is enabled
- Next.js security middleware is active

---

### Check 12: Response Times Within SLA

**What it checks:**
- All critical endpoints respond within 500ms
- Response time is measured end-to-end
- No service is experiencing slowness

**Expected behavior:**
- `/api/health` < 500ms
- `/api/readiness` < 500ms
- `/api/agent/status` < 500ms

**Acceptable ranges:**
- < 200ms: Excellent
- 200-300ms: Good
- 300-500ms: Acceptable
- > 500ms: Slow (warning)

**Verifies:**
- Performance is acceptable
- No obvious bottlenecks
- Service is responsive to users

---

### Check 13: Error Handling (404 for Missing Routes)

**What it checks:**
- Non-existent routes return HTTP 404
- Error handling middleware is active
- Error responses are properly formatted

**Expected behavior:**
- `/api/nonexistent-endpoint-check` returns HTTP 404
- 404 response has valid error message
- No stack traces exposed

**Verifies:**
- Error handling is configured
- 404 responses are clean
- No accidental information disclosure

---

### Check 14: Deployment Environment Detected

**What it checks:**
- Environment name is correctly detected
- Environment is either "production", "staging", or "development"
- Environment variable is properly set

**Expected behavior:**
- `/api/agent/status` returns `env: "production"` (or configured environment)
- Environment is readable
- Deployment knows its own environment

**Verifies:**
- Environment configuration is correct
- Service understands its deployment context
- Feature flags can be conditionally applied

---

### Check 15: Deployment Commit Tracked

**What it checks:**
- Deployment commit hash is present and trackable
- Source code version is known
- Changes are auditable

**Expected behavior:**
- `/api/agent/status` returns valid commit hash (e.g., "abc123def...")
- Commit hash matches deployed source
- Version information is consistent

**Verifies:**
- Deployment is reproducible
- Source code version is known
- Audit trail is complete

---

## Expected Results

### All Checks Pass (GO Status)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GO STATUS: ALL CHECKS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Results:
  Passed: 15/15
  Failed: 0/15
  Success Rate: 100%
```

**What this means:**
- ✓ Deployment is healthy and ready for use
- ✓ All critical services are operational
- ✓ Security controls are in place
- ✓ Performance is within acceptable limits
- ✓ Safe to accept user traffic

### Partial Failure (NO-GO Status)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NO-GO STATUS: 2 CHECK(S) FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Results:
  Passed: 13/15
  Failed: 2/15
  Success Rate: 86%
```

**What this means:**
- ✗ One or more critical services are failing
- ✗ Deployment is not ready for traffic
- ✗ Remediation required before going live
- ✗ Review specific failures for details

---

## Failure Interpretation

### Database Connectivity Fails

**Symptom:**
```
❌ FAIL: Database check failed (db_ok=false)
```

**Possible causes:**
1. Database cluster is unavailable
2. Service role credentials are invalid
3. Network connectivity is broken
4. Connection pool is exhausted
5. Database schema is not initialized

**Remediation steps:**
1. Check Supabase project status in dashboard
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Verify `NEXT_PUBLIC_SUPABASE_URL` is set
4. Check database IP whitelist (if applicable)
5. Run migrations: `npm run db:seed` or check Supabase console
6. See [Database Troubleshooting](#database-troubleshooting)

---

### Rate Limiter Not Configured

**Symptom:**
```
❌ FAIL: Rate limiter not properly configured
```

**Possible causes:**
1. `UPSTASH_REDIS_REST_URL` not set in environment
2. `UPSTASH_REDIS_REST_TOKEN` is invalid or expired
3. Upstash Redis cluster is down
4. Network connectivity to Redis is blocked

**Remediation steps:**
1. Verify Redis URL: `echo $UPSTASH_REDIS_REST_URL`
2. Check Upstash dashboard for cluster status
3. Verify tokens are current (may need to regenerate)
4. For production: Set both env vars before deployment
5. See [Rate Limiter Setup](#rate-limiter-setup)

**Note:** If intentionally disabling rate limiting for testing:
- Rate limiting is optional for some environments
- Execution endpoints will fail closed without it
- Not recommended for production

---

### Core Health Fails

**Symptom:**
```
❌ FAIL: DSG Core is healthy (core_ok=false)
```

**Possible causes:**
1. DSG Core service is not reachable
2. Core initialization failed
3. Policy engine cannot load
4. Remote core service (if configured) is down

**Remediation steps:**
1. Check `/api/health` response for error detail
2. Verify `DSG_CORE_URL` (if using remote core)
3. Verify `DSG_CORE_API_KEY` is valid
4. Check service logs in Vercel dashboard
5. See [Core Troubleshooting](#core-troubleshooting)

---

### Security Headers Missing

**Symptom:**
```
⚠️ FAIL: Security headers missing (1/3)
```

**Possible causes:**
1. Next.js middleware is not applying headers
2. `next.config.js` security configuration is incomplete
3. Reverse proxy is stripping headers

**Remediation steps:**
1. Check `next.config.js` for `headers()` configuration
2. Verify `middleware.ts` is present and applied
3. Check Vercel deployment logs for middleware execution
4. Ensure CSP, X-Frame-Options, X-Content-Type-Options are set
5. See [Security Headers Setup](#security-headers-setup)

---

### Response Times Exceed SLA

**Symptom:**
```
⚠️ FAIL: /api/health: 750ms (exceeds SLA)
```

**Possible causes:**
1. Database queries are slow
2. External service dependencies are slow
3. Function cold start (serverless)
4. High server load
5. Network latency

**Remediation steps:**
1. Check database query performance in Supabase console
2. Verify no N+1 queries in code
3. Check Vercel function analytics
4. Look for database indexes on frequently queried columns
5. Consider caching strategies
6. See [Performance Optimization](#performance-optimization)

---

### Webhook Endpoint Not Found

**Symptom:**
```
❌ FAIL: Webhook endpoint not found (HTTP 404)
```

**Possible causes:**
1. Stripe webhook route is not deployed
2. Route file is missing or has wrong path
3. Webhook handler is not exported
4. Deployment did not include route

**Remediation steps:**
1. Verify `app/api/webhooks/stripe/route.ts` exists
2. Check route exports `POST` function
3. Run `npm run build` locally and verify build succeeds
4. Check Vercel build logs for deployment errors
5. Verify webhook secret in Stripe dashboard
6. See [Webhook Setup](#webhook-setup)

---

### Auth Endpoints Not Responding

**Symptom:**
```
❌ FAIL: Auth endpoint not responding correctly (HTTP 404)
```

**Possible causes:**
1. Auth routes are not deployed
2. NextAuth configuration is incomplete
3. Supabase auth adapter is not initialized
4. Auth middleware is failing

**Remediation steps:**
1. Verify auth routes exist in `app/api/auth/...`
2. Check `NEXTAUTH_SECRET` is set
3. Verify Supabase auth is configured
4. Check auth adapter in `app/api/auth/[...nextauth]/route.ts`
5. Check middleware.ts applies auth properly
6. See [Auth Setup](#auth-setup)

---

## GO/NO-GO Decision Tree

Use this flowchart to determine deployment readiness:

```
START
  ↓
Is Check 1 (Health) passing?
  ├─ NO  → Service unreachable → STOP, debug deployment
  ├─ YES ↓
    Is Check 4 (Database) passing?
      ├─ NO  → Database unavailable → STOP, check Supabase
      ├─ YES ↓
        Is Check 5 (Rate Limiter) passing?
          ├─ NO  → Rate limiting unavailable
          │         Is this intentional?
          │         ├─ YES (local testing) → Continue cautiously
          │         ├─ NO (production) → STOP, configure Redis
          ├─ YES ↓
            Are all other checks (2,3,6,7,8,9,10,11) passing?
              ├─ < 2 failures → Check warnings only → Continue
              ├─ ≥ 2 failures → Multiple systems failing → STOP, review failures
              ├─ All pass ↓
                Are performance checks (12,13,14,15) passing?
                  ├─ < 1 failure → Minor issues only → CAUTION, monitor
                  ├─ ≥ 1 failure → Performance degraded → CAUTION, investigate
                  ├─ All pass ↓
                    ALL CHECKS PASS → GO FOR DEPLOYMENT ✓
```

---

## Remediation Procedures

### Database Troubleshooting

**Quick Check:**
```bash
# Test local database connectivity
npm run test:live:db
```

**Vercel Environment:**
1. Go to Vercel Project → Settings → Environment Variables
2. Verify these are set:
   - `NEXT_PUBLIC_SUPABASE_URL` (public URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, not public)
3. Test in Vercel CLI:
   ```bash
   vercel env pull
   npm run test:live:db
   ```

**Supabase Checks:**
1. Go to Supabase Project → Settings → Database
2. Verify:
   - Database is in "Active" state
   - Connection limit is sufficient
   - Network is not blocking connections
3. Check migrations:
   ```bash
   npm run db:types  # regenerate types
   ```

**Common Issues:**
- Wrong project URL → Check Supabase dashboard URL vs. env var
- Invalid key → Regenerate in Supabase Settings → API Keys
- Migration not applied → Check Supabase Migrations tab
- IP whitelist → Add Vercel IP to allowlist in Supabase

---

### Rate Limiter Setup

**For Production (Upstash Redis):**

1. Create Upstash Redis cluster:
   - Go to https://console.upstash.com
   - Create new Redis database in your region
   - Copy REST URL and REST Token

2. Add to Vercel:
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL
   # Paste: https://YOUR-ID.upstash.io/

   vercel env add UPSTASH_REDIS_REST_TOKEN
   # Paste: YOUR-SECRET-TOKEN
   ```

3. Redeploy:
   ```bash
   vercel deploy --prod
   ```

4. Verify:
   ```bash
   ./scripts/quick-health-check.sh https://your-app.vercel.app
   ```

**For Local Development:**
- Rate limiter is optional for `npm run dev`
- Can skip setting Upstash URLs locally
- Tests will mock Redis

---

### Core Troubleshooting

**Check Core Status:**
```bash
./scripts/quick-health-check.sh https://your-app.vercel.app | grep "Core Service"
```

**Internal Core (default):**
- Core is bundled with app
- No external service needed
- If failing, check: `lib/dsg/` files exist

**Remote Core:**
1. Verify `DSG_CORE_URL` is set
2. Verify `DSG_CORE_API_KEY` is valid
3. Test remote endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR-KEY" \
     https://remote-core-service/health
   ```

---

### Security Headers Setup

**Verify Headers:**
```bash
curl -I https://your-app.vercel.app/api/health
```

Should show:
```
Content-Security-Policy: ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

**Configure (next.config.js):**
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'"
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        }
      ]
    }
  ]
}
```

---

### Performance Optimization

**Quick Wins:**
1. Enable compression in `next.config.js`:
   ```javascript
   compress: true
   ```

2. Add database indexes:
   ```sql
   CREATE INDEX idx_executions_created
     ON runtimes(created_at DESC);
   ```

3. Cache health endpoint (30 seconds):
   ```javascript
   response.headers.set('Cache-Control', 'public, max-age=30');
   ```

4. Profile with Vercel Analytics:
   - Go to Vercel Project → Analytics → Web Vitals

---

### Webhook Setup

**Stripe Webhook Configuration:**

1. Create webhook in Stripe:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `customer.subscription.updated`
   - Copy signing secret

2. Add to Vercel:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET
   # Paste: whsec_...
   ```

3. Test webhook:
   ```bash
   ./scripts/test-stripe-webhook.sh https://your-app.vercel.app
   ```

---

### Auth Setup

**For Supabase Auth:**

1. Enable Auth in Supabase:
   - Go to Project → Settings → Authentication
   - Configure allowed redirect URLs:
     ```
     http://localhost:3000/**
     https://your-app.vercel.app/**
     ```

2. Add NEXTAUTH config:
   ```bash
   vercel env add NEXTAUTH_SECRET
   # Generate: openssl rand -base64 32
   ```

3. Verify routes exist:
   ```bash
   ls -la app/api/auth/*/route.ts
   ```

---

## Environment Checklist

### Required Environment Variables

**Supabase:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (public)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (secret)

**Stripe:**
- [ ] `STRIPE_SECRET_KEY` (secret)
- [ ] `STRIPE_WEBHOOK_SECRET` (secret)
- [ ] `STRIPE_PRICE_PRO` (public, Stripe price ID)

**Rate Limiting:**
- [ ] `UPSTASH_REDIS_REST_URL` (public)
- [ ] `UPSTASH_REDIS_REST_TOKEN` (secret)

**Authentication:**
- [ ] `NEXTAUTH_SECRET` (secret)

**Application:**
- [ ] `NEXT_PUBLIC_APP_URL` (public, app root)
- [ ] `APP_URL` (internal, app root)

**Total Required (Production):** 11 environment variables

### Verification Commands

```bash
# Check all required env vars are set (in Vercel)
vercel env ls

# Run full deployment check
./scripts/full-deployment-check.sh https://your-app.vercel.app

# Quick health check
./scripts/quick-health-check.sh https://your-app.vercel.app

# Continuous monitoring
./scripts/continuous-monitor.sh https://your-app.vercel.app 60

# Detailed logs
vercel logs https://your-app.vercel.app --follow
```

---

## Summary

Use this matrix to:
1. **Understand** what each check does
2. **Interpret** results and error messages
3. **Fix** issues with guided remediation steps
4. **Verify** each component is ready
5. **Monitor** deployment health over time

**For support:**
- Review the specific check section above
- Follow remediation procedures
- Check Vercel/Supabase dashboards
- Review application logs: `vercel logs`

**Next Steps:**
- ✓ Run full deployment check
- ✓ Address any failures
- ✓ Set up continuous monitoring
- ✓ Configure alerts (optional)
