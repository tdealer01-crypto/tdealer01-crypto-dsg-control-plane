# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a deterministic decision-evidence trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Observed deployment and gate evidence — 2026-05-21

This section records evidence from specific GitHub Actions and deployment checks that already ran successfully. It is not a certification, a full production-readiness guarantee, a third-party audit, a KUB mainnet deployment claim, or a user/TVL/DAU metrics claim.

| Checkpoint | Status | Evidence boundary |
|---|---:|---|
| Observed Vercel deployment | ✅ Observed | Vercel deployment evidence was recorded for the referenced production path. |
| Production commit path | ✅ Observed | GitHub merge commits were recorded on the current production path. |
| Production alias | ✅ Observed | `tdealer01-crypto-dsg-control-plane.vercel.app` was attached to the observed deployment. |
| Basic runtime readiness | ✅ Observed | `GET /api/readiness` returned HTTP `200` and `ok: true`; after PR `#569`, this endpoint is informational/non-authoritative for deploy gating. |
| Finance governance readiness | ✅ Authoritative gate observed | `GET /api/finance-governance/readiness` returned HTTP `200` and `ok: true` in the recorded readiness run. |
| Environment check | ✅ Observed | Runtime readiness reported `env`, `nextAuthSecret`, `supabaseServiceRole`, `dsgCoreConfig`, and `dsgCoreHealth` as `ok`. |
| Finance governance backend | ✅ Observed | Finance governance readiness reported required Supabase tables as reachable. |
| Default Docker E2E boundary | ✅ Fixed | `npm run test:e2e` runs demo-safe specs, while staging-only auth/API-key/billing flows run through `npm run test:e2e:staging`. |
| Production health endpoint | ⚠️ Rate-limited by design | `/api/health` can return HTTP `429`; this is non-fatal in the production readiness workflow. |

### Observed workflow status

```text
Observed Vercel deployment evidence: PASS
Basic runtime readiness: PASS / informational
Finance governance authoritative gate: PASS
DSG Secure Deploy Gate: GO
Supabase service role runtime check: PASS
Finance governance table checks: PASS
```

### Claim boundary

Allowed claim:

```text
DSG ONE ProofGate Control Plane has observed Vercel deployment evidence, basic
runtime readiness evidence, Supabase service-role configuration evidence, DSG core
health evidence, finance-governance readiness evidence, and DSG Secure Deploy Gate
GO evidence from the recorded workflow runs.
```

Disallowed claim:

```text
Full production-ready certification, independent third-party audit, WORM-certified
audit storage, external Z3 production-solver verification, end-to-end formally
verified SaaS deployment, KUB mainnet deployment, TVL, DAU, wallet, user, or
transaction metrics.
```

---

## What it does

Other tools tell you what your agent did *after* the fact. DSG ONE intercepts the action *before* it executes — issuing an `ALLOW` stamp or a `BLOCK` with agent guidance.

```text
Agent wants to act
  → POST /api/try/gate  { session_id, action }
  → ALLOW + deterministic stamp   (agent proceeds)
  → BLOCK + suggested_llm_prompt  (agent self-corrects)
```

Every decision is recorded with deterministic evidence. No rebuild of an existing stack is required for REST API integration.

---

## Customer journey

```text
/eu-ai-act          compliance landing page
/signup            email + workspace name → magic link
/auth/confirm      creates org + trial context
/dashboard/welcome onboarding
/dashboard/api-keys create scoped API key, shown once and hashed server-side
/quickstart        REST API guide
/api/try/gate      live public trial gate endpoint
/api/execute       protected execution entry
```

---

## REST API — no SDK required

### Step 1 — Declare your session

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "my-agent-run-001",
    "declared_actions": ["read database", "send email", "update user record"],
    "ttl_minutes": 30
  }'
```

### Step 2 — Gate every action

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "my-agent-run-001", "action": "send email to user@example.com"}'
```

Example `ALLOW` response:

```json
{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com",
  "session_state": {
    "stamps_issued": 1,
    "blocked_count": 0,
    "ttl_remaining_min": 29
  }
}
```

Example `BLOCK` response:

```json
{
  "decision": "BLOCK",
  "reason": "Action violates a high-risk policy pattern",
  "agent_guidance": {
    "can_proceed_with": ["read database", "send email", "update user record"],
    "suggested_llm_prompt": "Your action was blocked. You can still perform the allowed actions."
  }
}
```

Trial limits: `60 req/min`, session TTL `60 min`, no API key required for trial gate calls.

The trial gate includes permanently blocked high-risk policy patterns. The exact pattern list should be reviewed in source code, not copied into public grant or marketing claims.

---

## API routes

