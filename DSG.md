# DSG.md — Architecture & Development Readiness Guide

สำหรับ Claude, agents, และ developers ที่ทำงานบน DSG Control Plane.

**อ่านไฟล์นี้ก่อน:**
1. ทำการเปลี่ยนแปลงใด ๆ ต่อ `lib/spine/`, `lib/runtime/`, `lib/dsg/`
2. เขียน issue/PR เกี่ยวกับ governance, execution, evidence
3. ติดตั้ง plugin หรือ gate ใหม่

**เวอร์ชัน:** 2026-07-17  
**สถานะ:** ระบุจุดอ่อน 3 ข้อ, แนวทางแก้ไข

---

## 0. Required Pre-Work Sequence

ก่อนเขียนโค้ด:

1. ✅ Read `AGENTS.md` — Agent operating rules
2. ✅ Read `CLAUDE.md` — General codebase rules
3. ✅ Read `docs/agents/CLAUDE_TOOL_API_CONTRACT.md` — API boundaries
4. ✅ **Read this file (DSG.md)** — Architecture & known issues
5. ✅ Inspect exact file/route/test referenced by the task
6. ✅ Identify which of the 3 known problems is related
7. ✅ Make smallest focused change
8. ✅ Run narrowest verification

---

## 1. DSG Control Plane Architecture Overview

DSG = **Deterministic Execution & Governance Control Plane**

```
Role: Gate AI/agent actions before execution + record audit/evidence trail
Product: AI runtime governance engine
Package: dsg-platform
Primary URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
```

### High-Level Flow

```
Agent Request (POST /api/execute with Bearer token)
    ↓
[Auth + Quota Gate + Rate Limit]
    ↓
[Normalize Payload + Issue Runtime Intent]
    ↓
[SPINE PIPELINE: Gate → Arbiters → Decision]
    ↓
[Commit to DB via Runtime RPC]
    ↓
[Meter Usage + Fire Webhooks]
    ↓
Response (decision + proof + usage)
```

### 4 Core Subsystems

| # | Subsystem | Role | Files |
|---|-----------|------|-------|
| 1 | **Agent Execution Flow** | Request intake → validation → response | `app/api/spine/execute/route.ts`, `lib/spine/engine.ts` |
| 2 | **Runtime Spine Pipeline** | Multi-stage decision (gate + arbiters) | `lib/spine/pipeline.ts`, `lib/spine/plugins/` |
| 3 | **Evidence System (CCVS)** | L1-L5 compliance evidence collection | `lib/ccvs/`, `tests/` |
| 4 | **Controlled Executor (Hermes)** | Plan proposal + credential leasing + execution bounds | `lib/dsg/brain/` |

---

## 2. Current Known Issues (Read This First)

### ⚠️ ISSUE #1: Runtime Commit RPC Signature Mismatch (MEDIUM RISK)

**File:** `lib/runtime/commit-rpc.ts:24-51`

**What:**
```typescript
// Falls back to legacy schema if latest fails
const first = await client.rpc('runtime_commit_execution', args);
if (isRpcSignatureMismatch(first.error.message)) {
  const fallback = await client.rpc('runtime_commit_execution', toLegacyArgs(args));
  return { ...fallback, mode: 'legacy' as const };
}
```

**Risk:**
- ❌ If Supabase RPC schema drifts, fallback is SILENT (no alert)
- ❌ `p_agent_monthly_limit` and `p_org_plan_limit` are dropped in legacy mode
- ❌ Quota tracking may be incorrect
- ❌ CCVS evidence doesn't record that legacy mode was used

**Impact:** 
If schema mismatches in production, quota enforcement may become unreliable without operator awareness.

**Fix Strategy:**
```typescript
// MUST DO:
// 1. Log WARNING every time legacy mode is used
// 2. Send alert to monitoring (PostHog/Datadog)
// 3. Track mode: 'legacy' | 'latest' in CCVS evidence
// 4. Require explicit Supabase migration (don't silently fallback forever)

// Example:
if (isRpcSignatureMismatch(first.error.message)) {
  console.warn('[RPC FALLBACK]', { error: first.error.message });
  captureEvent('runtime_rpc_fallback_used', { orgId, agentId });
  // ...then fallback
}
```

**Test:** `tests/failure/runtime-rpc-fallback.test.ts` (create if missing)

**Priority:** 🟡 MEDIUM — Do before next production deployment

---

### ⚠️ ISSUE #2: Credential Broker Has No Encryption-at-Rest Validation (MEDIUM RISK)

