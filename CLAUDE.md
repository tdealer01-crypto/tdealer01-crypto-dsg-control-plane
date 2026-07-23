# CLAUDE.md — DSG ONE / ProofGate AI Assistant Operating Guide

This file is the working guide for Claude Code and other AI assistants operating in this repository.
It explains the codebase structure, development workflow, verification expectations, and claim boundaries.

If this file conflicts with `AGENTS.md`, `docs/agents/CLAUDE_TOOL_API_CONTRACT.md`, security policy, or current verified evidence, stop and resolve the conflict before editing code, docs, migrations, deployment settings, or PR text.

---

## 0. Required startup sequence

Before making repository changes:

1. Read `AGENTS.md`.
2. Read this `CLAUDE.md`.
3. Read `docs/agents/CLAUDE_TOOL_API_CONTRACT.md`.
4. Inspect the exact file, issue, PR, branch, route, migration, workflow, deployment, or error referenced by the user.
5. Classify every important statement as one of:
   - `verified fact`
   - `inference`
   - `pending`
   - `blocked`
   - `not verified`
6. Make the smallest branchable change that solves the user goal.
7. Run the narrowest relevant verification available.
8. Report exact commands/results, or say `Not run` with the reason.

Do not skip inspection because a previous chat, README note, PR body, or memory says something exists. Repo and live system state can drift.

---

## 1. Truth boundary and claim policy

This repository is evidence-first. Do not put false text, fake evidence, guessed status, or exaggerated readiness claims into code, docs, PRs, commits, issues, comments, logs, or responses.

Acceptable evidence includes:

- inspected repository files;
- command output from a real run;
- GitHub metadata, workflow logs, artifacts, PR state, or commit state;
- Supabase schema/query/log/advisor output;
- Vercel project/deployment/build-log/runtime metadata;
- live endpoint responses from reachable public or explicitly authorized routes.

If evidence is missing, use `pending`, `blocked`, or `not verified`.

### Never claim without fresh evidence

Blocked unless separately proven by current evidence:

- `production-ready`
- `marketplace-ready`
- `enterprise-ready 100%`
- `full customer production go-live`
- `certified compliance`
- `guaranteed compliance`
- `third-party audited`
- `WORM-certified storage`
- `JWT/JWKS auth complete`
- `real cryptographic signing complete`
- `external production Z3 solver invocation`
- `mainnet launched`
- `TVL / DAU / users`

Allowed only when the current evidence supports it:

- `production-connected`
- `evidence-ready`
- `audit-ready`
- `governance-enabling`
- `deterministic gate scaffold`
- `setup-ready`
- `pre-audit evidence mapping`

---

## 2. Current product identity

The repository is the product shell for **DSG ONE / ProofGate Control Plane**.

Core framing:

- Product: AI runtime governance/control plane.
- Role: gate AI/agent actions before execution and record evidence/audit trails.
- Package name: `dsg-platform`.
- Primary production URL currently documented in repo: `https://tdealer01-crypto-dsg-control-plane.vercel.app`.

Important: product marketing copy, README release notes, and past PR bodies are not enough for new production claims. Re-check the live system before claiming current production health.

---

## 3. Canonical source order

When files disagree, prefer newer directly verified evidence, but do not silently rewrite history.

Use this order:

1. Live command/API/deployment/database evidence from the current task.
2. Current branch files inspected directly.
3. `AGENTS.md` for permanent agent rules.
4. `docs/agents/CLAUDE_TOOL_API_CONTRACT.md` for tool/API boundaries.
5. `PROJECT_TRUTH.md` for project control truth.
6. `docs/REPO_TRUTH.md` and `docs/RUNBOOK_DEPLOY.md` for route/deployment boundaries.
7. README release notes and PR bodies as useful context, not final proof.
8. Older docs and memories as historical hints only.

If a newer README says a claim is green but `PROJECT_TRUTH.md` or `docs/RUNBOOK_DEPLOY.md` is older, do not guess. Inspect current files, recent PRs, workflows, live endpoints, Supabase, and Vercel evidence as needed.

---

## 4. Repository map

### Root configuration

Common root files:

