# PROJECT_TRUTH

Last reviewed: 2026-04-17
Mode: dry-run
Status: derived from real repository files only

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

## Known unresolved conflict

### Test-count conflict

Two real files disagree:

- `README.md` latest update (April 14, 2026): `185 tests passed, 3 skipped`
- `docs/REPO_TRUTH.md` production-ready snapshot (April 11, 2026): `85 tests`, `41 test files`, `0 failures`

This conflict must remain explicit until revalidated from CI or a fresh test run.
Do not collapse these numbers into a single truth without verification.

## Working rule for future sessions

Before patching, deploying, or updating docs:

1. Read the real file first
2. Classify statements as fact vs inference
3. If a new statement conflicts with this file or canonical sources, stop and log the conflict
4. Prefer newer, directly validated evidence over older documentation snapshots
