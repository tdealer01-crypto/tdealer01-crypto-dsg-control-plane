# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 🟢 GO / NO-GO — 2026-05-28 (CCVS v1.2)

```
GO/NO-GO RESULT: PASS  ✅  (all scripted checks green)
```

| Gate | Result | Command / Evidence |
|---|:---:|---|
| TypeScript typecheck | ✅ 0 errors | `npm run typecheck` |
| Unit + integration tests | ✅ **998 passed** / 1010 total | `npm run test` — 133 files passed, 4 skipped |
| Policy Z3 proofs | ✅ 8 theorems UNSAT | `npm run verify:policy` |
| Revenue Z3 proofs | ✅ 16 theorems FORMAL PROOF PASS | `npm run proof:revenue` |
| Mutation score gate | ✅ **72.08%** ≥70% (break=70) | `npm run test:mutation:ci` — Stryker verified locally |
| Stryker timeout safety | ✅ 840s bash timeout, deferred on CI timeout | `ccvs-evidence.yml` L4 job |
| Cosign OIDC availability | ✅ gated on `ACTIONS_ID_TOKEN_REQUEST_URL` | L1/L4/L5 `oidc_check` step |
| gate.ts coverage floor | ✅ lines/fn/stmt 100%, branch 100% | `vitest.config.ts` per-file threshold |
| CCVS Phase-2 coverage | ✅ 5 per-file floors (evidence-collector 83%, drift 90%) | `vitest.config.ts` |
| compliance-status API | ✅ GET/POST `/api/ccvs/compliance-status` | shield badge, claim_pass_eligible cache |
| EU AI Act Annex IV | ✅ 9 items mapped, Aug 2026 deadline | `GET /api/compliance-evidence-pack/annex4` |
| claim_pass_eligible | ✅ Step Summary badge 🟢/🔴 | `ccvs-evidence.yml` compliance-matrix job |
| Production homepage | ✅ HTTP 200 | `GET /` |
| Runtime readiness | ✅ HTTP 200 `status=ready` | `GET /api/readiness` |
| Health + rate limiter | ✅ HTTP 200 `rateLimiter.ok: true` | `GET /api/health` |
| Trust surface pages | ✅ HTTP 200 × 4 | `/terms` `/privacy` `/security` `/support` |
| User-flow E2E | ✅ PASS | finance-governance submit → approve → Supabase persisted |
| **go:no-go gate** | ✅ **PASS** | `npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app` |

### Full test output — 2026-05-28 (CCVS v1.2)

```
 Test Files  133 passed | 4 skipped (137)
      Tests  998 passed | 12 skipped (1010)
   Start at  2026-05-28
```

+60 new tests vs v1.1: gate boundary (no-arg default, exact spread=0.35), drift-detector env var `??` behavior and sha256 prefix, evidence-collector branch coverage (bundleRef, verificationPolicyRef, RUNNER_OS, metrics fallback), SpineInfraError constructor/error cases, normalize.ts (sha256, normalizeArgs, buildCommandEnvelope, isExpired), compliance-status GET/POST round-trip, Annex IV 9-item structure.

Stryker mutation score: **72.08%** (191/265 killed) — verified locally before CI gate activated.

```
npm run typecheck     ✅  0 errors
npm run verify:policy ✅  8 theorems proved, 0 failed
npm run proof:revenue ✅  16 theorems — VERDICT: FORMAL PROOF PASS
npm run go:no-go      ✅  GO/NO-GO RESULT: PASS
```

---

## 🔐 Evidence-Driven Compliance Pipeline — CCVS v1.2 (2026-05-28)

Every passing test is automatically upgraded into a **cryptographically-chained, audit-ready evidence artifact**.

### Evidence Severity Levels

| Level | Type | Description | Minimum for |
|-------|------|-------------|-------------|
| L1 | `unit` | Test results + coverage metrics | Internal quality |
| L2 | `integration` | API & workflow coverage | Feature readiness |
| L3 | `adversarial` / `replay` | Tamper / replay rejection tests | Security review |
| L4 | `mutation` / `oversight` | Stryker mutation score ≥90% (break=70), Z3 formal proofs | Compliance claims |
| L5 | `provenance` | SLSA provenance, reproducible build | Regulatory assertion |

