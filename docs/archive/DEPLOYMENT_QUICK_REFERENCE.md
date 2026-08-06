# Deployment Quick Reference Card

Quick commands for post-deployment verification and monitoring.

## Immediate Post-Deployment (First 30 Minutes)

```bash
# 1. Quick health check (30 seconds)
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# 2. Comprehensive verification (2 minutes)
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# 3. Check deployment status
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .
# Expected: { "ok": true, "version": "...", "env": "production", ... }

# 4. Check readiness
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .ok
# Expected: true
```

**If any check fails → STOP, investigate before proceeding**

## Manual Verification Checklist

✅ Vercel deployment shows "Ready" status
✅ Health endpoint returns HTTP 200 and OK status
✅ Readiness endpoint shows all checks passed
✅ No errors in Vercel Function logs
✅ Database connection working (check Supabase)
✅ Environment variables all present
✅ Security headers present in responses

## Essential Endpoints

```bash
# Public endpoints (no auth required)
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness

# Execution endpoints (auth required)
curl -H "Authorization: Bearer $API_KEY" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute

# Webhooks (from external services)
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/webhook/inbox
```

## Response Time Targets

| Endpoint | p50 | p95 | Target SLA |
|----------|-----|-----|-----------|
| /api/health | 50ms | 150ms | < 500ms |
| /api/agent/status | 100ms | 250ms | < 500ms |
| /api/readiness | 200ms | 500ms | < 1s |
| /api/execute | 500ms | 2s | < 3s |

## Verify with cURL

```bash
# Simple health check
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# With response time and status code
curl -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -o /dev/null -s \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Full response with headers
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check security headers
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Test CORS
curl -I -X OPTIONS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute
```

## Environment Variables Check

```bash
# Via readiness endpoint (shows which are missing)
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .checks

# Expected output should show all checks as OK:
# - env: {"ok": true}
# - supabaseServiceRole: {"ok": true}
# - dsgCoreConfig: {"ok": true}
# - financeGovernanceBackend: {"ok": true}
```

## Database Check

```bash
# From readiness endpoint
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | \
  jq '.checks.supabaseServiceRole'

# Expected: {"ok": true}

# If failed, check Supabase:
# 1. Verify SUPABASE_SERVICE_ROLE_KEY env var is set in Vercel
# 2. Check Supabase project status dashboard
# 3. Verify network connectivity
```

## Security Headers Verification

```bash
# These should be present in response headers:
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Expected headers:
# content-security-policy: ...
# x-content-type-options: nosniff
# x-frame-options: DENY (or SAMEORIGIN)
# strict-transport-security: ...
```

## Rate Limiting Check

```bash
# Send multiple requests and check rate limit headers
for i in {1..5}; do
  echo "Request $i:"
  curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | \
    grep -i ratelimit
done

# Expected: RateLimit-* headers present (if Upstash Redis configured)
```

## Error Investigation

```bash
# Check Vercel logs for errors
# https://vercel.com/projects/tdealer01-crypto-dsg-control-plane/deployments
# -> Click deployment -> View logs -> Search for ERROR or WARN

# Check recent 10 lines
curl https://vercel.com/api/v9/deployments/[deployment-id]/logs \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq '.logs | tail -10'

# Check specific error pattern
curl https://api.vercel.com/v9/deployments/[deployment-id]/logs \
  -H "Authorization: Bearer $VERCEL_TOKEN" | \
  jq '.logs | map(select(.message | contains("ERROR")))'
```

## Stripe Webhook Configuration

```bash
# Verify webhook endpoint is registered
# https://dashboard.stripe.com/webhooks
# Expected:
# - Endpoint: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/stripe
# - Status: Active
# - Events: customer.subscription.updated, etc.

# Send test webhook (from Stripe dashboard)
# Expected: Webhook processed successfully

# Check webhook log in Supabase
# SELECT * FROM webhook_events WHERE provider='stripe' ORDER BY created_at DESC LIMIT 10;
```

## Monitoring Commands

```bash
# Run continuous health check (every 60 seconds)
watch -n 60 'curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .'

# Monitor response time (10 requests)
for i in {1..10}; do
  curl -w "Request $i: %{time_total}s\n" -o /dev/null -s \
    https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
done

# Check error rate (simplified)
failures=0; for i in {1..100}; do
  curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health || ((failures++))
done; echo "Errors: $failures/100"
```

## Rollback (If Needed)

```bash
# 1. Go to Vercel dashboard
# https://vercel.com/projects/tdealer01-crypto-dsg-control-plane/deployments

# 2. Find last known good deployment (look for timestamp)

# 3. Click "Redeploy" on that deployment

# 4. Verify health checks pass
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# 5. If all checks pass, rollback is complete
# 6. Post incident summary to team
```

## Emergency Contacts

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| On-Call Engineer | [phone/Slack] | 5 minutes |
| Backend Lead | [phone/Slack] | 15 minutes |
| Engineering Manager | [phone/Slack] | 30 minutes |

## Alert Thresholds

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Response Time (p95) | > 2s | Investigate, optimize |
| Error Rate | > 1% | Page on-call engineer |
| Uptime | < 99% (> 14 min/day down) | Critical incident |
| Database Latency (p95) | > 500ms | Check indexes, slow queries |
| Cold Start | > 5s | Review bundle size |

## Useful Bash Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Health check shortcut
alias dsg-health='./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app'

# Deployment verification shortcut
alias dsg-verify='./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app'

# Check deployment status
alias dsg-status='curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .'

# Check readiness
alias dsg-ready='curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .ok'

# Monitor in real-time
alias dsg-monitor='watch -n 10 "curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq ."'

# Quick status (one-liner)
alias dsg-quick='echo "Health: $(curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .ok) | Ready: $(curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .ok)"'
```

## Common Issues & Solutions

### "Connection refused"
```
→ Deployment not responding
→ Check Vercel: https://vercel.com/projects/tdealer01-crypto-dsg-control-plane
→ Expected: "Ready" status
```

### "Supabase service role: false"
```
→ Database not reachable
→ Check: SUPABASE_SERVICE_ROLE_KEY env var in Vercel
→ Check: Supabase project status
→ Check: Network/firewall rules
```

### "Response time > 2s"
```
→ Slow queries or cold start
→ If first request: expected (cold start)
→ If persistent: check Supabase query logs
→ Add indexes if queries are slow
```

### "Error rate > 1%"
```
→ Critical issue, investigate immediately
→ Check Vercel logs for error messages
→ Check Supabase logs for DB errors
→ Check Stripe/webhook logs for integration errors
```

## Document Locations

- **Scripts** → `/scripts/health-check.sh`, `deployment-verification.sh`
- **Full Checklist** → `/docs/POST_DEPLOYMENT_CHECKLIST.md`
- **Monitoring Guide** → `/docs/MONITORING_SETUP.md`
- **Scripts Guide** → `/docs/VERIFICATION_SCRIPTS_README.md`
- **Deployment Runbook** → `/docs/RUNBOOK_DEPLOY.md`

---

**Print and keep at your desk during deployments!**

**Version:** 1.0 | **Updated:** 2025-01-15
