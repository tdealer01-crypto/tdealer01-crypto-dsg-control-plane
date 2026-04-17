# PROJECT_TRUTH

Last reviewed: 2026-04-17
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

## Deployment truth

Deployment and production-readiness checks must be grounded in `docs/RUNBOOK_DEPLOY.md`.

Minimum deployment truth includes:

- required env vars must be validated before release
- Supabase migrations must be applied in order
- smoke checks must include `/api/health`
- authenticated operator checks must include runtime/control-plane surfaces
- live E2E against Supabase/staging is part of the intended validation path

## Test baseline resolution (April 17, 2026)

The earlier 85-vs-185 mismatch is now resolved in favor of the latest committed evidence set.

- Historical snapshot (valid for April 11, 2026): `85 tests`, `41 test files`, `0 failures`
- Current authoritative baseline (committed April 17, 2026): `185 tests passed, 3 skipped, 0 failed` and `62 test files passed, 1 skipped, 0 failed`

Authoritative evidence files:

- `qa-logs/npm-test-2026-04-17.log`
- `qa-logs/npm-test.log`
- `qa-logs/test-summary.md`
- `docs/STATUS_SNAPSHOT_2026-04-17.md`

Working rule: preserve older snapshots as historical context, but treat the April 17, 2026 artifact set as the current repo baseline until superseded by a newer committed run.


## Production-readiness status boundary

Repository test truth and production go-live truth are intentionally separate:

- Test truth (current): April 17, 2026 committed Vitest baseline = `185 passed, 3 skipped, 0 failed`.
- Go-live truth (current): **not yet complete** until runbook evidence is closed for deployment readiness, env validation, migration apply state, deployed smoke checks, authenticated operator checks, and live staging/E2E validation.

Do not claim full production readiness from Vitest evidence alone.

## Working rule for future sessions

Before patching, deploying, or updating docs:

1. Read the real file first
2. Classify statements as fact vs inference
3. If a new statement conflicts with this file or canonical sources, stop and log the conflict
4. Prefer newer, directly validated evidence over older documentation snapshots
