# DSG ONE — ProofGate Control Plane

Runtime governance layer for AI agents. Gate every action before execution and keep a verifiable hash-chained audit trail.

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18225586.svg)](https://doi.org/10.5281/zenodo.18225586)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

**Production:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Evidence snapshot — 2026-06-16

Verified facts from live system and current codebase. Not claims — each row has a source.

### Production endpoints

| Endpoint | Result | Verified |
|---|---|---|
| `GET /api/health` | `ok:true, db_ok:true, rateLimiter:ok, dsgCoreConfig:ok, 7/7 readiness checks pass` | 2026-06-15T19:03:05Z |
| `GET /api/readiness` | `ok:true` — env, nextAuthSecret, supabaseServiceRole, dsgCoreConfig, dsgCoreHealth, financeGovernanceSurface, financeGovernanceBackend | 2026-06-15T19:03:05Z |
| `GET /api/agent/status` | `ok:true, env:production, db:true` | 2026-06-15T19:03:04Z |

### Test suite

```
Test Files  220 passed | 9 skipped (229)
Tests       2172 passed | 58 skipped | 0 failed (2230)
Duration    ~35s
Run date    2026-06-16
Command     npm run test
```

Skipped: 58 tests gated on `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (live DB required).

### Formal proofs (Z3 SMT — design-time, not request-time)

| File | Theorems | Method |
|---|---|---|
| `lib/gateway/z3/theorems.py` | 5 core policy theorems (role_safety, plan_safety, approval_safety, audit_completeness, non_triviality) | `assert Not(claim)` → UNSAT |
| `lib/gateway/z3/defi_constraints.py` | 3 DeFi constraint theorems (amount_bound, slippage_bound, constraint_consistency) | UNSAT refutation |
| `tools/proofs/prove_revenue_ready.py` | 16 billing/quota theorems | `assert_unsat` |
| `tools/proofs/prove_answer_gate.py` | 22 answer gate invariants | `assert_decision` |

Runner: `npm run verify:policy` → `scripts/verify-policy.sh` → `lib/gateway/z3/generate_spec.py`  
Output: `lib/gateway/verified-constraints.json`

### Security boundaries (code-verified)

| Control | Implementation | File:line |
|---|---|---|
| Bearer auth before body read | `requireDsgAuth()` fail-closed — 401/403 if no valid token | `lib/dsg/auth/require-dsg-auth.ts:113` |
| CORS origin-locked | `getAllowedCorsOrigins()` — no wildcard; strict mode in production | `lib/security/cors.ts:35` |
| Rate limit fail-closed | Falls back to in-memory bucket if Redis unavailable | `lib/security/rate-limit.ts:90` |
| Cron auth fail-closed | Returns 503 when `CRON_SECRET` missing, 401 on mismatch | `app/api/cron/flush-meter-outbox/route.ts:9` |
| Compliance status fail-closed | Returns 503 when Supabase unavailable — no fake data | `app/api/ccvs/compliance-status/route.ts:125` |
| Credential broker | Returns SHA-256 fingerprint only — never raw secret value | `lib/dsg/brain/credential-broker.ts` |
| Answer gate in SSE stream | Every AI reply scanned before client receives it | `app/api/agent-chat/route.ts:140` |
| No browser storage | localStorage/sessionStorage removed from all components | `components/TryChatWidget.tsx`, `app/dashboard/hermes/page.tsx` |
| Webhook error not leaking | Raw `insertError.message` replaced with structured `db_error` response | `app/api/webhooks-config/route.ts` |

### Hermes Agent LLM stack

| Layer | Provider | Model | Trigger |
|---|---|---|---|
| Planner (primary) | Anthropic | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` set |
| Planner (secondary) | Together AI | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | `TOGETHER_API_KEY` set |
| Planner (tertiary) | OpenRouter | `nousresearch/hermes-3-llama-3.1-405b:free` | `OPENROUTER_API_KEY` set; override via `DSG_HERMES_PLANNER_MODEL` |
| Synthesis | Anthropic | `claude-haiku-4-5-20251001` | After tool steps complete |
| DadBot (Android) | OpenRouter | `qwen/qwen-2.5-7b-instruct:free` | `OPENROUTER_API_KEY` set; override via `DSG_DADBOT_MODEL` |

### Resolved items (2026-06-16)

| Item | Resolution | File |
|---|---|---|
| API body size limit | `middleware.ts` rejects POST/PUT/PATCH > 1 MB with 413; `/api/:path*` added to matcher | `middleware.ts` |
| Quota race (non-atomic) | `incrementQuota` now calls `increment_quota_atomic` SQL RPC (atomic `executions = executions + 1`) | `lib/usage/quota.ts`, migration `20260616000001` |
| RLS disabled on `claim_readiness_artifacts` | RLS enabled; SELECT for authenticated; DELETE blocked via trigger for all roles including service_role | migration `20260616000002` |
| Expired credential leases not cleaned | Cron route added at `/api/cron/cleanup-expired-leases` (daily 03:00 UTC) | `app/api/cron/cleanup-expired-leases/route.ts` |
| Bilingual UI (TH/EN) | GlobalNav language switcher; 4 pages fully bilingual: Delivery Proof, Dashboard Approvals, Finance Approvals, Hermes page; no mixed language | `components/GlobalNav.tsx`, `store/useAppLanguage.ts` |
| Executor capacity alert spam | Single-slot executors (max=1) at 100% no longer trigger CRITICAL alert — guard `cap.max > 1` added | `lib/hooks/alert-rules.ts` |
| Webhook "Internal server error" | Structured `db_error` response + amber guidance panel with `supabase db push` instruction | `app/api/webhooks-config/route.ts`, `app/dashboard/webhooks/page.tsx` |
| Hermes "Thinking…" stuck on timeout | Stream-close handler sets fallback message when SSE closes without `assistant_reply` | `app/dashboard/hermes/page.tsx` |
| Hermes planner model (noisy) | Switched from `anthropic/claude-haiku-4-5` (OpenRouter) to `nousresearch/hermes-3-llama-3.1-405b:free`; overridable via `DSG_HERMES_PLANNER_MODEL` | `lib/hermes/llm-planner.ts`, `lib/agent/llm-router.ts` |
| DadBot noisy default model | Replaced `nvidia/nemotron-3-ultra-550b-a55b:free` with `qwen/qwen-2.5-7b-instruct:free` (better Thai, cleaner output) | `app/api/agent/chat/route.ts` |

### What is not claimed

- `production-ready` for general traffic cutover — Playwright E2E gate not yet run from CI
- `third-party audited` — `certificationClaim: false` and `independentAuditClaim: false` in all evidence bundles
- `external Z3 solver at request time` — Z3 runs design-time only; request path uses deterministic TypeScript scaffold
- `WORM-certified storage` — RLS is now enabled and DELETE is trigger-blocked, but S3 Object Lock is not configured

---

## Contents

- [Codebase map](#codebase-map)
- [API surface](#api-surface)
- [Runtime execution flow](#runtime-execution-flow)
- [Deterministic gate / proof flow](#deterministic-gate--proof-flow)
- [Answer gate flow](#answer-gate-flow)
- [Claim-readiness / CCVS flow](#claim-readiness--ccvs-flow)
- [Hermes Managed Agents surface](#hermes-managed-agents-surface)
- [DSG Brain / Controlled Executor](#dsg-brain--controlled-executor)
- [Dashboard surfaces](#dashboard-surfaces)
- [Library modules](#library-modules)
- [Commands](#commands)
- [Supabase migrations](#supabase-migrations)
- [Docs index](#docs-index)

---

## Codebase map

```
/
├── app/
│   ├── api/                        Route handlers (Next.js App Router)
│   │   ├── execute/                POST /api/execute — stable compatibility entry
│   │   ├── spine/execute/          POST /api/spine/execute — current spine layer
│   │   ├── intent/                 POST /api/intent — intent-first execution
│   │   ├── agents/                 GET, POST /api/agents — agent registry CRUD
│   │   ├── policies/               GET, POST /api/policies — policy engine
│   │   ├── executions/             GET /api/executions — execution history
│   │   ├── audit/                  GET /api/audit — audit trail
│   │   ├── usage/                  GET /api/usage, /api/usage/analytics
│   │   ├── capacity/               GET /api/capacity — org capacity
│   │   ├── dsg/v1/                 Deterministic gate API (see below)
│   │   ├── dsg/brain/              DSG Brain execute, code write
│   │   ├── dsg/agent-runtime/      Agent runtime surfaces
│   │   ├── hermes/                 Managed Agents REST API (26 routes)
│   │   ├── mcp/                    MCP JSON-RPC server (33 hermes + DSG tools)
│   │   ├── ccvs/                   CCVS compliance chain API
│   │   ├── proof/claim-readiness/  GET /api/proof/claim-readiness
│   │   ├── compliance-evidence-pack/ Compliance report + Annex IV
│   │   ├── delivery-proof/         Delivery Proof scan + report
│   │   ├── parallel/               Parallel orchestrator health
│   │   ├── billing/                Billing routes
│   │   ├── stripe/                 Stripe webhook handler
│   │   ├── cron/                   flush-meter-outbox, usage-alerts
│   │   ├── health/                 GET /api/health
│   │   ├── readiness/              GET /api/readiness
│   │   └── agent/status/           GET /api/agent/status
│   └── dashboard/                  Authenticated operator UI
│       ├── agents/                 Agent management
│       ├── executions/             Execution list + proof viewer
│       ├── audit/                  Audit trail browser
│       ├── policies/               Policy editor
│       ├── hermes/                 Hermes Agent chat (SSE)
│       ├── dsg-brain/              Brain execution UI
│       ├── approvals/              Approval queue (human-in-the-loop)
│       ├── billing/                Billing / usage dashboard
│       ├── integrations/           Webhook integrations
│       ├── settings/               Org settings, DeFi config
│       └── welcome/                Guided onboarding
│
├── lib/
│   ├── spine/                      Runtime spine pipeline
│   │   ├── engine.ts               executeSpineIntent, issueSpineIntent
│   │   ├── pipeline.ts             Step pipeline runner
│   │   ├── request.ts              normalizeSpinePayload
│   │   ├── plugin.ts               Plugin system
│   │   ├── plugins/                Built-in plugins
│   │   ├── permission-gate.ts      Permission gate plugin
│   │   └── verify-safe-dom-intent.ts  Safe DOM intent verification
│   ├── runtime/                    Runtime evidence and state
│   │   ├── commit-rpc.ts           runtime_commit_execution RPC
│   │   ├── gate.ts                 Runtime gate logic (100% coverage enforced)
│   │   ├── canonical.ts            Canonical hash helpers
│   │   ├── approval.ts             Approval token handling
│   │   ├── checkpoint.ts           Execution checkpoint
│   │   └── recovery.ts             Recovery helpers
│   ├── dsg/
│   │   ├── deterministic/          Deterministic gate scaffold
│   │   │   ├── gate-engine.ts      evaluateDeterministicGate()
│   │   │   ├── proof-engine.ts     Proof generation
│   │   │   ├── proof-hash.ts       SHA-256 proof hash construction
│   │   │   ├── policy-manifest.ts  Policy catalog
│   │   │   ├── external-solver.ts  Solver metadata (static_check mode)
│   │   │   ├── request-validation.ts  Input validation + nonce/idempotency
│   │   │   ├── solver-metadata.ts  Solver identity descriptor
│   │   │   └── types.ts            Gate types
│   │   ├── answer-gate/            AI reply governance
│   │   │   ├── answer-gate-evaluator.ts  Deterministic reply evaluator
│   │   │   ├── claim-detector.ts   Regex claim scanner
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── brain/                  DSG Brain / Hermes controlled executor
│   │   │   ├── plan-attempt.ts     Immutable plan + deterministic planHash
│   │   │   ├── controlled-executor.ts  Execution grants, credential leases
│   │   │   ├── conformance-gate.ts Command/path/hash conformance validation
│   │   │   ├── credential-broker.ts  Supabase-backed secret lookup + leases
│   │   │   ├── shell-executor.ts   Allowed-command whitelist executor
│   │   │   ├── hermes-plugin.ts    Plan → credential → execute → conform
│   │   │   └── CREDENTIAL_BROKER.md  Broker spec and limits
│   │   ├── agent-command-gate.ts   Agent command gate scaffold
│   │   ├── evaluate-action.ts      Action evaluation entry
│   │   └── multi-agent-ccvs/       CCVS multi-agent pipeline
│   ├── security/
│   │   ├── cors.ts                 buildCorsHeaders, buildPreflightResponse
│   │   ├── rate-limit.ts           Upstash Redis rate limiting
│   │   ├── request-json.ts         readJsonBody (size-limited, depth-checked)
│   │   ├── api-error.ts            handleApiError, sensitive key redaction
│   │   ├── cron-auth.ts            Cron secret validation (fail-closed)
│   │   ├── secret-crypto.ts        Secret hashing helpers
│   │   └── audit-export.ts         Audit export helpers
│   ├── billing/
│   │   ├── metered.ts              meterExecution (Stripe metered, outbox pattern)
│   │   ├── fulfillment.ts          Plan fulfillment
│   │   ├── entitlements.ts         Entitlement checks
│   │   ├── overage-config.ts       Overage policy
│   │   ├── quota-policy.ts         Quota policy rules
│   │   ├── reconciliation.ts       Billing reconciliation
│   │   └── seat-activation.ts      Seat activation
│   ├── usage/
│   │   └── quota.ts                checkQuota, incrementQuota
│   ├── agent-auth.ts               resolveAgentFromApiKey (SHA-256 lookup)
│   ├── authz-runtime.ts            Internal service vs user session auth
│   ├── database.types.ts           Generated Supabase types
│   └── supabase-server.ts          getSupabaseAdmin (server-only)
│
├── tests/
│   ├── unit/           60 test files — authz, agent-auth, gate, security, billing
│   ├── integration/    21 test files — API routes, spine, audit, delegation
│   ├── failure/        Adversarial / negative / replay rejection tests
│   ├── proofs/         Formal proof test coverage
│   └── e2e/            Playwright — finance-governance, auth flows, API lifecycle
│
├── supabase/
│   ├── migrations/     78 SQL migration files (chronological)
│   └── schema.sql      Schema snapshot
│
├── tools/proofs/
│   ├── dsg_answer_gate.py          Z3 SAT encoding — 6 decision types
│   ├── prove_answer_gate.py        22 invariant proofs
│   ├── prove_revenue_ready.py      16 billing theorems (z3-solver WASM)
│   ├── dsg_revenue_model.py        Revenue model encoding
│   └── governed_agent_model.py     Agent governance model
│
├── lib/gateway/z3/                 Gateway Z3 formal proofs
│   ├── theorems.py                 5 core policy theorems (UNSAT refutation)
│   ├── defi_constraints.py         3 DeFi constraint theorems (Theorems 6–8)
│   ├── generate_spec.py            Runner → lib/gateway/verified-constraints.json
│   ├── policy_model.py             Policy sorts and decision symbols
│   ├── custodial_bounds.py         Custodial limit constraints
│   └── yield_invariants.py         Yield safety invariants
│
├── scripts/                        Verification, smoke, benchmark, deploy scripts
├── load/                           k6 load test scripts
├── apps/android/                   Android DSG Agent APK
├── packages/stripe-app/            Stripe Dashboard UI extension
└── examples/managed-agent-session/ Standalone Managed Agents client example
```

---

## API surface

### Public probes

| Method | Route | File | Returns |
|---|---|---|---|
| GET | `/api/health` | `app/api/health/route.ts` | `{status, database, rateLimiter}` |
| GET | `/api/readiness` | `app/api/readiness/route.ts` | `{status: "ready"}` |
| GET | `/api/agent/status` | `app/api/agent/status/route.ts` | `{ok, commit, env, checks.db}` |

### Execution

| Method | Route | File |
|---|---|---|
| POST | `/api/execute` | `app/api/execute/route.ts` |
| POST | `/api/spine/execute` | `app/api/spine/execute/route.ts` |
| POST | `/api/intent` | `app/api/intent/route.ts` |

### Deterministic gate (DSG v1)

| Method | Route | File |
|---|---|---|
| GET | `/api/dsg/v1/policies/manifest` | `app/api/dsg/v1/policies/route.ts` |
| POST | `/api/dsg/v1/gates/evaluate` | `app/api/dsg/v1/gates/evaluate/route.ts` |
| POST | `/api/dsg/v1/gates/answer-evaluate` | `app/api/dsg/v1/gates/*/route.ts` |
| POST | `/api/dsg/v1/proofs/prove` | `app/api/dsg/v1/proofs/route.ts` |
| GET | `/api/dsg/v1/controller` | `app/api/dsg/v1/controller/route.ts` |
| GET | `/api/dsg/v1/planner` | `app/api/dsg/v1/planner/route.ts` |

### Compliance & evidence

| Method | Route | File |
|---|---|---|
| GET | `/api/ccvs/evidence-chain` | `app/api/ccvs/evidence-chain/route.ts` |
| GET, POST | `/api/ccvs/compliance-status` | `app/api/ccvs/compliance-status/route.ts` |
| GET | `/api/proof/claim-readiness` | `app/api/proof/claim-readiness/route.ts` |
| GET | `/api/compliance-evidence-pack` | `app/api/compliance-evidence-pack/route.ts` |
| GET | `/api/compliance-evidence-pack/annex4` | `app/api/compliance-evidence-pack/annex4/route.ts` |

### Operator (authenticated, org-scoped)

| Method | Route | File |
|---|---|---|
| GET, POST | `/api/policies` | `app/api/policies/route.ts` |
| GET | `/api/executions` | `app/api/executions/route.ts` |
| GET | `/api/audit` | `app/api/audit/route.ts` |
| GET | `/api/usage` | `app/api/usage/route.ts` |
| GET | `/api/usage/analytics` | `app/api/usage/analytics/route.ts` |
| GET | `/api/capacity` | `app/api/capacity/route.ts` |
| GET, POST | `/api/agents` | `app/api/agents/route.ts` |
| GET, PUT, DELETE | `/api/agents/[id]` | `app/api/agents/[id]/route.ts` |
| GET | `/api/parallel/health` | `app/api/parallel/health/route.ts` |
| GET | `/api/parallel/queue` | `app/api/parallel/queue/route.ts` |

### Hermes Managed Agents (26 routes)

| Resource | Routes | Base path |
|---|---|---|
| Agents | CRUD + archive | `/api/hermes/agents/` |
| Sessions | CRUD + archive + events GET/POST + SSE stream | `/api/hermes/sessions/` |
| Memory stores | CRUD + archive | `/api/hermes/memory-stores/` |
| Vaults | CRUD + archive | `/api/hermes/vaults/` |
| Skills | CRUD | `/api/hermes/skills/` |
| Environments | CRUD + archive | `/api/hermes/environments/` |
| User profiles | CRUD + enrollment URL | `/api/hermes/user-profiles/` |
| Webhooks | CRUD | `/api/hermes/webhooks/` |
| Enrollment | Token validation | `GET /api/hermes/enroll` |

Auth: `requireOrgRole(['operator','org_admin'])` on all routes.

### MCP JSON-RPC

| Method | Route | File |
|---|---|---|
| POST | `/api/mcp` | `app/api/mcp/route.ts` |

Returns `tools/list` of **33 `hermes.*` tools + 10 DSG tools + Android tools**.

### Delivery Proof

| Method | Route |
|---|---|
| POST | `/api/delivery-proof/scan` |
| GET | `/delivery-proof/report/[run_id]` |

### Cron (CRON_SECRET required — fail-closed → 503)

| Method | Route | Schedule |
|---|---|---|
| POST | `/api/cron/flush-meter-outbox` | Hourly |
| POST | `/api/cron/usage-alerts` | 07:00 UTC daily |

---

## Runtime execution flow

```
POST /api/spine/execute
 app/api/spine/execute/route.ts
 │
 ├── 1. CORS preflight
 │       lib/security/cors.ts → buildCorsHeaders(), buildPreflightResponse()
 │
 ├── 2. Rate limit (60 req/min per agent key)
 │       lib/security/rate-limit.ts → applyRateLimit() → Upstash Redis
 │
 ├── 3. Body parse (readJsonBody, max 64 KB)
 │       lib/security/request-json.ts
 │
 ├── 4. Payload normalization
 │       lib/spine/request.ts → normalizeSpinePayload()
 │       Requires: agent_id, action (or tool), context
 │
 ├── 5. Agent auth — resolve from Bearer token
 │       lib/agent-auth.ts → resolveAgentFromApiKey()
 │       SHA-256 hash lookup in `api_keys` table → agent record
 │       Requires: agent.status = 'active'
 │
 ├── 6. Quota check
 │       lib/usage/quota.ts → checkQuota(orgId, agentId)
 │       Blocks if org quota exhausted
 │
 ├── 7. Safe DOM intent verification (if action is DOM-typed)
 │       lib/spine/verify-safe-dom-intent.ts → verifySafeDomIntentOrPass()
 │
 ├── 8. Issue / reuse runtime intent
 │       lib/runtime/approval.ts → issue or reuse pending approval key
 │       (idempotency: same nonce → same key)
 │
 ├── 9. Execution state + loop protection
 │       AgentExecutionState: isExecuting, completedTasks, failedTasks
 │       Break conditions: queue empty | 10+ failures | elapsed > 5 min
 │       Stop reasons: TIMEOUT | MAX_RETRIES | TOO_MANY_FAILURES | QUEUE_EMPTY
 │
 ├── 10. Spine pipeline execution
 │       lib/spine/engine.ts → executeSpineIntent()
 │       lib/spine/pipeline.ts → step runner
 │       lib/spine/plugins/ → plugin chain
 │       lib/spine/permission-gate.ts → permission enforcement
 │       Produces: decision, policyVersion, trace, proof
 │
 ├── 11. Quota increment
 │       lib/usage/quota.ts → incrementQuota()
 │
 ├── 12. Billing meter (outbox pattern)
 │       lib/billing/metered.ts → meterExecution()
 │       Writes billing_meter_outbox row (status: pending)
 │       Attempts immediate Stripe delivery → updates to sent | failed
 │       Idempotency key: dsg-meter-{executionId} (not timestamp)
 │
 ├── 13. Runtime commit (audit lineage)
 │       lib/runtime/commit-rpc.ts → runtime_commit_execution RPC
 │       Writes: requestHash → decisionHash → recordHash → bundleHash
 │       Append-only RLS — no updates after insert
 │
 ├── 14. Webhook dispatch (async, non-blocking)
 │       lib/webhooks/deliver.ts → fireWebhook()
 │       HMAC-SHA256 signed, https:// only
 │
 └── 15. Response
         { decision, reason, requestHash, decisionHash, policyVersion,
           proofHash, nonce, trace, usage, stop_reason? }
```

---

## Deterministic gate / proof flow

```
POST /api/dsg/v1/gates/evaluate
 app/api/dsg/v1/gates/evaluate/route.ts
 │
 ├── 1. DSG auth
 │       lib/dsg/auth/require-dsg-auth.ts → requireDsgAuth()
 │       Returns caller.orgId for rate-limit key
 │
 ├── 2. Rate limit (60 req/min per org)
 │       lib/security/rate-limit.ts
 │
 ├── 3. Body parse (readJsonBody, max 16 KB)
 │       lib/security/request-json.ts
 │
 ├── 4. Request validation
 │       lib/dsg/deterministic/request-validation.ts
 │       → validateDeterministicProofRequest()
 │       Required fields: nonce, idempotencyKey, constraints[], inputHash
 │
 ├── 5. Gate evaluation
 │       lib/dsg/deterministic/gate-engine.ts → evaluateDeterministicGate()
 │       ├── Load policy manifest
 │       │       lib/dsg/deterministic/policy-manifest.ts
 │       ├── Evaluate each constraint (deterministic TypeScript rules)
 │       │       decision per constraint: PASS | REVIEW | BLOCK | UNSUPPORTED
 │       │       UNSUPPORTED → low risk: REVIEW | medium/high risk: BLOCK
 │       ├── Aggregate: lowest-trust decision wins
 │       │       BLOCK > REVIEW > PASS
 │       └── Build result envelope
 │
 ├── 6. Proof hash construction
 │       lib/dsg/deterministic/proof-hash.ts
 │       proofHash = SHA-256(canonicalize({ inputHash, constraintSetHash,
 │                                          policyVersion, decision, nonce }))
 │
 ├── 7. Solver metadata
 │       lib/dsg/deterministic/solver-metadata.ts
 │       solver.name = "static_check"
 │       solver.version = "dsg-deterministic-ts-0.0.0"
 │
 └── 8. Response
         { ok, decision, reason, policyVersion, constraintSetHash,
           proofHash, inputHash, nonce, idempotencyKey,
           constraintResults[], solver, latencyMs }

POST /api/dsg/v1/proofs/prove
 Same auth + rate-limit + validation pipeline
 lib/dsg/deterministic/proof-engine.ts → generateProof()
 Returns: proofHash, proofType, witnessHash, verificationKey

GET /api/dsg/v1/policies/manifest
 lib/dsg/deterministic/policy-manifest.ts
 Returns: policy catalog, policyVersion, constraintSetHash, availableConstraints[]
```

Z3 design-time proofs (CI — not invoked at request time):

```bash
npm run verify:policy      # scripts/verify-policy.sh → lib/gateway/z3/{theorems,defi_constraints}.py
                           #   5 core policy theorems + 3 DeFi constraint theorems → 8 total UNSAT
npm run proof:revenue      # tools/proofs/prove_revenue_ready.py — 16 theorems
npm run proof:answer-gate  # tools/proofs/prove_answer_gate.py — 22 invariants
```

---

## Answer gate flow

```
POST /api/dsg/v1/gates/answer-evaluate
 │
 ├── 1. Extract AI reply text from request body
 │
 ├── 2. Claim detection
 │       lib/dsg/answer-gate/claim-detector.ts → detectClaimsInReply()
 │       Regex scanner for: production-ready | deployed | tests passed |
 │       formally verified | enterprise-grade | WORM-certified | …
 │
 ├── 3. Gate evaluation
 │       lib/dsg/answer-gate/answer-gate-evaluator.ts → evaluateAnswerGate()
 │       Decision priority (highest wins):
 │         BLOCK_UNSUPPORTED_CLAIM       → unverified production claim detected
 │         NEED_TOOL_VERIFICATION        → claim needs live tool check
 │         SPLIT_VERIFIED_AND_INFERRED   → mix of verified + inferred content
 │         ANSWER_VERIFIED               → all claims have evidence
 │         ANSWER_WITH_LIMITS            → answer valid within stated limits
 │         NEED_REVIEW                   → ambiguous, route to human
 │
 └── 4. Response
         { decision, reason, detectedClaims[], blockedClaims[] }

Wired into:
  app/api/agent-chat-v2/route.ts  → BLOCK_UNSUPPORTED_CLAIM replaces reply
                                     with governance notice before SSE emit
  app/dashboard/hermes/           → evaluates every Hermes chat reply
```

Z3 proof backing (design-time):

```
tools/proofs/dsg_answer_gate.py     6 decision types, 3 Buddhist-mark constraints
tools/proofs/prove_answer_gate.py   22 deterministic invariant proofs
```

---

## Claim-readiness / CCVS flow

### Evidence chain (CI pipeline)

```
.github/workflows/ccvs-evidence.yml
│
├── L1  Unit tests + coverage
│       vitest run --coverage → coverage.json
│       scripts/emit-test-evidence.mjs → ccvs-unit-evidence.json
│       chain_hash = SHA-256(canonicalize(envelope))
│
├── L2  Integration tests
│       vitest run tests/integration → results
│       Separate evidence envelope, chain_hash links to L1
│
├── L3  Adversarial + replay rejection
│       vitest run tests/failure
│       Replay-rejection tests: same nonce → same decision (idempotency verified)
│
├── L4  Mutation (Stryker) + Z3 proofs
│       npx stryker run → mutation.json (break gate: score < 70%)
│       npm run verify:policy → 8 theorems
│       npm run proof:revenue → 16 theorems
│       Cosign signature (OIDC — gated on ACTIONS_ID_TOKEN_REQUEST_URL)
│
├── L5  Provenance + SBOM
│       scripts/generate-sbom.mjs → sbom.cdx.json (CycloneDX 1.4, 245+ components)
│       GitHub attestation (SLSA Level 2)
│       scripts/build-evidence-bundle.mjs → manifest.json + chain hash
│
├── Compliance matrix
│       scripts/generate-compliance-matrix.mjs → ccvs-compliance-matrix.json
│       Maps: requirement → control → test file → evidence hash
│       POST /api/ccvs/compliance-status (uploads matrix, claim_pass_eligible badge)
│
└── Drift detection
        lib/ccvs/drift-detector.ts → detects schema / policy drift between runs
```

### Claim-readiness API

```
GET /api/proof/claim-readiness
 app/api/proof/claim-readiness/route.ts
 │
 ├── Query params
 │       claims=ISO-42001-A.6,NIST-GOVERN-01  (comma-separated, optional)
 │       includeEvidence=true                  (artifact details)
 │       includeSecurityBreakdown=true         (npm-audit, gitleaks, CodeQL counts)
 │
 ├── Data source: Supabase → claim_readiness_artifacts table
 │       Columns: claim_id, evidence_type, artifact_hash, chain_hash,
 │                s3_version_id, s3_retain_until, signature_bundle,
 │                artifact_data, status, immutable_at
 │       RLS: SELECT allowed · UPDATE/DELETE blocked (append-only)
 │
 ├── Per-claim evaluation
 │       Load required_evidence_types[] from ClaimSpec
 │       Check each evidence_type has a verified artifact row
 │       Compute status: PASS | PARTIAL | BLOCK
 │
 └── Response
         { claims: [{ claim_id, label, status, evidence[], missing[] }],
           security_breakdown?, overall_eligible }

Supported claim IDs:
  ISO-42001-A.6-PLANNING    NIST-GOVERN-01    EU-AI-ACT-ANNEX-IV
  SUPPLY-CHAIN-01           SECURITY-HARDENING  RUNTIME-INTEGRITY   LOAD-PROOF
```

### CCVS compliance status API

```
GET  /api/ccvs/compliance-status   → claim_pass_eligible (true/false), shield badge colour
POST /api/ccvs/compliance-status   → CI uploads { matrix, run_id, mutation_score }
                                     Cached in-memory (resets on cold start)

GET  /api/ccvs/evidence-chain      → severity table, requirement catalog, chain integrity,
                                     drift_status
```

### EU AI Act Annex IV endpoint

```
GET /api/compliance-evidence-pack/annex4
    → 9 items mapped to DSG controls (JSON)
    ?format=html → styled HTML checklist

GET /api/compliance-evidence-pack
    → printable HTML compliance report
    ?print=1 → auto-print PDF mode
```

---

## Hermes Managed Agents surface

### REST API routes

```
/api/hermes/agents/
  GET    /api/hermes/agents          list
  POST   /api/hermes/agents          create
  GET    /api/hermes/agents/[id]     get
  PUT    /api/hermes/agents/[id]     update
  DELETE /api/hermes/agents/[id]     delete (archive)

/api/hermes/sessions/
  GET    /api/hermes/sessions        list
  POST   /api/hermes/sessions        create
  GET    /api/hermes/sessions/[id]   get
  PUT    /api/hermes/sessions/[id]   update
  DELETE /api/hermes/sessions/[id]   archive
  GET    /api/hermes/sessions/[id]/events        list events
  POST   /api/hermes/sessions/[id]/events        push event
  GET    /api/hermes/sessions/[id]/events/stream SSE (polls up to 25s)
  GET    /api/hermes/sessions/[id]/threads       thread list

/api/hermes/memory-stores/, /api/hermes/vaults/, /api/hermes/skills/,
/api/hermes/environments/, /api/hermes/user-profiles/, /api/hermes/webhooks/
  Standard CRUD + archive pattern per resource

GET /api/hermes/enroll?token=...    enrollment token validation
```

### Supabase schema (migration 20260604_hermes_managed_agents.sql)

11 tables: `hermes_agents`, `hermes_sessions`, `hermes_session_events`,
`hermes_memory_stores`, `hermes_memories`, `hermes_vaults`, `hermes_skills`,
`hermes_environments`, `hermes_user_profiles`, `hermes_webhooks`, `hermes_threads`

All tables: RLS enabled, org-scoped (`org_id` FK).

### MCP tool surface

```
POST /api/mcp
  app/api/mcp/route.ts
  JSON-RPC 2.0

  methods/tools/list → 33 hermes.* tools + 10 DSG tools + Android tools
  methods/tools/call → dispatches to tool handler

  Auth: requireOrgRole(['operator','org_admin']) before any hermes.* call
  orgId: always from server-verified access.orgId, never from caller args
  role:  hardcoded to 'operator' in buildAgentContext, never read from args
```

### Hermes chat pipeline

```
User → POST /dashboard/hermes (SSE)
     → app/api/agent-chat/route.ts  (or agent-chat-v2)
     │
     ├── planGoal regex → select DSG_TOOLS[] to call
     ├── Execute tools sequentially (real API routes)
     │     readiness, list_agents, create_agent, list_executions,
     │     get_execution_proof, get_audit, get_usage, fetch_url,
     │     browser_navigate (Browserbase optional), write_code_file,
     │     run_code (→ /api/dsg/brain/execute), realtime_web_search,
     │     telegram_send, auto_setup, get_compliance_status, …
     ├── synthesizeWithClaude (claude-haiku-4-5-20251001)
     ├── evaluateAnswerGate() — pure TypeScript, no LLM
     │     detectClaimsInReply() → BLOCK_UNSUPPORTED_CLAIM if unverified
     └── Stream reply via SSE (event: assistant_reply | done | step_start |
                                      step_result | step_error)
```

---

## DSG Brain / Controlled Executor

```
lib/dsg/brain/
│
├── plan-attempt.ts
│     PlanAttempt — immutable snapshot of approved plan
│     planHash = SHA-256(canonicalize({ goal, steps[], constraints[], approvedAt }))
│     Deterministic: same plan inputs → same hash always
│
├── controlled-executor.ts
│     ExecutionGrant — scoped to planHash, agentId, orgId, expiry
│     CredentialLease — short-lived secret reference (redacted fingerprint only)
│     Controls: allowed steps, allowed credential refs, execution window
│
├── conformance-gate.ts
│     Validates executed commands against:
│       - allowedCommands[] whitelist (exact match)
│       - allowedPaths[] canonical path prefix
│       - planHash match (must equal approved hash)
│       - evidence presence (no evidence → BLOCK)
│     Result: CONFORM | DEVIATION | BLOCK
│
├── credential-broker.ts
│     Queries dsg_secrets table (Supabase)
│     Returns: { fingerprint, leaseId } — never raw secret value
│     Lease stored in dsg_secret_leases table
│
├── shell-executor.ts
│     Runs commands from allowedCommands whitelist only
│     Captures stdout/stderr for conformance evidence
│
└── hermes-plugin.ts
      Orchestration scaffold:
        proposePlan() → PlanAttempt
        brokerCredentials() → CredentialLease[]
        buildControlledContext() → ExecutionContext
        executeControlled() → conformance check per step
        onDeviation() → remediation hook

POST /api/dsg/brain/execute
  Accepts: { runtime, code, filename }
  shell-executor: allowedCommands + allowedPaths enforced
  Returns: { stdout, stderr, exitCode, evidence }

POST /api/dsg/code/write
  Secret pattern block: sk-ant-*, SUPABASE_SERVICE_ROLE, etc.
  Path traversal guard: resolved path must be under allowed canonical paths
  Returns: { written: true, path }
```

---

## Dashboard surfaces

| Page | Route | Auth |
|---|---|---|
| Welcome / onboarding | `/dashboard/welcome` | Supabase session |
| Agents | `/dashboard/agents` | operator |
| Execution list + proof viewer | `/dashboard/executions` | operator |
| Audit trail | `/dashboard/audit` | operator |
| Policy editor | `/dashboard/policies` | operator |
| Approvals queue | `/dashboard/approvals` | operator |
| Hermes chat | `/dashboard/hermes` | operator |
| DSG Brain UI | `/dashboard/dsg-brain` | operator |
| Billing / usage | `/dashboard/billing` | operator |
| Webhook integrations | `/dashboard/integrations` | operator |
| DeFi config | `/dashboard/settings/defi` | org_admin |
| Team | `/dashboard/team` | org_admin |

Middleware: `middleware.ts` → Supabase SSR session check on `/dashboard/**`, `/approvals/**`, `/gateway/monitor/**`.

`DecisionExplainer` component (`components/DecisionExplainer.tsx`) — converts raw `ALLOW / STABILIZE / BLOCK` into plain-language what / why / next-action. Wired into `/dashboard/executions` and gateway monitor "Latest visible proof" card.

---

## Library modules

| Module | File | Purpose |
|---|---|---|
| Spine engine | `lib/spine/engine.ts` | `executeSpineIntent`, `issueSpineIntent` |
| Spine pipeline | `lib/spine/pipeline.ts` | Step pipeline runner |
| Gate | `lib/runtime/gate.ts` | Runtime gate logic (100% line/branch coverage enforced) |
| Runtime commit | `lib/runtime/commit-rpc.ts` | `runtime_commit_execution` Supabase RPC |
| Agent auth | `lib/agent-auth.ts` | `resolveAgentFromApiKey` (SHA-256 hash lookup) |
| Authz runtime | `lib/authz-runtime.ts` | Internal service vs user session paths |
| Release gate | `lib/release-gate/checker.ts` | GO/NO-GO verdict + network error handling |
| Entitlements | `lib/release-gate/entitlements.ts` | Active entitlement DB check |
| CORS | `lib/security/cors.ts` | `buildCorsHeaders`, `buildPreflightResponse` |
| Rate limit | `lib/security/rate-limit.ts` | Upstash Redis rate limiting |
| Body safety | `lib/security/request-json.ts` | `readJsonBody` (size + depth limited) |
| API error | `lib/security/api-error.ts` | `handleApiError`, secret key redaction |
| Billing meter | `lib/billing/metered.ts` | `meterExecution` — outbox pattern |
| Quota | `lib/usage/quota.ts` | `checkQuota`, `incrementQuota` |
| CCVS collector | `lib/ccvs/evidence-collector.ts` | Evidence envelope construction |
| CCVS drift | `lib/ccvs/drift-detector.ts` | Schema / policy drift detection |
| CCVS matrix | `lib/ccvs/compliance-matrix.ts` | Requirement → control mapping |
| Gate engine | `lib/dsg/deterministic/gate-engine.ts` | `evaluateDeterministicGate` |
| Proof engine | `lib/dsg/deterministic/proof-engine.ts` | `generateProof` |
| Answer gate | `lib/dsg/answer-gate/answer-gate-evaluator.ts` | `evaluateAnswerGate` |
| Claim detector | `lib/dsg/answer-gate/claim-detector.ts` | `detectClaimsInReply` |
| Plan attempt | `lib/dsg/brain/plan-attempt.ts` | `PlanAttempt`, `planHash` |
| Conformance gate | `lib/dsg/brain/conformance-gate.ts` | Command/path/hash validation |
| Credential broker | `lib/dsg/brain/credential-broker.ts` | Secret lease (fingerprint only) |
| Agent governance | `lib/agent-governance/service.ts` | Execution request + proof assembly |

---

## Commands

```bash
# Development
npm run dev                    # next dev -p 3000
npm run build                  # next build
npm run typecheck              # tsc --noEmit -p tsconfig.typecheck.json

# Tests
npm run test                   # vitest run (all)
npm run test:unit              # vitest run tests/unit    (60 files)
npm run test:integration       # vitest run tests/integration (21 files)
npm run test:failure           # vitest run tests/failure
npm run test:coverage          # vitest run --coverage
npm run test:mutation:ci       # npx stryker run (break gate: score < 70%)

# Formal proofs (Python — requires: npm run proof:install)
npm run proof:install          # pip install -r tools/proofs/requirements.txt
npm run verify:policy          # 8 Z3 theorems: 5 core policy + 3 DeFi constraints (lib/gateway/z3/)
npm run proof:revenue          # 16 Z3 billing theorems
npm run proof:answer-gate      # 22 Z3 answer gate invariants

# CCVS pipeline
npm run ccvs:emit              # emit evidence envelope
npm run ccvs:verify            # verify chain_hash integrity
npm run ccvs:matrix            # generate compliance matrix JSON
npm run ccvs:pipeline          # coverage → emit → verify → matrix

# Evidence + compliance
npm run build-evidence-bundle  # scripts/build-evidence-bundle.mjs
npm run generate-sbom          # scripts/generate-sbom.mjs (CycloneDX 1.4)

# Production gate
npm run go:no-go <url>         # scripts/go-no-go-gate.sh

# Security
npm audit --audit-level=high
bash scripts/check-request-body-safety.sh

# Benchmarks
npm run benchmark:gateway      # scripts/benchmark-gateway-production.mjs
npm run benchmark:vendors      # scripts/benchmark-vendors.mjs

# Database
npm run db:types               # supabase gen types typescript → lib/database.types.ts
```

---

## Supabase migrations

78 migration files in `supabase/migrations/` — chronological from `20260323` to `20260615`.

Key migrations:

| File | Schema object |
|---|---|
| `20260331_runtime_spine.sql` | `runtime_intents`, `runtime_executions` |
| `20260331_runtime_spine_rpc.sql` | `runtime_commit_execution` RPC |
| `20260523000000_billing_meter_outbox.sql` | `billing_meter_outbox` (outbox pattern) |
| `20260604_hermes_managed_agents.sql` | 11 Hermes tables (RLS, org-scoped) |
| `20260612041000_create_claim_readiness_artifacts.sql` | `claim_readiness_artifacts` (append-only RLS) |
| `20260613000001_billing_meter_outbox_rls_and_monitoring.sql` | Outbox RLS hardening |
| `20260613000002_dsg_auth_indexes_and_audit.sql` | Auth indexes + audit triggers |
| `20260615000001_integration_webhook_deliveries.sql` | Webhook delivery log |
| `20260615000002_fix_api_key_usage_summary_security_invoker.sql` | `api_key_usage_summary` view invoker fix |

---

## Docs index

| Doc | Path |
|---|---|
| Deploy runbook | `docs/RUNBOOK_DEPLOY.md` |
| Repo truth | `docs/REPO_TRUTH.md` |
| Project truth | `PROJECT_TRUTH.md` |
| Agent operating guide | `CLAUDE.md` |
| Tool/API contract | `docs/agents/CLAUDE_TOOL_API_CONTRACT.md` |
| Credential broker spec | `lib/dsg/brain/CREDENTIAL_BROKER.md` |
| CCVS evidence standard | `docs/CLAIM_EVIDENCE_STANDARD.md` |
| WORM storage policy | `docs/compliance/WORM_AUDIT_STORAGE_POLICY.md` |
| EU AI Act Annex IV | `docs/compliance/EU_AI_ACT_ANNEX_IV_TECHNICAL_FILE.md` |
| Load proof | `docs/compliance/LOAD_PROOF_READINESS.md` |
| Load test | `load/README.md` |
| Android agent | `apps/android/` |
| Stripe App | `packages/stripe-app/docs/` |
| Managed Agents example | `examples/managed-agent-session/` |
| Competitive brief | `docs/COMPETITIVE_BRIEF_CISCO_PANW_2026-06-15.md` |
| Dev activity report | `docs/DSG_ONE_DEV_ACTIVITY_REPORT_2026-06-15.md` |
| Scripts reference | `scripts/SCRIPTS_REFERENCE.md` |

---

**Formal verification artifact (Zenodo / CERN OpenAIRE):**
`https://doi.org/10.5281/zenodo.18225586`

**GitHub Marketplace Action:**
`uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.1.0`

**Android APK:**
`https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/releases/tag/android-apk-latest`
