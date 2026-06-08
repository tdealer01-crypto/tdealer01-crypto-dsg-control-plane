# Verification Scripts & Post-Deployment Guide

Complete guide to verifying DSG Control Plane deployments and monitoring production.

## Quick Start

After deploying to Vercel, run:

```bash
# Health check (fast verification)
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Comprehensive deployment verification
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Standard go/no-go gate
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

All three should exit with code 0 (success).

---

## Scripts Overview

### 1. health-check.sh

**Purpose:** Quick health verification focusing on response times and critical endpoints.

**Usage:**
```bash
./scripts/health-check.sh https://example.com
HEALTH_CHECK_URL=https://example.com ./scripts/health-check.sh
```

**What it checks:**
- ✅ Endpoint connectivity (`/api/health`, `/api/agent/status`, `/api/readiness`)
- ✅ Response times (threshold: 500ms)
- ✅ JSON response structure
- ✅ Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- ✅ 404 error handling

**Environment variables:**
- `HEALTH_CHECK_URL` — Base URL for checks
- `HEALTH_CHECK_TIMEOUT` — Request timeout in seconds (default: 20)
- `HEALTH_CHECK_RETRIES` — Number of retries (default: 3)

**Exit codes:**
- `0` — All checks passed
- `1` — One or more checks failed
- `2` — Usage error (missing URL)

**Sample output:**
```
============================================================
Health Check: https://example.com
============================================================

1. CONNECTIVITY CHECKS
---
✅ Health endpoint -> HTTP 200
✅ Agent status endpoint -> HTTP 200
✅ Readiness endpoint -> HTTP 200

2. RESPONSE TIME CHECKS
---
✅ Response time for /api/health: 145ms (< 500ms)
✅ Response time for /api/agent/status: 198ms (< 500ms)

3. JSON RESPONSE VALIDATION
---
✅ JSON response for /api/agent/status contains all expected fields
✅ JSON response for /api/readiness contains all expected fields

4. SECURITY HEADERS
---
✅ Security headers present for /api/health

5. ERROR HANDLING
---
✅ 404 response for missing endpoint -> HTTP 404

============================================================
HEALTH CHECK SUMMARY
============================================================
Passed: 9
Failed: 0
Warnings: 0

✅ All critical health checks passed!
```

**When to use:**
- Quick verification after deployment
- Automated health checks (hourly/daily)
- Smoke testing before release
- Integration with monitoring systems

---

### 2. deployment-verification.sh

**Purpose:** Comprehensive post-deployment verification covering environment, database, security, and integrations.

**Usage:**
```bash
./scripts/deployment-verification.sh https://example.com
DEPLOYMENT_URL=https://example.com ./scripts/deployment-verification.sh
```

**What it checks:**

1. **Vercel Deployment Status**
   - HTTP response code
   - Deployed commit version
   - Environment (production/preview)

2. **Readiness Endpoint**
   - Environment variables present
   - NextAuth secret configured
   - Supabase service role
   - DSG Core configuration
   - Finance governance backend

3. **Database Connectivity**
   - Supabase service role probe
   - Finance governance readiness
   - Database health check

4. **Webhook & Integration Endpoints**
   - Webhook endpoint accessibility
   - Expected methods (POST)

5. **Security Headers**
   - Content-Security-Policy
   - X-Content-Type-Options
   - X-Frame-Options
   - Strict-Transport-Security
   - Rate limiting headers

6. **CORS Configuration**
   - Access-Control-Allow-Origin
   - Access-Control-Allow-Methods

7. **Stripe Integration** (optional)
   - API key format validation

8. **DSG/Hermes Components** (optional)
   - Hermes status endpoint
   - DSG policies manifest

9. **Critical Path Endpoints**
   - `/api/health`
   - `/api/agent/status`
   - `/api/readiness`
   - `/api/execute`

**Environment variables:**
- `DEPLOYMENT_URL` — Base URL for checks
- `DEPLOYMENT_TIMEOUT` — Request timeout in seconds (default: 30)
- `DEPLOYMENT_CHECK_HERMES` — Check Hermes components (default: true)
- `DEPLOYMENT_CHECK_STRIPE` — Check Stripe integration (default: false, requires `STRIPE_SECRET_KEY`)

**Exit codes:**
- `0` — All critical checks passed
- `1` — One or more critical checks failed
- `2` — Usage error (missing URL)

**Sample output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYMENT VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: https://example.com
Time: 2025-01-15 14:30:45 UTC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. VERCEL DEPLOYMENT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deployment is responding (HTTP 200)
ℹ️  Deployed commit: abc123def456
ℹ️  Environment: production
✅ Production environment confirmed

... [more sections] ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFICATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passed checks:        25
Critical failures:    0
Warnings:             2

✅ DEPLOYMENT VERIFICATION PASSED
```

