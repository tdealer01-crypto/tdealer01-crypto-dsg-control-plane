# Product Launch Standard — 2026-04-24

## Release gates
- `/api/health` must return `ok: true`.
- `/api/readiness` must return `ok: true`.
- DSG core mode must be explicitly configured (`internal` or `remote`).
- Finance governance control-layer migration must be applied.

## Operational checks
- Run `scripts/go-no-go-gate.sh <base-url>`.
- Confirm enterprise trust surface pages and finance-governance APIs are reachable.