### CI Evidence Chain

```
L1 Unit → L2 Integration → L3 Adversarial+Replay → L4 Mutation(Stryker)+Z3 Proof → L5 SBOM+Provenance → Compliance Matrix → Drift Detection
```

Each job computes a `chain_hash = sha256(canonicalized_envelope)` and passes it to the next job as `previous_chain_hash`. The chain is tamper-evident.

**Enforcement on main (v1.1 hardening):**
- Mutation score **≥70% required** before compliance matrix runs (exits 1 if below)
- Cosign `.sigstore.json` bundles **required** at L1, L4, L5 — missing bundle fails the job
- `lib/runtime/gate.ts` coverage floor **lines/fn/stmt ≥90%, branch ≥85%** enforced via vitest per-file threshold
- `claim_pass_eligible` badge (🟢/🔴) written to GitHub Actions Step Summary on every main push

### Compliance Matrix

Auto-generated from test results — maps every regulatory requirement to a control, test file, and evidence hash:

| Framework | Requirement | Control | Min Level |
|-----------|-------------|---------|-----------|
| EU AI Act | Art. 14 Human oversight | CTRL-HUMAN-GATE | L2 |
| EU AI Act | Art. 12 Record-keeping | CTRL-IMMUTABLE-AUDIT | L3 |
| ISO 42001 | A.7.3 Risk assessment | CTRL-RISK-GATE | L3 |
| ISO 42001 | A.9.2 Internal audit | CTRL-AUDIT-TRAIL | L2 |
| NIST AI RMF | GOVERN 1.1 | CTRL-POLICY-ENGINE | L1 |
| NIST AI RMF | MAP 2.1 | CTRL-PROOF-VALIDITY | L4 |
| SLSA | Level 2 Provenance | CTRL-BUILD-PROVENANCE | L5 |

### npm scripts

```bash
npm run ccvs:emit      # emit evidence envelope after test run
npm run ccvs:verify    # verify chain_hash integrity on all envelopes
npm run ccvs:matrix    # generate compliance matrix JSON
npm run ccvs:pipeline  # full: coverage → emit → verify → matrix
```

### Evidence Chain + Compliance Status API

```
GET  /api/ccvs/evidence-chain          # severity table, requirement catalog, drift status
GET  /api/ccvs/compliance-status       # claim_pass_eligible badge + shield (lightgrey/green/red)
POST /api/ccvs/compliance-status       # CI uploads { matrix, run_id, mutation_score } after each run
GET  /api/compliance-evidence-pack/annex4          # EU AI Act Annex IV — 9 items → DSG controls (JSON)
GET  /api/compliance-evidence-pack/annex4?format=html  # styled HTML checklist
```

`compliance-status` uses an in-memory cache (resets on cold start); CI re-uploads after every deploy via `CCVS_UPLOAD_URL` env var in `generate-compliance-matrix.mjs`.

### EU AI Act Annex IV (August 2026 enforcement)

9 Annex IV technical documentation items mapped to DSG ONE controls:

| # | Annex IV Item | DSG Control | Status |
|---|---|---|---|
| 1 | General description + intended purpose | CTRL-POLICY-ENGINE | covered |
| 2 | Version + update history | CTRL-BUILD-PROVENANCE | covered |
| 3 | Technical specifications + accuracy | CTRL-RISK-GATE | covered |
| 4 | Monitoring + logging systems | CTRL-IMMUTABLE-AUDIT | covered |
| 5 | Input data specifications | CTRL-POLICY-ENGINE | partial |
| 6 | Human oversight measures | CTRL-HUMAN-GATE | covered |
| 7 | Post-market monitoring | CTRL-REPLAY-REJECTION | covered |
| 8 | Incident reporting | CTRL-AUDIT-TRAIL | partial |
| 9 | Instructions for use | CTRL-MIDMARKET-GATE | covered |

`certificationClaim: false` · `independentAuditClaim: false` — pre-audit evidence mapping, not legal certification.

---

## 📋 Compliance Evidence Pack — 2026-05-25

