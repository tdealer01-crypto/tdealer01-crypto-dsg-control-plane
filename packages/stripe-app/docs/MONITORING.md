# DSG Stripe App - Monitoring & Observability Setup

**Version**: 1.0.0  
**Last Updated**: 2025-06-06

---

## Table of Contents

1. [Overview](#overview)
2. [Vercel Analytics](#vercel-analytics)
3. [Sentry Error Tracking](#sentry-error-tracking)
4. [Supabase Database Monitoring](#supabase-database-monitoring)
5. [Upstash Redis Monitoring](#upstash-redis-monitoring)
6. [Custom Metrics](#custom-metrics)
7. [Alerting & Notifications](#alerting--notifications)
8. [Dashboards](#dashboards)
9. [SLO & SLI](#slo--sli)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Monitoring Strategy**: Multi-layer observability across application, database, and cache layers.

### What We Monitor

| Layer | Tool | Metrics |
|-------|------|---------|
| Application | Vercel Analytics | Latency, errors, memory, CPU |
| Errors | Sentry | Exception tracking, error rates |
| Database | Supabase Dashboard | Query perf, table size, connections |
| Cache | Upstash Dashboard | Hit/miss rate, memory, key count |
| Custom | CloudWatch / Logs | Policy evaluations, decisions |

### Key Metrics

```
Response Time (P50/P99)
├── /api/health: <10ms
├── /api/gateway/evaluate: <50ms
├── /api/policies: <100ms
└── /api/audit/operations: <200ms

Error Rate
├── Target: <0.1%
├── Critical: >1%
└── Action: Page on-call

Cache Hit Rate
├── Policies: >80%
├── Sessions: >90%
└── Target: >85% overall

Database Health
├── Query time: <100ms P99
├── Connections: <80% of pool
└── Replication lag: <1s
```

---

## Vercel Analytics

### Setup

Vercel Analytics is automatically enabled for all projects.

```
1. Go to Vercel Dashboard
2. Select project: dsg-stripe-app
3. Go to Analytics tab
4. View metrics by page/function
```

### Key Metrics

**Real User Metrics (RUM)**:
- **First Contentful Paint (FCP)**: When first content appears
- **Largest Contentful Paint (LCP)**: When largest content renders
- **Cumulative Layout Shift (CLS)**: How much page shifts during load
- **First Input Delay (FID)**: How long before user input is processed

**Function Metrics**:
- **Execution Time**: How long function took (ms)
- **Memory Used**: RAM consumed (MB)
- **Status Codes**: HTTP response codes (200, 400, 500, etc.)
- **Requests**: Total request count per endpoint

### View Analytics

```
Vercel Dashboard → dsg-stripe-app → Analytics

Segments:
├── Overview: All traffic
├── By Page: Individual routes
├── By Metric: Latency, errors, etc.
└── Custom: Filter by date, region, etc.
```

### Example Queries

**Top slow endpoints**:
```
Analytics → Filter:
├── Metric: Execution Time
├── Sort: Descending
└── Show: Top 10
Expected: /api/health <10ms, /api/gateway/evaluate <50ms
```

**Error rate by endpoint**:
```
Analytics → Filter:
├── Status Code: 5xx
├── Group By: Path
└── Show: Error count
Expected: <0.1% of requests
```

### Set Performance Budgets

```
Vercel Project Settings → Lifecycle:
├── Standard Execution Duration: <60s (default)
├── Cold Start Timeout: <30s
└── Function Memory: 1024 MB (configured in vercel.json)
```

---

## Sentry Error Tracking

### Setup

#### 1. Create Sentry Account

```
1. Go to https://sentry.io
2. Sign up / Log in
3. Create organization: "DSG"
4. Create project: "dsg-stripe-app"
5. Select platform: Node.js
6. Copy DSN: https://[key]@sentry.io/[project]
```

#### 2. Add to Environment

```bash
# Add SENTRY_DSN to Vercel
vercel env add SENTRY_DSN https://[key]@sentry.io/[project]

# Verify
vercel env list
```

#### 3. Install Package

```bash
npm install @sentry/node @sentry/tracing
npm install --save-dev @sentry/cli
```

#### 4. Initialize in Code

Already done in `packages/stripe-app/src/middleware/error-handler.ts`:

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    return event;
  }
});
```

### Common Errors to Track

```javascript
// Example: Database connection error
try {
  const result = await db.query(...);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      'stripe_account_id': accountId,
      'operation_type': 'charge_evaluation'
    },
    level: 'error'
  });
}

// Example: Policy evaluation failure
if (evaluationFailed) {
  Sentry.captureMessage('Policy evaluation failed', {
    level: 'warning',
    tags: {
      'policy_id': policy.id,
      'error_code': errorCode
    }
  });
}
```

### View Errors in Sentry

```
Sentry Dashboard → dsg-stripe-app

Sections:
├── Issues: Grouped errors (by fingerprint)
├── Performance: Slow transactions
├── Releases: Deployments
├── Health: Error rates over time
└── Alerts: Configured notifications

Example Issue:
├── Title: "Database connection timeout"
├── Count: 145 occurrences
├── Users affected: 3
├── Last seen: 2025-06-06 12:30 UTC
└── First seen: 2025-06-05 10:15 UTC
```

### Set Error Thresholds

```
Sentry → Alerts → Create Alert Rule

Error Rate Alert:
├── Condition: Error count > 10 in 5 minutes
├── Severity: Critical
└── Action: Send to #alerts Slack

New Issue Alert:
├── Condition: New error appears
├── Severity: Warning
└── Action: Send to #alerts Slack
```

---

## Supabase Database Monitoring

### Setup

```
1. Go to https://app.supabase.com
2. Select project: dsg-stripe-app
3. Go to Database → Monitoring
```

### Key Metrics

**Connection Metrics**:
- **Active connections**: Current concurrent connections
- **Available pool**: Remaining connection pool slots
- **Connection timeouts**: Failed connection attempts

**Query Performance**:
- **Query execution time**: ms per query
- **Slow queries**: Queries taking >100ms
- **Cache hit rate**: Percentage of queries served from cache

**Resource Usage**:
- **Database size**: Total storage used (GB)
- **CPU usage**: CPU% consumed
- **Memory**: RAM usage (GB)
- **Network I/O**: Data transferred (MB)

### View Database Health

```
Supabase Console → [Project] → Database

Tabs:
├── Overview: Quick health status
├── Logs: Recent queries and activity
├── Replication: Replica lag (if enabled)
└── Backups: Backup history
```

### Performance Monitoring

#### Find Slow Queries

```sql
-- Enable slow query log (if not already enabled)
SET log_min_duration_statement = 1000; -- Log queries > 1s

-- View recent slow queries
SELECT 
  query,
  mean_exec_time,
  max_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Optimize Indexes

```sql
-- Find missing indexes
SELECT *
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND schemaname != 'pg_catalog'
ORDER BY seq_scan DESC;

-- Create index for frequent sequential scans
CREATE INDEX idx_policies_account_priority 
  ON governance_policies(stripe_account_id, priority);

-- Verify index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Monitor Table Sizes

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Set Database Alerts

```
Supabase Console → [Project] → Settings → Alerts

Alert: Disk Usage
├── Condition: >80% of storage used
├── Notification: Email to ops@dsg.pics
└── Action: Request storage upgrade

Alert: Connection Limit
├── Condition: >80 of 100 connections
├── Notification: Slack #alerts
└── Action: Reduce connection pool usage

Alert: Replication Lag
├── Condition: >5 seconds
├── Notification: Email + Slack
└── Action: Investigate replica performance
```

---

## Upstash Redis Monitoring

### Setup

```
1. Go to https://console.upstash.com
2. Select database: dsg-stripe-app
3. Go to Monitoring tab
```

### Key Metrics

**Performance**:
- **Commands/sec**: Throughput
- **Latency**: ms per operation (P50/P99/P99.9)
- **Hit rate**: Cache hit % (goal: >80%)
- **Evicted keys**: Keys removed due to memory limit

**Resource Usage**:
- **Memory**: Used / Total (KB)
- **Connections**: Active connections
- **CPU**: CPU% consumed
- **Network**: Data transferred (MB)

### View Cache Health

```
Upstash Console → Database → Monitoring

Metrics:
├── Commands: GET, SET, DEL, etc.
├── Latency: Response time percentiles
├── Memory: Current usage trend
└── Keys: Total key count
```

### Optimize Cache

#### Monitor Hit Rate

```bash
# View cache stats
curl https://[database].upstash.io/info \
  -H "Authorization: Bearer [token]" | jq '.stats'

# Expected: hit_rate > 80%
```

#### Cache Key Management

```javascript
// Set appropriate TTLs
const CACHE_TTLS = {
  policies: 300,          // 5 min
  sessions: 3600,         // 1 hour
  account_info: 300,      // 5 min
  decision_cache: 60      // 1 min (optional)
};

// Set key with TTL
redis.setex(`policy:${accountId}`, CACHE_TTLS.policies, JSON.stringify(policy));

// Monitor key expiration
redis.keys('policy:*', (err, keys) => {
  console.log(`Cached policies: ${keys.length}`);
});
```

#### Handle Cache Misses

```javascript
// Cache-aside pattern
async function getPolicy(policyId) {
  // Try cache first
  const cached = await redis.get(`policy:${policyId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - fetch from DB
  const policy = await db.policy.findOne(policyId);
  
  // Store in cache for next time
  await redis.setex(`policy:${policyId}`, 300, JSON.stringify(policy));
  
  return policy;
}
```

### Set Cache Alerts

```
Upstash Console → Monitoring → Alerts

Alert: High Latency
├── Condition: P99 latency > 100ms
├── Notification: Email
└── Action: Investigate load / optimize

Alert: Low Hit Rate
├── Condition: Hit rate < 70%
├── Notification: Slack #alerts
└── Action: Increase TTL / cache more keys

Alert: Memory Pressure
├── Condition: Memory > 80% used
├── Notification: Email
└── Action: Increase database size / evict keys
```

---

## Custom Metrics

### Application Metrics

Instrument code to track custom business metrics:

```javascript
// Example: Policy evaluation metrics
async function evaluatePolicy(context) {
  const startTime = Date.now();
  
  try {
    const result = await PolicyEvaluator.evaluate(context);
    
    // Track success
    metrics.increment('policy_evaluation.success', {
      tags: {
        decision: result.decision,
        policy_type: context.policy_type
      }
    });
    
    // Track decision distribution
    metrics.gauge('policy_evaluation.decision', 1, {
      tags: {
        decision: result.decision
      }
    });
    
    return result;
  } catch (error) {
    // Track failure
    metrics.increment('policy_evaluation.failure', {
      tags: {
        error_type: error.code
      }
    });
    
    throw error;
  } finally {
    // Track duration
    const duration = Date.now() - startTime;
    metrics.histogram('policy_evaluation.duration_ms', duration);
  }
}
```

### Key Custom Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `policy_evaluation.success` | Successful evaluations | >99.5% |
| `policy_evaluation.failure` | Failed evaluations | <0.5% |
| `decision.allow_count` | ALLOW decisions | Varies |
| `decision.review_count` | REVIEW decisions | Varies |
| `decision.block_count` | BLOCK decisions | Varies |
| `audit_trail.write_latency` | Time to write audit | <50ms |
| `webhook.processing_time` | Webhook processing | <100ms |
| `oauth_flow.duration` | OAuth completion time | <2s |

---

## Alerting & Notifications

### Alert Configuration

#### Email Alerts

```
Sentry → Alerts:
├── Email address: t.dealer01@dsg.pics
├── Conditions:
│   ├── Error rate > 1%
│   ├── New issue appears
│   └── Performance regression
└── Frequency: Immediate for critical
```

#### Slack Integration (Optional)

```
1. Sentry → Integrations → Slack
2. Create Slack app
3. Install to workspace
4. Select channel: #alerts
5. Set notification rules

Example rules:
├── Critical errors → Immediate
├── Performance issues → Daily digest
└── New issues → Real-time
```

#### PagerDuty (Optional)

```
1. Sentry → Integrations → PagerDuty
2. Create incident for:
   ├── Error rate > 5%
   ├── Database unavailable
   └── Webhook delivery failures
```

### Notification Levels

| Severity | Example | Action | Notification |
|----------|---------|--------|--------------|
| CRITICAL | Database down | Page on-call | SMS + Call |
| HIGH | Error rate >1% | Alert team | Email + Slack |
| MEDIUM | Performance degradation | Monitor | Email |
| LOW | Info messages | Log only | Dashboard |

---

## Dashboards

### Vercel Analytics Dashboard

Monitor function performance:

```
Endpoint Performance:
├── /api/health
│   ├── Avg latency: 8ms
│   ├── P99 latency: 15ms
│   └── Error rate: 0%
├── /api/gateway/evaluate
│   ├── Avg latency: 35ms
│   ├── P99 latency: 120ms (goal: <50ms)
│   └── Error rate: 0.02%
└── /api/stripe-app/webhook/events
    ├── Avg latency: 75ms
    ├── P99 latency: 250ms
    └── Error rate: 0.01%
```

### Sentry Dashboard

Error tracking:

```
Last 24 Hours:
├── Total errors: 15
├── Unique issues: 3
├── Affected users: 2
└── Error rate: 0.08%

Top Issues:
├── Database connection timeout (5)
├── Policy evaluation error (4)
└── OAuth token invalid (2)
```

### Supabase Dashboard

Database health:

```
Current Status:
├── Database: Healthy
├── Storage: 2.4 GB / 10 GB (24%)
├── Connections: 12 / 100 (12%)
└── Query time (P99): 45ms

Recent Activity:
├── Queries/sec: 150
├── Inserts/sec: 5
├── Updates/sec: 8
└── Deletes/sec: 0
```

### Upstash Dashboard

Cache health:

```
Current Status:
├── Memory: 245 MB / 500 MB (49%)
├── Hit rate: 87%
├── Latency (P99): 8ms
└── Commands/sec: 320

Top Keys:
├── policy:* (850 keys)
├── session:* (120 keys)
└── account:* (45 keys)
```

---

## SLO & SLI

### Service Level Objectives (SLOs)

**Availability**:
- **Target**: 99.9% uptime
- **SLI**: (Successful requests / Total requests) × 100%

**Latency**:
- **Target**: P99 latency <500ms
- **SLI**: (Requests completing <500ms / Total requests) × 100%

**Error Rate**:
- **Target**: <0.1% error rate
- **SLI**: (Requests with status 2xx / Total requests) × 100%

**Cache Hit Rate**:
- **Target**: >85% cache hit rate
- **SLI**: (Cache hits / (Cache hits + misses)) × 100%

### Monitoring SLOs

```javascript
// Calculate SLI in code
class SLOMonitor {
  trackRequest(duration, statusCode) {
    const isHealthy = statusCode >= 200 && statusCode < 300;
    const isLow Latency = duration < 500;
    
    // Track for SLI calculation
    this.totalRequests++;
    if (isHealthy) this.successfulRequests++;
    if (isLowLatency) this.fastRequests++;
  }
  
  getSLI() {
    return {
      availability: (this.successfulRequests / this.totalRequests) * 100,
      latency: (this.fastRequests / this.totalRequests) * 100
    };
  }
}
```

### Error Budget

**Monthly error budget** (99.9% SLO):
- Available uptime: 99.9%
- Error budget: 0.1% = 43.2 seconds downtime per month

**Monitor budget usage**:
```
Error budget used: 50%
├── Incident 1 (database): 21 seconds
├── Incident 2 (deploy): 15 seconds
└── Remaining budget: 7.2 seconds
```

---

## Troubleshooting

### Issue: High Latency on Gateway Endpoint

**Symptoms**: P99 latency > 200ms

**Investigation**:
1. Check Vercel Analytics for endpoint performance
2. Check Supabase query logs for slow queries
3. Check Upstash cache hit rate
4. Check function memory usage

**Solutions**:
- Increase function memory
- Optimize database queries (add indexes)
- Increase cache TTL for policies
- Profile function with Sentry Profiling

### Issue: High Error Rate

**Symptoms**: Error rate > 0.5%

**Investigation**:
1. Check Sentry for error type
2. Identify affected endpoints
3. Check correlation with changes
4. Check external service status

**Solutions**:
- Rollback recent changes
- Increase error handling
- Add retry logic for transient errors
- Check service dependencies

### Issue: Database Connection Pool Exhausted

**Symptoms**: "Connection timeout" errors

**Investigation**:
1. Check Supabase active connections
2. Check function concurrency
3. Check query execution time
4. Check for connection leaks

**Solutions**:
- Increase connection pool size
- Reduce function concurrency
- Optimize long-running queries
- Close connections properly

### Issue: Cache Hit Rate Declining

**Symptoms**: Hit rate < 70%

**Investigation**:
1. Check Upstash key count vs. memory
2. Check cache eviction rate
3. Review cache TTL settings
4. Check key access patterns

**Solutions**:
- Increase Redis memory
- Increase TTL for hot keys
- Implement better cache strategy
- Monitor key distribution

---

## Best Practices

### Monitoring Best Practices

1. **Alert on outcomes, not metrics**
   - Bad: Alert on CPU > 70%
   - Good: Alert on error rate > 1%

2. **Avoid alert fatigue**
   - Set meaningful thresholds
   - Don't alert on every anomaly
   - Use alert deduplication

3. **Document alert runbooks**
   - Every alert has a playbook
   - Include investigation steps
   - Include resolution steps

4. **Regularly test alerts**
   - Send test alerts weekly
   - Verify notification delivery
   - Update runbooks as needed

### Logging Best Practices

1. **Don't log secrets**
   - Never log Bearer tokens
   - Never log encryption keys
   - Use placeholder for sensitive data

2. **Structured logging**
   ```javascript
   // Good: Machine-readable
   logger.info('Payment processed', {
     payment_id: 'pay_123',
     amount: 10000,
     duration_ms: 250
   });
   
   // Bad: Free-form text
   logger.info('Payment for 100 dollars processed in 250ms');
   ```

3. **Appropriate log levels**
   - DEBUG: Developer details
   - INFO: Normal operation
   - WARN: Unexpected but handled
   - ERROR: Error occurred
   - CRITICAL: System down

---

**Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**Status**: Production Ready
