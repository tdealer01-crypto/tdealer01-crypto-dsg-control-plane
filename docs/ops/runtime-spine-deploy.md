# Runtime Spine Deploy Runbook

1. Deploy app build containing `/api/intent`, `/api/execute`, `/api/runtime-summary`, `/api/mcp/call`, `/api/effect-callback`, `/api/checkpoint`.
2. Apply SQL migrations in repository order. The runtime spine/RPC path is:
   - `20260331_runtime_spine.sql`
   - `20260401_runtime_rbac.sql`
   - `20260402_billing_quota_in_rpc.sql`
   - `20260404_runtime_spine_rpc_hardening.sql`
3. Do not reintroduce the former duplicate/unapplied `20260331_runtime_spine_rpc.sql` migration as a synthetic historical version. Provider migration history records `20260331` as `runtime_spine`; later RPC migrations own the forward RPC definition/hardening path.
4. Backfill runtime roles (`runtime_roles`) for existing users before enabling RBAC gates.
5. Execute smoke checks:
   - `POST /api/intent` then `POST /api/execute` must produce ledger and compatibility rows.
   - `GET /api/runtime-summary` must show latest truth/ledger.
6. Monitor DB for non-zero rows in `runtime_approval_requests`, `runtime_truth_states`, `runtime_ledger_entries`.