- `package.json` — npm scripts, dependencies, overrides.
- `tsconfig.json` — Next/TypeScript project include list.
- `tsconfig.typecheck.json` — typecheck-specific config.
- `next.config.js` — rewrites and security headers.
- `middleware.ts` — Supabase SSR session handling and protected-page redirects.
- `vitest.config.ts` — test environment, coverage, and thresholds.
- `playwright.config.ts` — browser/E2E config when present.
- `vercel.json` — Vercel install command and cron schedules.
- `.env.example` — environment variable names only, never values.

### App Router surface

- `app/` — Next.js 15 App Router pages, layouts, and route handlers.
- `app/api/**/route.ts` — server route handlers.
- `app/dashboard/**` — authenticated/operator UI surfaces.
- `app/delivery-proof/**` — AI Delivery Proof UI/report surface.
- `app/compliance-evidence-pack/**` and related API routes — compliance evidence surfaces.

### Core libraries

- `lib/spine/` — runtime spine intent/execute pipeline.
- `lib/runtime/` — canonical hashes, approvals, commit RPC, gate support, runtime helpers.
- `lib/dsg/deterministic/` — deterministic gate/proof scaffold.
- `lib/dsg/brain/` — DSG Brain / Hermes controlled-executor scaffold.
- `lib/security/` — CORS, API errors, rate limiting, body parsing/safety helpers.
- `lib/usage/` and `lib/billing/` — quotas, overage, billing helpers.
- `lib/supabase*` and `lib/database.types.ts` — Supabase server/client integration and generated types.
- `lib/ccvs/` — compliance/evidence matrix, evidence collection, drift detection.
- `lib/commands/` — command normalization helpers.

### Claude Code Skills

Skills provide guidance and implementation for governance decision-making. Invoke with `/dsg-action-layer-ged`, `/formal-verification`, etc.:

- `skills/dsg-action-layer-ged/` — Primary governance skill. Studio-style control: plan → deterministic gate → permission verdict → execution. Covers Deterministic Safety Gate (Z3/SMT), Replayable Governance, Compliance Evidence Pack, Runtime Lifecycle, and Hermes Executor. **When to use**: Agent action gating, compliance audits, credential-controlled execution, governance lifecycle management.
  - `SKILL.md` — Decision flow documentation
  - `skill.ts` — TypeScript implementation
  - `references/` — Gate evaluation, replay, compliance, runtime, and Hermes executor guides

- `skills/dsg-github-marketplace-action-controller/` — Package DSG gates and proofs as reusable GitHub Marketplace Actions. Deterministic GO/NO-GO validation, audit proof, secure deploy checks. **When to use**: Publishing governance-controlled actions to GitHub Marketplace.
  - `SKILL.md` — Action controller documentation
  - `skill.ts` — TypeScript implementation
  - `references/` — action.yml spec and GO/NO-GO logic guides

- `skills/dsg-multi-governance-orchestrator/` — Multi-source governance orchestration. UI trust upgrades, action-layer gates, deterministic execution, marketplace/enterprise cutover, architecture review, production GO/NO-GO. **When to use**: Coordinating multiple governance sources before production deployment.
  - `SKILL.md` — Orchestrator documentation
  - `skill.ts` — TypeScript implementation
  - `references/` — Architecture template and M1-M2 checklist

- `skills/formal-verification/` — Formal proof using Z3 SMT solver. Horn clauses, deterministic proof, invariant checking, counterexample generation, evidence production. **When to use**: Policy constraint verification, formal property checking, audit-ready proof generation.
  - `SKILL.md` — Formal verification documentation
  - `skill.ts` — TypeScript implementation
  - `skill.json` — Configuration metadata

- `skills/dsg-marketplace-fix/` — Remediation skill. Fixes premature README claims, verifies production OAuth endpoints, ensures compliance before marketplace launch. **When to use**: Preparing for marketplace publication, fixing compliance gaps, verifying production readiness.
  - `SKILL.md` — Marketplace fix documentation
  - `skill.ts` — TypeScript implementation

**Skill invocation pattern**:
```bash
# Within Claude Code, invoke by name:
/dsg-action-layer-ged <task description>

# Or call via Skill tool with args
Skill("dsg-action-layer-ged", "Goal: ..., Risk Level: medium, ...")
```

