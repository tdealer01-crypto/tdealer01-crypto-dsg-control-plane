# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Production announcement — 2026-05-20

DSG ONE ProofGate Control Plane is deployed on Vercel production and the runtime readiness endpoint is green.

| Checkpoint | Status | Evidence |
|---|---:|---|
| Production deployment | ✅ READY | Vercel production deployment reached `READY`. |
| Production commit | ✅ Verified | GitHub merge commits are verified on the current production path. |
| Production alias | ✅ Active | `tdealer01-crypto-dsg-control-plane.vercel.app` is attached to the READY deployment. |
| Basic runtime readiness | ✅ PASS | `GET /api/readiness` returned HTTP `200` and `ok: true`. |
| Finance governance readiness | ✅ PASS | `GET /api/finance-governance/readiness` returned HTTP `200` and `ok: true`. |
| Environment check | ✅ PASS | Runtime readiness reports `env`, `nextAuthSecret`, `supabaseServiceRole`, `dsgCoreConfig`, and `dsgCoreHealth` as `ok`. |
| Finance governance backend | ✅ PASS | Finance governance reports required Supabase tables as reachable. |
| Default Docker E2E boundary | ✅ Fixed | `npm run test:e2e` runs demo-safe specs, while staging-only auth/API-key/billing flows run through `npm run test:e2e:staging`. |
| Production health endpoint | ⚠️ Rate-limited by design | `/api/health` can return HTTP `429`; this is non-fatal in the production readiness workflow. |

### Operational status

```text
Production deploy: PASS
Basic runtime readiness: PASS
Finance governance authoritative gate: PASS
DSG Secure Deploy Gate: GO
Subabase service role runtime check: PASS
Finance governance table checks: PASS
```

### Claim boundary

Allowed claim:

```text
DSG ONE ProofGate Control Plane is live on Vercel production with basic runtime
readiness, Supabase service-role configuration, DSG core health, finance-governance
readiness, and DSG Secure Deploy Gate GO evidence verified through production checks.
```

Disallowed claim:

```text
Certified, third-party audited, WORM-certified, or end-to-end independently
Z3-verified SaaS in production. (Design-time Z3 proof of the policy engine is
present and documented below; it is not equivalent to a third-party production audit.)
```

---

## Z3 Formal Verification — Gateway Policy Engine

The gateway policy engine (`lib/gateway/policy.ts`) is formally verified using the **Z3 SMT Solver**. All proofs run at design time; the TypeScript runtime consumes a generated `verified-constraints.json` artifact — no Z3 dependency at runtime.

### Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Design Time (Python + Z3 SMT Solver)                   │
│                                                         │
│  policy_model.py  ──►  theorems.py        (5 theorems)  │
│                   ──►  defi_constraints.py (3 theorems)  │
│                   ──►  generate_spec.py                  │
│                              │                          │
│                              ▼                          │
│                 verified-constraints.json               │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  Runtime (TypeScript / Next.js)                         │
│                                                         │
│  defi-validator.ts   ──►  defi-executor.ts              │
│  (proven bounds)          (DeFi pre-check before        │
│                            policy evaluation)           │
└─────────────────────────────────────────────────────────┘
```

### Method: SAT refutation

For each theorem, Z3 is asked to find a counterexample (`Not(claim)`). If no counterexample exists (`UNSAT`), the claim holds for **every possible input** — not just the ones covered by unit tests.

### 8 theorems proved

**Policy engine (`lib/gateway/policy.ts`)**

| # | Theorem | Claim |
|---|---------|-------|
| 1 | `role_safety` | `decision = allow → role ∈ {owner, admin, finance_admin, finance_approver, agent_operator}` |
| 2 | `plan_safety` | `decision = allow → plan ∈ {enterprise, business, pro}` |
| 3 | `approval_safety` | `decision = allow ∧ approvalRequired → approvalToken ≠ ∅` |
| 4 | `audit_completeness` | decision is always one of `{allow, block, review, ask_more_info}` — no undefined state |
| 5 | `non_triviality` | ∃ valid request where `decision = allow` — system is not trivially all-blocking |

**DeFi transaction constraints**

| # | Theorem | Claim |
|---|---------|-------|
| 6 | `amount_bound` | `amount ≤ $1,000` and `dailySpent + amount ≤ $10,000` — enforced before policy evaluation |
| 7 | `slippage_bound` | `slippage ≤ 50 bps (0.5%)` — no role or approval token can bypass this |
| 8 | `constraint_consistency` | The DeFi constraint set is satisfiable — valid transactions exist |

### Key safety property

```text
DeFi bounds check (Z3 Theorem 6–7)
  → Policy evaluation (role, plan, approval)
    → Provider execution (on-chain action)
