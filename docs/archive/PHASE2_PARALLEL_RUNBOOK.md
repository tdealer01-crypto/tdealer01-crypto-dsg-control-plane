# Phase 2 Parallel Control Plane - Operations Runbook

**Document Status**: Operations Ready  
**Last Updated**: 2026-07-30  
**Audience**: Platform operators, on-call engineers, SREs

## Overview

This runbook covers operational procedures for the Phase 2 parallel control plane architecture, which adds:

- **Request queue** with 3-level priority and fairness enforcement
- **Harmony engine** with hybrid semantic matching (heuristic + embedding)
- **Executor throttle** with per-type capacity limits
- **Manifest cache** with LRU eviction and TTL
- **Audit batch writer** with cryptographic hash chain verification
- **Real-time metrics dashboard** with alerting

### Key Targets

- **Queue latency**: p50 < 100ms, p99 < 1s
- **Cache hit rate**: > 80% under typical load
- **Executor utilization**: < 80% for healthy operation
- **Audit chain integrity**: 100% (no broken chains)

---

## 1. Quick Start

### Deployment Checklist

```bash
# 1. Verify all components compiled
npm run typecheck

# 2. Run unit tests
npm run test:unit -- tests/unit/parallel

# 3. Run integration tests
npm run test:integration -- tests/integration/parallel

# 4. Run load tests (optional, ~30s)
npm run test:load -- tests/load/parallel

# 5. Deploy to staging
npm run build
npm run start

# 6. Smoke test live endpoint
curl -X GET https://staging.tdealer01-crypto-dsg-control-plane.vercel.app/api/metrics/parallel

# 7. Deploy to production
# (Follow Vercel/GitHub Actions flow)

# 8. Verify production metrics
curl -X GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/metrics/parallel
```

### Manual Verification Commands

```bash
# Check request queue health
curl -X GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/parallel/health

# View current metrics
curl -X GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/metrics/parallel

# Inject test request
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/parallel/execute \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 1,
    "agentId": "test-agent",
    "delegationId": "test-delegation",
    "command": {
      "frameId": "test-frame",
      "elementId": "test-element",
      "operation": "click"
    }
  }'
```

---

## 2. Component Architecture

### Request Queue (`lib/performance/request-queue.ts`)

**Purpose**: Priority-based FIFO queueing with deadline enforcement and starvation prevention

**Key Features**:
- 3 priority levels (P1=CONFIRM, P2=AUDIT, P3=AUTO)
- 30-second timeout per request
- Max 10,000 pending requests
- Fairness: P3 guaranteed processing every 5 P1/P2
- Dead-letter queue for stale items (>15 min)

**Configuration**:
```typescript
MAX_QUEUE_SIZE: 10_000
REQUEST_TIMEOUT_MS: 30_000 // 30s
MAX_CONSECUTIVE_P3_DEQUEUES: 5 // Fairness
CLEANUP_CONFIG: {
  stalePendingTTL: 900_000,    // 15 min
  cleanupIntervalMs: 60_000,   // Every 1 min
  maxDLQSize: 1_000
}
```

**Metrics**:
- Queue size (current, trend)
- Wait time (p50, p95, p99)
- Priority distribution (p1, p2, p3 counts)
- Rejection rate
- Expiration rate

---

### Harmony Engine (`lib/parallel/harmony-engine.ts`)

**Purpose**: Hybrid semantic matching for fast manifest caching

**Two-Tier Matching**:

1. **Tier 1 (Heuristic)**: O(1) exact command hash lookup
   - Target: < 5ms
   - TTL: 5 minutes
   - Eviction: LRU when > 5000 entries

2. **Tier 2 (Embedding)**: O(n) cosine similarity on feature vectors
   - Target: < 50ms
   - Similarity threshold: 0.85
   - Max entries: 2000

**Configuration**:
```typescript
HEURISTIC_TTL_MS: 5 * 60 * 1000
EMBEDDING_SIMILARITY_THRESHOLD: 0.85
MAX_HEURISTIC_ENTRIES: 5000
MAX_EMBEDDING_ENTRIES: 2000
```

**Metrics**:
- Hit rate (heuristic, embedding, total)
- Miss count
- Latency (avg, p50, p95, p99)
- Index size (heuristic entries, embedding vectors)

---

### Executor Throttle (`lib/performance/executor-throttle.ts`)

**Purpose**: Prevent system overload by enforcing concurrent session limits

**Capacity Limits per Org**:
- Virtual-PC: 50 concurrent
- Browserbase: 100 concurrent
- Terminal: 200 concurrent
- Deploy: 1 concurrent (serialized)

**Configuration**:
```typescript
CAPACITY_LIMITS: {
  'virtual-pc': 50,
  'browserbase': 100,
  'terminal': 200,
  'deploy': 1
}
```

