# Runtime Spine On-call Checklist

- Alert on 5xx for `/api/intent`, `/api/execute`, `/api/effect-callback`.
- Alert on sustained growth of `pending` approvals older than 5 minutes.
- Alert on RPC errors from `runtime_commit_execution`.
- Daily check: latest ledger sequence should be monotonic per org+agent.
- Incident tags:
  - `runtime-authz` for role denials
  - `runtime-ledger` for commit failures
  - `runtime-callback` for effect callback idempotency issues
