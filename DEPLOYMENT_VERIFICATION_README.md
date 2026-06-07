# Deployment Verification Automation Suite

A comprehensive post-deployment verification automation suite with 3 executable scripts and complete documentation.

## What's Included

### 3 Executable Scripts

1. **`./scripts/full-deployment-check.sh`** (2-5 minutes)
   - Runs all 15 comprehensive verification checks
   - Provides detailed colored output with pass/fail status
   - Generates GO/NO-GO deployment readiness report
   - Includes remediation guidance for each failure

2. **`./scripts/quick-health-check.sh`** (10 seconds)
   - Fast lightweight health check
   - Shows 4 core health indicators
   - Perfect for daily spot checks and monitoring
   - Single summary output

3. **`./scripts/continuous-monitor.sh`** (runs continuously)
   - Continuous health monitoring with uptime tracking
   - Configurable check interval (default 60 seconds)
   - Alerts on service status changes
   - Shows uptime percentage and downtime tracking

### 2 Documentation Files

1. **`docs/DEPLOYMENT_VERIFICATION_MATRIX.md`** (868 lines, 21 KB)
   - Detailed definition of all 15 checks
   - Expected behavior for each check
   - Failure interpretation guide
   - GO/NO-GO decision tree
   - Step-by-step remediation procedures
   - Environment variable checklist

2. **`docs/DEPLOYMENT_VERIFICATION_QUICK_REFERENCE.md`** (6.7 KB)
   - Quick reference card for operators
   - 15 checks at a glance table
   - Common fixes (30-second solutions)
   - Pre-deployment checklist
   - Examples and troubleshooting resources

## The 15 Verification Checks

| # | Category | Check | Status |
|---|----------|-------|--------|
| 1 | CRITICAL | Health endpoint responds | HTTP 200 |
| 2 | CRITICAL | Readiness endpoint responds | HTTP 200 |
| 3 | CRITICAL | Agent status endpoint responds | HTTP 200 |
| 4 | CRITICAL | Database connectivity check | `db_ok: true` |
| 5 | CRITICAL | Rate limiter configured | Redis/Upstash |
| 6 | CRITICAL | DSG Core health | `core_ok: true` |
| 7 | CRITICAL | Execute endpoint accessible | Not 404 |
| 8 | IMPORTANT | Webhook endpoint configured | Stripe webhook |
| 9 | IMPORTANT | Auth endpoints responsive | Session handling |
| 10 | IMPORTANT | Trust pages accessible | /terms, /privacy, /security |
| 11 | IMPORTANT | Security headers present | CSP, X-Frame-Options |
| 12 | PERFORMANCE | Response times within SLA | < 500ms |
| 13 | QUALITY | Error handling | 404 for missing routes |
| 14 | TRACKING | Environment detected | production/staging/dev |
| 15 | TRACKING | Deployment commit tracked | Commit hash |

## Quick Start

### 1. Fast Health Check (10 seconds)
```bash
./scripts/quick-health-check.sh https://your-app.vercel.app
```

Example output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  QUICK HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: https://your-app.vercel.app
Time: 2026-06-07 12:34:56 UTC

Status Indicators:
  Overall Health:       ✓ true
  Database:             ✓ true
  Core Service:         ✓ true
  Rate Limiter (Redis): ✓ true

Service Details:
  Service: dsg-control-plane
  Timestamp: 2026-06-07T12:34:56.123Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ HEALTHY – All systems operational
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Full Deployment Check (2-5 minutes)
```bash
./scripts/full-deployment-check.sh https://your-app.vercel.app
```

Example output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPREHENSIVE DEPLOYMENT VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Check 1/15] Health endpoint responds
✅ PASS: Health endpoint returned HTTP 200 (ok=true)

[Check 2/15] Readiness endpoint responds
✅ PASS: Readiness endpoint returned HTTP 200 (ok=true)

[Check 3/15] Agent status endpoint responds
✅ PASS: Agent status endpoint returned HTTP 200 (repo=tdealer01-crypto-dsg-control-plane)

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYMENT VERIFICATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Results:
  Passed: 15/15
  Failed: 0/15
  Success Rate: 100%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GO STATUS: ALL CHECKS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Deployment is healthy and ready for use
✓ All critical services are operational
✓ Security controls are in place
✓ Performance is within acceptable limits
```

### 3. Continuous Monitoring
```bash
# Monitor every 60 seconds (default)
./scripts/continuous-monitor.sh https://your-app.vercel.app

# Monitor every 30 seconds with detailed output
./scripts/continuous-monitor.sh https://your-app.vercel.app 30

# Monitor every 10 seconds in quiet mode
./scripts/continuous-monitor.sh https://your-app.vercel.app 10 false
```

Example output (continuous):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONTINUOUS DEPLOYMENT MONITOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: https://your-app.vercel.app
Interval: 60s
Started: 2026-06-07 12:30:00

Press Ctrl+C to stop monitoring

Starting continuous monitoring...

✓ [Check 1] 2026-06-07 12:30:15 - UP - All systems healthy
✓ [Check 2] 2026-06-07 12:31:15 - UP - All systems healthy
✓ [Check 3] 2026-06-07 12:32:15 - UP - All systems healthy
✓ [Check 4] 2026-06-07 12:33:15 - UP - All systems healthy
```

## Features

✅ **No Mutations** - Scripts are read-only, never modify production
✅ **Error Handling** - Timeouts, retries, clear error messages
✅ **Color Output** - Green (pass), Red (fail), Yellow (warning), Blue (info)
✅ **Detailed Reports** - Per-check status with remediation guidance
✅ **GO/NO-GO Status** - Clear deployment readiness determination
✅ **Performance Tracking** - SLA verification and uptime monitoring
✅ **Comprehensive Docs** - 15-check matrix + quick reference
✅ **Bash-Only** - No external dependencies (uses curl, grep, standard tools)
✅ **Proxy-Aware** - Clears proxy settings for reliable checks
✅ **Production-Safe** - All checks are passive/read-only probes

