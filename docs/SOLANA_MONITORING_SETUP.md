# Solana Integration Monitoring & Alerting Setup

**Audience:** DevOps/observability engineers configuring dashboards and alerts for Solana transaction execution.

**Status:** Phase 3 Feature 3 Complete (June 30, 2026)

This guide covers setting up real-time monitoring of Solana transactions via PostHog dashboards, creating alert thresholds, and tracking transaction health metrics.

---

## Overview

Solana transaction execution generates events across multiple layers:

- **Application Layer:** Payment submission, confirmation polling
- **Ledger Layer:** Supabase `payment_ledger` and `audit_logs` tables
- **Blockchain Layer:** On-chain transaction status via Solana RPC

We monitor all three to detect failures, timeouts, and operational issues before they impact users.

---

## PostHog Dashboard Setup

### 1. Enable Event Tracking

The Solana integration emits events automatically. Verify in PostHog:

1. Go to PostHog → **Settings → Data Management → Events**
2. Look for these event types:
   - `payment_submitted` — Transaction sent to blockchain
   - `payment_confirmed` — Transaction confirmed by network
   - `payment_failed` — Transaction failed or timed out
   - `confirmation_timeout` — Exceeded 60-second confirmation window

**If events are not appearing:**

- Verify `NEXT_PUBLIC_POSTHOG_KEY` is set in production environment
- Check application logs for errors: `grep -i posthog` in deployment logs
- Ensure events are firing by triggering a test transaction via `/api/execute`

### 2. Create Dashboard

In PostHog, create a new **Dashboard** for Solana monitoring:

1. Go to **Dashboards → Create Dashboard**
2. Name: "Solana Integration Health"
3. Description: "Real-time monitoring of devnet/testnet transaction execution"
4. Add the following insights (cards) below.

---

## Key Monitoring Queries

### Query 1: Payment Success Rate (Last 24h)

Tracks percentage of transactions that confirmed successfully.

**Query Type:** Funnel or Trend

**SQL Template:**

```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW()
GROUP BY status
ORDER BY count DESC;
```

**Expected Result:**

| Status | Count | Percentage |
|--------|-------|-----------|
| confirmed | 947 | 99.58% |
| failed | 4 | 0.42% |

**Alert Threshold:** `<99%` → warning, `<95%` → critical

**PostHog Insight Setup:**

- Event: `payment_confirmed`, `payment_failed`
- Breakdown by: `status`
- Time period: Last 24h
- Display: Percentage

### Query 2: Average Confirmation Time Percentiles

Tracks how quickly transactions confirm. High percentiles indicate network congestion.

**Query Type:** Trend with Aggregation

**SQL Template:**

```sql
SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY confirmation_time_ms) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY confirmation_time_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY confirmation_time_ms) as p99_ms,
  MAX(confirmation_time_ms) as max_ms
FROM payment_ledger
WHERE status = 'confirmed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW();
```

**Expected Result:**

| P50 (ms) | P95 (ms) | P99 (ms) | Max (ms) |
|----------|----------|----------|----------|
| 1200 | 8500 | 15000 | 58000 |

**Alert Thresholds:**
- `p99 > 30000` → high latency
- `p95 > 15000` → elevated latency
- `max > 60000` → timeout occurred

**PostHog Insight Setup:**

- Event: `payment_confirmed`
- Property: `confirmation_time_ms`
- Time period: Last 24h
- Display: Histogram or trend graph

### Query 3: Error Rate by Error Type

Breakdown of failures to identify systemic issues.

**Query Type:** Pie chart or Bar chart

**SQL Template:**

```sql
SELECT
  error_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM payment_ledger
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW()
GROUP BY error_type
ORDER BY count DESC;
```

**Expected Result:**

| Error Type | Count | Percentage |
|-----------|-------|-----------|
| confirmation_timeout | 2 | 50% |
| invalid_recipient | 1 | 25% |
| insufficient_balance | 1 | 25% |

**Alert Threshold:** Any new error type → investigate immediately

**PostHog Insight Setup:**

