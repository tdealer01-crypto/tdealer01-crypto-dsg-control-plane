-- ============================================================================
-- Solana Integration Monitoring Queries
--
-- Purpose: SQL query templates for Supabase monitoring dashboards
-- Usage:
--   1. Copy individual queries to Supabase SQL Editor
--   2. Run to get real-time metrics
--   3. Export results to CSV/JSON for dashboards
--   4. Create PostHog or Datadog visualizations from results
--   5. Use in alerts (e.g., "if success_rate < 99% then alert")
--
-- Note: All timestamps are in UTC. Adjust time filters as needed.
--
-- ============================================================================

-- ============================================================================
-- Query 1: Payment Success Rate (Last 24 Hours)
-- ============================================================================
-- Purpose: Track percentage of transactions that confirmed successfully
-- Usage: Create dashboard card showing success % + count
-- Alert: If success_rate < 99%, escalate
--
-- Expected output:
--   | status    | count | percentage |
--   |-----------|-------|-----------|
--   | confirmed | 947   | 99.58%    |
--   | failed    | 4     | 0.42%     |

SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW()
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- Query 2: Confirmation Time Percentiles (Last 24 Hours)
-- ============================================================================
-- Purpose: Measure transaction confirmation latency (p50, p95, p99, max)
-- Usage: Track SLA compliance and identify network congestion
-- Alert: If p99 > 30s, investigate; if > 60s, critical
--
-- Expected output:
--   | p50_ms | p95_ms | p99_ms | max_ms |
--   |--------|--------|--------|--------|
--   | 1200   | 8500   | 15000  | 58000  |

SELECT
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY confirmation_time_ms) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY confirmation_time_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY confirmation_time_ms) as p99_ms,
  MAX(confirmation_time_ms) as max_ms,
  COUNT(*) as total_confirmed
FROM payment_ledger
WHERE status = 'confirmed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW();

-- ============================================================================
-- Query 3: Error Rate Breakdown by Error Type (Last 24 Hours)
-- ============================================================================
-- Purpose: Identify which error types are occurring most frequently
-- Usage: Diagnose systemic issues (e.g., RPC down, insufficient funds)
-- Alert: Any new error type = investigate
--
-- Expected output:
--   | error_type              | count | percentage |
--   |-------------------------|-------|-----------|
--   | confirmation_timeout    | 2     | 50%       |
--   | invalid_recipient       | 1     | 25%       |
--   | insufficient_balance    | 1     | 25%       |

SELECT
  COALESCE(error_type, 'unknown') as error_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage,
  COUNT(DISTINCT agent_id) as affected_agents
FROM payment_ledger
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW()
GROUP BY error_type
ORDER BY count DESC;

-- ============================================================================
-- Query 4: Treasury Balance Trend (Last 7 Days)
-- ============================================================================
-- Purpose: Monitor treasury wallet balance over time
-- Usage: Detect gradual depletion or fund injections
-- Alert: If balance < 1.0 SOL, warn; if < 0.1 SOL, critical
--
-- Note: Requires balance_ledger table (populate with cron job)
--       See SOLANA_MONITORING_SETUP.md for instructions
--
-- Expected output:
--   | date       | avg_balance | min_balance | max_balance |
--   |------------|-------------|-------------|-------------|
--   | 2026-06-30 | 4.52        | 4.45        | 4.58        |
--   | 2026-06-29 | 5.10        | 5.05        | 5.15        |

SELECT
  DATE(timestamp) as date,
  AVG(balance_sol) as avg_balance,
  MIN(balance_sol) as min_balance,
  MAX(balance_sol) as max_balance,
  COUNT(*) as check_count
FROM balance_ledger
WHERE wallet_address = (
  -- Replace with your actual treasury address
  SELECT DISTINCT wallet_address
  FROM balance_ledger
  ORDER BY timestamp DESC
  LIMIT 1
)
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- ============================================================================
-- Query 5: Failed Transactions by Agent (Last 24 Hours)
-- ============================================================================
-- Purpose: Identify which agents have highest failure rates
-- Usage: Diagnose agent-specific configuration issues
-- Alert: If agent success_rate < 95%, escalate
--
-- Expected output:
--   | agent_id  | total | confirmed | failed | success_rate |
--   |-----------|-------|-----------|--------|--------------|
--   | agent_123 | 150   | 150       | 0      | 100.00%      |
--   | agent_456 | 95    | 94        | 1      | 98.95%       |
--   | agent_789 | 50    | 48        | 2      | 96.00%       |

SELECT
  agent_id,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND created_at <= NOW()
GROUP BY agent_id
HAVING COUNT(*) > 0
ORDER BY failed DESC, success_rate ASC;

-- ============================================================================
-- Query 6: Real-Time Success Rate (Last 1 Hour)
-- ============================================================================
-- Purpose: Quick health check for on-call dashboard
-- Usage: At-a-glance monitoring, should be run every 5-10 minutes
-- Alert: If success_rate < 99%, investigate immediately
--
-- Expected output:
--   | total | confirmed | failed | success_pct |
--   |-------|-----------|--------|------------|
--   | 125   | 124       | 1      | 99.20%     |

SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_pct
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- ============================================================================
-- Query 7: Transaction Confirmation Time Distribution (Last 24 Hours)
-- ============================================================================
-- Purpose: Visualize distribution of confirmation times
-- Usage: Identify outliers and latency patterns
-- Display: Histogram or box plot
--
-- Expected output:
--   | bucket     | count | percentage |
--   |------------|-------|-----------|
--   | 0-1s       | 145   | 15.3%     |
--   | 1-5s       | 620   | 65.5%     |
--   | 5-10s      | 155   | 16.4%     |
--   | 10-30s     | 22    | 2.3%      |
--   | 30-60s     | 4     | 0.4%      |
--   | >60s       | 1     | 0.1%      |