**Metrics**:
- Utilization % per executor type
- Current count vs max
- Peak count (watermark)

---

### Manifest Cache (`lib/cache/manifest-cache.ts`)

**Purpose**: LRU cache with TTL for SafeElementManifest

**Limits per Cache Instance**:
- Max entries: 100 (default)
- Max memory: 50MB (default)
- TTL: 5 minutes (default)

**Configuration**:
```typescript
maxSize: 100 entries
maxMemory: 50 * 1024 * 1024 // 50MB
defaultTTL: 5 * 60 * 1000 // 5 min
```

**Eviction Strategy**:
1. Remove expired entries (TTL)
2. Remove oldest entries (LRU) if over size limit
3. Remove oldest entries if over memory limit

**Metrics**:
- Hit rate %
- Miss count
- Eviction count
- Memory used (bytes)
- Avg entry size
- Avg latency (ms)

---

### Audit Batch Writer (`lib/performance/audit-batch-writer.ts`)

**Purpose**: Efficient audit trail with cryptographic hash chain

**Batching**:
- Buffer size: 100 events or 100ms (whichever first)
- Max buffer: 10,000 events (reject if exceeded)
- Hash chain: SHA256(event + previousHash)

**Configuration**:
```typescript
FLUSH_INTERVAL_MS: 100
FLUSH_SIZE_THRESHOLD: 100
MAX_BUFFER_SIZE: 10_000
```

**Metrics**:
- Batch latency (ms)
- Events in buffer
- Total batches written
- Chain status (valid, broken, unknown)

---

### Hash Chain (`lib/audit/hash-chain.ts`)

**Purpose**: Detect audit trail tampering via cryptographic verification

**Verification**:
1. Sort events by createdAt
2. Check previousHash links
3. Recompute each event hash
4. Fail if any mismatch

**Configuration**: None (deterministic)

---

## 3. Operations Tasks

### 3.1 Monitoring

**Key Metrics to Watch** (every 5 min):

```json
{
  "queue": {
    "size": "<target: <100, warn: >500, critical: >1000>",
    "p99WaitMs": "<target: <500ms, warn: >800ms, critical: >1s>",
    "priority_distribution": "track p1 vs p2 vs p3 balance"
  },
  "cache": {
    "totalHitRate": "<target: >80%, warn: <70%, critical: <50%>",
    "avgLatencyMs": "<target: <10ms, warn: >50ms>"
  },
  "executors": {
    "virtual_pc_util": "<warn: >75%, critical: >90%>",
    "browserbase_util": "<warn: >75%, critical: >90%>",
    "terminal_util": "<warn: >75%, critical: >90%>"
  },
  "audit": {
    "chainStatus": "<must be 'valid', 'broken' = incident>"
  }
}
```

**Dashboard**: `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/parallel`

### 3.2 Alerting

**Automated Alerts** (via `/api/metrics/parallel`):

| Alert | Threshold | Action |
|-------|-----------|--------|
| Queue size high | > 1000 | Scale up executors or review policies |
| Cache hit rate low | < 60% | Check manifest DB, review prefetch strategy |
| P99 latency high | > 1s | Check executor capacity, review queue depth |
| Executor utilization high | > 80% | Increase limits or scale horizontally |
| Audit chain broken | status = broken | Investigate tampering, restore from backup |

### 3.3 Troubleshooting

#### Symptom: Manifest miss rate high (>20%)

**Diagnosis**:
1. Check cache hit rate: `GET /api/metrics/parallel` → `cache.totalHitRate`
2. Check embedding model: Are feature vectors capturing differences?
3. Check DB queries: Are manifests stored with correct delegationId?

**Recovery**:
```bash
# 1. Review harmony stats
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/parallel/health

# 2. Check delegation contracts in DB
SELECT COUNT(*), mission_id FROM delegations GROUP BY mission_id

# 3. If needed, rebuild harmony index
POST /api/parallel/rebuild-index
{
  "delegationId": "del-123",
  "force": true
}
```

#### Symptom: Executor capacity exhausted

**Diagnosis**:
1. Check utilization: `GET /api/metrics/parallel` → `executors.*.utilizationPercent`
2. Check active sessions: `SELECT COUNT(*) FROM sessions WHERE status = 'active'`

**Recovery**:
```bash
# Option 1: Increase capacity (temporary)
POST /api/parallel/executor/increase-capacity
{
  "executorType": "virtual-pc",
  "orgId": "org-123",
  "newLimit": 75
}

# Option 2: Scale horizontally (permanent)
# - Increase serverless instance count in Vercel
# - Or add dedicated container orchestration

# Option 3: Review policies
# - Are P3 (auto) requests too aggressive?
# - Can confirmation timeout be reduced?
```

