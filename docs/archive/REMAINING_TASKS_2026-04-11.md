# Remaining Tasks (as of 2026-04-11)

## Immediate blockers

1. **Fix E2E pipeline environment**
   - Resolve Playwright browser install/download failure (HTTP 403 in CI/runtime environment).
   - Add deterministic setup for browsers (pinned versions + mirror/cache strategy).

## Before production launch

2. **Run full E2E suite after Playwright fix**
   - Re-run end-to-end flows for auth, dashboard, billing checkout, and core API journeys.

3. **Deployment validation in staging**
   - Apply latest migrations to a staging database.
   - Validate API health checks, auth redirects, RBAC, and runtime execution paths.

4. **Secrets and runtime configuration hardening**
   - Verify all required environment variables are present for Vercel/Supabase/Stripe/Resend.
   - Rotate any temporary or shared credentials used during setup.

5. **Operational readiness checks**
   - Confirm logging, alerting, and incident runbooks are usable by on-call operators.
   - Execute smoke tests from runbook after deployment.

## Recommended quality gates

6. **CI quality gate policy**
   - Keep Vitest (unit/integration/migration/negative) as required.
   - Make E2E required once Playwright environment issue is fixed.

7. **Release checklist formalization**
   - Add a single release checklist covering schema migration order, rollback plan, and post-deploy verification.

## Summary

- Historical note (April 11 context): application code quality was strong based on then-current results (85/85 Vitest passed).
- Current baseline has been superseded by the April 17, 2026 committed evidence set (185 passed, 3 skipped; 62 files passed, 1 skipped).
- Main remaining risk is **environment/infrastructure readiness** (especially E2E runtime and deployment operations), not core feature completeness.
