# Audit Matrix Handoff

Status as of current main:

## Already on main
- `app/api/audit/matrix/route.ts`
- `components/audit/entropy-matrix.tsx`
- `app/dashboard/audit/matrix/page.tsx`

## Known integration gaps
1. `lib/dsg-core.ts` does not yet export `getDSGCoreAuditEvents(limit)`.
2. `lib/dsg-core.ts` does not yet export `getDSGCoreDeterminism(sequence)`.
3. `app/dashboard/audit/matrix/page.tsx` still fetches `/api/audit?limit=100` instead of `/api/audit/matrix?limit=100`.
4. `app/dashboard/audit/page.tsx` does not yet link to `/dashboard/audit/matrix`.
5. `app/dashboard/page.tsx` does not yet expose Audit navigation and does not yet show an audit summary section.

## Intended next changes
### 1) lib/dsg-core.ts
Add:
- `getDSGCoreAuditEvents(limit = 20)`
- `getDSGCoreDeterminism(sequence: number)`

Suggested endpoints:
- `GET /audit?limit=<limit>`
- `GET /audit/determinism?sequence=<sequence>`

Both helpers should follow the same pattern already used by:
- `getDSGCoreHealth()`
- `getDSGCoreMetrics()`
- `getDSGCoreLedger()`

### 2) app/dashboard/audit/matrix/page.tsx
Change fetch target from:
- `/api/audit?limit=100`

to:
- `/api/audit/matrix?limit=100`

Then adapt the page state to the matrix route response shape:
- `sequences`
- `regions`
- `cells`
- `determinism`
- `summary`

### 3) components/audit/entropy-matrix.tsx
If matrix page is switched to `/api/audit/matrix`, this component should consume `cells` directly or matrix page should map `cells` into the current `items` prop shape.

### 4) app/dashboard/audit/page.tsx
Add a visible link/button to:
- `/dashboard/audit/matrix`

### 5) app/dashboard/page.tsx
Add:
- Audit navigation link/button
- Audit summary section using `/api/audit?limit=20` or `/api/audit/matrix?limit=100` summary data

## Important note
The matrix route file exists on main, but the end-to-end feature is not complete until the items above are finished.
