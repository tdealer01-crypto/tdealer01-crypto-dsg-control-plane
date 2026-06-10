# Master Integration Plan: Safe DOM + AGI Evolution Simulation
**Version:** 2.0 (Merged: PR702 Review + dsg-agi-simulation-master)  
**Date:** 2026-06-10  
**Branch:** `claude/pr702-simulation-repo-h4fbfu`

---

## Executive Summary

This is the **unified implementation roadmap** for:
1. **PR702:** Safe DOM Mirror Phase 1 (deterministic DOM access control library)
2. **dsg-agi-simulation-master:** Genetic algorithm + Z3 formal verification for DSG governance parameter evolution
3. **Phase 1-2 Integration:** Combining Safe DOM gates with evolved governance parameters

**Key Insight:** The simulation provides the evolution engine to find optimal Safe DOM policy parameters (blockThreshold, reviewThreshold, decision gate timeouts) validated through Z3 formal verification and canary deployment.

---

## Part 1: Core Components

### 1.1 Safe DOM Mirror (PR702) — Access Control Library

**What it does:**
```typescript
// Agent-facing safe view (no selectors, no secrets)
SafeDomElement[] {
  id: "e001",           // Opaque element ID
  role: "button",
  text: "View logs",
  allowedOps: ["click"]
}

// Server-side manifest (for verification only)
SafeElementManifest[] {
  ...SafeDomElement,
  frameId: "frame_abc",
  internalSelector: "#logs-button",  // Hidden from agent
  expiresAt: "2026-06-10T12:05:00Z"
}

// Agent command → verification
verifySafeDomCommand(manifest, {
  frameId: "frame_abc",
  elementId: "e001",
  operation: "click"
}) → ALLOW or BLOCK
```

**Core Invariant:**
```
If DSG does not expose an element in the manifest, agent cannot invoke it.
```

**Status:** Phase 0 (Library only)
- ✅ Unit tests (165 lines)
- ✅ Core types + filter + redaction + manifest + verification
- 🔧 Requires: validateManifest() + element ID collision fix
- ⏳ Requires: Integration with executors (PR703-705)

---

### 1.2 AGI Evolution Simulation (dsg-agi-simulation-master) — Parameter Optimization

**What it does:**
Genetic algorithm + Z3 solver to find optimal governance parameters:

```typescript
GenomeParameters {
  // Rate Limiting
  rateLimitRpm: 100-1000,
  rateLimitWindowMs: 1000-300000,
  
  // Quotas
  freeTierQuota: 100-10000,
  paidTierMultiplier: 1.5-100,
  quotaWindowDays: 1-30,
  
  // Caching
  cacheTtlMs: 1000-3600000,
  cacheMaxSize: 100-100000,
  
  // Execution Control
  maxConcurrentExecutions: 1-100,
  queueDepth: 10-10000,
  executionTimeoutMs: 1000-120000,
  webhookTimeoutMs: 500-30000,
  
  // Decision Gates (DIRECTLY RELATED TO SAFE DOM)
  blockThreshold: 0.5-0.99,      // Confidence threshold for blocking
  reviewThreshold: 0.1-0.5,      // Confidence threshold for review
  
  // Batching
  batchSize: 1-100,
  batchWindowMs: 10-5000
}
```

**Evolution Process:**
1. **Initialize:** Seed population of genomes with random parameters
2. **Simulate:** Run each genome against workload trace
3. **Evaluate Fitness:**
   - latencyP99 (milliseconds)
   - errorRate (0-1)
   - throughput (requests/sec)
   - costEfficiency (0-100)
   - slaCompliance (boolean)
   - zeroDataLoss (boolean)
   - auditCompleteness (0-1)
   - humanOverrideRate (0-1)
   - quotaUtilization (0-1)
   - composite score (0-1)
4. **Verify:** Z3 solver checks constraints
5. **Canary:** Deploy to 5-10% traffic before production
6. **Select:** Elite genomes + crossover + mutation
7. **Repeat:** Until fitness plateau or max generations

**Input Constraints (Z3-Verifiable):**
```typescript
Z3ConstraintSet {
  slaContracts: [
    { metric: "latencyP99", threshold: 500, operator: "lte" },
    { metric: "errorRate", threshold: 0.05, operator: "lte" }
  ],
  securityInvariants: [
    { name: "NoDataLoss", expression: "zeroDataLoss == true" },
    { name: "AuditComplete", expression: "auditCompleteness >= 0.9" }
  ],
  resourceLimits: {
    maxConcurrentExecutions: 100,
    maxQueueDepth: 10000,
    maxMemoryMB: 1024,
    maxCpuPercent: 80
  },
  auditRequirements: [
    { eventType: "execution", requiredFields: ["agentId", "decision", "reason"] }
  ]
}
```