## Environment Variables Required

The scripts verify these 11 production environment variables:

```
NEXT_PUBLIC_SUPABASE_URL          (Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY     (Supabase)
SUPABASE_SERVICE_ROLE_KEY         (Supabase)
STRIPE_SECRET_KEY                 (Stripe)
STRIPE_WEBHOOK_SECRET             (Stripe)
STRIPE_PRICE_PRO                  (Stripe)
UPSTASH_REDIS_REST_URL            (Rate Limiting)
UPSTASH_REDIS_REST_TOKEN          (Rate Limiting)
NEXTAUTH_SECRET                   (Auth)
NEXT_PUBLIC_APP_URL               (App Config)
APP_URL                           (App Config)
```

## Usage Examples

### Pre-Release Verification
```bash
# Run full check before release
./scripts/full-deployment-check.sh https://your-app.vercel.app

# Check output for GO/NO-GO status
# If all pass: safe to proceed
# If failures: fix issues and rerun
```

### Daily Health Check
```bash
# Quick spot check every morning
./scripts/quick-health-check.sh https://prod.example.com

# If degraded, run full check:
./scripts/full-deployment-check.sh https://prod.example.com
```

### Continuous Monitoring During Deployment
```bash
# Watch health during active deployment
./scripts/continuous-monitor.sh https://your-app.vercel.app 30

# In another terminal, watch logs:
vercel logs https://your-app.vercel.app --follow
```

### Troubleshooting Active Incident
```bash
# Start monitoring with detailed output every 10 seconds
./scripts/continuous-monitor.sh https://your-app.vercel.app 10

# Check specific failing endpoint
curl -v https://your-app.vercel.app/api/health

# Review logs
vercel logs https://your-app.vercel.app --follow
```

## Documentation

### Complete Reference
See **`docs/DEPLOYMENT_VERIFICATION_MATRIX.md`** for:
- Detailed definition of each check
- Expected results and status codes
- How to interpret failures
- Step-by-step remediation for each failure type
- GO/NO-GO decision tree
- Component-specific troubleshooting guides
- Database, Redis, Stripe, Auth setup instructions

### Quick Guide
See **`docs/DEPLOYMENT_VERIFICATION_QUICK_REFERENCE.md`** for:
- TL;DR command list
- 15 checks at a glance table
- Common fixes (30-second solutions)
- Pre-deployment checklist
- Examples and help resources

## Integration Examples

### GitHub Actions Workflow
```yaml
- name: Verify Deployment
  run: |
    ./scripts/full-deployment-check.sh ${{ secrets.DEPLOYMENT_URL }}
```

### Slack Alert Integration
```bash
# In your monitoring script:
if ! ./scripts/quick-health-check.sh $URL; then
  curl -X POST $SLACK_WEBHOOK -d "Deployment health check failed"
fi
```

### Add to Cron Job
```bash
# Check every 5 minutes
*/5 * * * * /home/user/scripts/quick-health-check.sh https://your-app.vercel.app
```

## Troubleshooting

### "Health endpoint unreachable"
1. Check if deployment is active: `vercel status`
2. Verify URL is correct (check Vercel project settings)
3. Check Vercel deployment logs: `vercel logs <url>`

### "Database connectivity failed"
1. Verify env vars: `vercel env ls | grep SUPABASE`
2. Check Supabase project is "Active" in dashboard
3. Verify credentials are correct in Vercel settings

### "Rate limiter not configured"
1. Create Upstash Redis cluster at https://console.upstash.com
2. Copy REST URL and REST Token
3. Add to Vercel: `vercel env add UPSTASH_REDIS_REST_URL`
4. Redeploy: `vercel deploy --prod`

### "Response times exceed SLA"
1. Check database performance in Supabase console
2. Review Vercel function analytics
3. Look for missing database indexes
4. Consider caching strategies

## Exit Codes

### full-deployment-check.sh
- `0` = All checks passed (GO)
- `1` = One or more checks failed (NO-GO)
- `2` = Usage error or missing URL

### quick-health-check.sh
- `0` = Service healthy
- `1` = Service degraded or down
- `2` = Usage error

### continuous-monitor.sh
- `0` = Interrupted by user (Ctrl+C)
- `1` = Initial health check failed
- `2` = Usage error

## Testing the Scripts

Test locally against a deployed URL:
```bash
# Test quick check
./scripts/quick-health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Test full check
./scripts/full-deployment-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Test monitoring (Ctrl+C to stop)
./scripts/continuous-monitor.sh https://tdealer01-crypto-dsg-control-plane.vercel.app 10
```

## Support & Resources

- **Full documentation:** `docs/DEPLOYMENT_VERIFICATION_MATRIX.md`
- **Quick reference:** `docs/DEPLOYMENT_VERIFICATION_QUICK_REFERENCE.md`
- **Deployment runbook:** `docs/RUNBOOK_DEPLOY.md`
- **Incident response:** `docs/RUNBOOK_INCIDENT_RESPONSE.md`

## Next Steps

1. ✓ Review this README
2. ✓ Read the quick reference: `cat docs/DEPLOYMENT_VERIFICATION_QUICK_REFERENCE.md`
3. ✓ Test locally: `./scripts/quick-health-check.sh <your-url>`
4. ✓ Review detailed matrix: `cat docs/DEPLOYMENT_VERIFICATION_MATRIX.md`
5. ✓ Integrate into your workflow (CI/CD, monitoring, runbooks)

---

**Created:** 2026-06-07  
**Last Updated:** 2026-06-07  
**Status:** Ready for review and integration
