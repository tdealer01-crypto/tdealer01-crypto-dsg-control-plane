## Summary
This PR prepares the control plane for enterprise finance governance launch readiness.

## What changed
- Added deployment readiness API and checks (`/api/readiness`) and surfaced readiness from `/api/health`.
- Fixed DSG core remote mode execution path to execute on remote core instead of local gate fallback.
- Hardened internal service authentication with digest-based timing-safe verification and rotating token support.
- Added finance governance control-layer migration tables with backfill from legacy workflow tables.
- Enhanced finance governance repository with control-layer-first reads/writes and fallback compatibility.
- Added case-level decisions/exceptions/evidence endpoints.
- Added launch readiness CI workflow and launch/revenue docs.

## Validation
- `npm test`
- `npm run typecheck`