**When to use:**
- Post-deployment checklist
- Production readiness verification
- Comprehensive health assessment
- Validation before customer notification

---

## Comparison: Which Script to Use?

| Scenario | Script | Time | Coverage |
|----------|--------|------|----------|
| Quick check after deploy | `health-check.sh` | 30 sec | Critical endpoints only |
| Full verification checklist | `deployment-verification.sh` | 2 min | All components |
| Standard go/no-go gate | `npm run go:no-go` | 1 min | Standard endpoints |
| Hourly monitoring | `health-check.sh` | 30 sec | Lightweight |
| Pre-release validation | `deployment-verification.sh` | 2 min | Comprehensive |

---

## Integration with CI/CD

### GitHub Actions Example

Create `.github/workflows/post-deploy-verification.yml`:

```yaml
name: Post-Deployment Verification

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - production
          - staging

jobs:
  verify:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Run health check
        run: |
          chmod +x ./scripts/health-check.sh
          ./scripts/health-check.sh ${{ secrets.DEPLOYMENT_URL }}

      - name: Run deployment verification
        run: |
          chmod +x ./scripts/deployment-verification.sh
          ./scripts/deployment-verification.sh ${{ secrets.DEPLOYMENT_URL }}

      - name: Notify team
        if: success()
        run: |
          echo "✅ Deployment verification passed!"
          echo "Environment: ${{ github.event.inputs.environment }}"
          echo "URL: ${{ secrets.DEPLOYMENT_URL }}"

      - name: Alert on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Deployment verification failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Verification Failed*\nEnvironment: ${{ github.event.inputs.environment }}\nCheck: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

### Scheduled Daily Health Checks

Create `.github/workflows/daily-health-check.yml`:

```yaml
name: Daily Health Check

on:
  schedule:
    - cron: '0 10 * * *'  # Every day at 10 AM UTC

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run health check
        run: |
          chmod +x ./scripts/health-check.sh
          HEALTH_CHECK_URL=${{ secrets.PRODUCTION_URL }} \
          ./scripts/health-check.sh ${{ secrets.PRODUCTION_URL }}

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: health-check-report-${{ github.run_number }}
          path: /tmp/monitoring.log
          retention-days: 30
```

---

## Manual Verification Workflow

### Step 1: Quick Health Check

```bash
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
```

✅ If passed, continue to step 2.  
❌ If failed, check `/api/health` manually and review Vercel logs.

### Step 2: Comprehensive Verification

```bash
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
```

✅ If passed, deployment is production-ready.  
❌ If failed, address issues identified in output.

### Step 3: Full Checklist

Complete the manual checklist in `docs/POST_DEPLOYMENT_CHECKLIST.md`:

- Database migrations applied
- Environment variables all present
- Stripe webhook configured
- OAuth redirect URIs registered
- Security headers verified
- Monitoring configured

### Step 4: Production Announcement

Once all checks pass:

1. Update deployment status
2. Notify team in Slack
3. Announce to customers if applicable
4. Begin monitoring production

---

## Troubleshooting

### health-check.sh Issues

**Script fails with "CONNECT tunnel failed"**
```
Cause: Proxy settings blocking curl in sandboxed environment
Solution: Run from GitHub Actions or unbounded network shell
```

**Timeout errors on all checks**
```
Cause: Deployment not responding or network issues
Solution: 
  1. Verify Vercel deployment shows "Ready" status
  2. Test manually: curl https://example.com/api/health
  3. Check Vercel logs for errors
