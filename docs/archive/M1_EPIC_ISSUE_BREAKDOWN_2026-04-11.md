# M1 Epic Breakdown (Production Cutover)

Date: 2026-04-11 (UTC)  
Milestone binding: **M1 only**

## Freeze policy (effective immediately)

- Freeze all demo-only work.
- Do **not** add any new mock route.
- Do **not** add any new in-memory persistence source-of-truth.
- Do **not** add any new localStorage persistence source-of-truth.

## M1 epic issue split (5 work chunks)

1. **schema/migration delta**
   - finalize workflow/audit schema for submit/approve/reject/escalate
   - add required org-scoped constraints/indexes
2. **repository + org-scope enforcement**
   - unify write/read access through repository layer
   - enforce org scope + RBAC server-side
3. **action write path cutover**
   - submit/approve/reject/escalate must write to DB + audit
4. **read path cutover**
   - dashboard and read APIs use DB-backed state only
5. **acceptance test matrix**
   - unit/integration/migration checks + cutover acceptance checklist

## Wave 1 start (parallel now)

Start these streams in parallel:

- `A1` schema/migrations
- `B1` repository layer
- `D2` policy/error contracts
- `E1` test matrix

## Integration checkpoint (must pass before broader rollout)

Checkpoint objective:

1. Critical action path writes to **real DB** (no demo fallback).
2. Dashboard critical state reads from **real DB-backed APIs**.

Suggested verification signals:

- API responses reflect persisted row state.
- Audit/ledger traces align with action history.
- Dashboard state parity with action history under same org scope.

## PR governance rule

- Every PR must be linked to **M1** or **M2** only.
- Any PR not mapped to M1/M2 is out-of-scope for this cutover.
