# Audit Matrix Handoff

This note records the current implementation state for DSG audit matrix work in the control-plane repo.

## Already in `main`

The following files are already present in the repository:

- `app/api/audit/route.ts`
- `app/dashboard/audit/page.tsx`
- `app/api/audit/matrix/route.ts`
- `components/audit/entropy-matrix.tsx`
- `app/dashboard/audit/matrix/page.tsx`

## Current status

The matrix feature is **partially landed**. New matrix files exist, but integration is not fully complete.

### Confirmed gaps still to close

1. `lib/dsg-core.ts`
   - still needs:
     - `DSGCoreAuditEvent`
     - `DSGCoreDeterminism`
     - `getDSGCoreAuditEvents(limit)`
     - `getDSGCoreDeterminism(sequence)`
   - matrix route imports these helpers, so build/runtime may fail until this file is updated.

2. `app/dashboard/audit/matrix/page.tsx`
   - should call `/api/audit/matrix`
   - if it still calls `/api/audit`, it is not wired to the new matrix route correctly.

3. `app/dashboard/audit/page.tsx`
   - should include a link to `/dashboard/audit/matrix`

4. `app/dashboard/page.tsx`
   - still needs an `Audit` navigation button
   - still needs an audit summary section/card
   - should surface audit events / determinism summary from `/api/audit`

## Recommended next steps

Work in this order:

1. Update `lib/dsg-core.ts`
2. Update `app/dashboard/audit/matrix/page.tsx` to use `/api/audit/matrix`
3. Add matrix link to `app/dashboard/audit/page.tsx`
4. Add audit summary + Audit button to `app/dashboard/page.tsx`
5. Open a PR after these four items are complete

## Intent

This repo is part of the larger DSG system:

- `DSG core` = execution truth + policy + ledger + audit determinism
- `control-plane` = operator UI + billing + org workflows + execution surface

The goal of this work is to make audit determinism visible in the control-plane through:

- audit page
- entropy matrix view
- dashboard summary

## Note for follow-up agents

Do not assume the matrix feature is complete just because the matrix files exist.
Check the four gaps above before opening or merging a PR.
