# Vercel new-account routing verification — 2026-08-16

Purpose: trigger the current pull-request deployment workflow from the latest `main` so GitHub Actions proves which Vercel account routing is actually selected after the account migration work.

Acceptance evidence:

- `Resolve audited Vercel routing` must report `Vercel routing resolved to new account.`
- `VERCEL_USE_NEW_ACCOUNT` must be `true`.
- The selected org/project must not equal the legacy IDs guarded by `scripts/resolve-vercel-routing.mjs`.
- `vercel pull` must succeed against the selected project.
- Preview deployment must reach a usable URL and `/api/health` must pass.

This file contains no credentials or secret values. A failed run is diagnostic evidence and must not be converted into a production-ready claim.
