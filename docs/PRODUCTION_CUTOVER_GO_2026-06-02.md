# Production Cutover GO — 2026-06-02

## Decision

**Production Cutover GO: PASS**

Scope: DSG Control Plane production cutover for the current Vercel/Supabase deployment path.

This does not claim external Z3 production-solver invocation, independent third-party audit, WORM-certified storage, JWT/JWKS completion, marketplace/platform approval, enterprise certification, or that all CI checks are green.

## Repository evidence

- PR: #650 — `Add production GO cutover evidence gate`
- PR state: merged
- Merged at: `2026-06-01T17:08:11Z`
- Merge commit: `9da5a07f8058352cbe1905d36d4388029e067f2c`
- PR head before merge: `13f1d8f6682a8b2af778a39cfe6429a5e4c5bd50`
- Key blocker fixed: `lib/dsg/brain/ui/session-storage.ts` no longer uses browser `localStorage` or `sessionStorage` for DSG Brain session/config persistence.

## Vercel evidence

Observed through Vercel API:

- Project: `tdealer01-crypto-dsg-control-plane`
- Project ID: `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW`
- Deployment ID: `dpl_EyV4MeuQZceP58myseHaeJMK3ZLB`
- Target: `production`
- State: `READY`
- Commit: `13f1d8f6682a8b2af778a39cfe6429a5e4c5bd50`

## Live endpoint evidence

Observed through Vercel protected fetch against the production alias.

### GET /api/health

- HTTP status: `200`
- `ok: true`
- `core_ok: true`
- `db_ok: true`
- `rateLimiter.ok: true`
- embedded readiness checks true:
  - `env.ok`
  - `nextAuthSecret.ok`
  - `supabaseServiceRole.ok`
  - `dsgCoreConfig.ok`
  - `dsgCoreHealth.ok`
  - `financeGovernanceSurface.ok`
  - `financeGovernanceBackend.ok`

### GET /api/readiness

- HTTP status: `200`
- `ok: true`
- checks true:
  - `env.ok`
  - `nextAuthSecret.ok`
  - `supabaseServiceRole.ok`
  - `dsgCoreConfig.ok`
  - `dsgCoreHealth.ok`
  - `financeGovernanceSurface.ok`
  - `financeGovernanceBackend.ok`

### GET /api/agent/status

- HTTP status: `200`
- `ok: true`
- `env: production`
- `checks.db: true`

Note: `/api/agent/status` reported an older `version` string during verification. For this cutover, use the combined evidence from PR #650 merge metadata, Vercel deployment metadata, `/api/health`, `/api/readiness`, and Supabase state.

## Supabase evidence

Observed through Supabase API for project `zeyguilldygozufpgxms` (`dsg-control-plane-dev`):

- Project status: `ACTIVE_HEALTHY`
- Region: `ap-southeast-2`
- Postgres: `17.6.1`
- `public.org_onboarding_states`: exists, RLS enabled, rows present
- `public.audit_logs`: exists, RLS enabled, rows present
- `public.dsg_agent_command_gate_decisions`: exists, RLS enabled, rows present
- `public.dsg_agent_action_result_receipts`: exists, RLS enabled, rows present
- Finance governance evidence tables have live rows:
  - `finance_governance_audit_ledger`
  - `finance_workflow_action_events`
  - `finance_transactions`
  - `finance_approval_requests`
  - `finance_approval_decisions`

## GitHub Actions signal

Observed for commit `13f1d8f6682a8b2af778a39cfe6429a5e4c5bd50`:

- `launch-readiness`: success
- `E2E (Playwright Docker)`: success
- `ccvs-evidence`: success
- `DSG Secure Deploy Gate`: success
- `CI Security Checks`: failure at `npm audit`

Interpretation:

- The operational production cutover is GO.
- Do **not** claim “all CI checks green.”
- Treat the npm audit failure as follow-up security hardening until resolved or separately risk-accepted.

## Gate matrix

| Gate | Result | Evidence |
|---|:---:|---|
| G1 Repo verification | PASS | PR #650 merged; merge commit `9da5a07f8058352cbe1905d36d4388029e067f2c` |
| G2 No fake browser source-of-truth | PASS | `lib/dsg/brain/ui/session-storage.ts` no longer uses browser storage |
| G3 DB/Supabase state | PASS | Supabase API shows required RLS tables and live rows |
| G4 Org/RBAC route protection | PARTIAL PASS | `/api/usage` anonymous returned `401` earlier; full authenticated RBAC matrix still recommended |
| G5 Deterministic proof readiness | PASS | PR #650 derives `productionReadyClaim` from proof evidence and keeps external/compliance claims false |
| G6 Typecheck/test/build | PASS by PR evidence | PR #650 records typecheck, test, verify:deterministic, build, verify:production-manifest PASS |
| G7 Vercel production deploy Ready | PASS | Vercel deployment is `READY`, target `production` |
| G8 Live health/readiness | PASS | `/api/health` and `/api/readiness` HTTP 200 with checks green |
| G9 Authenticated smoke flow | PARTIAL PASS | DB rows and PR tests prove the core flow; a fresh operator session smoke test is still recommended for M2 hardening |
| G10 Evidence manifest | PASS | This document plus README history and PR #650 evidence |

## Final decision object

```json
{
  "productionCutoverGo": true,
  "scope": "DSG Control Plane production cutover",
  "mergeCommit": "9da5a07f8058352cbe1905d36d4388029e067f2c",
  "deploymentReady": true,
  "liveHealthReady": true,
  "dbEvidenceReady": true,
  "browserSourceOfTruthRemoved": true,
  "securityHardeningReview": "CI Security Checks failed at npm audit; resolve as follow-up",
  "notClaimed": [
    "external Z3 production solver",
    "third-party audit",
    "WORM-certified storage",
    "JWT/JWKS complete",
    "marketplace/platform approval",
    "enterprise certification",
    "all CI checks green"
  ]
}
```