### Public trial gate

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/try/gate` | Declare a session or gate an action without an API key. |

### API keys

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/api-keys` | List organization API keys. Requires authentication and returns `401`/`403` for anonymous requests. |
| `POST` | `/api/api-keys` | Create an API key. The raw key is returned once. |
| `DELETE` | `/api/api-keys/:id` | Revoke an API key. |

### Agents and execution

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/agents` | List or create agents. |
| `POST` | `/api/execute` | Protected execution entry. |
| `POST` | `/api/dsg/v1/gates/evaluate` | Deterministic gate evaluation. |
| `POST` | `/api/dsg/v1/proofs/prove` | Generate deterministic proof scaffold. |
| `GET` | `/api/dsg/v1/policies/manifest` | Fetch policy manifest. |
| `GET` | `/api/readiness` | Basic production runtime readiness check. Network probes are reported but are not the authoritative deployment gate. |
| `GET` | `/api/finance-governance/readiness` | Authoritative finance-governance readiness gate for production deployment. |

---

## Pages

| Path | Purpose |
|---|---|
| `/` | Homepage |
| `/eu-ai-act` | EU AI Act compliance landing page |
| `/proofgate` | ProofGate product story |
| `/proofgate-github-action` | GitHub Marketplace Action landing page |
| `/enterprise-ready` | Enterprise setup page |
| `/finance-governance` | Payment and finance controls |
| `/automation` | Webhook and workflow automation |
| `/ai-compliance` | ISO 42001 and NIST AI RMF positioning |
| `/pricing` | Trial, Pro, Business, and Enterprise tiers |
| `/quickstart` | REST API integration guide |
| `/docs` | API endpoint reference |
| `/signup` | Trial signup |
| `/login` | Magic link and password login |
| `/dashboard/welcome` | Post-signup onboarding |
| `/dashboard/api-keys` | Create and revoke scoped API keys |
| `/dashboard/integrations` | Integration setup guide |
| `/dashboard` | Command center |
| `/admin/leads` | Founder-only lead pipeline view |
| `/unsubscribe` | Email opt-out route |

---

## Tech stack

```text
Next.js 15 App Router
React 18
TypeScript
Supabase auth + Postgres + service role
Stripe billing webhooks
Vercel deployment + crons
Vitest unit/integration tests
Playwright E2E tests
GitHub Actions production gates
DSG Secure Deploy Gate
```

---

## Local development

```bash
npm install --ignore-scripts
cp .env.example .env.local
npm run dev
```

Open: `http://localhost:3000`

Required local environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
CRON_SECRET=
GITHUB_TOKEN=
FOUNDER_EMAIL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Pull from Vercel when linked:

```bash
vercel env pull .env.local
```

---

## Verification commands

```bash
npm run typecheck
npm test
npm run test:unit
npm run test:integration
npm run test:migrations
npm run test:coverage
npm run test:e2e
```

Required staging/live gates:

```bash
npm run test:live:db:required
npm run test:e2e:staging
```

Evaluation must use all three evidence layers together:

```text
1. Repository evidence: tests, typecheck, coverage, and QA logs.
2. Deployment evidence: Vercel deployment state and readiness endpoints.
3. Runtime/operator evidence: authenticated flows, live DB checks, and audit evidence in the target environment.
```

Green repository tests alone are not final proof of deployment readiness.

---

## Current test and gate evidence — 2026-05-21

These are the recorded checks after PRs `#567`, `#568`, and `#569` were merged. They are workflow evidence from successful runs, not a certification and not a reason to rerun the same gates solely to reproduce this README evidence.

| Evidence layer | Command / workflow | Latest observed status | What it supports |
|---|---|---:|---|
| Unit + integration baseline | `npm test` | ✅ Covered by `launch-readiness` success after PR `#567` | Repository tests compile and run after gateway/authz/billing test additions. |
| TypeScript gate | `npm run typecheck` | ✅ Covered by `launch-readiness` success after PR `#567` | Test import paths and gateway types compile. |
| Build gate | `npm run build` | ✅ Covered by `launch-readiness` success after PR `#567` | Next.js build path remains valid for the checked commit. |
| Production manifest gate | `npm run verify:production-manifest` | ✅ Covered by `launch-readiness` success after PR `#567` | Production manifest remains valid for the checked commit. |
| Gateway policy tests | `tests/unit/gate/gateway-policy.test.ts` | ✅ Added and merged in PR `#567` | Policy allow/block/review branches are covered. |
| Gateway executor tests | `tests/unit/gate/gateway-executor.test.ts` | ✅ Added and merged in PR `#567` | Gateway request normalization and mocked provider execution are covered. |
| Authz role tests | `tests/unit/auth/authz-require-org-role.test.ts` | ✅ Added and merged in PR `#567` | Role resolution, PGRST fallback, 401/403/500 paths are covered. |
| Billing checkout tests | `tests/unit/billing/checkout-route.test.ts` | ✅ Added and corrected in PR `#567` | Checkout auth, org isolation, rate limit, plan/price behavior are covered. |
| Billing webhook tests | `tests/unit/billing/stripe-webhook.test.ts` | ✅ Added and corrected in PR `#567` | Stripe webhook routing and billing state paths are covered. |
| Playwright Docker E2E | `E2E Playwright Docker` | ✅ Passed on PR `#567` | Browser E2E baseline remains green for the checked workflow run. |
| Production readiness | `Production Readiness Check #591` | ✅ Success | Observed runtime checks passed; `/api/readiness` is non-blocking/basic, and `/api/finance-governance/readiness` is the authoritative runtime gate. |
| DSG deploy gate | `DSG Secure Deploy Gate #507` | ✅ `GO` | Strict gate returned readiness `200`, protected route `401`, failure reason `none`, and evidence/proof/chain hashes. |
| Vercel deployment evidence | Vercel status on merge commit `3356a699` | ✅ Observed success | Deployment evidence was recorded after the readiness gate fix. |

