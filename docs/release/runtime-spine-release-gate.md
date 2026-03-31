# Runtime Spine Release Gate

Release is blocked unless all checks pass:

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:failure`
4. `npm run test:migrations`
5. `npm run typecheck`

Mandatory behavioral checks:
- Consumed/revoked/expired approvals cannot be revived via `/api/intent`.
- `/api/mcp/call` always performs `intent -> execute` before dispatch.
- `effect-callback` duplicate calls are idempotent.
- Checkpoints only persist when truth + ledger lineage already exists.
