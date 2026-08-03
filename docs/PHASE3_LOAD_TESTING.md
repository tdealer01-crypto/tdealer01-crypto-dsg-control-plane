# Phase 3: Load Testing Harness — Hybrid Proof Verification Under 1000 Concurrent Agents

## Overview

Phase 3 validates the Phase 2 hybrid proof verification strategy (cached proofs + live Z3 fallback) under realistic production load. The k6 load testing framework simulates 1000 concurrent agents evaluating deterministic gates with mixed workloads.

## Objectives

- **Cache hit rate verification**: Confirm 80%+ cache hit rate in steady state
- **Latency SLAs**: Ensure 95th percentile latency < 500ms (cached) and < 1s (live)
- **Throughput**: Validate system handles 1000 concurrent agents
- **Fallback reliability**: Verify live Z3 path handles cache misses gracefully
- **Multi-tenant isolation**: Confirm org-scoped RLS under load

## Setup

### Prerequisites

1. **k6 CLI** — Download from [k6.io](https://k6.io/docs/getting-started/installation/)
2. **Running DSG ONE instance** — Local or deployed Vercel
3. **Valid API key** — From your DSG ONE agent
4. **Environment variables**:
   ```bash
   BASE_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
   API_KEY="your-agent-api-key"
   ```

### Installation

k6 is a standalone binary. No npm dependencies required.

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Or download from k6.io
```

## Test Scenarios

### Scenario 1: Local Development (Quick)

**Duration**: ~5 minutes  
**Agents**: Ramp 0 → 50 → 0  
**Purpose**: Verify script syntax and basic functionality

```bash
k6 run tests/load/phase2-hybrid-proof-k6.js \
  -e BASE_URL="http://localhost:3000" \
  -e API_KEY="local-test-key" \
  --vus 10 \
  --duration 30s
```

### Scenario 2: Production Staging (Comprehensive)

**Duration**: ~7 minutes  
**Agents**: Ramp 0 → 100 → 500 → 1000 → 0  
**Purpose**: Full load test with ramp-up/ramp-down

```bash
k6 run tests/load/phase2-hybrid-proof-k6.js \
  -e BASE_URL="https://staging.example.com" \
  -e API_KEY="staging-api-key" \
  --out csv=test-results/phase3-load-test.csv
```

### Scenario 3: Production GO/NO-GO Gate

**Duration**: ~10 minutes  
**Agents**: Constant 1000  
**Purpose**: Final production readiness validation

```bash
k6 run tests/load/phase2-hybrid-proof-k6.js \
  -e BASE_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app" \
  -e API_KEY="$PRODUCTION_API_KEY" \
  --out csv=test-results/phase3-production-go.csv \
  --summary-export=test-results/phase3-summary.json
```

## Test Flow

### 1. Ramp-up Phase (4 minutes)
- 0 → 100 agents (30s): Baseline throughput, single-digit cache misses
- 100 → 500 agents (1m): Cache building, stabilization
- 500 → 1000 agents (2m): Peak load, cache convergence

### 2. Steady State (3 minutes)
- 1000 concurrent agents
- Expected: 80%+ cache hit rate, < 500ms P95 latency
- Monitor: Z3 solver fallback triggering

### 3. Ramp-down (1.5 minutes)
- 1000 → 500 → 0 agents
- Verify graceful shutdown, no lingering requests

## Metrics Collected

### Primary Metrics (SLAs)

| Metric | Target | Notes |
|--------|--------|-------|
| `http_req_duration` P95 | < 500ms | Cached decision latency |
| `http_req_duration` P99 | < 1s | Live Z3 decision latency |
| `cache_hits` | > 0 | Verify caching works |
| `proof_from_cache` | ≥ 80% | Cache hit rate |
| `http_req_failed` | < 1% | Failure rate |
| `z3_solver_latency` | 100-500ms | Z3 invocation time |

### Custom Metrics

- **`cache_hits`** (Counter): Total cached proof decisions
- **`cache_misses`** (Counter): Total live Z3 invocations
- **`liveZ3_invocations`** (Counter): Z3 fallback calls
- **`proof_latency_ms`** (Trend): End-to-end decision latency
- **`z3_solver_latency_ms`** (Trend): Z3-only execution time
- **`proof_from_cache`** (Rate): Proportion of cached vs live decisions

## Expected Results

### Steady State (1000 agents)

```
Cache hit rate:           85% ± 5%
Cached decision latency:  < 50ms P95, < 100ms P99
Live Z3 latency:          150-400ms P50, < 800ms P99
Throughput:               ~500 decisions/sec per 1000 agents
Org isolation errors:     0
RLS policy violations:    0
```

### Pass Criteria (GO/NO-GO)

✅ **GO** if:
- Cache hit rate ≥ 80%
- P95 latency ≤ 500ms for cached decisions
- P95 latency ≤ 1000ms for live decisions
- Failure rate < 1%
- Zero RLS/org-scoping violations
- Zero unhandled exceptions

❌ **NO-GO** if any of the above fail consistently.

## Output & Analysis

### CSV Output

```bash
# Generated in test-results/phase3-load-test.csv
timestamp,metric_name,metric_value,metric_tags
2026-08-02T16:45:00Z,http_req_duration,45.2,"url=http://localhost:3000/api/dsg/v1/gates/evaluate"
2026-08-02T16:45:01Z,cache_hits,1,"scenario=simple_allow"
...
```

### JSON Summary

```bash
# Generated in test-results/phase3-summary.json
{
  "metrics": {
    "cache_hits": { "count": 8500 },
    "cache_misses": { "count": 1500 },
    "proof_from_cache": { "value": 0.85 },
    "http_req_duration": {
      "p(95)": 450,
      "p(99)": 950,
      "avg": 120
    },
    "z3_solver_latency": { "avg": 280 }
  }
}
```

## Troubleshooting

### High Cache Miss Rate (< 80%)

**Symptom**: `proof_from_cache` is below 80%  
**Causes**:
- Cache table not populated (migration not applied)
- RLS policies blocking service_role inserts
- Different org_id per request (cache key mismatch)

**Fix**:
1. Verify migration: `SELECT COUNT(*) FROM dsg_gate_decisions;`
2. Check RLS: `SELECT * FROM pg_policies WHERE tablename = 'dsg_gate_decisions';`
3. Ensure consistent org_id in test payloads

### High Latency (> 500ms cached)

**Symptom**: P95 latency exceeds SLA  
**Causes**:
- Database query slow (missing indexes)
- Network latency to Supabase
- Z3 solver running when cache should hit

**Fix**:
1. Verify indexes: `SELECT * FROM pg_indexes WHERE tablename = 'dsg_gate_decisions';`
2. Check Supabase query logs for slow queries
3. Verify cache hit rate; if low, see "High Cache Miss Rate" above

### RLS Policy Violations

**Symptom**: 403 Forbidden on some requests  
**Causes**:
- Test org_id not in user's orgs
- `users` table missing user records
- RLS policy misconfigured

**Fix**:
1. Verify user has access: `SELECT * FROM public.users WHERE auth_user_id = auth.uid();`
2. Verify org membership: `SELECT * FROM public.user_orgs WHERE user_id = auth.uid();`
3. Review RLS policy in migration

## Next Steps

After Phase 3 passes GO/NO-GO:

1. **Phase 4**: GitHub Actions preview branching with per-PR database isolation
2. **Production deployment**: Monitor cache hit rate post-launch
3. **Incident response**: Z3 solver failure fallback procedures

## References

- [Phase 2 Hybrid Proof Strategy](./PHASE2_HYBRID_PROOF_STRATEGY.md)
- [k6 Documentation](https://k6.io/docs/)
- [dsg_gate_decisions Schema](../supabase/migrations/20260801000004_supabase_dsg_gate_decisions.sql)
- [DSG ONE Gate API](./API_REFERENCE.md#post-apidsgv1gatesevaluate)