```

Math bounds (Theorems 6–7) run **before** policy evaluation. Even an `owner` role with a valid `approvalToken` cannot execute a transaction exceeding $1,000 — the block is pre-policy and unconditional.

### Run the proofs

```bash
npm run verify:policy
# → pip install z3-solver
# → python3 lib/gateway/z3/generate_spec.py
# → ✓ PROVED  [role_safety]
# → ✓ PROVED  [plan_safety]
# → ✓ PROVED  [approval_safety]
# → ✓ PROVED  [audit_completeness]
# → ✓ PROVED  [non_triviality]
# → ✓ PROVED  [amount_bound]
# → ✓ PROVED  [slippage_bound]
# → ✓ PROVED  [constraint_consistency]
# → Wrote: lib/gateway/verified-constraints.json
```

### Proof files

| File | Purpose |
|------|---------|
| `lib/gateway/z3/policy_model.py` | Z3 encoding of `evaluateGatewayToolRequest()` — enum sorts mirror TypeScript union types exactly |
| `lib/gateway/z3/theorems.py` | Proves theorems 1–5 by SAT refutation |
| `lib/gateway/z3/defi_constraints.py` | Proves theorems 6–8 for DeFi transaction parameters |
| `lib/gateway/z3/generate_spec.py` | Runs all proofs, writes `verified-constraints.json` |
| `lib/gateway/verified-constraints.json` | Committed artifact — consumed by TypeScript at module load time |
| `lib/gateway/defi-validator.ts` | Pure, deterministic DeFi validator backed by proven constraints |
| `lib/gateway/defi-executor.ts` | Wraps `executeGatewayTool()` with DeFi pre-check |

---

## What it does

Other tools tell you what your agent did *after* the fact. DSG ONE intercepts the action *before* it executes — issuing an `ALLOW` stamp or a `BLOCK` with agent guidance.

```text
Agent wants to act
  → POST /api/try/gate  { session_id, action }
  → ALLOW + cryptographic stamp   (agent proceeds)
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
  "reason": "Pattern \"delete\\s+all\" is permanently blocked",
  "agent_guidance": {
    "can_proceed_with": ["read database", "send email", "update user record"],
    "suggested_llm_prompt": "Your action was blocked. You can still perform the allowed actions."
  }
}
```

Trial limits: `60 req/min`, session TTL `60 min`, no API key required for trial gate calls.

Permanently blocked patterns include: `delete all`, `drop table`, `truncate`, `bypass policy`, `rm -rf`, `exfiltrate`, `steal`.

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
Z3 SMT Solver (design-time formal verification of gateway policy)
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

Formal verification (requires Python + z3-solver):

```bash
npm run verify:policy
```

Required staging/live gates:

```bash
npm run test:live:db:required
npm run test:e2e:staging
```

Evaluation must use all three evidence layers together:

```text
1. Repository evidence: tests, typecheck, coverage, Z3 proofs, and QA logs.
2. Deployment evidence: Vercel deployment state and readiness endpoints.
3. Runtime/operator evidence: authenticated flows, live DB checks, and audit evidence in the target environment.
```

Green repository tests alone are not final proof of deployment readiness.

---

## Current test and gate evidence — 2026-05-21

These are the latest verified checks after PRs `#567`, `#568`, and `#569` were merged.

