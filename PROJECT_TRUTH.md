# PROJECT_TRUTH

Last reviewed: 2026-05-25
Mode: active
Status: merged into main; derived from real repository files only

## Canonical sources

This file is a thin control document. The canonical project documents are:

1. `docs/REPO_TRUTH.md`
2. `docs/RUNBOOK_DEPLOY.md`

When information in this file conflicts with those source files, stop and resolve the conflict before making repo changes.

## Project identity

The repository currently presents itself as:

- Product name in `README.md`: `DSG ONE`
- Product role: enterprise AI runtime control plane
- Package name in `package.json`: `dsg-platform`

## Operational truth

Use these interpretations unless a newer verified source overrides them:

- Public baseline probe: `GET /api/health`
- Stable execution compatibility entry: `POST /api/execute`
- Current spine-oriented execution layer: `POST /api/intent`, `POST /api/spine/execute`
- Operator-facing routes are authenticated/org-scoped and should not be treated as anonymous probes:
  - `GET /api/usage`
  - `GET /api/executions`
  - `GET /api/audit`
  - `GET, POST /api/policies`
  - `GET /api/capacity`
  - `POST /api/agent-chat`

Deterministic gate status (live scaffold):

- `GET /api/dsg/v1/policies/manifest`: live
- `POST /api/dsg/v1/gates/evaluate`: live deterministic gate decision payload
- `POST /api/dsg/v1/proofs/prove`: live deterministic proof scaffold
- Current observed gate payload includes `policyVersion`, `constraintSetHash`, `proofHash`, `inputHash`, structured constraint results, and replay-protection fields.
- Current solver metadata claim boundary: deterministic TypeScript static-check scaffold (`solver.name=static_check`, `solver.version=dsg-deterministic-ts-0.0.0`).

## Deployment truth

Deployment and production-readiness checks must be grounded in `docs/RUNBOOK_DEPLOY.md`.

Minimum deployment truth includes:

- required env vars must be validated before release
- Supabase migrations must be applied in order
- smoke checks must include `/api/health`
- authenticated operator checks must include runtime/control-plane surfaces
- live E2E against Supabase/staging is part of the intended validation path

## Test baseline resolution (May 25, 2026)

Four historical baselines exist; use the newest committed run as current truth:

| Date | Files | Tests | Status |
|---|---|---|---|
| 2026-04-11 | 41 passed | 85 passed | superseded |
| 2026-04-17 | 62 passed, 1 skipped | 185 passed, 3 skipped | superseded |
| 2026-05-15 | 77 passed, 2 skipped | 252 passed, 4 skipped | superseded |
| 2026-05-25 | 125 passed, 4 skipped (129) | 874 passed, 12 skipped (886) | **current** |

Evidence: `npm test` output recorded in this session — 20.44s duration, 0 failures.

Working rule: treat May 25, 2026 as the current repo baseline until superseded by a newer committed run.

TypeScript typecheck: **passes with zero errors** (verified 2026-05-25).

## Production-readiness status boundary

### 🟢 CLOSED — PR #595 Merged & Live on Main (2026-05-25)

Repository test truth and production go-live truth are intentionally separate:

- Test truth (current): May 25, 2026 committed Vitest baseline = `874 passed, 12 skipped, 0 failed` (125 files passed | 4 skipped).
- PR #595 (`claude/compliance-pack-main` → `main`) merged via squash, commit `a4ee97a8`. README updated commit `1460e89`.

### Smoke check results — 2026-05-25 (final, all green)

| Route | Status | Evidence |
|---|:---:|---|
| `GET /` (homepage) | 🟢 HTTP 200 | `curl -s -o /dev/null -w "%{http_code}"` |
| `GET /api/readiness` | 🟢 HTTP 200 | `curl -s -o /dev/null -w "%{http_code}"` |
| `GET /compliance-evidence-pack` | 🟢 HTTP 200 | background poller confirmed live |
| `GET /api/compliance-evidence-pack` | 🟢 HTTP 200 | background poller confirmed live |

### Build fixes applied after PR #595 (all merged to main)

| PR | Fix | Result |
|---|---|---|
| Direct push | `tsconfig.json` explicit include list — exclude `packages/` by omission | Vercel TS compile error fixed |
| PR #596 | `tsconfig.typecheck.json` same explicit include list | `npm run typecheck` 0 errors |
| PR #597 | `vercel.json` agent crons → daily schedule (Hobby plan limit) | Vercel deploy unblocked, green |

### Audit items closed in PR #595

- 🟢 CLOSED — Compliance Evidence Pack route (`/api/compliance-evidence-pack`)
- 🟢 CLOSED — Compliance Evidence Pack landing page (`/compliance-evidence-pack`)
- 🟢 CLOSED — Marketing copy specificity (hero badge, trust bar, CTA)
- 🟢 CLOSED — P1 unit test coverage: 10 source files (monitor, providers, managed-connectors, commit-rpc, safe-log, audit-export, request-json, policy, planner, approvals)
- 🟢 CLOSED — Test fixes: orgPlan missing, vi.mocked cast, toMatchObject union, toHaveBeenCalledWith indexing

### Permanent truth boundaries (unchanged)

Do not upgrade beyond scaffold truth without new evidence:

- no external Z3 production-solver invocation claim
- no JWT/JWKS auth-complete claim
- no WORM evidence storage complete claim (audit trail is hash-chained in schema; WORM-certified storage not separately certified)
- no real cryptographic-signing complete claim
- no third-party certification claim
- `certificationClaim = false` · `independentAuditClaim = false` per compliance-evidence-pack route footer

## Billing / revenue architecture (verified 2026-08-04)

