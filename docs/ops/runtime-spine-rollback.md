# Runtime Spine Rollback

1. Disable external traffic to runtime mutating routes.
2. Revert application deployment to prior image.
3. Keep migration artifacts in-place (no destructive table drops in live incident).
4. If needed, disable runtime writes by revoking execute privilege on `runtime_commit_execution`.
5. Verify legacy compatibility endpoints still write to `executions`, `audit_logs`, `usage_events`, `usage_counters`.