- Event: `payment_failed`
- Breakdown by: `error_type`
- Time period: Last 24h
- Display: Pie or bar chart

### Query 4: Treasury Balance Trend

Monitor treasury wallet balance to ensure sufficient funds.

**Query Type:** Time series

**SQL Template:**

```sql
-- Run manually via balance check; automate in cron job
-- Insert into balance_ledger table:
INSERT INTO balance_ledger (timestamp, wallet_address, balance_sol, source)
VALUES (NOW(), '<treasury_address>', <current_balance>, 'solana_rpc')
ON CONFLICT (wallet_address, DATE(timestamp)) 
DO UPDATE SET balance_sol = EXCLUDED.balance_sol;

-- Query trend:
SELECT
  DATE(timestamp) as date,
  AVG(balance_sol) as avg_balance,
  MIN(balance_sol) as min_balance,
  MAX(balance_sol) as max_balance
FROM balance_ledger
WHERE wallet_address = '<treasury_address>'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

**Expected Result:**

| Date | Avg | Min | Max |
|------|-----|-----|-----|
| 2026-06-30 | 4.52 | 4.45 | 4.58 |
| 2026-06-29 | 5.10 | 5.05 | 5.15 |

**Alert Threshold:** `< 1.0 SOL` → warning, `< 0.1 SOL` → critical (insufficient for transactions)

**PostHog Insight Setup:**

- Use custom SQL query
- Display as line graph
- Add horizontal line alert at 1.0 SOL

### Query 5: RPC Endpoint Health from Logs

Monitor RPC connectivity and error rates.

**Query Type:** Trend

**SQL Template:**

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) / COUNT(*), 2) as availability_pct
FROM rpc_logs
WHERE endpoint = 'https://api.devnet.solana.com'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

**Expected Result:**

| Date | Requests | Successful | Failed | Availability |
|------|----------|-----------|--------|---------------|
| 2026-06-30 | 1204 | 1200 | 4 | 99.67% |

**Alert Threshold:** `< 99%` → investigate RPC health

**PostHog Insight Setup:**

- Use custom SQL query
- Display as line graph
- Track availability_pct metric

### Query 6: Failed Transactions by Agent

Diagnostic query to identify which agents have the highest failure rates.

**Query Type:** Bar chart

**SQL Template:**

```sql
SELECT
  agent_id,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY agent_id
HAVING COUNT(*) > 0
ORDER BY failed DESC, success_rate ASC;
```

**Expected Result:**

| Agent ID | Total | Confirmed | Failed | Success Rate |
|----------|-------|-----------|--------|--------------|
| agent_123 | 150 | 150 | 0 | 100.00% |
| agent_456 | 95 | 94 | 1 | 98.95% |
| agent_789 | 50 | 48 | 2 | 96.00% |

**Use Case:** Identify agents with configuration issues or unusual transaction patterns.

---

## Alert Thresholds & Rules

Create alerts in PostHog (or forward logs to external alerting system):

| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Success Rate | < 99% | Warning | Review error logs |
| Success Rate | < 95% | Critical | Page on-call engineer |
| P99 Confirmation | > 30s | Warning | Check Solana network status |
| P99 Confirmation | > 60s | Critical | Consider fallback RPC |
| Treasury Balance | < 1.0 SOL | Warning | Prepare fund injection |
| Treasury Balance | < 0.1 SOL | Critical | Fund immediately |
| RPC Availability | < 99% | Warning | Switch to fallback RPC |
| Error Rate | 1+ new type | Critical | Investigate immediately |

---

## Supabase Monitoring SQL

Use these queries directly in Supabase SQL Editor for quick diagnostics.

### Real-Time Success Rate (Last 1h)

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_pct
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

### Latest Transactions with Status

```sql
SELECT
  id,
  agent_id,
  amount,
  status,
  error_type,
  created_at,
  confirmed_at,
  (EXTRACT(EPOCH FROM (confirmed_at - created_at)) * 1000)::int as confirmation_time_ms
