# tdealer01-crypto-dsg-control-plane

Production-ready control plane for DSG runtime operations, built with Next.js App Router + Supabase.

This repository is structured to cover end-to-end runtime governance: Auth/SSO, Spine execution, DSG core integration, agent lifecycle, billing, enterprise proof, dashboards, and operational APIs.

---

## Production Launch Checkpoint — 2026-04-25

**DSG Action Layer Gate: GO**

This checkpoint records the validated production launch baseline for the DSG control plane after the lockfile, manifest, runtime readiness, and Termux go/no-go gate fixes were merged.

| Area | Status | Evidence |
|---|---:|---|
| Production deployment | ✅ PASS | Vercel production deployment `dpl_43qqZowFMo7JpsBXgkropG5bLjfb` is `READY` on commit `e4b194b` |
| Production URL | ✅ PASS | `https://tdealer01-crypto-dsg-control-plane.vercel.app` |
| Health endpoint | ✅ PASS | `/api/health` returns HTTP 200 with `ok: true` |
| Readiness endpoint | ✅ PASS | `/api/readiness` returns HTTP 200 with `ok: true` |
| Trust pages | ✅ PASS | `/terms`, `/privacy`, `/security`, `/support` return HTTP 200 |
| Protected monitor endpoint | ✅ PASS | `/api/core/monitor` returns HTTP 401 when unauthenticated, which is expected |
| Legacy server-store callers | ✅ PASS | No legacy `/api/finance-governance/server-store` callers found |
| Go/no-go script | ✅ PASS | `GO/NO-GO RESULT: PASS (all scripted checks green)` |

### Re-run the launch gate

```bash
BASE="https://tdealer01-crypto-dsg-control-plane.vercel.app"
./scripts/go-no-go-gate.sh "$BASE"
```

Expected result:

```text
GO/NO-GO RESULT: PASS (all scripted checks green)
```

### Runtime readiness requirements

Production readiness depends on these environment-backed checks staying green:

- `NEXTAUTH_SECRET`
- Supabase service role configuration
- DSG core configuration
- DSG core health
- Finance governance surface

If any readiness check returns `ok: false`, the launch state falls back to **NO-GO** until fixed and redeployed.

---

## Test Status (Latest Validated Baseline)

Validated local and runtime baseline from the launch repair run:

- **199 tests passed**
- **67 test files passed**
- **3 tests skipped**
- **1 test file skipped**
- **Typecheck passed** with exit code `0`
- **Production manifest gate passed** with **186 paths present**
- **Vercel production build passed**
- **Runtime health/readiness passed**
- **Go/no-go gate passed**

### Breakdown

| Check | Result |
|---|---:|
| Vitest test suite | 199 passed / 3 skipped |
| Test files | 67 passed / 1 skipped |
| TypeScript typecheck | PASS |
| Production manifest gate | PASS — 186 paths present |
| Vercel production deployment | PASS — READY |
| Runtime smoke | PASS |
| DSG Action Layer Gate | GO |

---

## Production-Ready File Inventory

## 1) Root Config & Entry

| File | Responsibility |
|---|---|
| `package.json` | Dependencies & scripts |
| `package-lock.json` | Locked dependency graph for reproducible Vercel/Linux installs |
| `tsconfig.json` | TypeScript config |
| `next.config.js` | Next.js config |
| `middleware.ts` | Edge middleware (auth/security) |
| `vitest.config.ts` | Test runner config |
| `playwright.config.ts` | E2E config |
| `tailwind.config.js` | Tailwind CSS |
| `postcss.config.js` | PostCSS |
| `vercel.json` | Vercel deployment |
| `.env.example` | Environment template |

---

## 2) `app/` — Next.js App Router (Pages & API)

### Pages

| Path | Responsibility |
|---|---|
| `app/layout.tsx` | Root layout |
| `app/page.tsx` | Landing page |
| `app/login/page.tsx` | Login page |
| `app/password-login/page.tsx` | Password login |
| `app/signup/page.tsx` | Signup page |
| `app/pricing/page.tsx` | Pricing page |
| `app/quickstart/page.tsx` | Quickstart guide |
| `app/marketplace/page.tsx` | Marketplace |
| `app/marketplace-ui/page.tsx` | Marketplace UI |
| `app/app-shell/page.tsx` | App shell server wrapper |
| `app/docs/page.tsx` | Docs page |
| `app/request-access/page.tsx` | Request access |
| `app/terms/page.tsx` | Terms page |
| `app/privacy/page.tsx` | Privacy page |
| `app/security/page.tsx` | Security page |
| `app/support/page.tsx` | Support page |
| `app/globals.css` | Global styles |

