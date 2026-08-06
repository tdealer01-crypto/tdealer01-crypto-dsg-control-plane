# Deployment Verification Quick Reference

## TL;DR - Quick Commands

```bash
# Fast health check (10 seconds)
./scripts/quick-health-check.sh https://your-app.vercel.app

# Full verification suite (2-5 minutes)
./scripts/full-deployment-check.sh https://your-app.vercel.app

# Continuous monitoring (keeps running)
./scripts/continuous-monitor.sh https://your-app.vercel.app 60
```

---

## The 15 Checks at a Glance

| # | Check | Endpoint | Pass = | Status |
|---|-------|----------|--------|--------|
| 1 | Health Responds | `/api/health` | HTTP 200 | CRITICAL |
| 2 | Readiness Responds | `/api/readiness` | HTTP 200 | CRITICAL |
| 3 | Agent Status Responds | `/api/agent/status` | HTTP 200 | CRITICAL |
| 4 | Database Connected | Health response | `db_ok: true` | CRITICAL |
| 5 | Rate Limiter Config | Health response | `rateLimiter.ok: true` | CRITICAL |
| 6 | Core Health | Health response | `core_ok: true` | CRITICAL |
| 7 | Execute Endpoint | `/api/execute` | Not 404 | CRITICAL |
| 8 | Webhook Endpoint | `/api/webhooks/stripe` | Not 404 | IMPORTANT |
| 9 | Auth Endpoints | `/api/auth/session` | Not 404 | IMPORTANT |
| 10 | Trust Pages | `/terms`, `/privacy`, `/security` | HTTP 200 | IMPORTANT |
| 11 | Security Headers | Response headers | CSP, X-Frame, X-Content | IMPORTANT |
| 12 | Response SLA | All endpoints | < 500ms | PERFORMANCE |
| 13 | Error Handling | `/api/nonexistent` | HTTP 404 | QUALITY |
| 14 | Environment Detect | Agent status | `env: production` | TRACKING |
| 15 | Commit Tracked | Agent status | Valid commit hash | TRACKING |

---

## What Each Result Means

### ✅ ALL CHECKS PASS (GO)
- **Status:** Ready for production
- **Action:** Proceed with deployment
- **Next:** Monitor with continuous-monitor.sh

### ⚠️ WARNINGS (1-2 failures)
- **Status:** Minor issues detected
- **Action:** Review specific failures
- **Next:** Fix issues or proceed with caution

### ❌ NO-GO (3+ failures)
- **Status:** Multiple systems failing
- **Action:** Stop deployment
- **Next:** Follow remediation for each failure

---

## Common Fixes (30 seconds each)

### "Health endpoint unreachable"
```bash
# Check if service is deployed
curl https://your-app.vercel.app/api/health

# Check Vercel deployment status
vercel status
```

### "Database connectivity failed"
```bash
# Verify env vars are set
vercel env ls | grep SUPABASE

# Check Supabase project is active
# → Go to Supabase dashboard
```

### "Rate limiter not configured"
```bash
# Set Redis credentials
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# Redeploy
vercel deploy --prod
```

### "Response times exceed SLA"
```bash
# Check for slow database queries
# → Review Supabase Query Performance tab

# Add database index if needed
# → Check docs/DEPLOYMENT_VERIFICATION_MATRIX.md
```

---

## Pre-Deployment Checklist

Before running verification checks:

- [ ] Vercel deployment is "Ready"
- [ ] All 11+ environment variables are set (`vercel env ls`)
- [ ] Supabase project is "Active"
- [ ] Stripe webhook secret is configured (if using Stripe)
- [ ] Latest code is merged to main/production branch
- [ ] No active Vercel build errors

---

## After Verification Passes

1. **Monitor** deployment health:
   ```bash
   ./scripts/continuous-monitor.sh https://your-app.vercel.app 60
   ```

2. **Set up alerts** (if using monitoring service):
   - Slack webhook
   - PagerDuty integration
   - Email alerts on failure

3. **Document** deployment:
   - Record timestamp
   - Note any pre-deployment issues
   - Save verification report

4. **Plan re-verification**:
   - Run quick check daily
   - Full check before each release
   - Continuous monitor for critical apps

---

## Environment Variables (11 Required)

### Supabase (3)
```
NEXT_PUBLIC_SUPABASE_URL          (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY     (public)
SUPABASE_SERVICE_ROLE_KEY         (secret)
```

### Stripe (3)
```
STRIPE_SECRET_KEY                 (secret)
STRIPE_WEBHOOK_SECRET             (secret)
STRIPE_PRICE_PRO                  (public)
```

### Rate Limiting (2)
```
UPSTASH_REDIS_REST_URL            (public)
UPSTASH_REDIS_REST_TOKEN          (secret)
```

### Auth (1)
```
NEXTAUTH_SECRET                   (secret)
```

### Application (2)
```
NEXT_PUBLIC_APP_URL               (public)
APP_URL                           (internal)
```

---

## Verification Script Features

### full-deployment-check.sh
- **Time:** 2-5 minutes
- **Checks:** All 15 comprehensive tests
- **Output:** Colored pass/fail report
- **Best for:** Complete pre-release verification

### quick-health-check.sh
- **Time:** 10 seconds
- **Checks:** Core 4 indicators
- **Output:** Single health summary
- **Best for:** Daily spot checks, monitoring

### continuous-monitor.sh
- **Time:** Runs continuously
- **Checks:** Health endpoint every N seconds
- **Output:** Uptime tracking, alert on changes
- **Best for:** Watching deployments, troubleshooting

---

## Getting Help

### See More Details
```bash
# Read full verification matrix
cat docs/DEPLOYMENT_VERIFICATION_MATRIX.md

# Show verbose output
DEPLOYMENT_CHECKS_VERBOSE=true ./scripts/full-deployment-check.sh <url>
```

### Debug a Failing Check
1. Review the specific check in DEPLOYMENT_VERIFICATION_MATRIX.md
2. Run `./scripts/quick-health-check.sh <url>` to see JSON response
3. Check Vercel logs: `vercel logs <url>`
4. Follow remediation steps in matrix

### Still Stuck?
1. Check Vercel project → Settings → Environment Variables
2. Check Supabase project → Settings → API Keys
3. Check Stripe dashboard for webhook configuration
4. Review application logs in Vercel dashboard

---

## Examples

### Pre-Release Verification
```bash
# Full check
./scripts/full-deployment-check.sh https://your-app.vercel.app

# If all pass: safe to release
# If failures: fix issues and rerun
```

### Daily Health Check
```bash
# Quick check every morning
./scripts/quick-health-check.sh https://prod.example.com

# Monitor throughout day if needed
./scripts/continuous-monitor.sh https://prod.example.com 60 false
```

### Troubleshoot Active Incident
```bash
# Start monitoring with detailed output
./scripts/continuous-monitor.sh https://your-app.vercel.app 10

# In another window, check Vercel logs
vercel logs https://your-app.vercel.app --follow
```

---

## Reference: Exit Codes

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

---

**For complete details, see:** `docs/DEPLOYMENT_VERIFICATION_MATRIX.md`
