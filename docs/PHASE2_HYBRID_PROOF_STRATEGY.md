# Phase 2: Hybrid Proof Verification Strategy

**Decision:** Cached (A) primary path + Live Z3 (B) for verification  
**Implemented:** `lib/dsg/deterministic/proof-cache.ts`  
**Status:** Ready for integration into gate-engine

---

## Executive Summary

The `/api/dsg/v1/gates/evaluate` route uses a **hybrid two-path strategy** for proof verification:

- **Path A (Primary - Cached)**: Fast deterministic replay from stored `dsg_gate_decisions` records
  - Lookup by `input_hash` (SHA256 of constraints + context)
  - Return in <1ms if cache hit
  - Deterministic, audit-ready, cost-efficient
  
- **Path B (Secondary - Live)**: Fresh Z3 solver invocation when verification needed
  - Invoked on cache miss OR explicit verification flag
  - Produces fresh formal proofs
  - Used for audit/compliance verification
  - Slower (~100-500ms) but always current

**Design Goal:** Balance determinism + speed (Path A) with freshness guarantees (Path B)

---

## Architecture

```
POST /api/dsg/v1/gates/evaluate
    ├─ Auth ✓
    ├─ Rate limit ✓
    ├─ Entitlement ✓
    └─ evaluateDeterministicGate()
         └─ evaluateProofWithHybridStrategy()
              ├─ [Path A] hashProofInput() → inputHash
              │   └─ tryGetCachedProof(orgId, inputHash)
              │       └─ query dsg_gate_decisions (Neon/Supabase)
              │           └─ HIT: return cached proof (fast path)
              │           └─ MISS: fall through to Path B
              │
              └─ [Path B] invokeExternalSolver() OR proveDeterministicPlan()
                  ├─ Compute constraints
                  ├─ Optionally call Z3 solver (if enabled)
                  ├─ Generate proof
                  └─ recordProofDecision() → store in dsg_gate_decisions
                      └─ Enable future cache hits
```

---

## Decision Flow

### Input to Decision

1. **Request arrives**: POST /api/dsg/v1/gates/evaluate with:
   ```json
   {
     "planId": "plan_123",
     "context": { "hasApproval": true, "riskLevel": "low" },
     "policyRef": "policy_v1",
     "policyVersion": "uuid",
     "nonce": "n123",
     "idempotencyKey": "idem_123"
   }
   ```

2. **Compute cache key**: `inputHash = SHA256(request components)`
   ```typescript
   inputHash = hashProofInput(request)  // deterministic
   ```

3. **Check Path A (Cached)**:
   ```sql
   SELECT id, proof_hash, decision, z3_trace 
   FROM dsg_gate_decisions 
   WHERE org_id = ? AND input_hash = ?
   ORDER BY created_at DESC LIMIT 1
   ```
   
   - **Hit** (row found): Return cached proof immediately
     - Latency: <1ms
     - Used for: Regular gate evaluations (99% of traffic)
   
   - **Miss** (no row): Proceed to Path B
   - **Verify flag set**: Skip cache, proceed to Path B
     - Used for: Audit, compliance verification, re-evaluation

4. **If Path B (Live)**:
   - Invoke external Z3 solver (if `DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true`)
   - Generate fresh proof with solver metadata
   - Record in `dsg_gate_decisions` for future cache hits
   - Return proof with `source: 'live'`

---

## Database Schema Integration

### dsg_gate_decisions Table (Neon/Supabase)

```sql
CREATE TABLE dsg_gate_decisions (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  policy_version UUID,
  input_hash BYTEA NOT NULL,        -- Cache key (SHA256 of request)
  constraint_set JSONB,             -- Full constraints for replay
  decision VARCHAR(20),             -- 'ALLOW', 'BLOCK', 'REVIEW'
  decision_confidence DECIMAL,      -- 0.0 - 1.0
  proof_hash BYTEA,                 -- SHA256 of proof output
  proof_format VARCHAR(50),         -- 'dsg-deterministic-v1', etc.
  z3_status VARCHAR(10),            -- 'sat', 'unsat', 'unknown'
  z3_satisfiable BOOLEAN,           -- From solver response
  z3_solver_version VARCHAR(50),    -- e.g., '4.16.0'
  z3_smt2_hash VARCHAR(64),         -- Hash of SMT-LIB2 input
  z3_trace JSONB,                   -- Full solver response for replay
  created_by UUID,
  created_at TIMESTAMPTZ,
  
  UNIQUE(org_id, input_hash, created_at)
);

CREATE INDEX idx_dsg_gate_org_input ON dsg_gate_decisions(org_id, input_hash DESC);
```

**Key design**:
- `input_hash` = deterministic SHA256 of request = cache key
- `z3_trace` = full solver response = enables offline proof replay
- Append-only (no UPDATE/DELETE) = audit trail integrity

---

## Implementation Checklist

### Step 1: Wire proof-cache into gate-engine
- [ ] Update `evaluateDeterministicGate()` to call `evaluateProofWithHybridStrategy()`
- [ ] Pass hybrid options (orgId, verifyFresh flag, recordResult flag)
- [ ] Test cache hit/miss scenarios

