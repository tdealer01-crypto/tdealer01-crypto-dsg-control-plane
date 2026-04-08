# Script Governance (Production vs Dev tooling)

## Goal
Control which shell/script helpers are allowed in production workflows and ensure they are safe.

## Policy
1. Scripts that modify production environment, set secrets, or deploy (`set-vercel-*.sh`, `set-vercel-stripe-env.sh`, `apply-*`) require:
   - Peer review (2 reviewers) and explicit approval in PR.
   - Documentation in `docs/ops/`.
   - An entry in the "Approved Production Scripts" table.

2. Scripts must:
   - Use `set -euo pipefail`
   - Not echo secrets or print sensitive values to logs.
   - Accept a `--dry-run` or explicit `--confirm` flag for production changes.

3. Local/dev-only scripts must be named `*-local.sh` and documented; they cannot be used in CI for prod changes.

## Example approval workflow
1. Developer creates PR including script + docs + tests.
2. Two reviewers approve (one security/ops).
3. Merge to `main`.
4. Ops runs script in a controlled environment or uses CI job that requires `VERCEL_TOKEN`.

## Audit
- Periodic `shellcheck` run (CI job).
- `gitleaks` to ensure no secrets are hard-coded.
