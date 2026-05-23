# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 🟢 GO / NO-GO — 2026-05-24

```
GO/NO-GO RESULT: PASS  ✅  (all scripted checks green)
```

| Gate | Result | Command / Evidence |
|---|:---:|---|
| TypeScript typecheck | ✅ 0 errors | `npm run typecheck` |
| Unit + integration tests | ✅ **521 passed** / 533 total | `npm run test` — 15.89s |
| Policy Z3 proofs | ✅ 8 theorems UNSAT | `npm run verify:policy` |
| Revenue Z3 proofs | ✅ 16 theorems FORMAL PROOF PASS | `npm run proof:revenue` |
| Production homepage | ✅ HTTP 200 | `GET /` |
| Runtime readiness | ✅ HTTP 200 `status=ready` | `GET /api/readiness` |
| Health + rate limiter | ✅ HTTP 200 `rateLimiter.ok: true` | `GET /api/health` |
| Trust surface pages | ✅ HTTP 200 × 4 | `/terms` `/privacy` `/security` `/support` |
| User-flow E2E | ✅ PASS | finance-governance submit → approve → Supabase persisted |
| **go:no-go gate** | ✅ **PASS** | `npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app` |

### Full test output — 2026-05-24 22:20 UTC

```
 Test Files  101 passed | 4 skipped (105)
      Tests  521 passed | 12 skipped (533)
   Start at  22:20:44
   Duration  15.89s (transform 2.53s, setup 0ms, collect 3.74s, tests 10.60s)
```

```
npm run typecheck     ✅  0 errors
npm run verify:policy ✅  8 theorems proved, 0 failed
npm run proof:revenue ✅  16 theorems — VERDICT: FORMAL PROOF PASS
npm run go:no-go      ✅  GO/NO-GO RESULT: PASS
```

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
Vitest 521 tests (unit + integration)
Playwright E2E
Z3 SMT Solver — 24 theorems at design time
GitHub Actions + DSG Secure Deploy Gate
```

---

## Verification commands

```bash
npm run typecheck          # TypeScript — 0 errors
npm run test               # 521 tests
npm run verify:policy      # Z3 policy proofs (Python)
npm run proof:revenue      # Z3 billing proofs (Python)
npm run go:no-go <url>     # Full production gate
```

---

## Supported claims — verified evidence only

```
✓ REST API gate endpoint is live and returns correct ALLOW/BLOCK decisions.
✓ Runtime readiness is green (HTTP 200, status=ready).
✓ 521 unit + integration tests pass, 0 failures.
✓ TypeScript compiles with 0 errors.
✓ Gateway policy engine formally verified — 8 Z3 theorems, design-time.
✓ Billing quota model formally verified — 16 Z3 theorems, design-time.
✓ DeFi transaction bounds mathematically proven (amount ≤ $1k, slippage ≤ 50bps).
✓ Stripe metered billing idempotent — per-execution key, no same-second dedup.
✓ Billing outbox — no silent loss on Stripe outage, hourly retry.
✓ Cron routes fail-closed — missing CRON_SECRET returns 503, not 200.
✓ go:no-go gate PASS on 2026-05-24.
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