#### Symptom: Audit chain broken (integrity error)

**Diagnosis**:
1. Check chain status: `GET /api/metrics/parallel` → `audit.chainStatus`
2. Query audit table for mismatches:
   ```sql
   SELECT COUNT(*) FROM agi_action_audit
   WHERE previous_hash != COALESCE(
     (SELECT event_hash FROM agi_action_audit a2
      WHERE a2.job_id = agi_action_audit.job_id
      AND a2.created_at < agi_action_audit.created_at
      ORDER BY created_at DESC LIMIT 1),
     '0'
   )
   ```

**Recovery**:
```bash
# 1. Stop processing requests
POST /api/parallel/pause

# 2. Verify most recent valid batch
GET /api/audit/chain/head

# 3. Restore from backup (if available)
POST /api/audit/restore
{
  "fromBackupAt": "2026-07-30T10:00:00Z"
}

# 4. Resume processing
POST /api/parallel/resume
```

### 3.4 Configuration Tuning

**Request Queue**:
- `MAX_QUEUE_SIZE`: Increase if queue fills frequently (vs scaling executors)
- `REQUEST_TIMEOUT_MS`: Decrease if requests timeout before completion
- `MAX_CONSECUTIVE_P3_DEQUEUES`: Increase if P3 starvation occurs

**Harmony Engine**:
- `HEURISTIC_TTL_MS`: Decrease if command context changes quickly
- `EMBEDDING_SIMILARITY_THRESHOLD`: Increase (0.85→0.90) to reduce false matches
- `MAX_HEURISTIC_ENTRIES`: Increase for better cache locality

**Executor Throttle**:
- Increase limits based on resource availability (CPU, memory)
- Decrease if seeing cascading failures

**Manifest Cache**:
- `maxSize`: Increase if eviction rate is high
- `maxMemory`: Increase if available on instance
- `TTL`: Decrease if manifests change frequently

**Audit Batch Writer**:
- `FLUSH_INTERVAL_MS`: Decrease if latency is critical
- `FLUSH_SIZE_THRESHOLD`: Increase for better throughput

---

## 4. Performance Tuning

### 4.1 Cache Hit Rate Optimization

**Current Target**: > 80%

**Levers**:
1. **Prefetch Strategy**: Background fetch next expected manifests
   ```typescript
   // In delegation handler
   await harmonyEngine.prefetchNextCommands(delegation);
   ```

2. **Embedding Tuning**: Better feature vectors
   - Review `encodeCommand()` function
   - Add more salient features (operation type dominates)
   - Test on real command patterns

3. **Heuristic Index Size**: Increase `MAX_HEURISTIC_ENTRIES`
   - Each entry: ~200 bytes
   - 5000 entries = ~1MB RAM

### 4.2 Latency Optimization

**Current Targets**: p50 < 100ms, p99 < 1s

**Levers**:
1. **Queue Processing**: Parallel dequeue
   ```typescript
   // Current: sequential dequeue
   // Future: batch dequeue (10-20 at once)
   async function dequeueBatch(size: number): Promise<QueuedRequest[]> {
     const batch = [];
     for (let i = 0; i < size; i++) {
       const req = queue.dequeue();
       if (req) batch.push(req);
     }
     return batch;
   }
   ```

2. **Executor Warmup**: Pre-start sessions for P1/P2
   ```typescript
   // Spawn session before request arrives
   const session = await spawnExecutorSession(executorType);
   ```

3. **Manifest Streaming**: Return manifest while still processing
   ```typescript
   // Don't wait for full batch; stream results
   response.write(JSON.stringify(manifest));
   ```

### 4.3 Throughput Optimization

**Target**: 1000+ RPS without degradation

**Levers**:
1. **Batch Writes**: Flush audit in larger batches (100→500 events)
2. **Connection Pooling**: Reuse Supabase connections
3. **Memory Pooling**: Pre-allocate buffers

---

## 5. Incident Response

### P1 Incident: Audit Chain Broken

**Impact**: Governance integrity compromised; cannot trust audit trail

**Steps**:
1. Page on-call immediately
2. Pause all execution: `POST /api/parallel/pause`
3. Isolate broken batch:
   ```sql
   SELECT * FROM agi_action_audit
   WHERE job_id = 'job-xyz'
   AND created_at > 'broken_timestamp'
   LIMIT 100
   ```
4. Restore from backup or manual re-entry
5. Verify chain:
   ```bash
   npm run test:audit -- --verify-chain
   ```
6. Resume: `POST /api/parallel/resume`
7. Post-mortem: Review tampering vectors

### P2 Incident: Queue Backlog Building