Pre-formatted evidence report for EU AI Act and ISO 42001 compliance review.

- **24 Z3 theorems** — 8 policy + 16 billing, UNSAT proof for each
- **874 test assertions** — 129 test files, 0 failures
- **WORM hash chain** — SHA-256 `requestHash → decisionHash → recordHash → bundleHash`
- **EU AI Act Art. 12/14** — Record keeping and human oversight control mapping
- **ISO/IEC 42001** — A.6, A.9, A.10 AI management system controls

```
GET /api/compliance-evidence-pack          # Printable HTML report
GET /api/compliance-evidence-pack?print=1  # Auto-print PDF mode
/compliance-evidence-pack                  # Landing page
```

Evidence boundary: `certificationClaim = false` · `independentAuditClaim = false` — see report footer.

---

## 💳 Revenue Hardening — Issue #577 (2026-05-24)

Four P0/P1 bugs fixed and verified in production before this release.

### P0-1 · Stripe Meter Idempotency

**Bug:** idempotency key was `dsg-meter-{orgId}-{timestamp}` — two executions in the same second shared the same key, Stripe deduped them → silent revenue leak.

**Fix:** key is now `dsg-meter-{executionId}` — each execution row has a unique ID, guaranteed distinct.

```typescript
// Before (broken)
const idempotencyKey = `dsg-meter-${orgId}-${timestamp}`;

// After (fixed)
const idempotencyKey = `dsg-meter-${executionId}`;
```

### P0-2 · Billing Outbox (no silent loss)

**Bug:** `reportMeterEvent` fired directly to Stripe — if Stripe was unavailable the usage event was lost with no retry path.

**Fix:** write-first-then-flush pattern:

1. Write `pending` row to `billing_meter_outbox` (Supabase) before any network call
2. Attempt immediate Stripe delivery → update row to `sent` or `failed`
3. Hourly cron `flush-meter-outbox` retries all `pending` rows older than 5 min

```
billing_meter_outbox schema:
  execution_id  (unique — idempotency key)
  status        pending → sent | failed
  stripe_event_id, error, flushed_at
```

Migration: `supabase/migrations/20260523000000_billing_meter_outbox.sql`

### P0-3 · Cron Auth Fail-Closed

**Bug:** `if (cronSecret && ...)` — if `CRON_SECRET` was not set, the condition was never entered → cron ran unauthenticated.

**Fix:**

```typescript
// Before (fail-open)
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { return 401 }

// After (fail-closed)
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return !cronSecret ? 503 : 401;
}
```

Applies to both `/api/cron/usage-alerts` and `/api/cron/flush-meter-outbox`.

### P1-1 · Analytics Period Parameter

**Bug:** `GET /api/usage/analytics?period=2026-04` always returned current month data — `period` param was parsed but ignored.

**Fix:** `getOrgUsageSnapshot(orgId, period?)` now accepts an optional period; analytics route passes it through to both the snapshot query and `topAgents` query.

```bash
# Now works correctly:
GET /api/usage/analytics?period=2026-04  →  "period": "2026-04"
```

---

## 🔐 Z3 Formal Verification

### Policy Engine — 8 theorems (Python Z3)

```
npm run verify:policy
✓ PROVED  [role_safety]            allow → role ∈ valid set
✓ PROVED  [plan_safety]            allow → plan ∈ {enterprise, business, pro}
✓ PROVED  [approval_safety]        allow ∧ approvalRequired → token ≠ ∅
✓ PROVED  [audit_completeness]     decision always in valid enum
✓ PROVED  [non_triviality]         ∃ valid request where decision = allow
✓ PROVED  [amount_bound]           DeFi amount ≤ $1,000 and daily ≤ $10,000
✓ PROVED  [slippage_bound]         slippage ≤ 50 bps
✓ PROVED  [constraint_consistency] DeFi constraint set is satisfiable
Policy theorems: 8 proved, 0 failed
```

### Billing & Quota — 16 theorems (TypeScript z3-solver WASM)