### Production readiness evidence

```text
Production Readiness Check #591
Status: Success
/api/health: rate_limited, non-fatal
/api/readiness: pass, informational/non-authoritative
/api/finance-governance/readiness: pass, authoritative gate
/api/core/monitor: auth_required, expected for unauthenticated CI
/api/usage: auth_required, expected for unauthenticated CI
Overall observed workflow result: Success
```

### DSG Secure Deploy Gate evidence

```text
DSG Secure Deploy Gate #507
Status: Success
Verdict: GO
Preset: strict
Readiness status: 200
Protected status: 401
Failure reason: none
Evidence hash: present
Proof hash: present
Chain hash: present
```

### Test coverage improvement from PR #567

PR `#567` added and fixed tests for the areas that were highest risk after the earlier coverage review:

```text
gateway policy evaluation
gateway executor normalization and provider execution
authz org-role enforcement
API key and organization access boundaries
billing checkout and Stripe webhook paths
middleware and route-level security behavior
```

### Evidence boundary

```text
This README records observed repository, deployment, and runtime workflow evidence.
It is not a legal certification, third-party audit, WORM certification, KUB mainnet
evidence, user/TVL/DAU evidence, or complete formal verification of the deployed SaaS.
```

---

## GitHub workflows

| Workflow | Purpose | Current role |
|---|---|---|
| `launch-readiness` | Typecheck, tests, build, production manifest. | Repository merge gate. |
| `E2E Pipeline` | Docker Playwright baseline and repository E2E checks. | Browser regression gate. |
| `Production Readiness Check` | Runtime readiness, deployment health, and management-secret checks. | Runtime workflow evidence gate. |
| `Production Quality Gates` | Coverage, live DB required gate, and staging Playwright gate. | Manual/staging quality gate. |
| `DSG Secure Deploy Gate` | Secure deployment policy gate. | Deterministic GO / NO-GO deploy evidence. |

---

## EU AI Act coverage scaffold

| Article | Requirement | DSG ONE |
|---|---|---|
| Art. 9 | Risk management before action | Gate every action before execution. |
| Art. 12 | Record keeping | Decision evidence and audit trail scaffold. |
| Art. 14 | Human oversight | BLOCK guidance and approval workflow. |

---

## Formal verification artifact

```text
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

The DOI artifact is the formal verification reference. Repository runtime routes provide scaffold behavior and operational implementation; they are not equivalent to an independently certified end-to-end formally verified SaaS deployment or an external Z3 production-solver verification claim.

---

## GitHub Marketplace action

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1
```

Marketplace:

```text
https://github.com/marketplace/actions/dsg-secure-deploy-gate
```

Demo repo:

```text
https://github.com/tdealer01-crypto/dsg-gate-demo-nextjs
```

Landing page:

```text
https://tdealer01-crypto-dsg-control-plane.vercel.app/proofgate-github-action
```

---

## Supported claims

```text
✓ REST API gate endpoint is live.
✓ Production Readiness Check #591 completed successfully.
✓ Production Readiness Check #591 observed /api/readiness pass as informational/non-authoritative.
✓ Finance-governance readiness passed through /api/finance-governance/readiness as the authoritative gate.
✓ DSG Secure Deploy Gate #507 returned GO with strict preset evidence.
✓ API key management uses scoped, revocable keys with server-side hashing.
✓ Runtime readiness confirms Supabase service-role configuration in the observed run.
✓ Deterministic proof/gate scaffold is present.
✓ Marketplace Action demo and landing page are published.
```

Not claimed:

```text
✗ Full production-ready certification.
✗ Independent third-party audit or certification.
✗ WORM-certified audit storage.
✗ External Z3 solver verified in production end-to-end.
✗ KUB mainnet deployment.
✗ TVL, DAU, wallet, user, partner, or transaction metrics.
✗ Published public npm/PyPI SDK.
```
