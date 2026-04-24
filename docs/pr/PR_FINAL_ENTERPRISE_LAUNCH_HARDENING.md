# Final PR: Enterprise Launch Hardening (Finance Governance)

## Summary
- Fix `/api/readiness` boolean parsing for `DSG_FINANCE_GOVERNANCE_ENABLED=false`.
- Make finance governance migration resilient on fresh Supabase projects by guarding legacy backfill with `to_regclass(...)`.
- Harden finance governance schema with RLS baseline, org-scoped authenticated select policies, indexes, constraints, and `updated_at` triggers.
- Fix approval action ID mapping by resolving approval request IDs to `transaction_id` before transaction updates.
- Improve case detail/decision/exception/evidence lookups so they accept transaction IDs, case IDs, or approval request IDs.
- Defer final evidence bundle generation until required approval steps are fully completed.
- Standardize finance governance API error handling so known domain errors remain explicit and unknown/internal errors pass through safe error handling.

## Why this PR
This PR closes launch-blocking reliability and data-safety gaps after the base finance governance merge:
- false-positive readiness gating from string booleans,
- migration failure on new database projects with no legacy tables,
- incorrect row updates when action IDs were treated as transaction IDs,
- brittle case/evidence lookup behavior when queue inputs used approval IDs,
- premature evidence bundle creation,
- and inconsistent API error behavior for unknown internal failures.

## Validation checklist
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Apply Supabase migration on staging
- [ ] Hit `/api/readiness` and confirm HTTP 200