### Auth Flow (`app/auth/`)

- `app/auth/confirm/`
- `app/auth/continue/`
- `app/auth/login/`
- `app/auth/password-login/`
- `app/auth/signout/`
- `app/auth/signup/`

### SSO & Enterprise Proof (`app/sso/`, `app/enterprise-proof/`)

- `app/sso/start/`
- `app/enterprise-proof/report/`
- `app/enterprise-proof/start/`
- `app/enterprise-proof/verified/`

### Dashboard (`app/dashboard/`)

| Path | Responsibility |
|---|---|
| `app/dashboard/layout.tsx` | Dashboard layout |
| `app/dashboard/page.tsx` | Dashboard home |
| `app/dashboard/error.tsx` | Error boundary |
| `app/dashboard/agents/` | Agent management |
| `app/dashboard/audit/` | Audit view |
| `app/dashboard/billing/` | Billing view |
| `app/dashboard/capacity/` | Capacity view |
| `app/dashboard/command-center/` | Command center |
| `app/dashboard/core-compat/` | Core compat view |
| `app/dashboard/executions/` | Executions view |
| `app/dashboard/integration/` | Integration view |
| `app/dashboard/ledger/` | Ledger view |
| `app/dashboard/mission/` | Mission view |
| `app/dashboard/operations/` | Operations view |
| `app/dashboard/policies/` | Policies view |
| `app/dashboard/proofs/` | Proofs view |
| `app/dashboard/replay/` | Replay view |
| `app/dashboard/settings/` | Settings view |
| `app/dashboard/skills/` | Skills view |

### API Routes (`app/api/`)

| Path | Responsibility |
|---|---|
| `app/api/access/` | Access control |
| `app/api/adapter-plan/` | Adapter plan |
| `app/api/agent-chat/` | Agent chat |
| `app/api/agents/` | Agent CRUD |
| `app/api/audit/` | Audit API |
| `app/api/auth/` | Auth API |
| `app/api/billing/` | Billing/Stripe |
| `app/api/capacity/` | Capacity API |
| `app/api/checkpoint/` | Checkpoint API |
| `app/api/core-compat/` | Core compat |
| `app/api/core/` | Core API |
| `app/api/core/monitor/` | Protected core monitor |
| `app/api/demo/` | Demo API |
| `app/api/effect-callback/` | Effect callback |
| `app/api/enterprise-proof/` | Enterprise proof |
| `app/api/execute/` | **Spine execution** |
| `app/api/executions/` | Executions list |
| `app/api/executors/` | Executor dispatch |
| `app/api/health/` | Health check |
| `app/api/readiness/` | Production readiness check |
| `app/api/integration/` | Integration |
| `app/api/intent/` | **Intent endpoint** |
| `app/api/ledger/` | Ledger API |
| `app/api/mcp/` | MCP protocol |
| `app/api/metrics/` | Metrics |
| `app/api/onboarding/` | Onboarding |
| `app/api/policies/` | Policies API |
| `app/api/proofs/` | Proofs API |
| `app/api/quickstart/` | Quickstart API |
| `app/api/replay/` | Replay API |
| `app/api/runtime-recovery/` | Runtime recovery |
| `app/api/runtime-summary/` | Runtime summary |
| `app/api/settings/` | Settings API |
| `app/api/spine/` | Spine API |
| `app/api/usage/` | Usage API |

---

## 3) `lib/` — Core Business Logic

### Spine Execution Engine (`lib/spine/`)

| File | Responsibility |
|---|---|
| `lib/spine/engine.ts` | Spine engine core |
| `lib/spine/pipeline.ts` | Plugin pipeline |
| `lib/spine/plugin.ts` | Plugin interface |
| `lib/spine/register-defaults.ts` | Default plugin registration |
| `lib/spine/request.ts` | Request types |
| `lib/spine/types.ts` | Spine types |
| `lib/spine/plugins/` | Plugin implementations |

