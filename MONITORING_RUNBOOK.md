# 📊 Monitoring & Observability Runbook

Production monitoring guide for DSG Control Plane with alerting strategies and incident response.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Metrics & Dashboards](#metrics--dashboards)
3. [Alert Thresholds](#alert-thresholds)
4. [Incident Response](#incident-response)
5. [Health Checks](#health-checks)
6. [Logging Strategy](#logging-strategy)

---

## Quick Start

### Check Production Status (30 seconds)

```bash
# Is the API alive?
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# Response should include:
# {"ok": true, "env": "production", "checks": {"db": true}}
```

### View Live Dashboard

- **Production Health**: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
- **Vercel Deployments**: https://vercel.com/tdealer01-cryptos-projects/tdealer01-crypto-dsg-control-plane
- **GitHub Actions**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions

---

## Metrics & Dashboards

### Core Metrics to Monitor

#### 🚀 Performance
- **Gate Latency**: Target `<15ms` (avg 11ms)
  - Location: All API routes `/api/*/`
  - Alert if: `>50ms` for >1 min
- **Request Throughput**: Track requests/sec
  - Alert if: Drops >20% from baseline
- **Build Time**: Target `<2min`
  - Alert if: `>3min` (disk/memory issue)

#### 💾 Database Health
- **Connection Pool**: Target 10-20 active
  - Alert if: `>25` (connection leak)
- **Query Latency**: Target `<100ms` p95
  - Alert if: `>500ms` (slow query)
- **Supabase Row Count**: Monitor table growth
  - `trinity_chat_history`: Expected growth 10-50/day
  - `public_test_results`: 90-day auto-expiration

#### 🔐 Security
- **Failed Auth Attempts**: Target <5/min
  - Alert if: `>10` in 5 min window
- **Rate Limit Hits**: Monitor `/api/public/*` endpoints
  - Alert if: DDoS pattern detected (>1000 429s/min)
- **Error Disclosure**: Monitor error responses
  - Alert if: Detailed error messages leaked (MONITORING_SECURITY)

#### 📊 Governance
- **DSG Gate Executions**: Track daily volume
  - Expected: 10-100/day in production
- **Z3 Proof Generation**: Monitor CCVS level distribution
  - Alert if: L5 proofs <80% (quality drop)
- **Evidence Chain Integrity**: Monitor SHA-256 mismatches
  - Alert if: Any mismatch (tamper detection)

### Dashboard Setup (Prometheus/Grafana)

```yaml
# prometheus.yml - Add DSG metrics
scrape_configs:
  - job_name: 'dsg-control-plane'
    static_configs:
      - targets: ['tdealer01-crypto-dsg-control-plane.vercel.app']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

**Key Dashboards**:
1. **Production Status** - Gate latency, throughput, errors
2. **Database Health** - Connection pool, query times, row counts
3. **Security Events** - Auth failures, rate limits, error logs
4. **Governance** - DSG executions, proof generation, audit trails

---

## Alert Thresholds

### 🔴 Critical Alerts (Page On-Call)

| Alert | Threshold | Duration | Action |
|-------|-----------|----------|--------|
| API Down | Status != 200 | >1 min | Restart Vercel, check DB |
| DB Connection Lost | Supabase offline | >2 min | Check Supabase dashboard |
| High Error Rate | >5% 5xx errors | >2 min | Check logs, rollback if needed |
| Gate Latency Spike | >200ms p99 | >5 min | Profile hot path, check DB |
| Authentication Failure | >20 failures/min | >3 min | Check API keys, restart auth service |

### 🟠 Warning Alerts (Notify Slack)

| Alert | Threshold | Duration | Action |
|-------|-----------|----------|--------|
| Elevated Error Rate | >1% 4xx/5xx errors | >5 min | Review logs, not necessarily urgent |
| Slow Queries | p95 >300ms | >5 min | Analyze slow query, consider indexing |
| Connection Pool High | >20 active | >2 min | Monitor growth, consider scaling |
| Rate Limit Activity | >500 429s/min | >2 min | Check for DDoS, review patterns |
| Deployment Lag | Build time >2.5min | — | Check dependencies, cache invalidation |

### 🟡 Info Alerts (Log Only)

| Alert | Threshold | Action |
|-------|-----------|--------|
| Daily Test Run | Scheduled 2 AM UTC | Verify in logs |
| Backup Completed | Daily 3 AM UTC | Confirm in Supabase |
| Cache Refresh | Hourly | Monitor hit rates |

---

## Incident Response

### Incident Severity Levels

**SEV-1 (Critical)**: Production down, no workaround
- Response time: <5 min
- Notify: On-call + team lead

**SEV-2 (High)**: Major feature broken, users blocked
- Response time: <15 min
- Notify: On-call team

**SEV-3 (Medium)**: Feature degraded, users have workaround
- Response time: <1 hour
- Notify: Slack channel

**SEV-4 (Low)**: Minor issue, no immediate impact
- Response time: <24 hours
- Notify: Issue tracker

### Response Playbook

#### API Down (SEV-1)

```bash
# 1. Confirm the issue (30 sec)
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# 2. Check Vercel status (1 min)
# - Visit https://vercel.com/tdealer01-cryptos-projects/tdealer01-crypto-dsg-control-plane
# - Look for recent failed deployments
# - Check if production instance is running

# 3. Check Supabase status (1 min)
# - Log in to Supabase dashboard
# - Verify database is online
# - Check connection count

# 4. Review recent commits (2 min)
git log --oneline -10
# If bad commit found: git revert <sha>

# 5. Restart Vercel deployment (1 min)
# - In Vercel dashboard: Redeploy current commit
# - Or: git push origin main (triggers new build)

# 6. Verify recovery (1 min)
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

#### Database Connection Lost (SEV-1)

```bash
# 1. Verify Supabase is online
curl -I https://api.supabase.co/status

# 2. Check connection string
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 3. Test connection
psql "postgres://user:pass@db.supabase.co:5432/postgres"

# 4. If stuck: Clear connection pool
# - In Supabase dashboard: Database → Connection Management
# - Terminate idle connections
# - Wait 30s for automatic reconnect

# 5. Restart app
# - Vercel: Redeploy
```

#### High Error Rate (SEV-2)

```bash
# 1. Get error details (1 min)
tail -100 <logs-path>

# 2. Identify pattern
grep -E "ERROR|EXCEPTION" <logs>

# 3. Check recent changes
git log --oneline -5
git diff HEAD~1

# 4. Options:
#    a) If bad commit: git revert
#    b) If bad config: Update env vars + redeploy
#    c) If bad data: Run migration/fix script

# 5. Verify fix
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

#### High Latency (SEV-2)

```bash
# 1. Check gate latency
curl -w "\nTime: %{time_total}s\n" https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# 2. Profile database queries
# - Supabase dashboard → Database → Query Performance
# - Look for slow queries

# 3. Check for hot paths
# - Review application logs
# - Identify most-called endpoints
# - Look for N+1 queries

# 4. Apply fixes
#    a) Add database indexes (if missing)
#    b) Cache frequently accessed data
#    c) Optimize query (e.g., reduce joins)

# 5. Verify improvement
time curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

### Rollback Procedure

```bash
# If latest deployment is bad:

# 1. Identify good commit
git log --oneline -20
# Example: 27ae6421 is last known-good

# 2. Revert locally
git revert HEAD --no-edit

# 3. Push rollback
git push origin main

# 4. Verify rollback completed
# - Wait for Vercel build
# - Check: https://vercel.com/...
# - Confirm status: curl /api/agent/status
```

---

## Health Checks

### Manual Health Check (Run Every 4 Hours)

```bash
#!/bin/bash
# health-check.sh

echo "=== DSG Production Health Check ==="

# 1. API Status
RESPONSE=$(curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status)
echo "API Status: $RESPONSE"

# 2. Check components
echo "ok" == $(echo $RESPONSE | jq -r '.ok') && echo "✅ API OK" || echo "❌ API DOWN"
echo "db" == $(echo $RESPONSE | jq -r '.checks.db') && echo "✅ DB OK" || echo "❌ DB DOWN"

# 3. Check build status
LAST_BUILD=$(curl -s https://api.vercel.com/v6/deployments?limit=1 \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.[0].state')
echo "Last Deployment: $LAST_BUILD"

# 4. Alert if any issues
if [[ $RESPONSE != *"\"ok\":true"* ]]; then
  echo "🚨 ALERT: Production issue detected!"
  # Send to Slack/PagerDuty
fi
```

### Automated Health Checks

**Vercel Cron**: (Built-in)
- Every 5 min: `/api/agent/status` healthcheck
- Alert on failure

**GitHub Actions**: (`.github/workflows/health-check.yml`)
```yaml
name: Production Health Check
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API
        run: curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
      - name: Notify Slack on Failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"🚨 Production health check failed"}'
```

---

## Logging Strategy

### Log Levels

- **ERROR** - Failures that need immediate attention (exceptions, auth fails)
- **WARN** - Degraded performance or unexpected behavior (high latency, rate limits)
- **INFO** - Normal operations (requests, deployments, completions)
- **DEBUG** - Detailed tracing (only in development/staging)

### Key Logs to Monitor

#### Security Logs
```
[AUTH_FAILURE] Invalid API key from 192.168.1.1
[RATE_LIMIT] IP 10.0.0.1 exceeded 10 req/min
[SECRET_LEAKED] Error message contained sensitive data
```

#### Performance Logs
```
[SLOW_QUERY] SELECT * took 523ms (threshold: 100ms)
[HIGH_LATENCY] Gate execution 234ms > 50ms threshold
[POOL_EXHAUSTED] Connection pool at 28/25 capacity
```

#### Data Logs
```
[DSG_PROOF] Gate L5 verification generated (hash: 0x...)
[AUDIT_TRAIL] Decision recorded: ALLOW (reason: ARBITER_COUNT_SUFFICIENT)
[EVIDENCE_CHAIN] SHA-256 mismatch detected - possible tampering
```

### Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Error logs | 30 days | Vercel logs |
| Audit trails | 2 years | Supabase (immutable) |
| Performance metrics | 90 days | Prometheus/Grafana |
| Debug logs | 7 days | Development only |

### Centralized Logging Setup (Optional)

```bash
# Ship logs to LogRocket/Datadog/ELK

# In .env.production
LOGDNA_API_KEY=<key>
DATADOG_API_KEY=<key>

# In app startup
import LogDNA from 'logdna'
const logger = LogDNA.createLogger(process.env.LOGDNA_API_KEY)
```

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | [TBD] | [TBD] | [TBD] |
| Team Lead | [TBD] | [TBD] | [TBD] |
| Platform Owner | [TBD] | [TBD] | [TBD] |

**Escalation Path**:
```
On-Call Engineer → Team Lead → Platform Owner → CEO
```

---

## Related

- **Troubleshooting**: See TROUBLESHOOTING.md for common errors
- **Security**: See docs/SECURITY.md for security monitoring
- **Performance**: See PERFORMANCE_GUIDE.md for optimization
- **Status**: Check https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

---

**Last Updated**: 2026-07-18  
**Maintained By**: DSG Platform Team  
**Review Schedule**: Quarterly or after incidents
