# Audit matrix handoff

Status checked on main:

- `app/api/audit/matrix/route.ts` exists.
- `components/audit/entropy-matrix.tsx` exists.
- `app/dashboard/audit/matrix/page.tsx` exists.

Remaining integration work:

1. Update `lib/dsg-core.ts` to export `getDSGCoreAuditEvents(limit)` and `getDSGCoreDeterminism(sequence)` so both audit routes can import real helpers.
2. Update `app/dashboard/audit/matrix/page.tsx` to fetch `/api/audit/matrix` instead of `/api/audit?limit=100`.
3. Update `app/dashboard/audit/page.tsx` to add a link/button to `/dashboard/audit/matrix`.
4. Update `app/dashboard/page.tsx` to add an Audit entry point and audit summary section.

Notes:

- Current matrix page renders the component but still reads from the old audit endpoint.
- Current matrix route imports helpers that are not present in `lib/dsg-core.ts` yet.
- This was partially blocked through the GitHub connector because creating new files works, but updating existing tracked files failed through the available connector write path.