**Output:** Best genome + proof chain
```typescript
SimulationOutput {
  bestGenome: Genome,              // Optimal parameters found
  fitnessTrajectory: FitnessScore[][],  // Evolution history
  z3Proofs: Map<GenomeId, Z3Proof>,    // Formal verification
  canaryResults: Map<GenomeId, CanaryResult>,  // Real traffic validation
  verification: VerificationReport,    // Deterministic = ✅
  replayToken: ReplayToken             // Same seed = Same output
}
```

**Status:** Standalone (research/evolution tool)
- ✅ TypeScript types complete
- ✅ Physics simulation layer
- ✅ Fitness evaluation
- ✅ Z3 integration
- ✅ Genome management
- ⏳ Requires: Integration with Safe DOM policy evolution (Phase 2)

---

## Part 2: Integration Roadmap

### Phase 0: Library Correctness (PR702)

**Goal:** Merge Safe DOM library with core security fixes

**Work:**
- Add `validateManifest()` function (~30-50 lines)
  - Check duplicate element IDs
  - Verify TTL not expired
  - Validate schema

- Fix element ID collision risk (~20-30 lines)
  - Current: `e001`, `e002` (reusable)
  - Fixed: Include frame/session scoping

**Timeline:** 1-2 hours  
**Merge Condition:** Unit tests pass + validateManifest verified

---

### Phase 1: Safe DOM Integration (PR703-705)

**Goal:** Connect Safe DOM to existing executors (Virtual PC, Browserbase, Spine Execute)

#### PR703: Virtual PC + Safe DOM (3-5 hours)

```
Virtual PC renders React page
  ↓
Extract DOM → RawDomElement[]
  ↓
buildSafeManifest(elements, { frameId: sessionId, ttlMs: 300_000 })
  ↓
Store in session state
  ↓
Return SafeDomElement[] to agent (no selectors)
  ↓
Agent command: { frameId, elementId: "e001", operation: "click" }
  ↓
verifySafeDomCommand(manifest, command) → ALLOW/BLOCK
  ↓
Execute with audit trail
```

**Files:**
- lib/dsg/app-builder/virtual-pc-safe-dom-integration.ts (120 lines)
- tests/integration/dsg-safe-dom-virtual-pc.test.ts (100 lines)

---

#### PR704: Browserbase + Safe DOM (4-6 hours)

```
Browserbase session created
  ↓
Agent requests: /api/safe-dom/browserbase/build-manifest
  │
  ├─ Input: { sessionId, frameUrl }
  ├─ Fetch live DOM from Browserbase API
  ├─ buildSafeManifest()
  ├─ INSERT into supabase.safe_dom_manifests
  └─ Return: { frameId, view: SafeDomElement[] }
  ↓
Agent command: { frameId, elementId: "e001", operation: "click" }
  ↓
Agent requests: /api/safe-dom/browserbase/execute-command
  │
  ├─ Fetch manifest from DB
  ├─ verifySafeDomCommand()
  ├─ If ALLOW: Send to Browserbase API
  └─ Return result + audit entry
```

**Minimum Database Schema:**
```sql
CREATE TABLE safe_dom_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  frame_id TEXT NOT NULL,
  manifest_json JSONB NOT NULL,        -- Full serialized manifest
  org_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,       -- TTL enforcement (5 min default)
  
  UNIQUE(session_id, frame_id),
  CONSTRAINT expires_at_in_future CHECK (expires_at > created_at)
);

CREATE INDEX idx_safe_dom_expires ON safe_dom_manifests(expires_at);
CREATE INDEX idx_safe_dom_session ON safe_dom_manifests(session_id, frame_id);
```

**Files:**
- lib/executors/browserbase-safe-dom-integration.ts (150 lines)
- app/api/safe-dom/browserbase/route.ts (80 lines)
- supabase/migrations/XXX_add_safe_dom_manifests.sql (30 lines)
- tests/integration/dsg-safe-dom-browserbase.test.ts (150 lines)

---

#### PR705: Spine Execute + Integration Tests + Docs (3-4 hours)

**Verification Location:** `/api/spine/execute` after quota check, before gate checks

