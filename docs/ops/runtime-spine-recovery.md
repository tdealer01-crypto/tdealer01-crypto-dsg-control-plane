# Runtime Spine Recovery

For partial failures where compatibility rows exist but runtime ledger is missing:

1. Identify affected execution IDs from `executions`.
2. Recompute canonical payload hash using `lib/runtime/canonical.ts` logic.
3. Insert missing `runtime_truth_states` and replay `runtime_commit_execution` with same decision/reason.
4. Confirm `runtime_approval_requests` status transitions to `consumed`.
5. Create new `runtime_checkpoints` for repaired lineage.
