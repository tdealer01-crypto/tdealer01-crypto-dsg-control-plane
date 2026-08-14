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
`app/api/stripe/webhook/route.ts` — see "Known unfixed items" below; do not
confuse it with the canonical one above.

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

### Known unfixed items (target/expected end state — verify merge state before relying on this)

The following three items are being addressed by other, separately-tracked
work as of 2026-08-04. Each is phrased so it reads correctly whether the fix
has merged yet or not — re-inspect the cited file directly rather than
trusting this summary once time has passed.

1. **`usage_counters` double-counting.** The `runtime_commit_execution` RPC
   (see `supabase/migrations/20260402_billing_quota_in_rpc.sql` and
   `supabase/migrations/20260404_runtime_spine_rpc_hardening.sql`, both of
   which `insert into usage_counters ... on conflict ... set executions =
   usage_counters.executions + 1`) already increments `usage_counters` as
   part of committing a governed execution. `app/api/spine/execute/route.ts`
   additionally calls the app-layer `incrementQuota()` (from
   `lib/usage/quota.ts`, which itself calls the `increment_quota_atomic` RPC
   defined in `supabase/migrations/20260616000001_atomic_quota_increment.sql`)
   as a fire-and-forget side effect. This double-increments the counter per
   execution. The fix in progress is to remove the redundant app-layer
   `incrementQuota()` call from `app/api/spine/execute/route.ts` and rely on
   `runtime_commit_execution` alone.
2. **Hardcoded plan on the deprecated webhook.** The deprecated
   `app/api/stripe/webhook/route.ts` (its own file header already marks it
   `@deprecated` and says the canonical webhook is
   `app/api/billing/webhook/route.ts`) hardcodes `plan: 'pro'` when
   upserting `release_gate_entitlements`, regardless of the subscription's
   actual plan. This is being fixed to derive the real plan instead of
   hardcoding it.
3. **Dead cron route.** `app/api/cron/billing-sync/route.ts` reads/writes a
   `billing_usage` table and calls a buggy `stripe.billing.meterEvents.create`
   shape, but the route is not reachable in production: it is not listed in
   `vercel.json`'s `crons` array (verified — only
   `/api/cron/flush-meter-outbox`, `/api/cron/reconcile-meter`,
   `/api/cron/usage-alerts`, `/api/cron/trial-invite`, and
   `/api/cron/weekly-report` appear there), and the `billing_usage` table it
   queries has no corresponding migration in `supabase/migrations/`. This
   dead route is being deleted; if `app/api/cron/billing-sync/route.ts` is
   still present when you read this, treat it as unreachable dead code, not
   as part of the metering pipeline.

Also tracked, **not fixed in this pass** — a second, independent quota
check: see `docs/REPO_TRUTH.md`'s "Known unresolved billing gap" section.

## Working rule for future sessions

Before patching, deploying, or updating docs:

1. Read the real file first
2. Classify statements as fact vs inference
3. If a new statement conflicts with this file or canonical sources, stop and log the conflict
4. Prefer newer, directly validated evidence over older documentation snapshots