### Step 2: Apply dsg_gate_decisions to Supabase
- [ ] Create migration: `supabase/migrations/20260801000004_supabase_dsg_gate_decisions.sql`
- [ ] Copy from Neon migration 20260801000003 (identical schema)
- [ ] Apply to Supabase production
- [ ] Verify RLS policies active

### Step 3: Update route handler
- [ ] Extract `orgId` from auth context
- [ ] Pass to `evaluateProofWithHybridStrategy()`
- [ ] Record `source` (cached vs live) in audit log
- [ ] Expose `source` in response (optional, for debugging)

### Step 4: Environment configuration
- [ ] `DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED` = "true" (for Path B)
- [ ] `DSG_EXTERNAL_SOLVER_URL` = configured Z3 endpoint
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = for dsg_gate_decisions writes
- [ ] Verify on Vercel production/preview

### Step 5: Test and monitoring
- [ ] Unit test: cache hit retrieves same proof
- [ ] Integration test: cache miss invokes live Z3
- [ ] Monitoring: track cache hit rate (target: >95% after warmup)
- [ ] Latency: cached <1ms, live ~100-500ms

---

## Cache Hit Rate Expectations

| Phase | Warmup | Steady State |
|-------|--------|--------------|
| **Hour 1** | 0% (cold start) | |
| **Hour 2-4** | 20-40% | First repeated patterns hit cache |
| **Day 1** | 70-80% | Most common constraints cached |
| **Week 1+** | 95%+ | Stable cache hit rate |

**Why high hit rate?**
- Most gate evaluations use similar constraint sets
- Same policies + context patterns repeat across agents
- Deterministic inputHash = same request = same cache key

---

## Cost & Performance Model

### Path A (Cached)
- **Latency**: <1ms (database lookup only)
- **Cost**: 1 Supabase read (on 1000 RPS = 1M reads/month ≈ $0.05)
- **Throughput**: 1000+ req/sec per instance

### Path B (Live)
- **Latency**: ~100-500ms (Z3 solver call)
- **Cost**: 1 external Z3 API call (on 1000 RPS = depends on Z3 pricing)
- **Throughput**: 2-10 req/sec per instance (Z3 CPU-bound)

### Blended (95% cached, 5% live)
- **Average latency**: 0.95ms + 25ms = **25.95ms** p50
- **Cost**: Primarily Supabase reads + occasional Z3 calls
- **Throughput**: ~900 req/sec per instance

---

## Failure Modes & Recovery

| Scenario | Behavior |
|----------|----------|
| **Cache miss (normal)** | Fall through to Path B, invoke Z3 |
| **Cache query fails** | Log warning, proceed to Path B (safe fallback) |
| **Z3 solver unavailable** | Return static proof (non-Z3), record in cache |
| **Org not found** | Return error (auth layer responsibility) |
| **Proof recording fails** | Log warning, still return proof (idempotent recording) |
| **High cache miss rate** | Monitor; indicates policy changes or new patterns |

**Recovery**: Proof recording is fire-and-forget; if recording fails, route still succeeds. Cache is best-effort; failures degrade to live evaluation.

---

## Migration to Supabase

### Create Migration
**File**: `supabase/migrations/20260801000004_supabase_dsg_gate_decisions.sql`

```bash
# Copy content from Neon migration
cp supabase/migrations/20260801000003_phase2_neon_dsg_gate_decisions.sql \
   supabase/migrations/20260801000004_supabase_dsg_gate_decisions.sql
```

### Apply via Supabase CLI
```bash
supabase migration list
supabase db push  # Applies pending migrations
```

### Verify
```bash
supabase db pull  # Verify schema in local environment
# Check: org_id, input_hash, proof_hash, z3_trace, RLS policies
```

---

## Monitoring & Observability

### Key Metrics

1. **Cache hit rate**: `cache_hits / (cache_hits + cache_misses)`
   - Target: >95%
   - Dashboard alert: <80%

2. **Proof latency**:
   - p50 (median): <2ms
   - p95: <50ms
   - p99: <500ms

3. **Live Z3 invocations**: Count per org per day
   - Expected: <5% of gate evaluations
   - Alert if >20%

### Logging
```typescript
// In proof-cache.ts
console.log(`[Proof Cache] HIT: ${inputHash.slice(0, 8)}...`);
console.log(`[Proof Cache] MISS/VERIFY: ${inputHash.slice(0, 8)}... (invoking live Z3)`);

// In route handler
logDsgApiCall({
  ...
  proofSource: source,  // 'cached' or 'live'
  proofLatencyMs: latency,
  cacheHit: source === 'cached',
});
```

---

## Timeline

- **Aug 2-3 (Today)**: Wire proof-cache into gate-engine, apply Supabase migration
- **Aug 4**: Update route handler, test cache scenarios
- **Aug 5**: Deploy to Vercel, monitor cache hit rate
- **Aug 6+**: Optimize Z3 solver configuration, benchmark load testing

---

## References

- `lib/dsg/deterministic/proof-cache.ts` — Hybrid strategy implementation
- `lib/dsg/deterministic/proof-engine.ts` — Live proof generation
- `app/api/dsg/v1/gates/evaluate/route.ts` — Route handler
- `docs/PHASE2_PLAN.md` — Phase 2 milestones
