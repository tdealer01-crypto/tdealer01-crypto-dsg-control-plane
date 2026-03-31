# Task Layer rollout issue split (Phase 1 first)

## Why this split

PR #102 established the runtime truth/safety spine direction. The next step should be Phase 1 (minimal task layer) before scheduler/executor expansions.

## Recommended issue set

1. `feat(tasks): introduce minimal task layer tables, planner, and run routes`
2. `feat(scheduler): integrate Airflow callback/retry model without giving up DSG truth ownership`
3. `feat(executors): add OpenTofu plan/apply adapter with evidence hashing and policy gate`

## Scope notes

- Keep DSG as truth authority for approvals/effects/ledger/lineage.
- Keep external orchestrators/executors as execution arms only.
- Explicitly separate runtime policy authority from demo/preview policy surfaces.

## Phase 1 delivery checklist

- [ ] migrations: `task_templates`, `task_runs`, `task_steps`
- [ ] domain types: task plan/run/status contracts
- [ ] API contracts: `POST /api/tasks/plan`, `POST /api/tasks/run`
- [ ] built-in templates: `rotate_agent_key`, `reconcile_failed_execution`, `export_audit_pack`, `infra_plan_apply`
- [ ] lineage assertion: step outcomes must flow back through DSG runtime routes