**Key skill design principles**:
- Each skill encodes governance decision logic (PLAN → GATE → DECIDE → EXECUTE → COMMIT → REPLAY).
- Skills call `runZ3AgentGate()` and `seedData()` from `lib/dsg/` for proof generation.
- Gate status is always one of: `PASS`, `REVIEW`, `BLOCK`, `UNSUPPORTED`.
- **UNSUPPORTED is never PASS** — it maps to REVIEW (low risk) or BLOCK (medium+).
- Every skill returns `proofHash` for audit replay.
- Mock state (`mockState: true`) disables production decisions.

### Tests and evidence

- `tests/unit/` — unit tests.
- `tests/integration/` — integration/API tests.
- `tests/failure/` — negative/adversarial/replay tests.
- `tests/e2e/` — Playwright tests.
- `tests/proofs/` — formal/proof-related test coverage.
- `qa-logs/` — historical run logs and snapshots when present.
- `coverage/`, `playwright-report/`, `test-results/` — generated outputs; do not treat as source unless produced by a current run.

### Supabase

- `supabase/migrations/` — schema migrations.
- `supabase/schema.sql` — schema snapshot/reference when present.
- `lib/database.types.ts` — generated types. If schema changes, regenerate from the live/project schema and verify typecheck.

### Workflows and deployment

- `.github/workflows/` — CI, CCVS evidence chain, Android/APK, deployment helper workflows.
- `scripts/` — verification, smoke, benchmark, deploy, evidence, and recovery scripts.
- `tools/proofs/` — proof tooling such as revenue formal proof scripts.

### Android agent

- `apps/android/` — Android DSG Agent APK.
- Key Android concepts include local memory, skills, scheduler, Telegram gateway, subagents, logs/audit, and a local API server on port `8642`.

### Examples

- `examples/managed-agent-session/` — standalone Managed Agents session example. It is intentionally outside the Next.js `tsconfig` include path and may require a newer local `@anthropic-ai/sdk` than the app dependency pin.

---

## 5. Package manager and scripts

This repo uses npm scripts.

Common commands:

```bash
npm run dev                 # next dev -p 3000
npm run build               # next build
npm run start               # next start -p 3000
npm run typecheck           # tsc --noEmit -p tsconfig.typecheck.json
npm run test                # vitest run
npm run test:unit           # vitest run tests/unit
npm run test:integration    # vitest run tests/integration
npm run test:failure        # vitest run tests/failure
npm run test:migrations     # vitest run tests/migrations
npm run test:coverage       # vitest run --coverage
npm run verify:policy       # policy proof script
npm run proof:revenue       # revenue/billing proof script
npm run go:no-go <url>      # production go/no-go gate
npm run ccvs:pipeline       # coverage -> evidence -> verify -> matrix
npm run test:mutation:ci    # Stryker mutation run
```

Live database and live browser checks require real environment variables and credentials. Do not run or claim those checks passed unless the current environment is actually configured.

### Vercel install command

`vercel.json` currently uses:

```json
"installCommand": "npm ci"
```

GitHub Actions workflows also use `npm ci`. Inspect the exact workflow before describing its behavior.

---

## 6. Verification ladder

Use the narrowest check that proves the change.

### Documentation-only change

Minimum:

```bash
# Usually no runtime test required.
# Verify by reading the rendered markdown or checking markdown syntax if tooling exists.
```

PR body must say:

```text
Verification:
- [x] Inspected relevant source files
- [ ] Runtime tests not run — docs-only change
```

### TypeScript/app code change

Run as applicable:

```bash
npm run typecheck
npm run test -- <targeted test file>
npm run test
npm run build
```

Use `npm run build` for Next.js page/component/route compile confidence. A passing Vitest suite does not prove `next build` passes.

### API route/security change

Run targeted tests plus one or more:

```bash
npm run test:unit
npm run test:integration
bash scripts/check-request-body-safety.sh
npm audit --audit-level=high
```

For public endpoints, use live or local curl only when environment is configured and authorized.

### Supabase migration change

Required process:

