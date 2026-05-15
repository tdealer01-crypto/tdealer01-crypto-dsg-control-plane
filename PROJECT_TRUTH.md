# PROJECT_TRUTH

Last reviewed: 2026-05-15
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

## Test baseline resolution (May 15, 2026)

Three historical baselines exist; use the newest committed run as current truth:

| Date | Files | Tests | Status |
|---|---|---|---|
| 2026-04-11 | 41 passed | 85 passed | superseded |
| 2026-04-17 | 62 passed, 1 skipped | 185 passed, 3 skipped | superseded |
| 2026-05-15 | 77 passed, 2 skipped | 252 passed, 4 skipped | **current** |

Authoritative evidence files:

- `qa-logs/npm-test-2026-05-15.log`
- `qa-logs/npm-test.log`
- `qa-logs/test-summary.md`

Working rule: preserve older snapshots as historical context, but treat the May 15, 2026 artifact set as the current repo baseline until superseded by a newer committed run.

TypeScript typecheck: **passes with zero errors** (verified May 15, 2026).

## Production-readiness status boundary

Repository test truth and production go-live truth are intentionally separate:

- Test truth (current): May 15, 2026 committed Vitest baseline = `252 passed, 4 skipped, 0 failed`.
- Go-live truth (current): **not yet complete** until runbook evidence is closed for deployment readiness, env validation, migration apply state, deployed smoke checks, authenticated operator checks, and live staging/E2E validation.

Do not claim full production readiness from Vitest evidence alone. Latest runbook evidence: `qa-logs/go-live-evidence-2026-05-15.md` (**PASS** — go-no-go gate green, all smoke checks pass on live deployment).

Remaining go-live blockers (require external environment — Vercel access, production Supabase credentials, direct outbound network):
- Vercel production deployment status = `Ready`
- Production environment variables complete and validated
- Supabase migrations applied in-order (all 34 migrations through `20260512090000_create_agent_gate_settings.sql`)
- `/api/health` and `/api/readiness` smoke checks pass on deployed target
- Authenticated operator checks pass
- Live staging/E2E validation recorded

Do not upgrade beyond scaffold truth without new evidence:

- no external Z3 production-solver invocation claim
- no JWT/JWKS auth-complete claim
- no WORM evidence storage complete claim
- no real cryptographic-signing complete claim
- no third-party certification claim

## Working rule for future sessions

Before patching, deploying, or updating docs:

1. Read the real file first
2. Classify statements as fact vs inference
3. If a new statement conflicts with this file or canonical sources, stop and log the conflict
4. Prefer newer, directly validated evidence over older documentation snapshots
