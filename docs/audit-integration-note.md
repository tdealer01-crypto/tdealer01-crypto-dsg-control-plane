# Audit Integration Note

This note is for follow-up agents working on DSG control-plane audit integration.

## Confirmed main-branch gaps

1. `lib/dsg-core.ts` does not export `getDSGCoreAuditEvents` or `getDSGCoreDeterminism`.
2. `app/dashboard/audit/matrix/page.tsx` still fetches `/api/audit?limit=100` instead of `/api/audit/matrix`.
3. `app/dashboard/page.tsx` is still missing the Audit entrypoint and audit summary section.
4. `app/dashboard/audit/page.tsx` is still missing a link to `/dashboard/audit/matrix`.

## Goal

Complete audit integration so that:
- matrix route uses real DSG core helpers
- matrix page consumes `/api/audit/matrix`
- dashboard has an Audit button and audit summary
- audit page links to matrix page

## Branch created by ChatGPT

- `fix/audit-integration-complete`

## Status

- matrix files already exist on `main`
- integration not yet complete at the time this note was added