1. Inspect the exact SQL file.
2. Check idempotency and destructive operations.
3. Run migration only through authorized Supabase tooling or provide dashboard instructions.
4. Verify actual DB objects with SQL query results.
5. Regenerate `lib/database.types.ts` when schema changes.
6. Run `npm run typecheck`.

Never claim a table/function/index/policy exists without a query result or direct database evidence.

### Production/deployment change

Minimum evidence before GO:

- deployment status is `Ready`;
- required env vars are present by name, never printed values;
- Supabase migrations are applied to the target environment;
- `GET /api/health` returns expected public health response;
- `GET /api/agent/status` confirms deployed commit and DB check;
- `GET /api/readiness` or the relevant readiness route returns expected status;
- authenticated operator routes are checked with authorized credentials;
- `npm run go:no-go <production-url>` passes if that script is in scope.

If any required live evidence is absent, status is `NO-GO`, `pending`, or `not verified`.

### Formal proof and HPC verification

For deterministic gate / formal proof changes, use HPC verification to prove Z3 constraints:

```bash
# Local Z3 verification (requires Python + z3-solver)
npm run verify:policy:hpc:local

# Docker-containerized verification (requires Docker)
npm run verify:policy:hpc:docker

# docker-compose persistent environment
npm run verify:policy:hpc:compose

# Parallel CCVS evidence pipeline (L1-L5 in parallel)
npm run ccvs:hpc-parallel
```

**HPC Verification Approach:**

1. **Container-based**: Z3 SMT solver runs in NVIDIA HPC container for reproducibility
2. **Evidence-ready**: Outputs JSON proof artifacts suitable for L4/L5 CCVS evidence
3. **No external solver requirement**: `/api/dsg/v1/gates/evaluate` does NOT invoke external Z3; HPC verification is optional proof support only
4. **Parallel execution**: CCVS L1-L5 evidence can run in parallel for faster verification
5. **CI/CD integration**: GitHub Actions workflow `verify-hpc.yml` automates Z3 formal proof on push/PR

**Expected output:**

```json
{
  "schema": "ccvs-makk8-z3-proof-v1",
  "summary": {
    "samma_verified": true,
    "micha_detected": true,
    "formal_proof_ok": true
  },
  "cases": [...]
}
```

---

## 7. Core API and route conventions

### Public baseline probes

Common public probes:

```http
GET /api/health
GET /api/readiness
GET /api/agent/status
```

`/api/agent/status` is intentionally lightweight and unauthenticated. It returns repo identity, deployment version, environment, timestamp, and a minimal DB connectivity check.

### Stable execution entry

```http
POST /api/execute
```

This route re-exports the current spine execution route. Treat it as the stable compatibility entry.

### Current spine execution layer

```http
POST /api/intent
POST /api/spine/execute
```

Expected behavior:

- extract Bearer token;
- normalize spine payload;
- require `agent_id`;
- resolve agent from API key;
- require active agent status;
- apply rate limits and CORS;
- enforce quota before/around execution;
- issue/reuse pending runtime intent;
- execute through the spine pipeline;
- commit runtime evidence/lineage through the runtime commit RPC;
- return decision, reason, proof, pipeline trace, ledger/truth sequence, and usage where available.

Do not bypass this path for governed execution.

### Deterministic gate/proof scaffold

```http
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/gates/evaluate
POST /api/dsg/v1/proofs/prove
```

Important boundary:

- `POST /api/dsg/v1/gates/evaluate` is a DSG-native deterministic gate adapter.
- The route explicitly states external Z3 solver is not invoked by that route.
- `UNSUPPORTED` must never become `PASS`.
- Low-risk `UNSUPPORTED` maps to `REVIEW`; medium/high risk `UNSUPPORTED` maps to `BLOCK`.

### Authenticated/operator routes

Do not use these as anonymous health checks:

```http
GET /api/usage
GET /api/executions
GET /api/audit
GET, POST /api/policies
GET /api/capacity
POST /api/agent-chat
```

Evaluate these with authenticated, org-scoped access only.

### Delivery Proof

`POST /api/delivery-proof/scan` accepts a production URL, optional repo URL, and readiness path. It checks homepage, readiness, health, protected-route auth rejection, and repo URL presence, then returns a shareable report ID.

