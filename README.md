# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. It gates actions before execution, keeps org-scoped state in server-side storage, and records evidence for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## ✅ Production Cutover GO — verified 2026-06-02

**Decision:** `Production Cutover GO = PASS`

This README is the handoff page for the next operator. It is intentionally short and evidence-first. Older release notes remain in Git history and docs; this page records the current cutover truth.

### What is GO

The production cutover for the DSG Control Plane web app is GO for the current Vercel/Supabase deployment path.

Verified evidence:

| Gate | Result | Evidence |
|---|:---:|---|
| Repo merge | ✅ PASS | PR #650 merged into `main` at `2026-06-01T17:08:11Z` |
| Merge commit | ✅ PASS | `9da5a07f8058352cbe1905d36d4388029e067f2c` |
| Vercel deployment | ✅ PASS | Deployment `dpl_EyV4MeuQZceP58myseHaeJMK3ZLB` is `READY`, target `production` |
| Production health | ✅ PASS | `GET /api/health` returned HTTP 200, `ok:true`, `core_ok:true`, `db_ok:true` |
| Production readiness | ✅ PASS | `GET /api/readiness` returned HTTP 200, `ok:true`, all checks true |
| Supabase state | ✅ PASS | Project `zeyguilldygozufpgxms` is active; required RLS tables exist with rows |
| Browser source-of-truth blocker | ✅ PASS | `lib/dsg/brain/ui/session-storage.ts` no longer uses browser `localStorage` / `sessionStorage` |
| Deterministic proof readiness | ✅ PASS | PR #650 derives `productionReadyClaim` from proof evidence and keeps external/compliance claims false |
| Production manifest | ✅ PASS | PR #650 evidence records `npm run verify:production-manifest` passed with 187 paths |

### Live endpoint proof

Current verified live responses:

```text
GET /api/health
HTTP 200
ok: true
core_ok: true
db_ok: true
rateLimiter.ok: true
readiness.env.ok: true
readiness.nextAuthSecret.ok: true
readiness.supabaseServiceRole.ok: true
readiness.dsgCoreConfig.ok: true
readiness.dsgCoreHealth.ok: true
readiness.financeGovernanceSurface.ok: true
readiness.financeGovernanceBackend.ok: true

GET /api/readiness
HTTP 200
ok: true
checks.env.ok: true
checks.nextAuthSecret.ok: true
checks.supabaseServiceRole.ok: true
checks.dsgCoreConfig.ok: true
checks.dsgCoreHealth.ok: true
checks.financeGovernanceSurface.ok: true
checks.financeGovernanceBackend.ok: true

GET /api/agent/status
HTTP 200
ok: true
env: production
checks.db: true
```

> Note: `/api/agent/status` reported an older version string during verification. For this cutover, use the combined evidence from PR #650 merge metadata, Vercel deployment metadata, `/api/health`, `/api/readiness`, and Supabase state.

### Supabase proof

Observed through Supabase API:

```text
Project: dsg-control-plane-dev
Project ref: zeyguilldygozufpgxms
Status: ACTIVE_HEALTHY
Region: ap-southeast-2
Postgres: 17.6.1
```

Required state tables observed with RLS enabled:

```text
public.org_onboarding_states
public.audit_logs
public.dsg_agent_command_gate_decisions
public.dsg_agent_action_result_receipts
public.finance_governance_audit_ledger
public.finance_workflow_action_events
public.finance_transactions
public.finance_approval_requests
public.finance_approval_decisions
```

### DSG Brain browser-storage blocker closed

`lib/dsg/brain/ui/session-storage.ts` now uses transient module memory only:

```ts
const sessions = new Map<string, SessionData>();
let currentConfig: DsgBrainConfig | null = null;
```

The old browser-backed `window.localStorage` implementation was removed. This closes the G2 blocker for DSG Brain session/config state.

### CI / follow-up signal

For PR head commit `13f1d8f6682a8b2af778a39cfe6429a5e4c5bd50`, GitHub Actions showed:

| Check | Result |
|---|:---:|
| launch-readiness | ✅ success |
| E2E (Playwright Docker) | ✅ success |
| ccvs-evidence | ✅ success |
| DSG Secure Deploy Gate | ✅ success |
| CI Security Checks | ❌ failure at `npm audit` |

**Interpretation:**

- The operational production cutover is **GO**.
- Do **not** claim "all CI checks green."
- Treat the `npm audit` failure as a follow-up hardening item until resolved or separately risk-accepted.

---

## Scope boundary — do not overclaim

The GO above is a production cutover GO for the current control-plane deployment.

**Not claimed:**

- external Z3 production solver invocation
- independent third-party audit
- WORM-certified evidence storage
- JWT/JWKS complete
- marketplace/platform approval
- enterprise certification
- all CI checks green

**Permanent truth boundaries remain:**

- Deterministic proof/gate is a DSG-native TypeScript static-check scaffold unless a newer verified source proves otherwise.
- `certificationClaim = false`.
- `independentAuditClaim = false`.
- Evidence must come from repo files, Vercel deployment state, Supabase state, live endpoint responses, or recorded CI output.

---

## Current operator handoff

New operator should start here:

**1. Confirm latest merge:**

```bash
git log --oneline -5
```

Expected merge evidence includes:

```text
9da5a07 Add production GO cutover evidence gate (#650)
```

**2. Confirm live production:**

```bash
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness
```

**3. Confirm no DSG Brain browser storage regression:**

```bash
grep -R "localStorage\|sessionStorage" -n lib/dsg/brain/ui app components lib --exclude-dir=node_modules
```

**4. Confirm deterministic module and manifest:**

```bash
npm run verify:deterministic
npm run verify:production-manifest
```

**5. Resolve hardening follow-up:**

```bash
npm audit --audit-level=high
```

---

## Product identity

DSG ONE / ProofGate Control Plane is an AI action governance gateway:

```text
User goal → policy/risk gate → approval/evidence → deterministic proof → controlled execution → audit/replay evidence
```

Primary production surfaces:

```text
GET  /api/health
GET  /api/readiness
GET  /api/agent/status
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/gates/evaluate
POST /api/dsg/v1/proofs/prove
```

Operator-facing routes such as `/api/usage`, `/api/executions`, `/api/audit`, `/api/policies`, and `/api/agent-chat` must be evaluated with authenticated, org-scoped access.

---

## Verification commands

```bash
npm run typecheck
npm run test
npm run verify:deterministic
npm run build
npm run verify:production-manifest
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

> **Termux note:** full `npm ci` may fail on Android arm64 because the `supabase` npm package postinstall does not support that platform. Use GitHub Actions/Linux CI for full verification.