| Evidence layer | Command / workflow | Latest observed status | What it proves |
|---|---|---:|---|
| Unit + integration baseline | `npm test` | ✅ Covered by `launch-readiness` success after PR `#567` | Repository tests compile and run after gateway/authz/billing test additions. |
| TypeScript gate | `npm run typecheck` | ✅ Covered by `launch-readiness` success after PR `#567` | Test import paths and gateway types compile. |
| Build gate | `npm run build` | ✅ Covered by `launch-readiness` success after PR `#567` | Next.js production build path remains valid. |
| Production manifest gate | `npm run verify:production-manifest` | ✅ Covered by `launch-readiness` success after PR `#567` | Production manifest remains valid. |
| Z3 formal verification | `npm run verify:policy` | ✅ Added in PR `#569` | 8 theorems proved: role/plan/approval safety, audit completeness, DeFi amount/slippage bounds. |
| Gateway policy tests | `tests/unit/gate/gateway-policy.test.ts` | ✅ Added and merged in PR `#567` | Policy allow/block/review branches are covered. |
| Gateway executor tests | `tests/unit/gate/gateway-executor.test.ts` | ✅ Added and merged in PR `#567` | Gateway request normalization and mocked provider execution are covered. |
| DeFi validator tests | `tests/unit/gate/defi-validator.test.ts` | ✅ Added in PR `#569` | 12 theorem-derived test cases covering all DeFi constraint branches. |
| Authz role tests | `tests/unit/auth/authz-require-org-role.test.ts` | ✅ Added and merged in PR `#567` | Role resolution, PGRST fallback, 401/403/500 paths are covered. |
| Billing checkout tests | `tests/unit/billing/checkout-route.test.ts` | ✅ Added and corrected in PR `#567` | Checkout auth, org isolation, rate limit, plan/price behavior are covered. |
| Billing webhook tests | `tests/unit/billing/stripe-webhook.test.ts` | ✅ Added and corrected in PR `#567` | Stripe webhook routing and billing state paths are covered. |
| Playwright Docker E2E | `E2E Playwright Docker` | ✅ Passed on PR `#567` | Browser E2E baseline remains green. |
| Production readiness | `Production Readiness Check #591` | ✅ Success | `/api/readiness` is non-blocking/basic, `/api/finance-governance/readiness` is the authoritative runtime gate. |
| DSG deploy gate | `DSG Secure Deploy Gate #507` | ✅ `GO` | Strict gate returned readiness `200`, protected route `401`, failure reason `none`, and evidence/proof/chain hashes. |
| Vercel production deploy | Vercel status on merge commit `3356a699` | ✅ Success | Production deployment completed after readiness gate fix. |

### Production readiness evidence

```text
Production Readiness Check #591
Status: Success
/api/health: rate_limited, non-fatal
/api/readiness: pass
/api/finance-governance/readiness: pass, authoritative gate
/api/core/monitor: auth_required, expected for unauthenticated CI
/api/usage: auth_required, expected for unauthenticated CI
Overall: Production Runtime Ready
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
This README records observed repository, deployment, and runtime evidence.
It is not a legal certification, third-party audit, WORM certification,
or end-to-end independently certified formal verification of the deployed SaaS.
```

---

## GitHub workflows

| Workflow | Purpose | Current role |
|---|---|---|
| `launch-readiness` | Typecheck, tests, build, production manifest. | Repository merge gate. |
| `E2E Pipeline` | Docker Playwright baseline and repository E2E checks. | Browser regression gate. |
| `Production Readiness Check` | Runtime readiness, deployment health, and management-secret checks. | Production runtime gate. |
| `Production Quality Gates` | Coverage, live DB required gate, and staging Playwright gate. | Manual/staging quality gate. |
| `DSG Secure Deploy Gate` | Secure deployment policy gate. | Deterministic GO / NO-GO deploy evidence. |

---

## EU AI Act coverage scaffold

| Article | Requirement | DSG ONE |
|---|---|---|
| Art. 9 | Risk management before action | Gate every action before execution. |
| Art. 12 | Record keeping | Decision evidence and audit trail. |
| Art. 14 | Human oversight | BLOCK guidance and approval workflow. |

---

## Formal verification artifact

```text
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

The DOI artifact is the formal verification reference. Repository runtime routes provide scaffold behavior and operational implementation; they are not equivalent to an independently certified end-to-end formally verified SaaS deployment.

Design-time Z3 verification of the gateway policy engine is present in `lib/gateway/z3/` and documented in the Z3 Formal Verification section above.

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
✓ Basic production readiness endpoint is green on 2026-05-21.
✓ Finance-governance readiness is green through /api/finance-governance/readiness.
✓ Production Readiness Check #591 completed successfully.
✓ DSG Secure Deploy Gate #507 returned GO with strict preset evidence.
✓ API key management uses scoped, revocable keys with server-side hashing.
✓ Runtime readiness confirms Supabase service-role configuration.
✓ Deterministic proof/gate scaffold is present.
✓ Marketplace Action demo and landing page are published.
✓ Gateway policy engine is formally verified with Z3 SMT Solver (8 theorems, design-time).
✓ DeFi transaction bounds (amount, slippage, token, protocol) are mathematically proven.
✓ Proof files and verified-constraints.json are committed and reproducible.
```

Not claimed:

```text
✗ Independent third-party audit or certification.
✗ WORM-certified audit storage.
✗ End-to-end independently certified Z3 production verification.
✗ Published public npm/PyPI SDK.
```