This is a proof scan helper, not a substitute for full production readiness.

---

## 8. Next.js and API coding conventions

- Use Next.js App Router route handlers in `app/api/**/route.ts`.
- Export `dynamic = 'force-dynamic'` for routes that must not be statically cached.
- For Next.js 15 dynamic route params, use async params shape, for example `params: Promise<{ id: string }>` and `await params` before reading values.
- Prefer `NextResponse.json(...)` for API responses.
- Use `handleApiError(...)` for standardized API error handling where existing route style does.
- Use `buildCorsHeaders(...)` and `buildPreflightResponse(...)` for routes needing CORS.
- For new critical POST/PUT/PATCH routes, prefer `readJsonBody(...)` with an explicit max size instead of raw `request.json()`. If raw `request.json()` is used, keep the blast radius small and justify it.
- Keep secrets server-side. Never pass secrets into client components, public env vars, markdown docs, logs, PR bodies, or examples.
- Preserve Thai text as valid UTF-8. Avoid mojibake.

---

## 9. Security conventions

### Secrets

Never commit or print:

- Supabase service-role keys;
- Vercel tokens;
- Stripe keys or webhook secrets;
- Anthropic/OpenAI/OpenRouter keys;
- GitHub PATs;
- cookies/session tokens;
- private `.env` values;
- customer private data.

Document environment variable names only.

### Middleware and auth

`middleware.ts` protects dashboard/app-shell/approvals/gateway monitor pages through Supabase SSR session checks. If Supabase public env vars are absent, protected routes should fail closed or redirect as implemented.

Do not assume API routes are protected by middleware. API auth must be implemented in the route or shared server helper.

### Cron routes

Cron routes must fail closed when `CRON_SECRET` is absent. Missing secret should not mean anonymous execution is allowed.

### Request body safety

For critical routes, size-limit JSON bodies with `readJsonBody(...)`. Keep body limits explicit and small:

- finance-style submission: small KB range;
- tool execution/MCP/agent routes: larger only when needed;
- CI matrix upload: large only if justified.

### Dependency security

`package.json` uses overrides for transitive dependency hardening. Do not remove overrides without running audit/build/test and explaining why the override is no longer needed.

---

## 10. Supabase and database conventions

- Use generated `lib/database.types.ts` for typed Supabase access where possible.
- Server-side privileged work must use server/admin helpers only on the server.
- Migrations must be idempotent when intended for dashboard/manual recovery.
- Dangerous SQL such as `DROP`, `TRUNCATE`, broad RLS disablement, or permissive policies require explicit review and evidence.
- RLS policy changes must state who can read/write and how org/workspace scoping is enforced.
- For live DB reconciliation scripts, distinguish clearly between:
  - tables created by the script;
  - columns topped up on existing tables;
  - FKs/RLS/triggers intentionally omitted;
  - static validation vs real live execution.

If a migration says a feature is ready but no applied-state query exists, status is `migration file exists`, not `live DB ready`.

---

## 11. Runtime spine conventions

The runtime spine is the governed execution path.

Expected flow:

1. Request arrives at `/api/execute`, `/api/intent`, or `/api/spine/execute`.
2. Agent is resolved from Bearer token and `agent_id`.
3. Quota and org/agent status are checked.
4. Runtime intent/approval key is created or reused.
5. Pipeline runs and produces final decision, policy version, proof, and trace.
6. Runtime commit RPC writes lineage/audit/truth state.
7. Response returns decision, proof, trace, usage, and sequence metadata.

Do not write around the runtime commit/audit path for governed actions.

If errors mention `runtime_commit_execution`, PostgREST schema cache, missing runtime RPC, or missing runtime spine tables, follow `docs/RUNBOOK_DEPLOY.md` recovery steps instead of inventing a fix.

---

## 12. Deterministic gate and formal proof conventions

The repo contains multiple proof/gate concepts. Keep them separate.

### Deterministic TypeScript gate scaffold

`lib/dsg/deterministic/**` and `/api/dsg/v1/gates/evaluate` implement a deterministic proof/gate scaffold.

Claim boundary:

