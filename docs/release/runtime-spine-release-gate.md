# Runtime Spine Release Gate

## Pre-merge checks
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes (or documented non-blocking skips with TODO).
- [ ] Migration SQL validated for forward apply.

## Runtime contract checks
- [ ] Trial signup seeds runtime roles for new org owner.
- [ ] `/api/execute` writes execution + audit + usage atomically via RPC.
- [ ] `/api/effect-callback` enforces org-scoped reconciliation.
- [ ] `/api/core/monitor` protected by runtime RBAC.
- [ ] `usage_counters(agent_id,billing_period)` uniqueness enforced.

## Post-deploy verification
- [ ] `GET /api/health` returns 200.
- [ ] `GET /login` and `GET /pricing` return 200.
- [ ] `GET /dashboard` redirects to `/login` when unauthenticated.
- [ ] `POST /api/onboarding/seed` returns 401 unauthenticated.
- [ ] `GET /api/core/monitor` returns structured readiness payload for authenticated users.

## Rollback criteria
- 5xx spike on runtime APIs after deploy.
- Monitor readiness consistently `down` without upstream incident.
- Missing audit/usage rows for successful executions.
