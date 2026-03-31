# Runtime Spine Deploy Runbook

1. Deploy app build containing `/api/intent`, `/api/execute`, `/api/runtime-summary`, `/api/mcp/call`, `/api/effect-callback`, `/api/checkpoint`.
2. Apply SQL migrations in order:
   - `20260331_runtime_spine.sql`
   - `20260331_runtime_spine_rpc.sql`
   - `20260401_runtime_rbac.sql`
3. Backfill runtime roles (`runtime_roles`) for existing users before enabling RBAC gates.
4. Execute smoke checks:
   - `POST /api/intent` then `POST /api/execute` must produce ledger and compatibility rows.
   - `GET /api/runtime-summary` must show latest truth/ledger.
5. Monitor DB for non-zero rows in `runtime_approval_requests`, `runtime_truth_states`, `runtime_ledger_entries`.