- okay: deterministic TypeScript static-check scaffold;
- okay: policy version / constraint set hash / proof hash / input hash when returned by the route;
- not okay without extra evidence: external production Z3 solver invocation.

### Design-time Z3/proof scripts

Scripts such as `npm run verify:policy` and `npm run proof:revenue` are design-time or CI proof checks. They can support formal-property claims only for the exact models they check.

Do not convert design-time proof into an end-to-end product proof.

### Unsupported decisions

`UNSUPPORTED` is not success. The safe mapping is review/block, never pass.

---

## 13. DSG Brain / Hermes controlled executor

`lib/dsg/brain/` is server-side-only scaffolding for Hermes-style planning and controlled execution.

Key files:

- `plan-attempt.ts` — immutable plan snapshot and deterministic `planHash`.
- `controlled-executor.ts` — execution grants, credential leases, controlled context.
- `conformance-gate.ts` — validates executed commands, file paths, plan hash, and evidence.
- `credential-broker.ts` — Supabase-backed secret lookup and lease/fingerprint creation.
- `hermes-plugin.ts` — orchestration scaffold for plan proposal, credential brokering, controlled context, conformance validation, remediation hooks.
- `CREDENTIAL_BROKER.md` — detailed broker documentation and limits.

Rules:

- No raw secret exposure.
- No direct production mutation outside controlled execution.
- Every execution result must match the approved `planHash`.
- Every executed command must be whitelisted.
- Every changed path must be under an allowed canonical path.
- Evidence is required; no evidence means conformance block.
- `proposePlan()` is currently a deterministic scaffold/placeholder unless a current implementation proves live LLM integration.

Credential broker boundary:

- The broker can query `dsg_secrets` and return leases with redaction fingerprints.
- The migration defines `value TEXT` plus encryption metadata. Do not claim complete app-layer encryption, external vaulting, or production secret rotation unless verified from implementation and live config.
- Unit tests use mocked Supabase unless a live DB test is explicitly run.

---

## 14. Billing, quota, revenue, and cron conventions

Billing and quota are part of the governed execution path.

Known design principles:

- Metered usage must be idempotent per execution, not timestamp-only.
- Billing outbox should write before Stripe/network delivery so failures are retryable.
- Cron endpoints must require `CRON_SECRET` and fail closed when missing.
- Usage analytics period parameters must be honored when provided.
- Quota gates should block before governed execution when limits are exceeded.

Do not claim Stripe, billing, or quota is live for a target environment without current Stripe/Vercel/Supabase/runtime evidence.

---

## 15. Compliance / CCVS evidence conventions

The CCVS pipeline models evidence levels:

- L1 unit evidence;
- L2 integration evidence;
- L3 adversarial/replay evidence;
- L4 mutation/proof/oversight evidence;
- L5 provenance/build evidence.

Important:

- Evidence JSON and chain hashes are useful audit artifacts.
- Sigstore/Cosign bundles may be optional or informational depending on the workflow step; inspect the workflow before claiming enforcement.
- Compliance matrix output is pre-audit evidence mapping, not legal certification.
- `certificationClaim = false` and `independentAuditClaim = false` must remain respected unless a real third-party audit/certification artifact exists.

---

## 16. Android agent conventions

The Android app under `apps/android/` is separate from the Next.js app.

Current major concepts:

- persistent memory and context injection;
- custom skills;
- scheduler/cron-style tasks;
- Telegram long-poll gateway;
- subagents;
- command/audit logs;
- local API server on port `8642`;
- OpenAI-compatible `POST /v1/chat/completions`;
- Anthropic-compatible `POST /v1/messages`.

Android rules:

- Do not add Gradle dependencies casually; preserve the lightweight/no-extra-dependency approach unless the task explicitly requires otherwise.
- Kotlin 2.x catch blocks must use named exception variables, not underscore wildcards.
- Network tokens such as Telegram bot tokens must stay in app storage/runtime config, not repo code or logs.
- Local API CORS is permissive by design in the local server; do not describe it as internet-hardened without additional auth/network binding evidence.

---

## 17. Managed Agents example conventions

`examples/managed-agent-session/` demonstrates a standalone Anthropic Managed Agents session client.

Rules:

