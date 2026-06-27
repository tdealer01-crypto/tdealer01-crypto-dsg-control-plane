# Monitoring Setup Guide

This guide explains how to monitor the DSG Control Plane in production and respond to alerts.

**Environment:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Table of Contents

1. [Monitoring Architecture](#monitoring-architecture)
2. [Vercel Monitoring](#vercel-monitoring)
3. [Supabase Monitoring](#supabase-monitoring)
4. [Health Check Automation](#health-check-automation)
5. [Alert Configuration](#alert-configuration)
6. [Error Rate Monitoring](#error-rate-monitoring)
7. [Performance Baseline](#performance-baseline)
8. [Webhook Monitoring](#webhook-monitoring)
9. [Database Monitoring](#database-monitoring)
10. [Daily Health Check Schedule](#daily-health-check-schedule)
11. [Incident Response](#incident-response)
12. [Monitoring Dashboards](#monitoring-dashboards)

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Production Deployment                       │
│           (Vercel + Supabase + Stripe/OAuth)              │
└─────────────────────────────────────────────────────────────┘
  │
  ├─→ Vercel Logs          → Function logs, build logs
  │
  ├─→ Supabase Logs        → Query logs, RLS policy logs
  │
  ├─→ Health Endpoints     → /api/health, /api/readiness
  │
  ├─→ Webhook Events       → Stripe, GitHub, integrations
  │
  └─→ Performance Metrics  → Response time, error rate
        (Browser, APM tools)
```

---

## Vercel Monitoring

### Access Vercel Dashboard

1. **Login to Vercel**
   - URL: https://vercel.com/dashboard
   - Project: `tdealer01-crypto-dsg-control-plane`

2. **View Deployment Status**
   - Deployments tab
   - Shows: Current deployment state (Ready, Building, Failed)
   - Shows: Deployment history with timestamps

3. **View Function Logs**
   - Logs tab
   - Filters:
     - Time range (last hour, last 24 hours, custom)
     - Status (All, Error, Warn, Info)
     - Search by log message
   - Real-time streaming of production logs

### Vercel Metrics to Monitor

| Metric | Location | Alert Threshold | Action |
|--------|----------|-----------------|--------|
| Build Time | Deployments tab | > 5 minutes | Check build log for slowness |
| Deployment Failures | Deployments tab | Any failed | Check error log, redeploy |
| Function Errors | Logs tab | > 1% of requests | Page on-call engineer |
| Cold Starts | Analytics | > 1 second | Review code size, dependencies |
| Response Time (p95) | Analytics | > 2 seconds | Investigate slow endpoints |

### Vercel Logs Query Examples

```
# Find all errors from last hour
status:error time:last_1h

# Find specific endpoint errors
path:/api/execute status:error

# Find slow responses (>2s)
duration:>2000

# Find authentication failures
path:/api/auth status:401

# Find webhook events
path:/api/webhooks
```

---

## Supabase Monitoring

### Access Supabase Dashboard

1. **Login to Supabase**
   - URL: https://app.supabase.com
   - Project: Look for DSG Control Plane project

2. **View Query Logs**
   - Database > Logs tab
   - Shows: All executed queries, execution time, status

3. **View RLS Policy Logs**
   - Database > Policies tab
   - Shows: Policy evaluations and rejections

### Supabase Metrics to Monitor

| Metric | Query | Alert Threshold | Action |
|--------|-------|-----------------|--------|
| Query Latency (p95) | `SELECT execution_time FROM query_logs` | > 500ms | Check indexes, query plan |
| Failed Queries | `SELECT * FROM query_logs WHERE status='error'` | > 5 per minute | Investigate error cause |
| Slow Queries | `SELECT * FROM query_logs WHERE execution_time > 500` | > 5 per minute | Add indexes or optimize |
| RLS Policy Rejections | `SELECT * FROM logs WHERE event='RLS_DENIED'` | > 1% of requests | Check policy configuration |
| Connections | Settings > Database | > 90% of max | Increase connection pool |

### Sample Monitoring Queries

```sql
-- Query performance (last 1 hour)
SELECT
  query_string,
  COUNT(*) as execution_count,
  AVG(execution_time) as avg_time_ms,
  MAX(execution_time) as max_time_ms,
  SUM(CASE WHEN execution_time > 500 THEN 1 ELSE 0 END) as slow_queries
FROM query_logs
WHERE executed_at > now() - interval '1 hour'
GROUP BY query_string
ORDER BY avg_time_ms DESC
LIMIT 20;

-- Error frequency (last 1 hour)
SELECT
  error_message,
  COUNT(*) as frequency,
  MAX(executed_at) as latest_occurrence
FROM query_logs
WHERE status = 'error'
  AND executed_at > now() - interval '1 hour'
GROUP BY error_message
ORDER BY frequency DESC;

-- Table size and growth
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') as row_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;

-- Recent RLS policy denials
SELECT
  *
FROM audit_logs
WHERE event_type = 'rls_policy_denied'
  AND created_at > now() - interval '1 hour'
ORDER BY created_at DESC
LIMIT 100;
```

---

## Health Check Automation

### Manual Health Checks

Run these commands to verify deployment health:

```bash
# Quick health check (runs all critical checks)
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Comprehensive deployment verification
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Standard go/no-go gate
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

### Automated Health Check (GitHub Actions)

Create `.github/workflows/monitor-production.yml`:

```yaml
name: Monitor Production Deployment

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run health check
        run: |
          ./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

      - name: Run deployment verification
        run: |
          ./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

      - name: Slack notification on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "🚨 Production Health Check Failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Health Check Failed*\nEnvironment: https://tdealer01-crypto-dsg-control-plane.vercel.app\nSee: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

### Local Monitoring Loop

Run continuous health checks locally:

```bash
#!/bin/bash
# monitor-production.sh

DEPLOYMENT_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
CHECK_INTERVAL=3600  # 1 hour in seconds

while true; do
  echo "$(date): Starting health check..."
  
  if ./scripts/health-check.sh "$DEPLOYMENT_URL" 2>&1 | tee -a /tmp/monitoring.log; then
    echo "$(date): ✅ Health check passed"
  else
    echo "$(date): ❌ Health check failed"
    # Send alert (email, Slack, PagerDuty, etc.)
  fi
  
  echo "Next check in $((CHECK_INTERVAL / 60)) minutes..."
  sleep $CHECK_INTERVAL
done
```

---

## Alert Configuration

### Alert Threshold Definitions

| Alert Level | Response Time | Error Rate | Availability | Action |
|------------|---------------|-----------|-----------------|--------|
| **Green** ✅ | < 500ms | < 0.1% | > 99.9% | Monitor normally |
| **Yellow** ⚠️ | 500ms - 2s | 0.1% - 1% | 99% - 99.9% | Investigate, optimize if trending |
| **Red** 🚨 | > 2 seconds | > 1% | < 99% | **Page on-call engineer immediately** |

### Critical Alert Conditions

**Immediate escalation (page on-call):**

1. **Deployment Failure**
   - Condition: Vercel deployment shows "Failed" or "Error"
   - Action: Check build logs, identify issue, redeploy or rollback

2. **Health Endpoint Down**
   - Condition: `/api/health` returns HTTP 5xx or times out
   - Action: Check Vercel logs, restart function if needed

3. **Database Disconnection**
   - Condition: Readiness check shows `supabaseServiceRole.ok: false`
   - Action: Check Supabase status, verify credentials, restart if needed

4. **Error Rate Spike**
   - Condition: Error rate > 1% for > 5 minutes
   - Action: Check recent deployments, investigate error cause, rollback if needed

5. **Response Time Degradation**
   - Condition: p95 response time > 2 seconds consistently
   - Action: Check Supabase query logs, optimize slow queries, scale if needed

### Setting Up Slack Alerts

1. **Create Slack Webhook**
   - Go to https://api.slack.com/apps
   - Create new app: "DSG Monitoring"
   - Enable Incoming Webhooks
   - Create webhook for #alerts channel
   - Copy webhook URL

2. **Store Secret in GitHub**
   - Repository > Settings > Secrets
   - Add: `SLACK_WEBHOOK_URL=https://hooks.slack.com/...`

3. **Script to Send Alerts**

```bash
#!/bin/bash
# send-slack-alert.sh

WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
MESSAGE="$1"
SEVERITY="${2:-warning}"  # info, warning, error

COLOR="warning"
if [[ "$SEVERITY" == "error" ]]; then
  COLOR="danger"
elif [[ "$SEVERITY" == "info" ]]; then
  COLOR="good"
fi

curl -X POST "$WEBHOOK_URL" \
  -H 'Content-type: application/json' \
  --data @- <<EOF
{
  "attachments": [
    {
      "color": "$COLOR",
      "title": "🔔 DSG Production Alert",
      "text": "$MESSAGE",
      "footer": "DSG Control Plane",
      "ts": $(date +%s)
    }
  ]
}
EOF
```

---

## Error Rate Monitoring

### Define Error Rate Metrics

```
Error Rate = (Number of failed requests) / (Total requests) * 100
```

### Monitor via Application Logs

```bash
# Count errors in last hour
curl -s https://api.vercel.com/v9/deployments \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  | jq '.deployments[0].id' -r \
  | xargs -I {} curl -s https://api.vercel.com/v9/deployments/{}/logs \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  | jq '.logs | map(select(.level=="error")) | length'
```

### Parse Error Patterns

```
# Errors by type (from Vercel logs)
grep "ERROR" vercel-logs.json \
  | jq '.message' \
  | cut -d: -f1 \
  | sort | uniq -c | sort -rn
```

### Alert Rules

```
IF error_rate > 1.0% FOR duration > 5 minutes
THEN page on_call_engineer_immediately

IF error_rate > 0.5% FOR duration > 15 minutes
THEN send Slack warning
```

---

## Performance Baseline

### Establish Baseline Metrics

Capture these metrics during normal operation:

```bash
# Capture response time baseline
for i in {1..100}; do
  curl -w "Response time: %{time_total}s\n" \
    -o /dev/null -s \
    https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
done | tee baseline-response-times.txt

# Calculate statistics
cat baseline-response-times.txt | \
  awk '{print $3}' | \
  sort -n | \
  awk '{sum+=$1; sumsq+=$1*$1} END {
    n=NR;
    avg=sum/n;
    stddev=sqrt(sumsq/n - (sum/n)^2);
    printf "Baseline Response Time:\n";
    printf "  Mean: %.3fs\n", avg;
    printf "  StdDev: %.3fs\n", stddev;
    printf "  p95: %.3fs\n", avg + 1.96*stddev;
  }'
```

### Target SLA Metrics

| Endpoint | p50 | p95 | p99 | Availability |
|----------|-----|-----|-----|-----------------|
| `/api/health` | 50ms | 150ms | 300ms | 99.95% |
| `/api/agent/status` | 100ms | 250ms | 500ms | 99.95% |
| `/api/readiness` | 200ms | 500ms | 1000ms | 99.90% |
| `/api/execute` | 500ms | 2000ms | 3000ms | 99.90% |

### Monitor Baseline Drift

```bash
#!/bin/bash
# compare-baselines.sh

echo "Current response times:"
CURRENT=$(for i in {1..10}; do
  curl -w "%{time_total}\n" -o /dev/null -s \
    https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
done | awk '{sum+=$1; n++} END {print sum/n}')

BASELINE=0.100  # 100ms baseline

if (( $(echo "$CURRENT > $BASELINE * 2" | bc -l) )); then
  echo "⚠️  Response time degraded: ${CURRENT}s (baseline: ${BASELINE}s)"
  # Send alert
else
  echo "✅ Response time within baseline"
fi
```

---

## Webhook Monitoring

### Monitor Webhook Deliveries

**Track webhook events:**

```sql
-- Webhook delivery status (last 24 hours)
SELECT
  event_type,
  provider,
  COUNT(*) as total_events,
  SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
  ROUND(100.0 * SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) / COUNT(*), 2) as delivery_rate_pct
FROM webhook_events
WHERE created_at > now() - interval '24 hours'
GROUP BY event_type, provider
ORDER BY total_events DESC;

-- Failed webhook retries
SELECT
  event_type,
  provider,
  attempt_number,
  error_message,
  next_retry_at,
  COUNT(*) as frequency
FROM webhook_events
WHERE status = 'failed'
  AND created_at > now() - interval '24 hours'
GROUP BY event_type, provider, attempt_number, error_message, next_retry_at
ORDER BY frequency DESC;
```

### Alert on Webhook Failures

```
IF webhook_failure_rate > 5% FOR duration > 10 minutes
THEN page on_call_engineer_immediately

IF webhook_failure_rate > 1% FOR duration > 30 minutes
THEN send Slack warning
```

### Webhook Response Time Target

**SLA: Webhook processing must complete within 500ms**

```bash
# Monitor webhook response times
SELECT
  provider,
  event_type,
  AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_response_time_sec,
  MAX(EXTRACT(EPOCH FROM (processed_at - received_at))) as max_response_time_sec,
  COUNT(*) as total_processed
FROM webhook_events
WHERE processed_at IS NOT NULL
  AND received_at > now() - interval '24 hours'
GROUP BY provider, event_type
ORDER BY avg_response_time_sec DESC;
```

---

## Database Monitoring

### Monitor Supabase Resources

**Connection Pool Status:**

```sql
-- Current connections
SELECT
  datname as database,
  count(*) as connections,
  max_conn as max_connections,
  ROUND(100.0 * count(*) / max_conn, 2) as connection_usage_pct
FROM pg_stat_activity
GROUP BY datname, max_conn;
```

**Database Size:**

```sql
-- Database size and growth
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

**Table Bloat:**

```sql
-- Identify tables with high bloat
SELECT
  schemaname,
  tablename,
  ROUND(100.0 * (CASE WHEN otta > 0 THEN sml_heap_size/otta ELSE 0 END), 2) as table_bloat_ratio,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pgstattuple_approx(schemaname||'.'||tablename)
ORDER BY table_bloat_ratio DESC;
```

### Alert Conditions

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Connection pool usage | > 80% | Scale connection pool |
| Database size growth | > 10GB/day | Investigate, clean up |
| Table bloat | > 50% | VACUUM ANALYZE |
| Slow queries | > 500ms | Add indexes, optimize |

---

## Daily Health Check Schedule

### Create Scheduled Health Check

**Option 1: GitHub Actions (recommended)**

Create `.github/workflows/daily-health-check.yml`:

```yaml
name: Daily Health Check

on:
  schedule:
    # Every day at 10 AM UTC
    - cron: '0 10 * * *'

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run health check
        run: |
          chmod +x ./scripts/health-check.sh
          ./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

      - name: Report results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: health-check-report-${{ github.run_number }}
          path: /tmp/monitoring.log
          retention-days: 30
```

**Option 2: Cron Job (local)**

```bash
# Add to crontab: crontab -e
0 10 * * * /home/user/scripts/daily-health-check.sh

# Create script
#!/bin/bash
# /home/user/scripts/daily-health-check.sh
cd /home/user/tdealer01-crypto-dsg-control-plane
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app \
  >> /var/log/dsg-health-check.log 2>&1
```

**Option 3: Uptime Monitor (external service)**

Services like Uptime Robot, Better Uptime, or Datadog:

1. Sign up for uptime monitoring service
2. Add health check URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health`
3. Set check frequency: Every 5 minutes
4. Configure alerts:
   - Down for > 5 minutes: Email + Slack + SMS
   - Degraded response: Email + Slack

---

## Incident Response

### On-Call Procedures

**When alert fires:**

1. **Acknowledge Alert** (within 5 minutes)
   - Slack: React with 👀 emoji
   - PagerDuty: Acknowledge incident

2. **Assess Severity**
   - Is deployment down? → **CRITICAL**
   - Is error rate > 5%? → **HIGH**
   - Is response time > 2s? → **MEDIUM**
   - Is error rate > 1%? → **LOW**

3. **Run Diagnostics**

```bash
# Quick status check
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .

# Check Vercel deployment
# -> https://vercel.com/projects/tdealer01-crypto-dsg-control-plane/deployments

# Check Supabase status
# -> https://app.supabase.com → Select project → Status
```

4. **Escalation Path**
   - Level 1: On-call engineer (immediate)
   - Level 2: Backend team lead (if not resolved in 15 min)
   - Level 3: Engineering manager (if not resolved in 30 min)

### Rollback Procedure

If deployment introduced a bug:

```bash
# 1. Go to Vercel dashboard
# 2. Find last known good deployment
# 3. Click "Redeploy" on that deployment
# 4. Confirm redeployment
# 5. Verify health checks pass
./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# 6. Post incident summary
```

### Post-Incident Review

After any incident:

1. Document in shared incident log
2. Root cause analysis (5 Whys)
3. Action items to prevent recurrence
4. Update monitoring/alerting if needed
5. Share learnings with team

---

## Monitoring Dashboards

### Suggested Dashboard (Vercel + Google Sheets)

Create a shared Google Sheet for weekly health:

```
Week of: [DATE]

| Date | Time | Health | Readiness | Error Rate | P95 Response | Status | Notes |
|------|------|--------|-----------|------------|--------------|--------|-------|
| 2025-01-15 | 10:00 | ✅ | ✅ | 0.0% | 145ms | OK | - |
| 2025-01-15 | 12:00 | ✅ | ✅ | 0.1% | 198ms | OK | - |
```

### Real-Time Dashboard (Datadog/New Relic)

If using APM service:

1. **Deployment Health**
   - Current deployment status
   - Build time trends
   - Deployment frequency

2. **Application Performance**
   - Response time (p50, p95, p99)
   - Error rate trend
   - Request volume

3. **Database Performance**
   - Query latency (p50, p95, p99)
   - Slow query frequency
   - Connection pool usage

4. **External Dependencies**
   - Stripe API status
   - Supabase status
   - Third-party service availability

---

## Summary Checklist

- [ ] Set up Vercel monitoring (check logs daily)
- [ ] Configure Supabase query monitoring
- [ ] Schedule automated health checks (hourly)
- [ ] Set up Slack alerts for critical issues
- [ ] Define alert thresholds and escalation path
- [ ] Establish performance baselines
- [ ] Configure webhook monitoring
- [ ] Set up database monitoring queries
- [ ] Document incident response procedures
- [ ] Create on-call schedule and runbook
- [ ] Train team on alert response procedures
- [ ] Review monitoring setup quarterly

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Owner:** DevOps / Platform Team