**Impact**: Requests queued > 30s, may timeout; user-facing degradation

**Steps**:
1. Check executor utilization: `GET /api/metrics/parallel`
2. If > 80%: Increase capacity or scale
3. If < 80%: Check for hanging sessions
4. Increase P1 priority to process confirmation requests faster
5. Monitor queue drain rate: `p99WaitMs should decrease over 5 min`

### P3 Incident: Cache Hit Rate Dropping

**Impact**: Manifest lookups hitting DB more; latency increases

**Steps**:
1. Check recent delegation policy changes
2. Invalidate affected contracts: `POST /api/harmony/invalidate-contract`
3. Rebuild indices: `POST /api/harmony/rebuild-indices`
4. Monitor hit rate recovery: should improve within 1 min

---

## 6. Testing & Verification

### 6.1 Unit Tests (Run Before Deployment)

```bash
npm run test:unit -- tests/unit/parallel
npm run test:unit -- tests/unit/cache
npm run test:unit -- tests/unit/audit

# Should all pass with >85% coverage
```

**Coverage Targets**:
- harmony-engine: >90%
- request-queue: >85%
- executor-throttle: >85%
- manifest-cache: >85%
- hash-chain: >90%

### 6.2 Integration Tests (Run Before Deployment)

```bash
npm run test:integration -- tests/integration/parallel

# Should verify:
# - End-to-end flow from request → harmony → audit
# - Priority enforcement
# - Concurrent request handling
```

### 6.3 Load Tests (Optional, ~30s)

```bash
npm run test:load -- tests/load/parallel/concurrent-agents.test.ts

# Should verify:
# - 100 agents: p50 < 100ms
# - 500 agents: p95 < 500ms, hit rate > 80%
# - 1000 agents: graceful degradation (p99 < 5s)
```

### 6.4 Production Smoke Tests (After Deployment)

```bash
#!/bin/bash
BASE_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"

# 1. Health check
curl -f $BASE_URL/api/health || exit 1

# 2. Metrics endpoint
METRICS=$(curl -s $BASE_URL/api/metrics/parallel)
HIT_RATE=$(echo $METRICS | jq '.cache.totalHitRate')
echo "Cache hit rate: $HIT_RATE%"
[ $HIT_RATE -gt 50 ] || exit 1

# 3. Test request
curl -f -X POST $BASE_URL/api/parallel/execute \
  -H "Content-Type: application/json" \
  -d '{"priority":1,"agentId":"smoke-test","delegationId":"del-1","command":{"frameId":"f1","elementId":"e1","operation":"click"}}' || exit 1

echo "✓ All smoke tests passed"
```

---

## 7. Runbook Reference

| Task | Command | Frequency |
|------|---------|-----------|
| Monitor dashboard | Visit `/dashboard/parallel` | Every 5 min (continuous) |
| Check metrics | `GET /api/metrics/parallel` | Every 5 min |
| Verify audit chain | `npm run test:audit` | Nightly |
| Rebuild indices | `POST /api/harmony/rebuild-indices` | Weekly or on-demand |
| Backup audit trail | DB backup procedure | Daily |
| Review queue stats | Query logs | Weekly |
| Performance review | Analyze metrics trends | Monthly |

---

## 8. Support & Escalation

**On-Call Runbook**: [Link to PagerDuty/etc]

**Escalation Path**:
1. Level 1 (On-Call): Diagnosis, restart, temporary increase limits
2. Level 2 (Platform Lead): Architecture review, permanent tuning
3. Level 3 (VP Eng): Major incident, data recovery

**Contact**:
- Slack: `#dsg-operations`
- Email: `dsg-ops@tdealer01.dsg.pics`
- GitHub: Issues tagged `incident`

---

## Appendix A: Key Files

| File | Purpose |
|------|---------|
| `lib/performance/request-queue.ts` | Priority queue implementation |
| `lib/parallel/harmony-engine.ts` | Semantic matching engine |
| `lib/performance/executor-throttle.ts` | Capacity management |
| `lib/cache/manifest-cache.ts` | LRU cache for manifests |
| `lib/performance/audit-batch-writer.ts` | Audit trail batching |
| `lib/audit/hash-chain.ts` | Chain verification |
| `lib/metrics/parallel-metrics.ts` | Metrics collection |
| `app/dashboard/parallel/page.tsx` | Monitoring dashboard |
| `tests/unit/parallel/*.test.ts` | Unit test suite |

## Appendix B: Dashboards

**Real-Time Dashboard**: `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/parallel`

**Grafana Integration**: (TODO) Configure Prometheus scrape of `/api/metrics/parallel`

**Alerts**: Configured in `/dashboard/parallel` with thresholds per section 3.2

