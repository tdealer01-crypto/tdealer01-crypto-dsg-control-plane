# Runtime Spine Runbook

## Scope
Operational procedures for runtime spine APIs (`/api/intent`, `/api/execute`, `/api/checkpoint`, `/api/effect-callback`) and monitoring surfaces.

## Daily checks
1. Health: `GET /api/health` should return `ok: true`.
2. Monitor readiness: `GET /api/core/monitor` should report `readiness_status.ready = true` for stable periods.
3. Runtime counters: verify `usage_counters` updated for active agents in current billing period.
4. Audit completeness: verify new executions have corresponding `audit_logs` rows.

## Incident triage
1. Capture request_id / execution_id and org_id.
2. Inspect `runtime_approval_requests` status (`pending|consumed|expired`).
3. Inspect `runtime_ledger_entries` and `runtime_truth_states` by execution lineage.
4. Inspect `audit_logs` + `usage_events` for matching execution_id.
5. If callback issue: verify `runtime_effects` row scoped to the caller org and callback_count progression.

## Common failure patterns
- `Insufficient role` (403): missing `runtime_roles` mapping for user/org.
- `No pending runtime intent` (409): approval intent missing/expired/consumed.
- `quota exceeded` (429): org or agent execution quotas reached.

## Recovery actions
- Re-provision runtime roles for affected user (`org_admin`, `operator`, `billing_admin`) when onboarding failed.
- Re-issue runtime intent before re-execute if prior request is terminal.
- Reconcile callback only from the same org context.

## Post-incident checklist
- Confirm audit and usage rows were written for all successful executions in timeframe.
- Confirm monitor readiness back to `ready` state.
- Add timeline + root cause in incident notes.
