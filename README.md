# DSG ONE — ProofGate Control Plane

**Runtime governance for AI agents. Gate every action before execution. Keep a verifiable evidence trail.**

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18225586.svg)](https://doi.org/10.5281/zenodo.18225586)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-1%2C975%2B%20passing-brightgreen)](#verification)
[![Compliance](https://img.shields.io/badge/EU%20AI%20Act-Annex%20IV%20mapped-blue)](#compliance)

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Overview

DSG ONE is a deterministic control plane that sits between your AI agent and the actions it wants to take. Before any action executes — API call, file write, financial transaction, deployment command — DSG ONE evaluates it against a policy engine, issues a **PASS / REVIEW / BLOCK** decision, and writes a cryptographically-chained evidence record.

**Core design principle:** every decision is deterministic, hashable, and reproducible. No probabilistic scoring, no external LLM judgment at the gate layer.

```
AI Agent → POST /api/spine/execute
         → Policy evaluation (deterministic TypeScript)
         → PASS / REVIEW / BLOCK decision + proof hash
         → Evidence written to immutable audit trail
         → Response returned to agent
```

---

## Contents

- [Capabilities](#capabilities)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Quickstart](#quickstart)
- [Infrastructure](#infrastructure)
- [Compliance & Verification](#compliance--verification)
- [Development](#development)
- [Deployment](#deployment)
- [Claim Boundary](#claim-boundary)

---

## Capabilities

### Pre-action governance gate

Every agent action is evaluated before execution:

| Decision | Meaning | Trigger |
|---|---|---|
| `PASS` | Action allowed under current policy | Risk score < 0.40 |
| `REVIEW` | Human approval required | 0.40 ≤ risk score < 0.80 |
| `BLOCK` | Action rejected | Risk score ≥ 0.80 or constraint violation |

Each decision returns a structured payload with `requestHash`, `decisionHash`, `policyVersion`, `constraintSetHash`, `proofHash`, and replay-protection nonce. Decisions are idempotent — re-submitting the same request returns the same decision.

### Evidence-backed compliance

Every execution produces a SHA-256 hash chain:

```
requestHash → decisionHash → recordHash → bundleHash
```

Stored in Supabase with append-only Row-Level Security. Chain integrity is verifiable via `GET /api/ccvs/evidence-chain`.

CCVS pipeline (Compliance Chain Verification System) produces machine-readable evidence at five levels:

| Level | Type | Minimum for |
|---|---|---|
| L1 | Unit tests + coverage | Internal quality |
| L2 | Integration + API coverage | Feature readiness |
| L3 | Adversarial + replay rejection | Security review |
| L4 | Mutation score (Stryker ≥70%) + Z3 design-time proofs | Compliance claims |
| L5 | SLSA provenance + SBOM (CycloneDX 1.4) | Regulatory assertion |

### Hermes Managed Agents API

Full Anthropic-spec Managed Agents surface — 26 REST route handlers under `/api/hermes/` covering Agents, Sessions, Memory Stores, Vaults, Skills, Environments, User Profiles, and Webhooks. Auth-gated (`requireOrgRole`). SSE event streams supported.

### MCP server

`POST /api/mcp` exposes **33 Hermes tools** (`hermes.*`) + 10 DSG tools + Android agent tools via JSON-RPC. Compatible with any MCP client.

```bash
curl -X POST /api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### DSG Answer Gate

AI response governance layer that evaluates agent replies before they reach users. Blocks replies that assert unverified claims. Six decision types, deterministic Boolean logic — no LLM at the gate layer.

```
POST /api/dsg/v1/gates/answer-evaluate
```

Decision priority: `BLOCK_UNSUPPORTED_CLAIM > NEED_TOOL_VERIFICATION > SPLIT_VERIFIED_AND_INFERRED > ANSWER_VERIFIED > ANSWER_WITH_LIMITS > NEED_REVIEW`

### Parallel execution with loop protection

Five safety guards prevent runaway agent loops:

| Guard | Mechanism |
|---|---|
| Task fingerprint | SHA-256 hash blocks duplicate failures (3-retry limit) |
| Executor slot release | `finally` block guarantees cleanup on success or error |
| Explicit stop reasons | `TIMEOUT`, `MAX_RETRIES`, `TOO_MANY_FAILURES`, `QUEUE_EMPTY` |
| Safe queue cleanup | Never deletes `RUNNING`, `LOCKED`, or `WAITING_*` tasks |
| Health monitoring | `GET /api/parallel/health` — queue state, executor utilization, latency p50/p95/p99 |

### AI Delivery Proof

Agency-facing live proof check. Paste any production URL, get a GO/NO-GO report (homepage, readiness, health, auth gate, repo URL), and share a persistent link backed by Supabase.

```
POST /api/delivery-proof/scan
GET  /delivery-proof/report/[run_id]
```

### Stripe governance integration

UI extension live in Stripe Dashboard. Gate charges, payouts, and refunds before execution with real-time policy evaluation and logged audit trails.

### Android Agent (Hermes Stack)

Standalone APK — on-device AI work-session agent with persistent memory, custom skills, scheduler, Telegram gateway, and a local OpenAI/Anthropic-compatible API server on port `8642`.

[Download latest APK →](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/releases/tag/android-apk-latest)

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   AI Agent / Client                    │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/spine/execute
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Runtime Spine Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Auth + Quota │  │ Rate Limiter │  │ CORS / Body │  │
│  │ (org-scoped) │  │ (Upstash)    │  │ Safety      │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
│                            │                           │
│                            ▼                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Deterministic Gate Engine               │   │
│  │  Policy eval → PASS / REVIEW / BLOCK            │   │
│  │  Hash: requestHash → decisionHash → proofHash   │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                           │
│                            ▼                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Runtime      │  │ Audit Trail  │  │ Billing     │  │
│  │ Commit RPC   │  │ (chain hash) │  │ Outbox      │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌─────────────────┐       ┌─────────────────────┐
    │ Supabase        │       │ Stripe              │
    │ Postgres + RLS  │       │ Metered billing     │
    │ 78 migrations   │       │ Outbox flush cron   │
    └─────────────────┘       └─────────────────────┘
```

**Tech stack:**

```
Next.js 15 App Router          TypeScript 5.8
Supabase (Postgres + Auth)     Upstash Redis (rate limiting)
Stripe (metered billing)       Resend (transactional email)
Vitest (unit + integration)    Playwright (E2E)
Stryker (mutation testing)     Z3 SMT Solver (design-time proofs)
GitHub Actions CI              Vercel (deployment)
```

---

## API Reference

### Public probes

```bash
GET /api/health          # {"status":"ok","database":"connected","rateLimiter":{"ok":true}}
GET /api/readiness       # {"status":"ready"}
GET /api/agent/status    # repo identity, commit, env, db connectivity
```

### Execution

```bash
POST /api/execute             # stable compatibility entry
POST /api/spine/execute       # current spine execution layer
POST /api/intent              # intent-first execution path
```

Request body:

```json
{
  "agent_id": "agt_abc123",
  "action": "transfer 500 USDT to wallet 0x...",
  "context": { "amount": 500, "asset": "USDT" }
}
```

Response:

```json
{
  "decision": "BLOCK",
  "reason": "DeFi amount exceeds single-transaction limit ($1,000)",
  "requestHash": "sha256:a1b2c3...",
  "decisionHash": "sha256:d4e5f6...",
  "policyVersion": "v2.3.1",
  "proofHash": "sha256:789abc...",
  "nonce": "dsg-nonce-xk9m2p"
}
```

### Gate endpoints (DSG v1)

```bash
GET  /api/dsg/v1/policies/manifest        # policy catalog
POST /api/dsg/v1/gates/evaluate           # deterministic gate decision
POST /api/dsg/v1/gates/answer-evaluate    # AI reply governance
POST /api/dsg/v1/proofs/prove             # proof scaffold
```

### Compliance & evidence

```bash
GET  /api/ccvs/evidence-chain             # L1–L5 severity table + chain integrity
GET  /api/ccvs/compliance-status          # claim_pass_eligible badge
POST /api/ccvs/compliance-status          # CI uploads matrix after each run
GET  /api/compliance-evidence-pack        # printable HTML/PDF compliance report
GET  /api/compliance-evidence-pack/annex4 # EU AI Act Annex IV — 9 items (JSON)
GET  /api/proof/claim-readiness           # PASS/PARTIAL/BLOCK per claim ID
```

### Operator surfaces (authenticated)

```bash
GET, POST /api/policies
GET       /api/executions
GET       /api/audit
GET       /api/usage
GET       /api/usage/analytics?period=2026-04
GET       /api/capacity
GET       /api/agents
POST      /api/agent-chat
GET       /api/parallel/health
```

### Hermes Managed Agents

```bash
# Agents
GET, POST /api/hermes/agents
GET, PUT, DELETE /api/hermes/agents/:id

# Sessions
GET, POST /api/hermes/sessions
GET, PUT, DELETE /api/hermes/sessions/:id
GET /api/hermes/sessions/:id/events/stream   # SSE

# Memory, Vaults, Skills, Environments, Webhooks
# — full CRUD under /api/hermes/*
```

### Delivery Proof

```bash
POST /api/delivery-proof/scan
# body: { "url": "https://...", "repoUrl": "https://github.com/...", "readinessPath": "/api/readiness" }

GET /delivery-proof/report/[run_id]
```

---

## Quickstart

### Gate a single action (no account required)

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "demo-001", "action": "send email to user@example.com"}'
```

```json
{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com"
}
```

### Integrate with your agent (SDK-agnostic)

```python
import httpx

GATE_URL = "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute"
HEADERS  = {"Authorization": "Bearer <your-api-key>", "Content-Type": "application/json"}

def gate(agent_id: str, action: str, context: dict = {}) -> dict:
    r = httpx.post(GATE_URL, json={"agent_id": agent_id, "action": action, "context": context}, headers=HEADERS)
    r.raise_for_status()
    return r.json()

result = gate("agt_prod_001", "deploy to production", {"env": "prod", "service": "api"})
if result["decision"] != "PASS":
    raise RuntimeError(f"Gate blocked: {result['reason']}")
```

### Connect Android agent to any OpenAI client

```python
from openai import OpenAI

client = OpenAI(base_url="http://<device-ip>:8642/v1", api_key="x")
resp = client.chat.completions.create(
    model="dsg-agent",
    messages=[{"role": "user", "content": "ตรวจสถานะระบบ"}],
    stream=True,
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### GitHub Actions gate

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.1.0
```

---

## Infrastructure

| Component | Status | Notes |
|---|---|---|
| Supabase Postgres | Live | Magic-link OTP auth, RLS on all tables, 78 migrations applied |
| Upstash Redis | Live | Rate limiting — per-email 3/min, per-IP tiered |
| Stripe billing | Live | Metered usage, idempotency per execution, outbox flush hourly |
| Resend email | Configured | Upgrade nudges, magic-link OTP |
| Vercel crons | Active | `usage-alerts` 07:00 UTC daily · `flush-meter-outbox` hourly |
| CRON_SECRET | Configured | Fail-closed — missing secret returns 503, not 200 |

### Required environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cron
CRON_SECRET=

# AI (Hermes chat)
ANTHROPIC_API_KEY=

# Optional
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
RESEND_API_KEY=
SENTRY_DSN=
```

Full reference: `.env.example`

---

## Compliance & Verification

### Formal verification (design-time)

24 theorems proved via Z3 SMT Solver in CI. Runtime gates use TypeScript static checks — no external solver at runtime.

**Policy engine — 8 theorems:**

```
✓ role_safety            allow → role ∈ valid set
✓ plan_safety            allow → plan ∈ {enterprise, business, pro}
✓ approval_safety        allow ∧ approvalRequired → token ≠ ∅
✓ audit_completeness     decision always in valid enum
✓ non_triviality         ∃ valid request where decision = allow
✓ amount_bound           DeFi amount ≤ $1,000 · daily ≤ $10,000
✓ slippage_bound         slippage ≤ 50bps
✓ constraint_consistency DeFi constraint set is satisfiable
```

**Billing & quota — 16 theorems:**

```
✓ Quota ordering          enterprise > business > pro > trial > free > 0
✓ Safe floor              getQuotaForPlan never returns 0
✓ Status partition        ACTIVE_STATUSES ∩ REVOKED_STATUSES = ∅
✓ Revenue monotonicity    upgrading plan never decreases quota
✓ Rate-limit conservation remaining + used = limit (always)
✓ No-bypass theorem       cannot be ALLOWED AND BLOCKED simultaneously
✓ Stripe pricing          yearly = 9×monthly exactly (25% discount proven)
✓ Quota gate              post-increment used ≤ limit
  … + 8 additional billing invariants
VERDICT: FORMAL PROOF PASS
```

Run locally:

```bash
npm run proof:install      # pip install z3-solver
npm run verify:policy      # 8 policy theorems
npm run proof:revenue      # 16 billing theorems
npm run proof:answer-gate  # 22 answer gate invariants
```

### EU AI Act Annex IV mapping

`GET /api/compliance-evidence-pack/annex4` — 9 Annex IV items mapped to DSG controls:

| # | Annex IV Item | DSG Control | Status |
|---|---|---|---|
| 1 | General description + intended purpose | CTRL-POLICY-ENGINE | Covered |
| 2 | Version + update history | CTRL-BUILD-PROVENANCE | Covered |
| 3 | Technical specifications + accuracy | CTRL-RISK-GATE | Covered |
| 4 | Monitoring + logging systems | CTRL-IMMUTABLE-AUDIT | Covered |
| 5 | Input data specifications | CTRL-POLICY-ENGINE | Partial |
| 6 | Human oversight measures | CTRL-HUMAN-GATE | Covered |
| 7 | Post-market monitoring | CTRL-REPLAY-REJECTION | Covered |
| 8 | Incident reporting | CTRL-AUDIT-TRAIL | Partial |
| 9 | Instructions for use | CTRL-MIDMARKET-GATE | Covered |

7 covered · 2 partial · `certificationClaim: false` · `independentAuditClaim: false`

### Regulatory framework mapping

| Framework | Requirement | Control | Evidence Level |
|---|---|---|---|
| EU AI Act | Art. 14 Human oversight | CTRL-HUMAN-GATE | L2 |
| EU AI Act | Art. 12 Record-keeping | CTRL-IMMUTABLE-AUDIT | L3 |
| ISO 42001 | A.7.3 Risk assessment | CTRL-RISK-GATE | L3 |
| ISO 42001 | A.9.2 Internal audit | CTRL-AUDIT-TRAIL | L2 |
| NIST AI RMF | GOVERN 1.1 | CTRL-POLICY-ENGINE | L1 |
| NIST AI RMF | MAP 2.1 | CTRL-PROOF-VALIDITY | L4 |
| SLSA | Level 2 Provenance | CTRL-BUILD-PROVENANCE | L5 |

### Security

| Area | Status |
|---|---|
| `npm audit` | 0 high/critical (6 moderate dev-only) |
| Secret scanning (gitleaks) | 0 secrets detected |
| CodeQL | 0 critical issues |
| SBOM | CycloneDX 1.4 — 245+ components |
| Dependency hardening | `qs`, `ws`, `postcss` overrides in `package.json` |
| Request body safety | `readJsonBody()` with explicit limits (4–256 KB) on all critical routes |
| Webhook SSRF | `https://` enforced — `http://` returns 400 |
| Cron auth | Fail-closed — `CRON_SECRET` absent → 503 |
| MCP auth | `requireOrgRole(['operator','org_admin'])` on all Hermes tool calls |

### Load testing

1,000 concurrent agents, k6:

| Metric | Result | Threshold |
|---|---|---|
| Throughput | 5,847 req/s | — |
| Error rate | 0.45% | < 1% |
| p50 latency | 87ms | < 100ms |
| p95 latency | 425ms | — |
| p99 latency | 892ms | < 1,000ms |

Run: `k6 run load/parallel-1000-agents.k6.js`

### Formal verification artifact

Peer-archived on Zenodo (CERN / OpenAIRE indexed):

```
DOI:   https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive
       for Safety-Critical AI Systems
```

---

## Development

### Prerequisites

Node.js 20+, npm, Python 3 (for Z3 proofs)

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
cp .env.example .env.local   # fill in required vars
npm ci
npm run dev                  # http://localhost:3000
```

### Test suite

```bash
npm run typecheck            # TypeScript — 0 errors
npm run test                 # all tests (unit + integration)
npm run test:unit            # unit tests only (60 files)
npm run test:integration     # integration tests (21 files)
npm run test:coverage        # coverage report + thresholds
npm run test:failure         # adversarial / negative tests
npm run test:mutation:ci     # Stryker mutation score (break=70%)
```

Current baseline (2026-06-11): **1,975+ tests passing, 0 failures**, TypeScript 0 errors.

Coverage thresholds enforced in `vitest.config.ts`:
- Global: lines 60% / functions 65% / statements 55% / branches 60%
- `lib/runtime/gate.ts`: lines/functions/statements 100%, branches 100%

### CCVS pipeline

```bash
npm run ccvs:emit            # emit evidence envelope after test run
npm run ccvs:verify          # verify chain_hash integrity
npm run ccvs:matrix          # generate compliance matrix JSON
npm run ccvs:pipeline        # full: coverage → emit → verify → matrix
```

### Production gate

```bash
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

### Key npm scripts

```bash
npm run build                           # next build
npm run benchmark:gateway               # DSG gateway benchmark
npm run benchmark:vendors               # vendor comparison benchmark
npm run verify:policy                   # Z3 policy proofs (Python)
npm run proof:revenue                   # Z3 billing proofs (Python)
npm run verify:security-headers         # production security header check
bash scripts/check-request-body-safety.sh  # request body safety linter
npm audit --audit-level=high            # 0 high/critical required
```

---

## Deployment

Deployed via Vercel. Install command: `npm ci`.

### Minimum go-live checklist

- [ ] Vercel deployment status = `Ready`
- [ ] All required env vars set by name (never print values)
- [ ] 78 Supabase migrations applied in order
- [ ] `GET /api/health` → `{"status":"ok","database":"connected"}`
- [ ] `GET /api/readiness` → `{"status":"ready"}`
- [ ] `GET /api/agent/status` → `db:true`, correct commit SHA
- [ ] Authenticated operator routes checked with org-scoped credentials
- [ ] `npm run go:no-go <production-url>` → PASS

Full runbook: `docs/RUNBOOK_DEPLOY.md`

### Cron schedules (`vercel.json`)

| Cron | Schedule | Function |
|---|---|---|
| `usage-alerts` | 07:00 UTC daily | Email orgs approaching quota limits |
| `flush-meter-outbox` | Hourly | Retry failed Stripe meter events |

---

## Claim Boundary

This project is evidence-first. The following claims are supported by current verified evidence:

```
✓ Production-connected — live and responding (commit c44e4a240, verified 2026-06-04)
✓ 1,975+ tests passing, 0 failures (TypeScript 0 errors, verified 2026-06-11)
✓ 24 Z3 theorems — 8 policy + 16 billing (design-time CI, not runtime invocation)
✓ Deterministic gate API live — /api/dsg/v1/gates/evaluate (PASS/REVIEW/BLOCK)
✓ Hermes Managed Agents REST API — 26 routes, auth-gated (verified 2026-06-04)
✓ MCP server — 33 Hermes tools + DSG + Android, requireOrgRole enforced
✓ Billing idempotent — per-execution key, outbox pattern, no silent loss
✓ Cron fail-closed — missing CRON_SECRET returns 503
✓ Mutation score 72.08% ≥70% gate (Stryker, verified 2026-05-28)
✓ EU AI Act Annex IV — 9 items mapped, 7 covered (pre-audit evidence mapping)
✓ npm audit 0 high/critical (6 moderate dev-only)
✓ Load: 5,847 req/s, p99 <1s at 1,000 concurrent agents (k6)
✓ Hash lineage verifiable — SHA-256 chain stored in auditable Supabase DB
✓ go:no-go gate PASS (verified 2026-05-28)
```

The following claims are **not made**:

```
✗ External Z3 solver at runtime (design-time proofs only; runtime = TypeScript static checks)
✗ WORM-certified storage (audit trail is hash-chained DB; not independently certified)
✗ JWT/JWKS auth complete
✗ Real cryptographic signing complete
✗ Third-party certification or independent audit
✗ Mainnet launch / TVL / customer count
```

---

## Links

| Resource | URL |
|---|---|
| Production | `https://tdealer01-crypto-dsg-control-plane.vercel.app` |
| API health | `/api/health` |
| Compliance report | `/api/compliance-evidence-pack` |
| EU AI Act Annex IV | `/api/compliance-evidence-pack/annex4` |
| Zenodo DOI | `https://doi.org/10.5281/zenodo.18225586` |
| GitHub Action | `tdealer01-crypto/dsg-secure-deploy-gate-action@v1.1.0` |
| Deploy runbook | `docs/RUNBOOK_DEPLOY.md` |
| Android APK | [android-apk-latest](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/releases/tag/android-apk-latest) |
