# DSG Repo Truth

This document records the current verified source-of-truth layout for the DSG product surface.

## Verified topology

- Product shell: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Canonical gate core: `tdealer01-crypto/DSG-Deterministic-Safety-Gate`
- Runtime plane: `tdealer01-crypto/DSG-ONE`
- Audit plane: `tdealer01-crypto/dsg-deterministic-audit`

## Verified formal core

The DSG formal gate core is verified for:

- Determinism
- Safety Invariance
- Constant-Time Bound

The uploaded proof artifact is SMT-LIB v2 and is intended to be checked with Z3, expecting `sat`.

## Scope boundary

This does not mean the full product is formally verified end to end.

The runtime spine is implemented in control-plane, and remaining work is contract-depth verification:

- transactional consistency under failure paths
- strict org scoping across callback and reconciliation paths
- RBAC depth across monitor and runtime admin surfaces
- billing and usage accounting consistency under concurrency
- multi-repo product assembly verification

Current practical deployment risk is configuration drift (especially Supabase/Vercel auth environment variables and redirect URL settings), not missing runtime-spine files.

## Current integration gap

The control-plane expects a richer core contract than the canonical gate contract currently visible in the gate repo. The current product is therefore a multi-repo system with verified components, not yet a single fully aligned execution path.

## Current control-plane route truth

The public and operator-facing route surfaces should be interpreted as follows:

### Public baseline probe
- `GET /api/health`

This is the baseline public availability probe for deployment and smoke-check purposes.

### Stable execution entry
- `POST /api/execute`

This path remains the stable execution entry for real-run traffic after first-run setup.
Internally, it forwards to the current spine execution handler.

### Current execution implementation layer
- `POST /api/intent`
- `POST /api/spine/execute`

These routes reflect the current spine-oriented execution shape in the control-plane repo.

### Authenticated operator routes
- `GET /api/usage`
- `GET /api/executions`
- `GET /api/audit`
- `GET, POST /api/policies`
- `GET /api/capacity`
- `POST /api/agent-chat`

These should be evaluated with authenticated, org-scoped access.
They are not anonymous/public health probes.

## Practical interpretation

When checking repo truth for the control-plane:
- treat `/api/health` as the public baseline probe
- treat `/api/execute` as the stable public execution entry
- treat `/api/spine/execute` as the current implementation path behind execution
- treat usage, policy, capacity, audit, and execution inspection routes as operator surfaces

## PR merge timeline note (April 2026)

If you are trying to "merge #216" in this repository timeline, note that this branch history currently has:

- `#215` (`33aa49d`)
- `#217` (`e1b3987`)
- `#218` (`52e17a8`)
- `#219` (`eb170a6`)
- `#220` (`8920f39`)

There is no commit tagged with `(#216)` in the local git history, which usually means one of the following:

1. PR 216 was closed without merge.
2. PR 216 was merged with a different title that omitted the `(#216)` suffix.
3. The branch was rebased/squashed and commit references changed.

Suggested recovery flow:

1. Fetch full remote refs (`git fetch --all --prune`).
2. Check whether `origin/pr/216` or an equivalent branch exists.
3. If PR 216 exists remotely, merge/cherry-pick by commit SHA, not PR number label.
4. If PR 216 does not exist, continue from the latest merged baseline (`#220`) and re-open the missing changes as a new PR.

## Current test baseline (April 17, 2026)

This section is the active baseline for test-status truth in this repository.

- Test files: **62 passed, 1 skipped, 0 failed**
- Tests: **185 passed, 3 skipped, 0 failed**

Evidence pointers:
- `qa-logs/npm-test-2026-04-17.log`
- `qa-logs/npm-test.log`
- `qa-logs/test-summary.md`
- `docs/STATUS_SNAPSHOT_2026-04-17.md`

Historical context:
- The April 11 snapshot below remains preserved for timeline/history purposes only.


## Production-readiness gap snapshot (April 17, 2026)

Runbook-aligned status is **not yet closed** from repository evidence alone.

| Runbook requirement (`docs/RUNBOOK_DEPLOY.md`) | Current repo evidence status |
|---|---|
| Vercel production deployment is `Ready` | Not proven by committed artifact in this repository. |
| Production env vars complete/validated | Not proven by committed artifact in this repository. |
| Supabase migrations applied on target environment | Migration files exist; applied-state evidence for production target is not committed here. |
| Deployed smoke check `GET /api/health` | Not proven against deployed production target in committed evidence set. |
| `/api/core/monitor` + authenticated operator checks | Not proven against deployed production target in committed evidence set. |
| Live E2E/staging validation | Not fully proven; Vitest baseline is green, but live browser/E2E evidence is incomplete. |

Interpretation:
- Treat the April 17 test baseline as repository-test truth.
- Do **not** mark go-live complete until the runbook evidence above is collected and recorded.

## Historical production-ready inventory snapshot (April 11, 2026)

This historical snapshot records production-ready file coverage and validated test status as of April 11, 2026 in `tdealer01-crypto-dsg-control-plane`.