### DSG Core Integration (`lib/dsg-core/`)

| File | Responsibility |
|---|---|
| `lib/dsg-core/index.ts` | Entry point / mode switch |
| `lib/dsg-core/internal.ts` | In-process gate |
| `lib/dsg-core/remote.ts` | Remote gate call |
| `lib/dsg-core/types.ts` | Core types |

### Gate (`lib/gate/`)

| File | Responsibility |
|---|---|
| `lib/gate/index.ts` | Gate entry |
| `lib/gate/registry.ts` | Gate registry |
| `lib/gate/types.ts` | Gate types |
| `lib/gate/plugins/` | Gate plugins |

### Runtime (`lib/runtime/`)

| File | Responsibility |
|---|---|
| `lib/runtime/approval.ts` | Approval flow |
| `lib/runtime/canonical.ts` | Canonical state |
| `lib/runtime/checkpoint.ts` | Checkpoint logic |
| `lib/runtime/gate.ts` | Runtime gate |
| `lib/runtime/makk8-arbiter.ts` | Makk8 arbiter |
| `lib/runtime/permissions.ts` | Permissions |
| `lib/runtime/reconcile.ts` | Reconciliation |
| `lib/runtime/recovery.ts` | Recovery logic |

### Auth & RBAC (`lib/auth/`)

| File | Responsibility |
|---|---|
| `lib/auth/access-policy.ts` | Access policy |
| `lib/auth/directory-sync.ts` | Directory sync |
| `lib/auth/guest-access.ts` | Guest access |
| `lib/auth/jit-provisioning.ts` | JIT provisioning |
| `lib/auth/login-context.ts` | Login context |
| `lib/auth/preflight.ts` | Auth preflight |
| `lib/auth/rbac.ts` | RBAC engine |
| `lib/auth/require-active-profile.ts` | Profile guard |
| `lib/auth/require-org-permission.ts` | Org permission guard |
| `lib/auth/safe-next.ts` | Safe Next.js helpers |
| `lib/auth/sign-in-events.ts` | Sign-in events |
| `lib/auth/sso-config.ts` | SSO config |

### Billing (`lib/billing/`)

| File | Responsibility |
|---|---|
| `lib/billing/overage-config.ts` | Overage config |
| `lib/billing/seat-activation.ts` | Seat activation |

### Security (`lib/security/`)

| File | Responsibility |
|---|---|
| `lib/security/api-error.ts` | API error handling |
| `lib/security/audit-export.ts` | Audit export |
| `lib/security/error-response.ts` | Error response |
| `lib/security/rate-limit.ts` | Rate limiting |
| `lib/security/safe-log.ts` | Safe logging |

### Agent Tooling (`lib/agent/`)

| File | Responsibility |
|---|---|
| `lib/agent/context.ts` | Agent context |
| `lib/agent/executor.ts` | Agent executor |
| `lib/agent/planner.ts` | Agent planner |
| `lib/agent/tools.ts` | Agent tools |

### Enterprise Proof (`lib/enterprise/`)

| File | Responsibility |
|---|---|
| `lib/enterprise/proof-access.ts` | Proof access control |
| `lib/enterprise/proof-public.ts` | Public proof |
| `lib/enterprise/proof-runtime.ts` | Runtime proof |
| `lib/enterprise/proof-types.ts` | Proof types |
| `lib/enterprise/proof.ts` | Proof core |

### Executors (`lib/executors/`)

| File | Responsibility |
|---|---|
| `lib/executors/index.ts` | Executor entry |
| `lib/executors/browserbase.ts` | Browserbase executor |
| `lib/executors/social.ts` | Social executor |
| `lib/executors/types.ts` | Executor types |

### Other Lib Files

| File | Responsibility |
|---|---|
| `lib/supabase/` | Supabase client |
| `lib/onboarding/bootstrap.ts` | Onboarding bootstrap |
| `lib/makk8/action-data.ts` | Makk8 action data |
| `lib/agent-auth.ts` | Agent auth |
| `lib/authz.ts` | Authorization |
| `lib/core-compat.ts` | Core compatibility |
| `lib/dsg-core.ts` | DSG core entry |
| `lib/integration-status.ts` | Integration status |
| `lib/resend.ts` | Email (Resend) |
| `lib/stripe-products.ts` | Stripe products |
| `lib/supabase-server.ts` | Supabase server client |