```

**Response time warnings (> 500ms)**
```
Cause: Slow endpoints (normal for cold starts)
Solution: 
  1. Run again (subsequent requests are faster)
  2. Check Supabase query logs for slow queries
  3. Review Vercel analytics for bottlenecks
```

### deployment-verification.sh Issues

**"supabaseServiceRole.ok: false"**
```
Cause: Database not reachable
Solution:
  1. Verify SUPABASE_SERVICE_ROLE_KEY env var set in Vercel
  2. Check Supabase status page
  3. Verify network connectivity
  4. Check Supabase logs for connection issues
```

**"dsgCoreHealth.ok: false"**
```
Cause: DSG Core not reachable (internal or remote mode)
Solution:
  1. If remote mode: verify DSG_CORE_URL and DSG_CORE_API_KEY
  2. If internal mode: check DSG core service status
  3. Review DSG Core logs for errors
```

**CORS headers missing**
```
Cause: CORS not configured or OPTIONS not allowed
Solution:
  1. Check next.config.js for CORS headers configuration
  2. Verify middleware.ts allows OPTIONS requests
  3. Review buildCorsHeaders() implementation
```

**Stripe integration warnings**
```
Cause: STRIPE_SECRET_KEY not set or invalid
Solution:
  1. Verify STRIPE_SECRET_KEY env var in Vercel
  2. Check key format (should start with sk_)
  3. Verify in Stripe Dashboard that key is active
```

---

## Performance Tuning

### Reducing Health Check Time

If health checks take too long:

```bash
# Run checks in parallel
./scripts/health-check.sh https://example.com &
wait

# Or use simpler checks
curl -s https://example.com/api/health | jq .ok
```

### Caching Responses

For frequently run checks, consider caching:

```bash
#!/bin/bash
CACHE_FILE="/tmp/health-check-cache"
CACHE_AGE=$((5 * 60))  # 5 minutes

if [[ -f "$CACHE_FILE" ]] && [[ $(( $(date +%s) - $(stat -f%m "$CACHE_FILE") )) -lt $CACHE_AGE ]]; then
  cat "$CACHE_FILE"
else
  ./scripts/health-check.sh "$1" | tee "$CACHE_FILE"
fi
```

---

## Advanced Usage

### Integration with Monitoring Tools

**Datadog:**
```bash
# Send check result as metric
./scripts/health-check.sh https://example.com && \
  curl -X POST "https://api.datadoghq.com/api/v1/series" \
    -H "DD-API-KEY: $DD_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"series": [{"metric": "dsg.health_check", "points": [[null, 1]], "type": "gauge"}]}'
```

**Prometheus:**
```bash
# Export metrics for Prometheus
check_status() {
  ./scripts/health-check.sh "$1" > /dev/null 2>&1 && echo 1 || echo 0
}

echo "# HELP dsg_health_check DSG deployment health status"
echo "# TYPE dsg_health_check gauge"
echo "dsg_health_check{environment=\"production\"} $(check_status https://example.com)"
```

**Custom Alert Integration:**
```bash
#!/bin/bash
# alert-on-failure.sh

if ! ./scripts/health-check.sh "$1"; then
  # Send alert (email, Slack, PagerDuty, etc.)
  curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
    -H 'Content-type: application/json' \
    -d '{"text": "❌ Health check failed for '"$1"'"}'
fi
```

---

## Related Documents

- **POST_DEPLOYMENT_CHECKLIST.md** — Complete manual verification checklist
- **MONITORING_SETUP.md** — Continuous monitoring and alerting configuration
- **RUNBOOK_DEPLOY.md** — Deployment and troubleshooting procedures
- **CLAUDE.md** — Development guidelines and verification conventions

---

## Quick Command Reference

```bash
# Health check (fast)
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Deployment verification (comprehensive)
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Standard go/no-go gate
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app

# Manual endpoint checks
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .

# Test response time
curl -w "Response: %{time_total}s\n" -o /dev/null -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check security headers
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check CORS
curl -I -X OPTIONS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Owner:** DevOps / Platform Team

For questions or to report issues with verification scripts, please contact the platform team.