### Test status snapshot

| Category | Pass | Fail | Notes |
|---|---:|---:|---|
| Unit | 41 | 0 | Passed |
| Integration | 35 | 0 | Passed |
| Failure (negative) | 4 | 0 | Passed |
| Migrations | 5 | 0 | Passed |
| E2E (Playwright) | 0 | 1 | Browser install/download issue (environment), not an application logic regression |

Vitest aggregate status at that historical point: **85 tests**, **41 test files**, **0 failures**.

### Root config and entry surface

- `package.json`
- `tsconfig.json`
- `next.config.js`
- `middleware.ts`
- `vitest.config.ts`
- `playwright.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `vercel.json`
- `.env.example`

### Next.js app router surface (`app/`)

Public/auth pages are present, including:

- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/password-login/page.tsx`
- `app/signup/page.tsx`
- `app/pricing/page.tsx`
- `app/quickstart/page.tsx`
- `app/marketplace/page.tsx`
- `app/marketplace-ui/page.tsx`
- `app/app-shell/page.tsx`
- `app/docs/page.tsx`
- `app/request-access/page.tsx`
- `app/globals.css`

Auth flow folders:

- `app/auth/confirm/`
- `app/auth/continue/`
- `app/auth/login/`
- `app/auth/password-login/`
- `app/auth/signout/`
- `app/auth/signup/`

SSO and enterprise proof folders:

- `app/sso/start/`
- `app/enterprise-proof/report/`
- `app/enterprise-proof/start/`
- `app/enterprise-proof/verified/`

Dashboard surface includes:

- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/error.tsx`
- `app/dashboard/agents/`
- `app/dashboard/audit/`
- `app/dashboard/billing/`
- `app/dashboard/capacity/`
- `app/dashboard/command-center/`
- `app/dashboard/core-compat/`
- `app/dashboard/executions/`
- `app/dashboard/integration/`
- `app/dashboard/ledger/`
- `app/dashboard/mission/`
- `app/dashboard/operations/`
- `app/dashboard/policies/`
- `app/dashboard/proofs/`
- `app/dashboard/replay/`
- `app/dashboard/settings/`
- `app/dashboard/skills/`

API surface (`app/api/`) includes:

- `app/api/access/`
- `app/api/adapter-plan/`
- `app/api/agent-chat/`
- `app/api/agents/`
- `app/api/audit/`
- `app/api/auth/`
- `app/api/billing/`
- `app/api/capacity/`
- `app/api/checkpoint/`
- `app/api/core-compat/`
- `app/api/core/`
- `app/api/demo/`
- `app/api/effect-callback/`
- `app/api/enterprise-proof/`
- `app/api/execute/` (stable execution entry)
- `app/api/executions/`
- `app/api/executors/`
- `app/api/health/`
- `app/api/integration/`
- `app/api/intent/` (intent endpoint)
- `app/api/ledger/`
- `app/api/mcp/`
- `app/api/metrics/`
- `app/api/onboarding/`
- `app/api/policies/`
- `app/api/proofs/`
- `app/api/quickstart/`
- `app/api/replay/`
- `app/api/runtime-recovery/`
- `app/api/runtime-summary/`
- `app/api/settings/`
- `app/api/spine/`
- `app/api/usage/`

### Core library surface (`lib/`)

Spine execution engine:

- `lib/spine/engine.ts`
- `lib/spine/pipeline.ts`
- `lib/spine/plugin.ts`
- `lib/spine/register-defaults.ts`
- `lib/spine/request.ts`
- `lib/spine/types.ts`
- `lib/spine/plugins/`

DSG core integration:

- `lib/dsg-core/index.ts`
- `lib/dsg-core/internal.ts`
- `lib/dsg-core/remote.ts`
- `lib/dsg-core/types.ts`

Gate:

- `lib/gate/index.ts`
- `lib/gate/registry.ts`
- `lib/gate/types.ts`
- `lib/gate/plugins/`

Runtime:

- `lib/runtime/approval.ts`
- `lib/runtime/canonical.ts`
- `lib/runtime/checkpoint.ts`
- `lib/runtime/gate.ts`
- `lib/runtime/makk8-arbiter.ts`
- `lib/runtime/permissions.ts`
- `lib/runtime/reconcile.ts`
- `lib/runtime/recovery.ts`

Auth and RBAC:

- `lib/auth/access-policy.ts`
- `lib/auth/directory-sync.ts`
- `lib/auth/guest-access.ts`
- `lib/auth/jit-provisioning.ts`
- `lib/auth/login-context.ts`
- `lib/auth/preflight.ts`
- `lib/auth/rbac.ts`
- `lib/auth/require-active-profile.ts`
- `lib/auth/require-org-permission.ts`
- `lib/auth/safe-next.ts`
- `lib/auth/sign-in-events.ts`
- `lib/auth/sso-config.ts`

Billing:

- `lib/billing/overage-config.ts`
- `lib/billing/seat-activation.ts`

Security:

- `lib/security/api-error.ts`
- `lib/security/audit-export.ts`
- `lib/security/error-response.ts`
- `lib/security/rate-limit.ts`
- `lib/security/safe-log.ts`

Agent tooling:

- `lib/agent/context.ts`
- `lib/agent/executor.ts`
- `lib/agent/planner.ts`
- `lib/agent/tools.ts`

Enterprise proof:

- `lib/enterprise/proof-access.ts`
- `lib/enterprise/proof-public.ts`
- `lib/enterprise/proof-runtime.ts`
- `lib/enterprise/proof-types.ts`
- `lib/enterprise/proof.ts`

Executors:

- `lib/executors/index.ts`
- `lib/executors/browserbase.ts`
- `lib/executors/social.ts`
- `lib/executors/types.ts`

Other key library files/folders:

- `lib/supabase/`
- `lib/onboarding/bootstrap.ts`
- `lib/makk8/action-data.ts`
- `lib/agent-auth.ts`
- `lib/authz.ts`
- `lib/core-compat.ts`
- `lib/dsg-core.ts`
- `lib/integration-status.ts`
- `lib/resend.ts`
- `lib/stripe-products.ts`
- `lib/supabase-server.ts`

### UI components (`components/`)

- `components/GlobalNav.tsx`
- `components/LoginForm.tsx`
- `components/audit/entropy-matrix.tsx`
- `components/canvas/EntropyField.tsx`

### Database schema and migrations (`supabase/`)

- `supabase/schema.sql`
- `supabase/migrations/20260323053000_product_loop_scaffold.sql`
- `supabase/migrations/20260323054500_product_loop_rls.sql`
- `supabase/migrations/20260323110000_billing_checkout_flow.sql`
- `supabase/migrations/20260323140000_schema_constraints_hardening.sql`
- `supabase/migrations/20260323141000_rls_policy_hardening.sql`
- `supabase/migrations/20260330_monitor_stats.sql`
- `supabase/migrations/20260331_runtime_spine.sql`
- `supabase/migrations/20260331_runtime_spine_rpc.sql`
- `supabase/migrations/20260401093000_batch3_enterprise_identity_rollout.sql`
- `supabase/migrations/20260401120000_enterprise_access_batch2.sql`
- `supabase/migrations/20260401_runtime_rbac.sql`
- `supabase/migrations/20260401_schema_policies_table.sql`
- `supabase/migrations/20260402_billing_quota_in_rpc.sql`
- `supabase/migrations/20260404_runtime_spine_rpc_hardening.sql`

### Deployment and ops scripts (`scripts/`)

- `scripts/check-error-handlers.sh`
- `scripts/stripe-setup.ts`
- `scripts/termux-deploy-all-in-one.sh`
- `scripts/apply-runtime-rpc-fix.sh`
- `scripts/go-no-go-gate.sh`
- `scripts/with-playwright-chromium.sh`
- `scripts/benchmark-dsg.mjs`
- `scripts/render-benchmark-site.mjs`
- `apply-billing-checkout-flow.sh`
- `apply-complete-audit-hotfix.sh`
- `set-vercel-runtime-env.sh`
- `set-vercel-stripe-env.sh`
- `redeploy-vercel-prod.sh`

### Documentation surface (`docs/`)

- `docs/OPERATOR_SETUP_CHECKLIST.md`
- `docs/PR_REVIEW_PACK_V1_RUNTIME_GAP_2026-03-31.md`
- `docs/REPO_TRUTH.md`
- `docs/RUNBOOK_DEPLOY.md`

## Thai localization note (April 12, 2026)

For operator handoff in Thai, the production-ready inventory snapshot above has been validated as equivalent to the Thai checklist shared on April 12, 2026, including:

- Historical Vitest summary (April 11 snapshot): **85 tests passed**, **41 test files**, **0 failures**
- Playwright status: one environment-level browser download/install failure (non-code defect)
- Full-system inventory coverage across root config, App Router pages/API, core libraries, components, migrations, scripts, and docs

This note exists to keep bilingual (EN/TH) repo-truth alignment explicit for review and release sign-off.

## Merge mismatch note: "286/294 merge ไม่ได้" (April 12, 2026)

If a reviewer sees a merge-progress indicator like **286/294** and cannot merge, treat it as a **branch divergence/incomplete-sync signal**, not a product-readiness failure by default.

Recommended triage order:

1. Ensure local branch is synchronized with the latest protected target branch (`main` or release branch) and re-run CI on the rebased head.
2. Re-check required status checks in GitHub branch protection (especially required workflow names after any CI workflow rename).
3. Confirm there are no unresolved "outdated review" or "required conversation resolution" gates.
4. If all checks are green but merge is still blocked, inspect merge queue / required linear-history settings and retry via the configured merge method.

Operational interpretation for this repository:

- The April 11 control-plane inventory remains historically valid for that date; current test baseline is the April 17 committed result (185 passed, 3 skipped; 62 files passed, 1 skipped).
- A `286/294` merge indicator should be handled as release-process metadata drift until a concrete failing required check is identified.