```typescript
// Pseudocode: app/api/spine/execute/route.ts
export async function POST(req: NextRequest) {
  // 1. Extract intent
  const intent = await req.json();
  
  // 2. Check quota
  const quota = await checkQuota(orgId, agentId);
  if (!quota.allowed) return json({ error: 'Quota exceeded' }, { status: 429 });
  
  // 3. ⭐ NEW: Safe DOM verification (if applicable)
  if (intent.safeDomCommand) {
    const manifest = await db.safeDoMManifests.findOne({
      sessionId: intent.sessionId,
      frameId: intent.safeDomCommand.frameId
    });
    const verification = verifySafeDomCommand(manifest, intent.safeDomCommand);
    if (verification.decision !== 'ALLOW') {
      return json({ error: verification.reason }, { status: 403 });
    }
  }
  
  // 4. Run existing gate checks
  const decision = await runGateChecks(intent);
  if (decision === 'BLOCK') return json({ error: 'Blocked by gate' }, { status: 403 });
  
  // 5. Execute and record audit trail
  const result = await executeIntent(intent);
  return json(result);
}
```

**Files:**
- lib/spine/verify-safe-dom-intent.ts (80 lines)
- app/api/spine/execute/route.ts (modify, ~30 lines)
- tests/integration/api/spine-execute-safe-dom.test.ts (120 lines)
- docs/safe-dom-integration-guide.md (150 lines)
- docs/safe-dom-manifest-format.md (100 lines)

**Timeline:** 2-3 days (PR703 + PR704 in parallel + PR705)

---

### Phase 2: Safe DOM + Evolution (PR706-710, Future)

**Goal:** Use AGI simulation to find optimal Safe DOM policy parameters

#### How it Works:

1. **Define Fitness Function:**
   - `blockThreshold` → Lower = more blocks = higher false positive rate
   - `reviewThreshold` → Higher = more reviews = more human overhead
   - Optimize: Minimize false positives + false negatives + human overhead

2. **Run Simulation:**
   ```
   For each genome (parameter set):
     For each workload trace:
       Evaluate Safe DOM decisions (BLOCK/REVIEW/ALLOW)
       Calculate error metrics
       Compare to Z3 constraints (SLA, security invariants)
       Check Z3 SAT solver result
     End
     Canary: Deploy to 5-10% traffic
     Measure: latency, error rate, human override rate
   End
   
   Select elite parameters
   Crossover + Mutate
   Repeat
   ```

3. **Z3 Constraints for Safe DOM:**
   ```typescript
   Z3ConstraintSet {
     slaContracts: [
       { metric: "falsePositiveRate", threshold: 0.05, operator: "lte" },
       { metric: "falseNegativeRate", threshold: 0.01, operator: "lte" },
       { metric: "humanOverrideRate", threshold: 0.1, operator: "lte" }
     ],
     securityInvariants: [
       { 
         name: "CoreInvariantHolds",
         expression: "unexposedElements_cannot_be_invoked == true"
       }
     ]
   }
   ```

4. **Output:**
   - Optimal Safe DOM policy parameters
   - Z3 proof of correctness
   - Canary deployment evidence
   - Replay token for reproducibility

#### Expected Files:
- lib/dsg/safe-dom/evolution/policy-optimizer.ts
- lib/dsg/safe-dom/evolution/z3-safe-dom-constraints.ts
- app/api/evolution/safe-dom-policies/route.ts
- tests/integration/safe-dom-policy-evolution.test.ts
- docs/safe-dom-policy-optimization-guide.md

**Timeline:** TBD (Phase 2, after Phase 1)

---

## Part 3: Critical Success Factors

### For Phase 0 (PR702):

✅ **Core Invariant:** "Agent can't invoke unexposed elements" — MUST be sound  
✅ **Type System:** Enforces separation (RawDomElement ≠ SafeDomElement ≠ manifest)  
✅ **Unit Tests:** 165 lines covering all verification paths  
✅ **validateManifest():** Prevents invalid manifests from entering verification  
⚠️ **Element ID Collision:** Must be fixed (API surface change)

### For Phase 1 (PR703-705):

✅ **Virtual PC Integration:** Proves Safe DOM works with GUI simulation  
✅ **Browserbase Integration:** Enables real browser automation  
✅ **Spine Execute Verification:** Core path security gate  
✅ **Supabase Schema:** Minimum fields only (manifest_json, session_id, frame_id, expires_at)  
✅ **Audit Trail:** Captures decision + reason + timestamp  
✅ **E2E Tests:** Real browser flow (Playwright)  
✅ **Documentation:** Integration guide + manifest format + API examples  

### For Phase 2 (PR706-710):

✅ **Fitness Metrics:** Multi-dimensional (latency, error rate, throughput, cost, SLA)  
✅ **Z3 Verification:** Constraints must be SAT-provable  
✅ **Canary Validation:** Real traffic tests before production  
✅ **Replay Token:** Same seed = Same output (determinism guaranteed)  
✅ **Human Feedback Loop:** Approve/reject evolved parameters before deployment  

---

## Part 4: Decision Checkpoints