**File:** `lib/dsg/brain/credential-broker.ts:62-100`

**What:**
```typescript
// Current: Just queries secrets, no validation that encryption is ON
const { data: secrets, error } = await (supabase as any)
  .from(finalConfig.secretsTableName)
  .select("id, name, value, created_at, updated_at")
  .in("name", secretNames);

// Problem: Code comment says "must be encrypted"
// but never validates it
```

**Risk:**
- ❌ If `dsg_secrets` encryption is disabled → raw secret values in Supabase
- ❌ No schema exists in migrations to enforce encryption
- ❌ No health check to validate encryption status
- ❌ CCVS matrix doesn't track secret_encryption status
- ❌ Backup key rotation not verified

**Impact:**
If encryption is accidentally disabled, secrets are stored plaintext in the database.

**Fix Strategy:**
```typescript
// MUST DO:
// 1. Create Supabase migration that:
//    - Creates dsg_secrets table
//    - Enables pgcrypto extension
//    - Encrypts 'value' column
//    - Sets up RLS policies
//
// 2. Add health check endpoint:
//    GET /api/health/credentials
//    → Verify RLS policies exist
//    → Verify encryption column type
//    → Return { encrypted: boolean, rlsActive: boolean }
//
// 3. Update CCVS matrix:
//    Add field: secret_encryption: 'verified' | 'not_verified'
//
// 4. Validate at broker init:
//    async function brokerCredentials(...) {
//      const healthCheck = await validateSecretTableEncryption();
//      if (!healthCheck.ok) throw new Error('...');
//      // ...then proceed
//    }
```

**Test:** `tests/integration/credential-broker-encryption.test.ts`

**Priority:** 🟡 MEDIUM — Do before storing production secrets

---

### ⚠️ ISSUE #3: Decision Combining Logic Doesn't Track Arbiter Count (MEDIUM RISK)

**File:** `lib/spine/pipeline.ts:78-100`

**What:**
```typescript
// Current: If NO arbiters load, result is gate output only
if (gateOutput.decision !== 'BLOCK') {
  const arbiters = registry.getByKind('arbiter').sort(...);
  for (const arbiter of arbiters) {
    // ... evaluate
  }
}

// Problem:
// • If arbiters.length === 0, no warning
// • If arbiter plugin fails to load, decision skips that stage
// • Development (0 arbiters) vs production (2+ arbiters) can differ
// • No minimum arbiter count enforcement
```

**Risk:**
- ❌ If arbiter plugin fails to load silently, security stage is skipped
- ❌ Development vs production may have different arbiter counts
- ❌ No alert if `arbiters.length < expected`
- ❌ CCVS evidence doesn't record arbiter count/status
- ❌ May violate "2-stage approval" design principle

**Example Attack:**
```
Production expects:
  - Gate: risk assessment
  - Arbiter 1: permission gate
  - Arbiter 2: compliance gate

But if "permission gate" plugin fails to load:
  → Decision only based on risk + compliance
  → Security bypass possible
```

**Fix Strategy:**
```typescript
// MUST DO:
// 1. Add config:
//    const MIN_ARBITER_COUNT = 1; // or 2 depending on design
//
// 2. At pipeline execution:
//    if (arbiters.length < MIN_ARBITER_COUNT) {
//      return {
//        final_decision: 'BLOCK',
//        final_reason: `ARBITER_COUNT_INSUFFICIENT: got ${arbiters.length}, need ${MIN_ARBITER_COUNT}`,
//        // ...
//      };
//    }
//
// 3. At startup, log:
//    console.log('[SPINE] Loaded arbiters:', arbiters.map(a => a.id));
//    if (arbiters.length < MIN_ARBITER_COUNT) {
//      console.error('[SPINE] WARNING: Not enough arbiters loaded!');
//    }
//
// 4. Update CCVS evidence:
//    Track: { arbiter_count: number, min_required: number }
//
// 5. Update health check:
//    GET /api/health → include { arbiters_loaded: number, arbiters_ok: boolean }
```

**Test:** `tests/failure/arbiter-missing.test.ts`

**Priority:** 🟡 MEDIUM — Do before security audit

---

## 3. Spineline (Runtime Spine Pipeline) Details

### Gate Plugin Role
- **Plugin Kind:** `'gate'`
- **Default ID:** `dsg-gate-bridge-v1` (set via `DSG_SPINE_GATE_PLUGIN` env)
- **Decision:** ALLOW, STABILIZE, or BLOCK
- **Effect:** If BLOCK → skip arbiters, return immediately