```
npm run proof:revenue
Quota ordering:          enterprise > business > pro > trial > free > 0
Safe floor:              getQuotaForPlan never returns 0
Status partition:        ACTIVE_STATUSES ∩ REVOKED_STATUSES = ∅
Revenue monotonicity:    upgrading plan never decreases quota
Rate-limit conservation: remaining + used = limit (always)
No-bypass theorem:       cannot be allowed AND blocked simultaneously
Stripe pricing:          yearly = 9×monthly exactly (25% discount proven)
Quota gate:              post-increment used ≤ limit (single-threaded)
VERDICT: FORMAL PROOF PASS — 16 theorems, 0 failed
```

**Method:** prove theorem P by asserting ¬P and checking UNSAT. If Z3 finds no countermodel, P holds for every possible input.

---

## Infrastructure

| Component | Status | Detail |
|---|:---:|---|
| Supabase auth + Postgres | ✅ LIVE | Magic-link OTP, RLS on all tables |
| Upstash Redis | ✅ LIVE | Rate limiting — per-email 3/min, per-IP tiers |
| Stripe billing | ✅ LIVE | Webhook live, metered billing ready, outbox flush hourly |
| Resend email | ✅ CONFIGURED | Upgrade nudge emails, magic-link OTP |
| `CRON_SECRET` | ✅ CONFIGURED | Fail-closed on both cron routes |
| Vercel crons | ✅ ACTIVE | `usage-alerts` 07:00 UTC daily, `flush-meter-outbox` hourly |

---

## REST API

### Gate an action

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "my-agent-run-001", "action": "send email to user@example.com"}'
```

```json
{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com"
}
```

### Usage analytics

```bash
# Current month
GET /api/usage/analytics

# Specific period
GET /api/usage/analytics?period=2026-04
```

---

## Tech stack

```
Next.js 15 App Router + TypeScript
Supabase auth + Postgres (RLS)
Stripe billing + metered usage
Upstash Redis rate limiting
Resend transactional email
Vitest 874 tests (unit + integration)
Playwright E2E
Z3 SMT Solver — 24 theorems at design time
GitHub Actions + DSG Secure Deploy Gate
```

---

## Verification commands

```bash
npm run typecheck          # TypeScript — 0 errors
npm run test               # 874 tests
npm run verify:policy      # Z3 policy proofs (Python)
npm run proof:revenue      # Z3 billing proofs (Python)
npm run go:no-go <url>     # Full production gate
```

---

## Supported claims — verified evidence only

```
✓ REST API gate endpoint is live and returns correct ALLOW/BLOCK decisions.
✓ Runtime readiness is green (HTTP 200, status=ready).
✓ 998 unit + integration tests pass, 0 failures (133 files, 4 skipped).
✓ TypeScript compiles with 0 errors.
✓ Gateway policy engine formally verified — 8 Z3 theorems, design-time.
✓ Billing quota model formally verified — 16 Z3 theorems, design-time.
✓ DeFi transaction bounds mathematically proven (amount ≤ $1k, slippage ≤ 50bps).
✓ Stripe metered billing idempotent — per-execution key, no same-second dedup.
✓ Billing outbox — no silent loss on Stripe outage, hourly retry.
✓ Cron routes fail-closed — missing CRON_SECRET returns 503, not 200.
✓ Mutation score gate 72.08% ≥70% (191/265 killed) — Stryker verified locally.
✓ CCVS compliance-status API live — GET /api/ccvs/compliance-status returns ok:true (commit da78ef0).
✓ EU AI Act Annex IV 9-item checklist live — GET /api/compliance-evidence-pack/annex4 (7 covered, 2 partial).
✓ go:no-go gate PASS on 2026-05-28 (CCVS v1.2).
✓ Compliance Evidence Pack — pre-audit PDF report served at /api/compliance-evidence-pack.
```

Not claimed:

```
✗ Independent third-party audit or certification.
✗ WORM-certified audit storage.
✗ Published public npm/PyPI SDK.
```

---

## Formal verification artifact

```
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive
       for Safety-Critical AI Systems
```

## GitHub Marketplace action

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.1.0
```

Launch page: `https://tdealer01-crypto-dsg-control-plane.vercel.app/proofgate-github-action`