| Checkpoint | Decision | Status |
|------------|----------|--------|
| **PR702 Merge** | Fix validateManifest + element ID collision (1-2h) | ✅ APPROVED |
| **Phase 1 Sequence** | PR703 + PR704 in parallel, then PR705 | ✅ APPROVED |
| **Manifest Storage** | Supabase (minimal schema, 5 fields) | ✅ APPROVED |
| **Verification Location** | Spine Execute after quota check | ✅ APPROVED |
| **Phase 2 Scope** | Safe DOM policy evolution via simulation | ⏳ FUTURE |

---

## Part 5: Success Metrics

### Phase 1 Complete:
- ✅ PR702 merged (validateManifest + element ID fix)
- ✅ PR703-705 passing integration tests
- ✅ E2E test demonstrates: agent command → verification → execution
- ✅ Audit trail logs all decisions
- ✅ Backward compatibility (legacy routes still work)
- ✅ Documentation complete

### Phase 2 Complete:
- ✅ AGI simulation produces evolved Safe DOM policy parameters
- ✅ Z3 verification passes for evolved parameters
- ✅ Canary deployment validates in production (5-10% traffic)
- ✅ Human review + approval before full rollout
- ✅ Replay token proves determinism

---

## Part 6: Known Limitations

**Phase 1:**
- ❌ No AGI system yet (Phase 2)
- ❌ No automatic policy evolution (Phase 2)
- ❌ Rate limiting at executor/spine layer (not Safe DOM responsibility)
- ❌ Production hardening (SLA monitoring, scaling) — Phase 2

**Phase 2:**
- ❌ No multi-region deployment (future hardening)
- ❌ No A/B testing framework (future optimization)
- ❌ No policy DSL for custom constraints (future customization)

---

## Appendix: File Map

### Phase 0 (PR702 — Already Merged)
```
lib/dsg/safe-dom/
├── types.ts ✅
├── filter.ts ✅
├── redact.ts ✅
├── manifest.ts ✅
├── verify-command.ts ✅
└── index.ts ✅

tests/unit/
└── dsg-safe-dom.test.ts ✅

🔧 Requires:
├── Add validateManifest() in verify-command.ts
└── Fix element ID format (frame/session scoping)
```

### Phase 1 (PR703-705)
```
🔜 PR703: Virtual PC Integration
lib/dsg/app-builder/virtual-pc-safe-dom-integration.ts
tests/integration/dsg-safe-dom-virtual-pc.test.ts

🔜 PR704: Browserbase Integration
lib/executors/browserbase-safe-dom-integration.ts
app/api/safe-dom/browserbase/route.ts
supabase/migrations/XXX_add_safe_dom_manifests.sql
tests/integration/dsg-safe-dom-browserbase.test.ts

🔜 PR705: Spine Integration + Docs
lib/spine/verify-safe-dom-intent.ts
app/api/spine/execute/route.ts (modify)
tests/integration/api/spine-execute-safe-dom.test.ts
docs/safe-dom-integration-guide.md
docs/safe-dom-manifest-format.md
```

### Phase 2 (PR706-710)
```
🔜 PR706: Policy Optimizer
lib/dsg/safe-dom/evolution/policy-optimizer.ts
lib/dsg/safe-dom/evolution/z3-safe-dom-constraints.ts

🔜 PR707: Evolution Endpoint
app/api/evolution/safe-dom-policies/route.ts

🔜 PR708: Integration Tests
tests/integration/safe-dom-policy-evolution.test.ts

🔜 PR709-710: Operator Dashboard + Docs
app/dashboard/policies/safe-dom-evolution.tsx
docs/safe-dom-policy-optimization-guide.md
```

### External Reference (dsg-agi-simulation-master)
```
/tmp/dsg-agi-simulation-master/
├── src/
│   ├── types.ts — Complete type definitions
│   ├── simulation.ts — Evolution engine
│   ├── fitness.ts — Multi-dimensional scoring
│   ├── z3-verifier.ts — Formal verification
│   ├── physics.ts — Network/compute simulation
│   └── main.ts — Entry point
├── rust-core/ — Formal property verification
├── data/ — Test workloads
└── scripts/ — Evolution scheduler
```

---

## Conclusion

This master plan unifies:
- **Safe DOM** (deterministic access control) with
- **AGI Evolution** (parameter optimization via formal verification)

**Timeline:**
- Phase 0: 1-2 hours (PR702 fix + merge)
- Phase 1: 2-3 days (PR703-705, parallel)
- Phase 2: TBD (PR706-710, after Phase 1 validation)

**Outcome:** Production-ready Safe DOM control plane with evolved, formally-verified governance parameters.

---

**Document Version:** 2.0 (Merged)  
**Last Updated:** 2026-06-10  
**Status:** Ready for Phase 0 → Phase 1 execution
