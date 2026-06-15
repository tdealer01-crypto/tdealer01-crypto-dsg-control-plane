# DSG ONE Documentation Index

This index is curated from the current repository layout. It does not certify that every older document in `docs/` is current.

## Start here

| Document | Purpose |
|---|---|
| [`../README.md`](../README.md) | Codebase-derived repository overview and claim boundary. |
| [`CODEBASE_REVIEW_2026-06-15.md`](./CODEBASE_REVIEW_2026-06-15.md) | Detailed codebase-only review used to refresh the root README. |

## Code surfaces to inspect first

| Surface | Files/directories |
|---|---|
| Runtime execution | `app/api/execute/route.ts`, `app/api/spine/execute/route.ts`, `lib/spine/` |
| Deterministic proof/gate | `app/api/dsg/v1/`, `lib/dsg/deterministic/` |
| DSG auth | `lib/dsg/auth/require-dsg-auth.ts`, `supabase/migrations/20260613000002_dsg_auth_indexes_and_audit.sql` |
| Claim readiness | `app/api/proof/claim-readiness/route.ts`, `supabase/migrations/20260612041000_create_claim_readiness_artifacts.sql` |
| Stripe App package | `packages/stripe-app/` |
| Scripts and CI entry points | `package.json`, `scripts/`, `.github/workflows/` |
| Database schema | `supabase/migrations/`, `lib/database.types.ts` |

## Recently added analysis docs

These are useful context docs but should not override direct code inspection:

- [`COMPETITIVE_BRIEF_CISCO_PANW_2026-06-15.md`](./COMPETITIVE_BRIEF_CISCO_PANW_2026-06-15.md)
- [`DSG_ONE_DEV_ACTIVITY_REPORT_2026-06-15.md`](./DSG_ONE_DEV_ACTIVITY_REPORT_2026-06-15.md)
- [`DSG_ONE_BUILD_IN_PUBLIC_POST_2026-06-15.md`](./DSG_ONE_BUILD_IN_PUBLIC_POST_2026-06-15.md)

## Documentation rule

Before publishing or updating claims, inspect the code path or target deployment evidence that supports the claim. Do not copy older status blocks forward just because they are present in historical docs.
