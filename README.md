# DSG ONE — ProofGate Control Plane

> Block before the AI agent acts — not after the damage is done.

DSG ONE is a runtime governance layer for AI agents. It gates actions before execution, keeps org-scoped state in server-side storage, and records evidence for regulated AI-agent operations.

Production URL: https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## Production Cutover GO — verified 2026-06-02

Decision: Production Cutover GO = PASS.

Scope: DSG Control Plane production cutover for the current Vercel/Supabase deployment path.

Verified evidence:

| Gate | Result | Evidence |
|---|:---:|---|
| Repo merge | PASS | PR #650 merged into main at 2026-06-01T17:08:11Z |
| Merge commit | PASS | 9da5a07f8058352cbe1905d36d4388029e067f2c |
| Vercel deployment | PASS | dpl_EyV4MeuQZceP58myseHaeJMK3ZLB is READY, target production |
| Production health | PASS | GET /api/health returned HTTP 200, ok:true, core_ok:true, db_ok:true |
| Production readiness | PASS | GET /api/readiness returned HTTP 200, ok:true, all checks true |
| Supabase state | PASS | Project zeyguilldygozufpgxms active; required RLS tables exist with rows |
| Browser source-of-truth blocker | PASS | lib/dsg/brain/ui/session-storage.ts no longer uses browser localStorage/sessionStorage |
| Deterministic proof readiness | PASS | PR #650 derives productionReadyClaim from proof evidence and keeps external/compliance claims false |

Live endpoint proof:

- GET /api/health: HTTP 200, ok:true, core_ok:true, db_ok:true.
- GET /api/readiness: HTTP 200, ok:true, env/secret/core/finance checks true.
- GET /api/agent/status: HTTP 200, ok:true, env:production, checks.db:true.

Supabase proof observed through API:

- Project: dsg-control-plane-dev.
- Project ref: zeyguilldygozufpgxms.
- Status: ACTIVE_HEALTHY.
- Region: ap-southeast-2.
- Postgres: 17.6.1.
- Required RLS tables observed: public.org_onboarding_states, public.audit_logs, public.dsg_agent_command_gate_decisions, public.dsg_agent_action_result_receipts, finance governance tables.

CI signal for commit 13f1d8f6682a8b2af778a39cfe6429a5e4c5bd50:

- launch-readiness: success.
- E2E (Playwright Docker): success.
- ccvs-evidence: success.
- DSG Secure Deploy Gate: success.
- CI Security Checks: failure at npm audit.

Interpretation:

- Operational production cutover is GO.
- Do not claim all CI checks green.
- Treat npm audit as follow-up security hardening until resolved or separately risk-accepted.

---

## Scope boundary — do not overclaim

Not claimed:

- external Z3 production solver invocation
- independent third-party audit
- WORM-certified evidence storage
- JWT/JWKS complete
- marketplace/platform approval
- enterprise certification
- all CI checks green

Permanent truth boundaries:

- Deterministic proof/gate remains a DSG-native TypeScript static-check scaffold unless a newer verified source proves otherwise.
- certificationClaim = false.
- independentAuditClaim = false.
- Evidence must come from repo files, Vercel deployment state, Supabase state, live endpoint responses, or recorded CI output.

---

## Operator quick check

Run:

    curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
    curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness
    grep -R "localStorage\|sessionStorage" -n lib/dsg/brain/ui app components lib --exclude-dir=node_modules
    npm run verify:deterministic
    npm run verify:production-manifest

Termux note: full npm ci may fail on Android arm64 because the supabase npm package postinstall does not support that platform. Use GitHub Actions/Linux CI for full verification.

---

## Product identity

DSG ONE / ProofGate Control Plane is an AI action governance gateway:

    User goal -> policy/risk gate -> approval/evidence -> deterministic proof -> controlled execution -> audit/replay evidence

Primary production surfaces:

- GET /api/health
- GET /api/readiness
- GET /api/agent/status
- GET /api/dsg/v1/policies/manifest
- POST /api/dsg/v1/gates/evaluate
- POST /api/dsg/v1/proofs/prove

Operator-facing routes such as /api/usage, /api/executions, /api/audit, /api/policies, and /api/agent-chat must be evaluated with authenticated, org-scoped access.