### Arbiter Plugins Role
- **Plugin Kind:** `'arbiter'`
- **When Run:** Only if gate output ≠ BLOCK
- **Decision Combining:**
  - ALLOW (severity 0) < STABILIZE (severity 1) < BLOCK (severity 2)
  - Use the highest-severity decision
  - Track which plugin decided (via `authoritative_plugin_id`)

### Decision Definitions
```
ALLOW
  → Execution is approved, proceed normally
  
STABILIZE
  → Execution needs human review before proceeding
  → May require approval workflow
  
BLOCK
  → Execution is denied, return error to caller
```

### Proof & Evidence
Every pipeline decision includes:
```typescript
proof: {
  proof_hash: string | null,      // SHA-256 hash of proof
  proof_version: string | null,   // e.g., "dsg-gate-v1"
  theorem_set_id: string | null,  // If using Z3 formal proof
  solver: string | null           // e.g., "Z3" or null
}
```

**Rule:** `proof_hash` is deterministic (same input → same hash)

---

## 4. Evidence System (CCVS L1-L5)

### Collection Layers

| L | Level | What | Where | Command |
|---|-------|------|-------|---------|
| 1 | Unit | Function tests | `tests/unit/` | `npm run test:unit` |
| 2 | Integration | Cross-module flows | `tests/integration/` | `npm run test:integration` |
| 3 | Adversarial | Attack scenarios, replay | `tests/failure/` | `npm run test:failure` |
| 4 | Formal Proof | Z3 constraints, mutations | `verify:policy`, `test:mutation:ci` | `npm run verify:policy` |
| 5 | Provenance | Build chain, hashes | GitHub Actions, Vercel | `npm run ccvs:pipeline` |

### Matrix Output
```typescript
// lib/ccvs/compliance-matrix.ts
{
  certificationClaim: false,        // No 3rd-party audit
  independentAuditClaim: false,     // No independent verification
  requiresExternalSolver: true,     // Z3 needed
  evidence_chain: {
    L1_unit: "PASS" | "PENDING",
    L2_integration: "PASS" | "PENDING",
    L3_adversarial: "PASS" | "PENDING",
    L4_proof: "PASS" | "PENDING",
    L5_provenance: "PASS" | "PENDING"
  }
}
```

**Rule:** Never claim "production-ready" unless all L1-L5 are PASS or explicitly justified.

---

## 5. Controlled Executor (Hermes) Rules

### Credential Broker Guarantees
- ✅ **Never exposes raw secrets** → only redaction fingerprints
- ✅ **Queries Supabase dsg_secrets table** → must exist and be encrypted
- ✅ **Issues credential leases** → with TTL + renewal tracking
- ✅ **Tracks lease validity** → expire after TTL

### Execution Grant Binding
```typescript
ExecutionGrant {
  planHash: string,           // SHA-256 of approved plan
  issuedAt: number,           // Timestamp
  ttlMs: number,              // 5 minutes default
  grantId: string,            // Unique ID
  renewals: number,           // Renewal count
  maxRenewals: number         // Max 2 default
}

// RULE: Grant is only valid for THIS specific plan
//       Cannot execute different plan with this grant
```

### Conformance Gate Checks
Before each command/file-change:
1. ✅ Verify `planHash` matches approved plan
2. ✅ Verify grant not expired
3. ✅ Verify command in `allowedCommands` whitelist
4. ✅ Verify path in `allowedPaths` whitelist
5. ✅ Collect execution evidence

**Rule:** BLOCK execution if ANY check fails.

---

## 6. Quota, Billing & Rate Limiting

### Quota Gate
```typescript
// Check before spine execution
const quota = await checkQuota(orgId, agentId);
if (!quota.allowed) {
  return 403 { error: 'Monthly quota exceeded', used, limit };
}
```

- ✅ **Idempotent per execution** (not timestamp-based)
- ✅ **Blocked before execution** (prevent overage)
- ✅ **Tracked in CCVS evidence**

### Rate Limiting
```typescript
// Per /api/spine/execute:
// 60 requests per 60 seconds per caller
const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;
```

**Rule:** Return 429 if exceeded.

### Metering
After execution:
```typescript
await meterExecution(orgId, agentId, costUsd);
await logQuotaConsumption(orgId, agentId, amount);
```

**Rule:** Meter happens AFTER decision (consumption recorded regardless of ALLOW/BLOCK).

---

## 7. When to Fix Issue #1, #2, or #3