---

## 4) `components/` — UI Components

| File | Responsibility |
|---|---|
| `components/GlobalNav.tsx` | Global navigation |
| `components/AppShellClient.tsx` | App shell client UI |
| `components/LoginForm.tsx` | Login form |
| `components/audit/entropy-matrix.tsx` | Audit entropy matrix |
| `components/canvas/EntropyField.tsx` | Canvas entropy field |

---

## 5) `supabase/` — Database Schema & Migrations

| File | Responsibility |
|---|---|
| `supabase/schema.sql` | Full schema |
| `supabase/migrations/20260323053000_product_loop_scaffold.sql` | Product loop scaffold |
| `supabase/migrations/20260323054500_product_loop_rls.sql` | RLS policies |
| `supabase/migrations/20260323110000_billing_checkout_flow.sql` | Billing checkout |
| `supabase/migrations/20260323140000_schema_constraints_hardening.sql` | Schema hardening |
| `supabase/migrations/20260323141000_rls_policy_hardening.sql` | RLS hardening |
| `supabase/migrations/20260330_monitor_stats.sql` | Monitor stats |
| `supabase/migrations/20260331_runtime_spine.sql` | Runtime spine tables |
| `supabase/migrations/20260331_runtime_spine_rpc.sql` | Runtime spine RPC |
| `supabase/migrations/20260401093000_batch3_enterprise_identity_rollout.sql` | Enterprise identity |
| `supabase/migrations/20260401120000_enterprise_access_batch2.sql` | Enterprise access |
| `supabase/migrations/20260401_runtime_rbac.sql` | Runtime RBAC |
| `supabase/migrations/20260401_schema_policies_table.sql` | Policies table |
| `supabase/migrations/20260402_billing_quota_in_rpc.sql` | Billing quota RPC |
| `supabase/migrations/20260404_runtime_spine_rpc_hardening.sql` | Spine RPC hardening |

---

## 6) `scripts/` — Deployment & Ops

| File | Responsibility |
|---|---|
| `scripts/check-error-handlers.sh` | Error handler check |
| `scripts/go-no-go-gate.sh` | Launch go/no-go smoke gate |
| `scripts/verify-production-manifest.mjs` | Production route/file manifest gate |
| `scripts/stripe-setup.ts` | Stripe setup |
| `scripts/termux-deploy-all-in-one.sh` | Termux deploy |
| `apply-billing-checkout-flow.sh` | Apply billing migration |
| `apply-complete-audit-hotfix.sh` | Apply audit hotfix |
| `set-vercel-runtime-env.sh` | Set Vercel runtime env |
| `set-vercel-stripe-env.sh` | Set Vercel Stripe env |

---

## 7) `docs/` — Documentation

- `docs/OPERATOR_SETUP_CHECKLIST.md`
- `docs/PR_REVIEW_PACK_V1_RUNTIME_GAP_2026-03-31.md`
- `docs/REPO_TRUTH.md`
- `docs/RUNBOOK_DEPLOY.md`

---

## Summary

This is the complete production-ready inventory for `tdealer01-crypto-dsg-control-plane`, covering:

- **Auth & SSO** (magic-link, password, SSO, RBAC, JIT provisioning)
- **Spine Execution Engine** (intent → gate → ledger pipeline)
- **DSG Core** (internal + remote safety gate)
- **Agent Management** (CRUD, key rotation, tools, planner)
- **Billing** (Stripe checkout, overage, seat activation)
- **Enterprise Proof** (public + verified runtime proof)
- **Dashboard** (19 complete views)
- **API Routes** (health, readiness, runtime, governance, agent, audit, billing, policy, proof, and spine surfaces)
- **Database** (migrations + schema)
- **Security** (rate-limit, safe-log, error handling, CSP/security headers)

Latest validated baseline: **DSG Action Layer Gate: GO** after Vercel production build, runtime health/readiness, trust surface checks, and `scripts/go-no-go-gate.sh` all passed.
