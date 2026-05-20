# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Production announcement — 2026-05-20

DSG ONE ProofGate Control Plane is deployed on Vercel production and the runtime readiness endpoint is green.

| Checkpoint | Status | Evidence |
|---|---:|---|
| Production deployment | ✅ READY | Vercel deployment `dpl_JDnMy6savmpHyYi8chJohcwicbiK` reached `READY`. |
| Production commit | ✅ Verified | GitHub merge commit `29ae61224e26f725d3205bd90912aa961338202f` from PR `#561`. |
| Production alias | ✅ Active | `tdealer01-crypto-dsg-control-plane.vercel.app` is attached to the READY deployment. |
| Runtime readiness | ✅ PASS | `GET /api/readiness` returned HTTP `200` and `ok: true`. |
| Environment check | ✅ PASS | Runtime readiness reports `env`, `nextAuthSecret`, `supabaseServiceRole`, `dsgCoreConfig`, and `dsgCoreHealth` as `ok`. |
| Finance governance readiness | ✅ PASS | Runtime readiness reports `financeGovernanceSurface` and `financeGovernanceBackend` as `ok`. |
| Default Docker E2E boundary | ✅ Fixed | `npm run test:e2e` now runs only demo-safe specs, while staging-only auth/API-key/billing flows run through `npm run test:e2e:staging`. |
| Production health endpoint | ⚠️ Rate-limited by design | `/api/health` can return HTTP `429`; `/api/readiness` is the authoritative runtime readiness gate. |

### Operational status

```text
Production deploy: PASS
Runtime readiness: PASS
Supabase service role runtime check: PASS
Finance governance readiness: PASS
```

### Claim boundary

Allowed claim:

```text
DSG ONE ProofGate Control Plane is live on Vercel production with runtime readiness,
Supabase service-role configuration, DSG core health, and finance-governance readiness
verified through /api/readiness on 2026-05-20.
```

Disallowed claim:

```text
Certified, third-party audited, WORM-certified, externally Z3 production verified,
or end-to-end formally verified SaaS.
```

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
| `GET` | `/api/api-keys` | List organization API keys. |
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
| `GET` | `/api/readiness` | Authoritative production runtime readiness check. |

---

## Pages

| Path | Purpose |
|---|---|
| `/` | Homepage |
| `/eu-ai-act` | EU AI Act compliance landing page |
| `/proofgate` | ProofGate product story |
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

## GitHub workflows

| Workflow | Purpose |
|---|---|
| `E2E Pipeline` | Docker Playwright baseline and repository E2E checks. |
| `Production Readiness Check` | Runtime readiness, deployment health, and management-secret checks. |
| `Production Quality Gates` | Coverage, live DB required gate, and staging Playwright gate. |
| `DSG Secure Deploy Gate` | Secure deployment policy gate. |

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

---

## GitHub Marketplace action

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.0.2
```

Marketplace:

```text
https://github.com/marketplace/actions/dsg-secure-deploy-gate
```

---

## Supported claims

```text
✓ REST API gate endpoint is live.
✓ Production readiness endpoint is green on 2026-05-20.
✓ API key management uses scoped, revocable keys with server-side hashing.
✓ Runtime readiness confirms Supabase service-role configuration.
✓ Finance-governance readiness is green through /api/readiness.
✓ Deterministic proof/gate scaffold is present.
```

Not claimed:

```text
✗ Independent third-party audit or certification.
✗ WORM-certified audit storage.
✗ External Z3 solver verified in production end-to-end.
✗ Published public npm/PyPI SDK.
```