### Issue #1 Fix: When?
- ❌ Defer if: You're adding new policy logic
- ✅ Do now if: You're touching `lib/runtime/commit-rpc.ts`
- ✅ Do now if: Working on quota/billing changes
- 🚀 **Timeline:** Before next production push

### Issue #2 Fix: When?
- ❌ Defer if: You're adding new features
- ✅ Do now if: You're working on credential-broker
- ✅ Do now if: Setting up dsg_secrets table for first time
- 🚀 **Timeline:** Before first customer secret stored

### Issue #3 Fix: When?
- ❌ Defer if: You're just running tests
- ✅ Do now if: Adding/modifying arbiter plugins
- ✅ Do now if: Setting up new environment
- ✅ Do now if: Creating security audit checklist
- 🚀 **Timeline:** Before security review

---

## 8. Development Workflow

### Before Committing

1. **Identify subsystem:**
   - Agent Execution Flow? → Check `app/api/spine/execute/route.ts`
   - Spine Pipeline? → Check `lib/spine/pipeline.ts` + known Issue #3
   - Evidence? → Check `lib/ccvs/` + ensure L1-L5 tested
   - Hermes/Executor? → Check `lib/dsg/brain/` + known Issue #2

2. **Check known issues:**
   - Am I touching Issue #1 files? → Must add logging
   - Am I touching Issue #2 files? → Must add encryption validation
   - Am I touching Issue #3 files? → Must add arbiter count check

3. **Run verification:**
   ```bash
   npm run typecheck
   npm run test:unit
   npm run test:integration
   npm run test:failure       # If security-adjacent
   npm run build              # Always for Next.js
   ```

4. **Update CCVS if needed:**
   - Changes to critical paths? → Add CCVS evidence tracking
   - Credential handling? → Track encryption status
   - Decision logic? → Track arbiter count + mode

### PR Checklist

- [ ] Inspected relevant files (not just README)
- [ ] Ran `npm run typecheck` — passed
- [ ] Ran `npm run test` — passed
- [ ] Ran `npm run build` — passed
- [ ] Identified which subsystem changed
- [ ] Did not introduce new Evidence-L1-L5 gaps
- [ ] If touching Issue #1/2/3 files — acknowledged the known risk
- [ ] PR body includes: files changed + verification + known limits

---

## 9. Security Conventions (DSG-Specific)

### Secrets
- ✅ Keep in Supabase dsg_secrets table (encrypted)
- ✅ Access only via credential broker
- ✅ Never log raw secret values
- ✅ Use redaction fingerprints in audit trail
- ❌ Never pass secrets to client components
- ❌ Never commit `.env` values

### Execution
- ✅ All execution through controlled executor
- ✅ Whitelist commands and paths
- ✅ Verify plan hash before each step
- ✅ Record evidence for every action
- ❌ No direct DB writes from execution context
- ❌ No raw shell access

### Evidence
- ✅ Record decision + latency + proof hash
- ✅ Track arbiter count and mode
- ✅ Track credential lease status
- ✅ Track execution grant renewals
- ❌ Never claim "verified" without L1-L5 evidence
- ❌ Never claim "production-ready" without security audit

---

## 10. API Routes & Contracts

### Stable Entry Points
```http
POST /api/execute              # Re-exports /api/spine/execute
POST /api/spine/execute        # Current spine execution
```

### Expected Input
```typescript
{
  agent_id: string,
  action: string,
  input: Record<string, unknown>,
  context: Record<string, unknown>,
  // Optional:
  policy_id?: string,
  approval?: { id: string, key: string }
}
```

### Expected Output
```typescript
{
  decision: "ALLOW" | "STABILIZE" | "BLOCK",
  reason: string,
  proof: { proof_hash, proof_version, theorem_set_id, solver },
  latency_ms: number,
  usage?: { used, limit, balance },
  stop_reason?: StopReason,
  pipeline_trace?: { stages: [...] }
}
```

### Health Checks
```http
GET /api/health                # Public baseline
GET /api/readiness             # Service ready?
GET /api/agent/status          # Agent identity + DB check
GET /api/health/credentials    # (To be added) Encryption OK?
GET /api/health/spine          # (To be added) Arbiters loaded?
```

---

## 11. Production Readiness Checklist

Before claiming "production-ready" for any DSG feature:

- [ ] L1 unit tests pass (`npm run test:unit`)
- [ ] L2 integration tests pass (`npm run test:integration`)
- [ ] L3 adversarial tests pass (`npm run test:failure`)
- [ ] L4 formal proof or mutation tests pass (`npm run verify:policy`)
- [ ] L5 build chain verified (GitHub + Vercel)
- [ ] CCVS matrix shows all levels PASS or explicitly justified
- [ ] Issue #1 RPC: Logging + alerting added
- [ ] Issue #2 Credentials: Encryption validated
- [ ] Issue #3 Arbiters: Count checked at startup
- [ ] Supabase migrations applied
- [ ] Live health checks passing
- [ ] No hardcoded secrets
- [ ] Audit trail records decision + proof + evidence

**Rule:** NO-GO until ALL checks are green with evidence.

---

## 12. File Organization Recap

```
lib/spine/
  ├── pipeline.ts           # Main pipeline runner (ISSUE #3 HERE)
  ├── engine.ts             # Intent issuance & execution
  ├── types.ts              # PluginInput, PluginOutput
  ├── plugins/
  │   ├── gate-bridge.ts    # Default gate plugin
  │   ├── arbiter.ts        # Example arbiter
  │   └── risk-gate.ts      # Risk assessment arbiter

lib/runtime/
  ├── commit-rpc.ts         # DB commit path (ISSUE #1 HERE)
  ├── approval.ts           # Approval workflow
  ├── gate.ts               # Gate resolution
  └── quota.ts              # Quota logic

lib/dsg/brain/
  ├── hermes-plugin.ts      # Main orchestration
  ├── credential-broker.ts  # Secret leasing (ISSUE #2 HERE)
  ├── controlled-executor.ts # Execution contract
  ├── conformance-gate.ts   # Command/path validation
  └── plan-attempt.ts       # Plan data structure

lib/ccvs/
  ├── evidence-collector.ts # L1-L5 collection
  ├── compliance-matrix.ts  # Matrix builder
  └── drift-detector.ts     # Staleness check

tests/
  ├── unit/                 # L1 evidence
  ├── integration/          # L2 evidence
  └── failure/              # L3 evidence
```

---

## 13. Common Mistakes to Avoid

- ❌ **Skip RPC fallback logging** → Issue #1 will haunt production
- ❌ **Trust that secrets are encrypted** → Issue #2 exploitable
- ❌ **Assume arbiters always load** → Issue #3 security bypass
- ❌ **Claim "production-ready" without L1-L5 evidence**
- ❌ **Pass secrets to client components**
- ❌ **Skip arbiter evaluation if gate ≠ BLOCK without recording why**
- ❌ **Update CCVS matrix without running full test suite**
- ❌ **Commit with failing tests** (verify with `npm run build`)

---

## 14. Questions? Next Steps

**Q: I want to add a new arbiter plugin**  
A: Check Issue #3 first. Then:
   1. Implement plugin with `kind: 'arbiter'`
   2. Register in `lib/spine/register-defaults.ts`
   3. Write tests in `tests/unit/` and `tests/integration/`
   4. Update `MIN_ARBITER_COUNT` config if needed
   5. Update health check to report arbiter load status

**Q: I'm working on credentials/secrets**  
A: Check Issue #2 first. Then:
   1. Ensure Supabase migration creates `dsg_secrets` with encryption
   2. Add RLS policies
   3. Use credential-broker, never raw queries
   4. Add `GET /api/health/credentials` check
   5. Write tests in `tests/integration/`

**Q: I'm fixing quota/billing**  
A: Check Issue #1 first. Then:
   1. Add logging for RPC fallback
   2. Test with both latest and legacy schemas
   3. Write tests in `tests/failure/`
   4. Update CCVS matrix with rpc_mode field

---

## 15. Summary

**This file ensures:**
- ✅ All developers know the 3 known issues
- ✅ All PRs are checked against known risks
- ✅ Evidence is collected consistently (L1-L5)
- ✅ No security bypass via missing validation
- ✅ Production readiness criteria are clear

**Before committing to `lib/spine/`, `lib/runtime/`, or `lib/dsg/brain/`:**

1. ✅ Read this file
2. ✅ Identify relevant issue (if any)
3. ✅ Address the risk
4. ✅ Run verification
5. ✅ Document in PR

**Status:** This architecture analysis was performed 2026-07-17  
**Branch:** `claude/seahorn-dsa-visualization-7h1ahd`  
**Next:** Implement Issue #3 fix (arbiter count validation)

---

**ติดต่อ:** t.dealer01@dsg.pics  
**Repository:** tdealer01-crypto/tdealer01-crypto-dsg-control-plane  
**Last Updated:** 2026-07-17