SELECT
  CASE
    WHEN confirmation_time_ms < 1000 THEN '0-1s'
    WHEN confirmation_time_ms < 5000 THEN '1-5s'
    WHEN confirmation_time_ms < 10000 THEN '5-10s'
    WHEN confirmation_time_ms < 30000 THEN '10-30s'
    WHEN confirmation_time_ms < 60000 THEN '30-60s'
    ELSE '>60s'
  END as bucket,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM payment_ledger
WHERE status = 'confirmed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY bucket
ORDER BY
  CASE bucket
    WHEN '0-1s' THEN 1
    WHEN '1-5s' THEN 2
    WHEN '5-10s' THEN 3
    WHEN '10-30s' THEN 4
    WHEN '30-60s' THEN 5
    WHEN '>60s' THEN 6
  END;

-- ============================================================================
-- Query 8: Hourly Success Rate Trend (Last 24 Hours)
-- ============================================================================
-- Purpose: Track success rate over time to spot degradation patterns
-- Usage: Time-series dashboard, identify when issues started
-- Display: Line graph with hourly data points
--
-- Expected output:
--   | hour       | success_rate | total | failed |
--   |------------|--------------|-------|--------|
--   | 2026-06-30 12:00 | 100.00%  | 45    | 0      |
--   | 2026-06-30 11:00 | 98.00%   | 50    | 1      |
--   | 2026-06-30 10:00 | 97.50%   | 40    | 1      |

SELECT
  DATE_TRUNC('hour', created_at) as hour,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================================================
-- Query 9: Recent Failed Transactions (Last 50)
-- ============================================================================
-- Purpose: Quick troubleshooting — see latest failures
-- Usage: On-call diagnosis, rapid incident response
-- Display: List view with latest first
--
-- Expected output:
--   | id  | agent_id  | amount | error_type           | created_at       |
--   |-----|-----------|--------|----------------------|------------------|
--   | 42  | agent_789 | 1.5    | confirmation_timeout | 2026-06-30 12:34 |
--   | 41  | agent_456 | 0.5    | invalid_recipient    | 2026-06-30 12:30 |

SELECT
  id,
  agent_id,
  amount,
  recipient,
  error_type,
  COALESCE(error_message, 'N/A') as error_message,
  created_at
FROM payment_ledger
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- Query 10: Transaction Success Rate by Hour (Last 7 Days)
-- ============================================================================
-- Purpose: Weekly trend analysis to identify peak failure times
-- Usage: Capacity planning, identify SLA violations
-- Display: Heatmap or line graph
--
-- Expected output:
--   | day_of_week | hour | success_rate |
--   |-------------|------|--------------|
--   | Monday      | 10   | 99.8%        |
--   | Monday      | 11   | 98.5%        |
--   | Monday      | 12   | 97.2%        |

SELECT
  TO_CHAR(created_at, 'Day') as day_of_week,
  EXTRACT(HOUR FROM created_at)::int as hour,
  ROUND(100.0 * SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  COUNT(*) as total
FROM payment_ledger
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(HOUR FROM created_at)
HAVING COUNT(*) > 10  -- Only show hours with >10 transactions
ORDER BY day_of_week, hour;

-- ============================================================================
-- Query 11: Duplicate Transaction Check (Safety Check)
-- ============================================================================
-- Purpose: Verify no duplicate transfers occurred (should return 0)
-- Usage: Audit trail, compliance verification
-- Alert: If count > 0, investigate immediately
--
-- Expected output:
--   | idempotency_key | count |
--   |-----------------|-------|
--   | (none expected)  |       |

SELECT
  idempotency_key,
  COUNT(*) as count
FROM payment_ledger
WHERE status = 'confirmed'
GROUP BY idempotency_key
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- If this query returns any rows, there are duplicate confirmed transactions.
-- This should NOT happen (idempotency_key is unique).

-- ============================================================================
-- Query 12: Total SOL Transferred (Audit Trail)
-- ============================================================================
-- Purpose: Track total SOL volume for accounting/audit
-- Usage: Financial reconciliation, revenue tracking
-- Note: Only includes confirmed transactions
--
-- Expected output:
--   | total_sol | transaction_count | avg_per_tx |
--   |-----------|-------------------|-----------|
--   | 1254.75   | 947               | 1.325     |

SELECT
  SUM(amount) as total_sol,
  COUNT(*) as transaction_count,
  ROUND(AVG(amount), 6) as avg_per_tx,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM payment_ledger
WHERE status = 'confirmed'
  AND created_at >= NOW() - INTERVAL '24 hours';

-- ============================================================================
-- Setup Instructions for Dashboard Integration
-- ============================================================================
--
-- 1. COPY-PASTE into Supabase SQL Editor:
--    - Go to Supabase Dashboard → SQL Editor
--    - Create new query
--    - Copy one of the queries above
--    - Click "Run"
--    - Click "Export" to download CSV/JSON
--
-- 2. CREATE RECURRING QUERY:
--    - Use query as basis for scheduled report
--    - Export to CSV weekly
--    - Email to team
--
-- 3. INTEGRATE WITH POSTHOG:
--    - Use PostHog SQL query feature
--    - Create dashboard card
--    - Set auto-refresh (e.g., every 5 min)
--    - Add alert threshold
--
-- 4. INTEGRATE WITH GRAFANA/DATADOG:
--    - Connect Supabase data source
--    - Import queries as panel definitions
--    - Create alerts on thresholds
--
-- ============================================================================