- It is outside the app `tsconfig` include path and should not affect `next build`.
- It may require a newer `@anthropic-ai/sdk` installed locally than the repo dependency pin.
- Do not move it into the main app dependency path without confirming SDK compatibility, typecheck, and build.
- Never commit `ANTHROPIC_API_KEY` or session secrets.

---

## 18. UI conventions

- Use existing components and layout patterns before introducing new UI systems.
- `lucide-react` is already a dependency.
- Do not assume `@/lib/utils` or a `cn()` helper exists. Some components intentionally use local `cx()` helpers.
- Dashboard pages are protected; public marketing pages are not proof of authenticated operator readiness.
- UI mock data is acceptable only when labelled as mock/non-production. For production claims, connect to Supabase-backed data and verify.

User-visible UI work should answer:

- What can the user do now?
- What became easier?
- What proof shows it works?
- What is the next step?

---

## 19. Git workflow

Default safe workflow:

1. Inspect files.
2. Create a focused branch.
3. Make a small change.
4. Run targeted verification.
5. Commit with an accurate message.
6. Open or update a PR.
7. Include verification and known limits.
8. Do not auto-merge production code without explicit approval and green gates.

Branch naming examples:

```text
claude/<short-task-name>
fix/<specific-bug>
docs/<specific-doc-change>
```

Commit messages should describe actual changes, not intentions or unverifiable outcomes.

---

## 20. Required PR body

Every agent PR must include:

```text
Goal:

Files changed:

Verification:
- [ ] command/result
- [ ] command/result

Known limits:

User-visible benefit:

Next step:
```

If no command was run, write `Not run` and explain why.

Do not hide failing tests. If a command fails due environment limits, state it as a warning with exact output or summary.

---

## 21. GitHub command handling

When a GitHub issue or PR comment starts with:

```text
@claude
@codex
@agent
@dsg-agent
```

Treat it as a proposed task, not permission to merge, deploy, change production env vars, disclose secrets, or bypass gates.

Before changing code from a comment:

1. Restate the verified goal.
2. Inspect `AGENTS.md`, this file, `docs/agents/CLAUDE_TOOL_API_CONTRACT.md`, and relevant files.
3. Identify risk and production impact.
4. Choose the smallest branchable change.
5. Define verification commands.

After changing code:

1. Run the narrowest relevant checks.
2. Report exact pass/fail results.
3. Open/update a PR.
4. Leave production release status `NO-GO` unless all live gates pass.

---

## 22. Deployment and production control loop

### Quick live identity check

```bash
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status"
```

Use this to confirm deployed commit, environment, and DB check. This is not enough by itself to claim full production readiness.

### Full production readiness check

Use `docs/RUNBOOK_DEPLOY.md` as the deployment source of truth.

Typical sequence:

1. Merge approved code to `main` only after PR gates pass.
2. Confirm Vercel deployment is `Ready`.
3. Confirm required env vars by name.
4. Confirm Supabase migrations are applied.
5. Run public smoke checks.
6. Run authenticated operator checks.
7. Run `npm run go:no-go <url>` when applicable.
8. Record evidence and known limits.

If Vercel cancels a build due unverified commits, follow the documented verified-commit/CLI bypass recovery path. Do not disable security settings or mutate production env vars without explicit approval and audit trail.

---

## 23. Common pitfalls

- Passing `npm test` does not prove `next build` passes.
- README release status can become stale; verify current state.
- A migration file existing does not prove it is applied to production.
- A Supabase generated type existing does not prove the live DB has the object.
- A route file existing does not prove the deployed route is live.
- A passing design-time proof does not prove end-to-end production formal verification.
- A local Android API server is not automatically internet-safe.
- `UNSUPPORTED` is never `PASS`.
- Mock data must never be described as production data.
- Docs saying "encrypted" are not enough; verify actual encryption implementation and key handling.

---

## 24. Safe default

If an instruction conflicts with verified evidence, `AGENTS.md`, this file, the tool/API contract, secrets policy, production safety, or user benefit, stop and report the conflict.

Do not guess. Do not overclaim. Do not make the answer pleasing at the cost of correctness.

The correct outcome is a small, verified improvement with clear user benefit and an honest next step.
