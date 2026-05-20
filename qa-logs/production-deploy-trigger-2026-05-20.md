# Production deploy trigger — 2026-05-20

Purpose: create a GitHub merge commit after the latest production-readiness and E2E-gate fixes so Vercel Git integration can build a verified main commit.

Included fixes already on main before this trigger:

- `fix(e2e): keep staging specs out of default Docker pipeline`
- `fix(readiness): avoid false failures on skipped management checks and health rate limits`

Validation boundary:

- This file does not change runtime code.
- Production readiness must still be verified by Vercel deployment status and `/api/readiness` after the merge.