FROM payment_ledger
ORDER BY created_at DESC
LIMIT 20;
```

### Failed Transactions (Last 24h)

```sql
SELECT
  id,
  agent_id,
  amount,
  recipient,
  error_type,
  error_message,
  created_at
FROM payment_ledger
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Audit Trail for Specific Transaction

```sql
SELECT
  id,
  resource_id,
  action,
  created_by,
  changes,
  created_at
FROM audit_logs
WHERE resource_type = 'payment_ledger'
  AND resource_id = '<transaction_id>'
ORDER BY created_at DESC;
```

---

## Treasury Balance Monitoring Script

Create an automated check to monitor treasury balance and alert if low.

**Script:** `scripts/monitor-treasury-balance.sh`

```bash
#!/bin/bash

TREASURY_ADDR="<your_treasury_public_key>"
RPC_ENDPOINT="https://api.devnet.solana.com"
LOW_BALANCE_THRESHOLD=1.0
CRITICAL_THRESHOLD=0.1

# Get current balance
BALANCE=$(solana balance $TREASURY_ADDR --url $RPC_ENDPOINT | awk '{print $1}')

echo "[$(date)] Treasury balance: ${BALANCE} SOL"

# Check thresholds
if (( $(echo "$BALANCE < $CRITICAL_THRESHOLD" | bc -l) )); then
  echo "🚨 CRITICAL: Treasury balance below $CRITICAL_THRESHOLD SOL"
  # Send alert (e.g., to Slack, PagerDuty)
  exit 1
elif (( $(echo "$BALANCE < $LOW_BALANCE_THRESHOLD" | bc -l) )); then
  echo "⚠️ WARNING: Treasury balance below $LOW_BALANCE_THRESHOLD SOL"
  # Send alert
  exit 0
else
  echo "✅ Treasury balance healthy"
  exit 0
fi
```

**Run as cron job** (every 30 minutes):

```bash
# Edit crontab
crontab -e

# Add line:
*/30 * * * * /path/to/monitor-treasury-balance.sh >> /var/log/treasury-monitor.log 2>&1
```

---

## Dashboard Export & Reporting

### Weekly Summary Report

Export dashboard data weekly for stakeholder review:

```bash
# Use PostHog API to export insights
curl -X GET "https://us.posthog.com/api/projects/479488/insights/" \
  -H "Authorization: Bearer $POSTHOG_API_KEY" \
  | jq '.results[] | {name, last_refresh, result}' > solana-dashboard-export.json
```

### Integration with External Monitoring

**Forward metrics to Datadog, New Relic, or CloudWatch:**

Configure webhook in PostHog or export via custom integration:

```bash
# Example: Send to Slack on critical alert
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🚨 Solana: Success rate <95%",
    "blocks": [
      {"type": "section", "text": {"type": "mrkdwn", "text": "*Solana Transaction Alert*\n• Success Rate: 92%\n• Time: 2026-06-30T12:34:56Z"}}
    ]
  }'
```

---

## On-Call Runbook Integration

Reference this dashboard in your on-call runbook:

```markdown
## Solana Transaction Issues

1. **Check dashboard:** [PostHog Solana Health](https://us.posthog.com/project/479488/dashboards/solana)
2. **If success rate < 99%:**
   - Query recent failures: See Query 3 above
   - Check error types
   - Escalate if rate < 95%
3. **If confirmation time high (p99 > 30s):**
   - Check Solana network status
   - Review RPC endpoint health
   - Consider fallback endpoint
4. **If treasury balance low:**
   - Run treasury balance check
   - Coordinate fund injection
   - Document in runbook
```

---

## Related Documentation

- **SOLANA_INTEGRATION.md** — Full architecture and integration guide
- **SOLANA_DEVNET_SETUP.md** — Initial setup and configuration
- **SOLANA_RECOVERY_PROCEDURES.md** — Failure recovery and remediation
- **SOLANA_DISASTER_RECOVERY.md** — On-call runbook and mitigation

---

**Last Updated:** June 30, 2026  
**Version:** 1.0 (Phase 3 Feature 3)  
**PostHog Project:** DSG ONE / ProofGate (ID: 479488)