This section supplements `docs/REPO_TRUTH.md`'s billing inventory and
`docs/RUNBOOK_DEPLOY.md`'s env-var list. It reflects the current billing
code as read directly in this worktree; it does not assert live-production
behavior beyond what is stated.

### The real Stripe pipeline

A full Checkout → webhook → entitlement → quota-gate → metered-billing →
Stripe-charge pipeline exists in code:

- `app/api/billing/checkout/route.ts` creates the Stripe Checkout session
  (plan/interval normalization, price resolution via
  `lib/billing/pricing-catalog.ts`).
- `app/api/billing/webhook/route.ts` is the canonical, signature-verified,
  idempotent (`billing_events` table, unique `stripe_event_id`) webhook. On
  `checkout.session.completed` / `customer.subscription.*` it upserts
  `billing_subscriptions` and calls `fulfillSubscription()` /
  `revokeSubscription()` (`lib/billing/fulfillment.ts`) to keep
  `organizations.plan` in sync.
- `lib/usage/quota.ts`'s `checkQuota()` reads `organizations.plan` +
  `usage_counters` to gate execution before the governed run.
- `lib/billing/metered.ts`'s `meterExecution()` / `reportMeterEvent()`
  reports a Stripe Billing Meter event per governed execution, which is
  what ultimately produces a Stripe charge for metered overage.

There is a second, separate, deprecated webhook at
`app/api/stripe/webhook/route.ts` — see "Billing bug fixes closed" below; do
not confuse it with the canonical one above.

### Outbox pattern is the canonical metering mechanism

`lib/billing/metered.ts` writes a durable `billing_meter_outbox` row
*before* calling Stripe. If the live Stripe call fails, the row stays
`pending`/`failed` and is retried by cron rather than being silently lost.
Two crons operate on this table (both present in `vercel.json`'s cron
list):

- `/api/cron/flush-meter-outbox` (`app/api/cron/flush-meter-outbox/route.ts`)
  retries `pending`/`failed` outbox rows via `flushMeterOutbox()`.
- `/api/cron/reconcile-meter` (`app/api/cron/reconcile-meter/route.ts`)
  cross-checks the outbox against Stripe's own meter-event records via
  `lib/billing/reconciliation.ts` and can requeue stuck rows.

Treat the outbox + these two crons as the canonical metering flow, not the
inline Stripe call alone — the inline call is best-effort and the outbox is
what guarantees eventual delivery.

### Billing bug fixes closed (verified 2026-08-06)

The three items below were open as of 2026-08-04 and are now **fixed and
merged to `main`** in commit `cf46bfb` (PR #1052, "fix(multi-agent-ccvs):
remove fabricated hash/PR evidence, wire orphaned test into CI", merged
2026-08-04). Re-verified by direct inspection of current file content plus a
real test run on 2026-08-06 — `npm run test -- tests/unit/billing/stripe-webhook-stripe-route.test.ts
tests/integration/api/spine-evidence-chain.test.ts tests/integration/metered-billing.test.ts`
→ 2 files passed, 1 skipped (no live Supabase credentials in this
environment), 27 tests passed, 0 failed.

1. **`usage_counters` double-counting — fixed.** `app/api/spine/execute/route.ts`
   no longer calls the app-layer `incrementQuota()`; a comment at the call
   site now states `usage_counters.executions` is already incremented
   atomically inside `runtime_commit_execution` and that calling
   `incrementQuota()` there would double-count.
2. **Hardcoded plan on the deprecated webhook — fixed.** `app/api/stripe/webhook/route.ts`
   now resolves the real plan from a price-ID map (mirroring
   `app/api/billing/webhook/route.ts`'s mapping) instead of hardcoding
   `plan: 'pro'` when upserting `release_gate_entitlements`.
3. **Dead cron route — fixed.** `app/api/cron/billing-sync/route.ts` no
   longer exists in the working tree; it was deleted in the same commit.
   `vercel.json`'s `crons` array was already unaffected (never listed it).

Also tracked, **still open, not part of the above fix** — a second,
independent quota check: see `docs/REPO_TRUTH.md`'s "Known unresolved
billing gap" section. Re-checked 2026-08-06: `lib/billing/fulfillment.ts`
still does not write `billing_subscriptions.plan_key`, so the gap described
there is current, not stale.

## Documentation sprawl cleanup (2026-08-06)

Repo root had 102 status/summary/report `.md` files and `docs/` had 541 —
643 total, with no single current source of truth. 516 of those had zero
reference from any code, script, or CI workflow (verified by grepping every
non-markdown file in the repo for each filename) and were moved via `git mv`
into `docs/archive/` (structure mirrored, content unchanged, full history
preserved — see `docs/archive/README.md`). This did not touch `app/`,
`lib/`, `tests/`, or any runtime behavior.

Files left in place (not archived) fall into two groups: the canonical set
listed above, and files actively read by application code or checked by
scripts/CI (e.g. `DSG.md`, `DESIGN.md`, several `docs/*.md` files used by
`scripts/validate-stripe-submission.sh` and similar). Those still need a
human decision — this pass only removed the risk-free orphans.

`README.md` root-relative links pointing at archived files were updated to
their new `docs/archive/...` path. A handful of README links were already
broken before this cleanup (`TEST_COVERAGE.md`, `docs/API.md`,
`docs/Z3_FORMAL_SOLVER_README.md`, `docs/delivery-proof.md`,
`docs/API_REFERENCE.md` — the last one exists only at root as
`API_REFERENCE.md`, not under `docs/`); those are pre-existing and were not
introduced by this change.

## Working rule for future sessions

Before patching, deploying, or updating docs:

1. Read the real file first
2. Classify statements as fact vs inference
3. If a new statement conflicts with this file or canonical sources, stop and log the conflict
4. Prefer newer, directly validated evidence over older documentation snapshots
