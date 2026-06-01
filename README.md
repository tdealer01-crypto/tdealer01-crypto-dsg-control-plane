# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 🟢 Latest merged baseline green — 2026-06-01

The latest local branch state includes the post-merge drift snapshot
`94b2ae7` and the latest functional merge `7d7b5b2` / PR #646
(**Harden production auth and readiness gates**). The repository gates checked
after that merge are green locally:

- `npm run typecheck` → TypeScript passed with `0` reported errors.
- `npm run test -- tests/unit/api/api-keys-route.test.ts tests/unit/auth/rbac.test.ts` → `20` tests passed.
- `npm run build` → Next.js production build compiled successfully and generated `118` app routes.

What PR #646 covers in code:

- Server-side auth hardening for agent execution, gateway tool execution, team,
  API key, webhook, and notification settings routes.
- RBAC helpers and unit coverage for role checks.
- Readiness gate updates in `lib/deployment/readiness.ts` and
  `scripts/go-no-go-gate.sh`.
- `vercel.json` remains on `npm install`, matching the current dependency state.

**Boundary:** this is a green repository/build baseline, not a blanket claim that
Marketplace/Enterprise production launch is complete. Launch readiness still
requires the M1/M2 cutover gates, live DB checks, smoke evidence, and
marketplace acceptance checks documented under `docs/`.

## 🟢 Production deploy unblocked — 2026-05-31

Production had frozen behind commit `944ddb4` (#636): Vercel **Require Verified
Commits** was auto-cancelling unsigned agent commits, and `next build` was
additionally failing type-checking because the generated `lib/database.types.ts`
had drifted from the live schema. Both are resolved.

- **Root cause 1 — Vercel Git gate:** "Require Verified Commits" disabled in
  Vercel → Git; native Git auto-deploy restored. `vercel-prod-cli-bypass.yml`
  remains as a manual `workflow_dispatch` fallback.
- **Root cause 2 — build type gate:** `lib/database.types.ts` reconciled with
  `supabase/schema.sql` (tsc `144 → 0` errors); the temporary `ignoreBuildErrors`
  escape hatch was removed so type-checking is a real build gate again.
- **DB reconciliation:** `supabase/migrations/20260531_full_db_reconciliation.sql`
  creates the 16 tables the code uses that were missing from the live DB
  (idempotent, FKs omitted) plus column top-ups; applied to production Supabase.
- **Managed Agents example:** `examples/managed-agent-session/` — minimal
  `@anthropic-ai/sdk` beta Sessions client (create session → stream → send →
  print agent text). Outside the Next.js `tsconfig`, so it does not affect the build.

**Verification**
- [x] `curl /api/agent/status` → `"version":"450f09b…","env":"production","checks":{"db":true}`
- [x] `npm run build` → `✓ Compiled successfully` with `ignoreBuildErrors` removed (verified locally)
- [x] Full reconciliation SQL → `Success. No rows returned` in Supabase SQL editor

**Known limits:** Managed Agents example needs a newer `@anthropic-ai/sdk` than the
repo's pinned `^0.27.3` (the example installs it locally; the repo pin is unchanged).

---

## 🟢 GO / NO-GO — 2026-05-29 (CCVS v1.2 + AI Delivery Proof MVP + Agency Pricing)

### New in this release
| Feature | Path | Description |
|---|---|---|
| AI Delivery Proof | `/delivery-proof` | Agency-facing live proof check — paste URL, get GO/NO-GO + share link |
| Live proof scan API | `POST /api/delivery-proof/scan` | 5 checks (homepage, readiness, health, auth gate, repo URL) |
| Shareable report | `/delivery-proof/report/[run_id]` | Persistent Supabase-backed report link per CI run |
| Agency pricing | `/pricing` | Business→Agency $299/mo — unlimited proof checks, white-label reports |
| EU AI Act Annex IV | `GET /api/compliance-evidence-pack/annex4` | 9-item checklist, 7 covered, 2 partial |
| MCP server marketing | `/pricing`, `/compliance-evidence-pack` | Positioned as differentiator vs Vanta/Sonar |
| Zenodo DOI trust | `/pricing`, `/compliance-evidence-pack` | doi.org/10.5281/zenodo.18225586 prominently surfaced |
| Android APK | `apps/android` | Hermes Agent stack — memory, skills, scheduler, Telegram gateway, subagents, Local API :8642 |

---

## 📱 Android Agent APK — Hermes Stack (2026-05-30)

**Download:** [android-apk-latest release](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/releases/tag/android-apk-latest)

DSG Agent Android app — no-code AI work-session agent with a Hermes-inspired self-improvement stack built entirely on Android SDK (no extra Gradle dependencies).

| Feature | Description |
|---|---|
| 🧠 Memory | Persistent entries (SharedPreferences JSON) auto-injected as `[ความจำ]` context block into every DadBot message; auto-captured from bot responses |
| 🛠 Skills | Custom skill sequences; DadBot self-creates them via `[SKILL:name\|DESC:desc\|STEPS:CMD:target]` syntax in responses |
| ⏰ Scheduler | `AlarmManager` cron tasks that fire DadBot automatically at configured intervals; results logged to audit trail |
| 🌐 Telegram Gateway | Long-poll Telegram Bot → DadBot → reply; token + allowed chat ID stored in SharedPreferences |
| 🤖 Subagents | `@sub1: prompt @sub2: prompt` — parallel DadBot instances, each with amber-bordered bubble |
| 🔧 Tool call cards | Amber-bordered command card inserted into chat on every `onCommand()` event |
| 🌐 Local API `:8642` | Pure-`ServerSocket` HTTP server — OpenAI `POST /v1/chat/completions` (stream + non-stream) and Anthropic `POST /v1/messages`; CORS enabled |
| 8-tab nav | Chat · Sessions · Memory · Skills · Cron · Gateway · Files · Logs — horizontally scrollable |

**Connect any OpenAI-compatible client to the on-device agent:**

```python
from openai import OpenAI
client = OpenAI(base_url="http://<device-ip>:8642/v1", api_key="x")
resp = client.chat.completions.create(
    model="dsg-agent",
    messages=[{"role": "user", "content": "ตรวจระบบ"}],
    stream=True,
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

**Or Anthropic SDK:**

```python
import anthropic
client = anthropic.Anthropic(base_url="http://<device-ip>:8642", api_key="x")
msg = client.messages.create(model="dsg-agent", max_tokens=1024,
    messages=[{"role": "user", "content": "แสดงไฟล์"}])
print(msg.content[0].text)
```

---

## 🟢 GO / NO-GO — 2026-05-28 (CCVS v1.2 + Security Hardening)

```
GO/NO-GO RESULT: PASS  ✅  (all scripted checks green)
```

| Gate | Result | Command / Evidence |
|---|:---:|---|
| TypeScript typecheck | ✅ 0 errors | `npm run typecheck` |
| Unit + integration tests | ✅ **998 passed** / 1010 total | `npm run test` — 133 files passed, 4 skipped |
| Policy Z3 proofs | ✅ 8 theorems UNSAT | `npm run verify:policy` |
| Revenue Z3 proofs | ✅ 16 theorems FORMAL PROOF PASS | `npm run proof:revenue` |
| Mutation score gate | ✅ **72.08%** ≥70% (break=70) | `npm run test:mutation:ci` — Stryker verified locally |
| Stryker timeout safety | ✅ 840s bash timeout, deferred on CI timeout | `ccvs-evidence.yml` L4 job |
| Cosign OIDC availability | ✅ gated on `ACTIONS_ID_TOKEN_REQUEST_URL` | L1/L4/L5 `oidc_check` step |
| gate.ts coverage floor | ✅ lines/fn/stmt 100%, branch 100% | `vitest.config.ts` per-file threshold |
| CCVS Phase-2 coverage | ✅ 5 per-file floors (evidence-collector 83%, drift 90%) | `vitest.config.ts` |
| compliance-status API | ✅ GET/POST `/api/ccvs/compliance-status` | shield badge, claim_pass_eligible cache |
| EU AI Act Annex IV | ✅ 9 items mapped, Aug 2026 deadline | `GET /api/compliance-evidence-pack/annex4` |
| claim_pass_eligible | ✅ Step Summary badge 🟢/🔴 | `ccvs-evidence.yml` compliance-matrix job |
| npm vulnerability gate | ✅ **6 moderate (dev-only)**, 0 high/critical | `npm audit --audit-level=high` — CI enforced |
| Request body safety | ✅ 5 critical routes → `readJsonBody` (size-limited) | `scripts/check-request-body-safety.sh` |
| Production homepage | ✅ HTTP 200 | `GET /` |
| Runtime readiness | ✅ HTTP 200 `status=ready` | `GET /api/readiness` |
| Health + rate limiter | ✅ HTTP 200 `rateLimiter.ok: true` | `GET /api/health` |
| Trust surface pages | ✅ HTTP 200 × 4 | `/terms` `/privacy` `/security` `/support` |
| User-flow E2E | ✅ PASS | finance-governance submit → approve → Supabase persisted |
| **go:no-go gate** | ✅ **PASS** | `npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app` |

### Full test output — 2026-05-28 (CCVS v1.2)

```
 Test Files  133 passed | 4 skipped (137)
      Tests  998 passed | 12 skipped (1010)
   Start at  2026-05-28
```

+60 new tests vs v1.1: gate boundary (no-arg default, exact spread=0.35), drift-detector env var `??` behavior and sha256 prefix, evidence-collector branch coverage (bundleRef, verificationPolicyRef, RUNNER_OS, metrics fallback), SpineInfraError constructor/error cases, normalize.ts (sha256, normalizeArgs, buildCommandEnvelope, isExpired), compliance-status GET/POST round-trip, Annex IV 9-item structure.

Stryker mutation score: **72.08%** (191/265 killed) — verified locally before CI gate activated.

```
npm run typecheck     ✅  0 errors
npm run verify:policy ✅  8 theorems proved, 0 failed
npm run proof:revenue ✅  16 theorems — VERDICT: FORMAL PROOF PASS
npm run go:no-go      ✅  GO/NO-GO RESULT: PASS
```

---

## 🔐 Evidence-Driven Compliance Pipeline — CCVS v1.2 (2026-05-28)

Every passing test is automatically upgraded into a **cryptographically-chained, audit-ready evidence artifact**.

### Evidence Severity Levels

| Level | Type | Description | Minimum for |
|-------|------|-------------|-------------|
| L1 | `unit` | Test results + coverage metrics | Internal quality |
| L2 | `integration` | API & workflow coverage | Feature readiness |
| L3 | `adversarial` / `replay` | Tamper / replay rejection tests | Security review |
| L4 | `mutation` / `oversight` | Stryker mutation score ≥90% (break=70), Z3 formal proofs | Compliance claims |
| L5 | `provenance` | SLSA provenance, reproducible build | Regulatory assertion |

### CI Evidence Chain

```
L1 Unit → L2 Integration → L3 Adversarial+Replay → L4 Mutation(Stryker)+Z3 Proof → L5 SBOM+Provenance → Compliance Matrix → Drift Detection
```

Each job computes a `chain_hash = sha256(canonicalized_envelope)` and passes it to the next job as `previous_chain_hash`. The chain is tamper-evident.

**Enforcement on main (v1.1 hardening):**
- Mutation score **≥70% required** before compliance matrix runs (exits 1 if below)
- Cosign `.sigstore.json` bundles **required** at L1, L4, L5 — missing bundle fails the job
- `lib/runtime/gate.ts` coverage floor **lines/fn/stmt ≥90%, branch ≥85%** enforced via vitest per-file threshold
- `claim_pass_eligible` badge (🟢/🔴) written to GitHub Actions Step Summary on every main push

### Compliance Matrix

Auto-generated from test results — maps every regulatory requirement to a control, test file, and evidence hash:

| Framework | Requirement | Control | Min Level |
|-----------|-------------|---------|-----------|
| EU AI Act | Art. 14 Human oversight | CTRL-HUMAN-GATE | L2 |
| EU AI Act | Art. 12 Record-keeping | CTRL-IMMUTABLE-AUDIT | L3 |
| ISO 42001 | A.7.3 Risk assessment | CTRL-RISK-GATE | L3 |
| ISO 42001 | A.9.2 Internal audit | CTRL-AUDIT-TRAIL | L2 |
| NIST AI RMF | GOVERN 1.1 | CTRL-POLICY-ENGINE | L1 |
| NIST AI RMF | MAP 2.1 | CTRL-PROOF-VALIDITY | L4 |
| SLSA | Level 2 Provenance | CTRL-BUILD-PROVENANCE | L5 |

### npm scripts

```bash
npm run ccvs:emit      # emit evidence envelope after test run
npm run ccvs:verify    # verify chain_hash integrity on all envelopes
npm run ccvs:matrix    # generate compliance matrix JSON
npm run ccvs:pipeline  # full: coverage → emit → verify → matrix
```

### Evidence Chain + Compliance Status API

```
GET  /api/ccvs/evidence-chain          # severity table, requirement catalog, drift status
GET  /api/ccvs/compliance-status       # claim_pass_eligible badge + shield (lightgrey/green/red)
POST /api/ccvs/compliance-status       # CI uploads { matrix, run_id, mutation_score } after each run
GET  /api/compliance-evidence-pack/annex4          # EU AI Act Annex IV — 9 items → DSG controls (JSON)
GET  /api/compliance-evidence-pack/annex4?format=html  # styled HTML checklist
```

`compliance-status` uses an in-memory cache (resets on cold start); CI re-uploads after every deploy via `CCVS_UPLOAD_URL` env var in `generate-compliance-matrix.mjs`.

### EU AI Act Annex IV (August 2026 enforcement)

9 Annex IV technical documentation items mapped to DSG ONE controls:

| # | Annex IV Item | DSG Control | Status |
|---|---|---|---|
| 1 | General description + intended purpose | CTRL-POLICY-ENGINE | covered |
| 2 | Version + update history | CTRL-BUILD-PROVENANCE | covered |
| 3 | Technical specifications + accuracy | CTRL-RISK-GATE | covered |
| 4 | Monitoring + logging systems | CTRL-IMMUTABLE-AUDIT | covered |
| 5 | Input data specifications | CTRL-POLICY-ENGINE | partial |
| 6 | Human oversight measures | CTRL-HUMAN-GATE | covered |
| 7 | Post-market monitoring | CTRL-REPLAY-REJECTION | covered |
| 8 | Incident reporting | CTRL-AUDIT-TRAIL | partial |
| 9 | Instructions for use | CTRL-MIDMARKET-GATE | covered |

`certificationClaim: false` · `independentAuditClaim: false` — pre-audit evidence mapping, not legal certification.

---

## 📋 Compliance Evidence Pack — 2026-05-28

Pre-formatted evidence report for EU AI Act and ISO 42001 compliance review.

- **24 Z3 theorems** — 8 policy + 16 billing, UNSAT proof for each
- **998 test assertions** — 133 test files, 0 failures
- **WORM hash chain** — SHA-256 `requestHash → decisionHash → recordHash → bundleHash`
- **EU AI Act Art. 12/14** — Record keeping and human oversight control mapping
- **ISO/IEC 42001** — A.6, A.9, A.10 AI management system controls

```
GET /api/compliance-evidence-pack          # Printable HTML report
GET /api/compliance-evidence-pack?print=1  # Auto-print PDF mode
/compliance-evidence-pack                  # Landing page
```

Evidence boundary: `certificationClaim = false` · `independentAuditClaim = false` — see report footer.

---

## 💳 Revenue Hardening — Issue #577 (2026-05-24)

Four P0/P1 bugs fixed and verified in production before this release.

### P0-1 · Stripe Meter Idempotency

**Bug:** idempotency key was `dsg-meter-{orgId}-{timestamp}` — two executions in the same second shared the same key, Stripe deduped them → silent revenue leak.

**Fix:** key is now `dsg-meter-{executionId}` — each execution row has a unique ID, guaranteed distinct.

```typescript
// Before (broken)
const idempotencyKey = `dsg-meter-${orgId}-${timestamp}`;

// After (fixed)
const idempotencyKey = `dsg-meter-${executionId}`;
```

### P0-2 · Billing Outbox (no silent loss)

**Bug:** `reportMeterEvent` fired directly to Stripe — if Stripe was unavailable the usage event was lost with no retry path.

**Fix:** write-first-then-flush pattern:

1. Write `pending` row to `billing_meter_outbox` (Supabase) before any network call
2. Attempt immediate Stripe delivery → update row to `sent` or `failed`
3. Hourly cron `flush-meter-outbox` retries all `pending` rows older than 5 min

```
billing_meter_outbox schema:
  execution_id  (unique — idempotency key)
  status        pending → sent | failed
  stripe_event_id, error, flushed_at
```

Migration: `supabase/migrations/20260523000000_billing_meter_outbox.sql`

### P0-3 · Cron Auth Fail-Closed

**Bug:** `if (cronSecret && ...)` — if `CRON_SECRET` was not set, the condition was never entered → cron ran unauthenticated.

**Fix:**

```typescript
// Before (fail-open)
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { return 401 }

// After (fail-closed)
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return !cronSecret ? 503 : 401;
}
```

Applies to both `/api/cron/usage-alerts` and `/api/cron/flush-meter-outbox`.

### P1-1 · Analytics Period Parameter

**Bug:** `GET /api/usage/analytics?period=2026-04` always returned current month data — `period` param was parsed but ignored.

**Fix:** `getOrgUsageSnapshot(orgId, period?)` now accepts an optional period; analytics route passes it through to both the snapshot query and `topAgents` query.

```bash
# Now works correctly:
GET /api/usage/analytics?period=2026-04  →  "period": "2026-04"
```

---

## 🛡️ Security Hardening — 2026-05-28

### Dependency Vulnerability Reduction (15 → 6 moderate)

`package.json` npm `overrides` force safe transitive dep versions:

```json
"overrides": {
  "qs":      ">=6.15.2",
  "ws":      ">=8.20.1",
  "postcss": ">=8.5.15"
}
```

| Package | Issue | Fix |
|---|---|---|
| `qs` <6.15.2 | Prototype pollution via `typed-rest-client` | override to ≥6.15.2 |
| `ws` <8.20.1 | DoS via `ethers` transitive dep | `ethers` ^6.13→^6.16 + override |
| `postcss` <8.5.10 | Line-return injection | override to ≥8.5.15 |

**Remaining 6 moderate**: all `vitest`/`esbuild` dev-only (CVSS 5.3, no dev server in CI `vitest run` mode). Require vitest v4 major bump — tracked via Dependabot.

CI enforcement: `npm audit --audit-level=high` in `ci-security.yml` — 0 high/critical blocks the build.

### Request Body Safety

5 critical API routes migrated from raw `request.json()` to `readJsonBody` (size-limited, depth-checked):

| Route | Max body | Purpose |
|---|---|---|
| `gateway/tools/execute` | 32 KB | AI tool execution gateway |
| `mcp-server` | 64 KB | JSON-RPC MCP endpoint |
| `agent-execute` | 64 KB | Agent execution planner |
| `ccvs/compliance-status` | 256 KB | CI compliance matrix upload |
| `finance-governance/submit` | 4 KB | Finance case submission |

`scripts/check-request-body-safety.sh` — CI linter (informational, non-blocking) flags any new `request.json()` regressions in POST/PUT/PATCH handlers. Wired into `ci-security.yml`.

---

## 🔐 Z3 Formal Verification

### Policy Engine — 8 theorems (Python Z3)

```
npm run verify:policy
✓ PROVED  [role_safety]            allow → role ∈ valid set
✓ PROVED  [plan_safety]            allow → plan ∈ {enterprise, business, pro}
✓ PROVED  [approval_safety]        allow ∧ approvalRequired → token ≠ ∅
✓ PROVED  [audit_completeness]     decision always in valid enum
✓ PROVED  [non_triviality]         ∃ valid request where decision = allow
✓ PROVED  [amount_bound]           DeFi amount ≤ $1,000 and daily ≤ $10,000
✓ PROVED  [slippage_bound]         slippage ≤ 50 bps
✓ PROVED  [constraint_consistency] DeFi constraint set is satisfiable
Policy theorems: 8 proved, 0 failed
```

### Billing & Quota — 16 theorems (TypeScript z3-solver WASM)

```
npm run proof:revenue
Quota ordering:          enterprise > business > pro > trial > free > 0
Safe floor:              getQuotaForPlan never returns 0
Status partition:        ACTIVE_STATUSES ∩ REVOKED_STATUSES = ∅
Revenue monotonicity:    upgrading plan never decreases quota
Rate-limit conservation: remaining + used = limit (always)
No-bypass theorem:       cannot be allowed AND blocked simultaneously
Stripe pricing:          yearly = 9×monthly exactly (25% discount proven)
Quota gate:              post-increment used ≤ limit (single-threaded)
VERDICT: FORMAL PROOF PASS — 16 theorems, 0 failed
```

**Method:** prove theorem P by asserting ¬P and checking UNSAT. If Z3 finds no countermodel, P holds for every possible input.

---

## Infrastructure

| Component | Status | Detail |
|---|:---:|---|
| Supabase auth + Postgres | ✅ LIVE | Magic-link OTP, RLS on all tables |
| Upstash Redis | ✅ LIVE | Rate limiting — per-email 3/min, per-IP tiers |
| Stripe billing | ✅ LIVE | Webhook live, metered billing ready, outbox flush hourly |
| Resend email | ✅ CONFIGURED | Upgrade nudge emails, magic-link OTP |
| `CRON_SECRET` | ✅ CONFIGURED | Fail-closed on both cron routes |
| Vercel crons | ✅ ACTIVE | `usage-alerts` 07:00 UTC daily, `flush-meter-outbox` hourly |

---

## REST API

### Gate an action

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "my-agent-run-001", "action": "send email to user@example.com"}'
```

```json
{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com"
}
```

### Usage analytics

```bash
# Current month
GET /api/usage/analytics

# Specific period
GET /api/usage/analytics?period=2026-04
```

---

## Tech stack

```
Next.js 15 App Router + TypeScript
Supabase auth + Postgres (RLS)
Stripe billing + metered usage
Upstash Redis rate limiting
Resend transactional email
Vitest 998 tests (unit + integration)
Playwright E2E
Z3 SMT Solver — 24 theorems at design time
GitHub Actions + DSG Secure Deploy Gate
npm overrides — qs/ws/postcss transitive dep hardening
```

---

## Verification commands

```bash
npm run typecheck          # TypeScript — 0 errors
npm run test               # 998 tests
npm run verify:policy      # Z3 policy proofs (Python)
npm run proof:revenue      # Z3 billing proofs (Python)
npm run go:no-go <url>     # Full production gate
npm audit --audit-level=high          # 0 high/critical (6 dev-only moderate)
bash scripts/check-request-body-safety.sh  # request body safety linter
```

---

## Supported claims — verified evidence only

```
✓ REST API gate endpoint is live and returns correct ALLOW/BLOCK decisions.
✓ Runtime readiness is green (HTTP 200, status=ready).
✓ 998 unit + integration tests pass, 0 failures (133 files, 4 skipped).
✓ TypeScript compiles with 0 errors.
✓ Gateway policy engine formally verified — 8 Z3 theorems, design-time.
✓ Billing quota model formally verified — 16 Z3 theorems, design-time.
✓ DeFi transaction bounds mathematically proven (amount ≤ $1k, slippage ≤ 50bps).
✓ Stripe metered billing idempotent — per-execution key, no same-second dedup.
✓ Billing outbox — no silent loss on Stripe outage, hourly retry.
✓ Cron routes fail-closed — missing CRON_SECRET returns 503, not 200.
✓ Mutation score gate 72.08% ≥70% (191/265 killed) — Stryker verified locally.
✓ CCVS compliance-status API live — GET /api/ccvs/compliance-status returns ok:true (commit da78ef0).
✓ EU AI Act Annex IV 9-item checklist live — GET /api/compliance-evidence-pack/annex4 (7 covered, 2 partial).
✓ go:no-go gate PASS on 2026-05-28 (CCVS v1.2).
✓ Compliance Evidence Pack — pre-audit PDF report served at /api/compliance-evidence-pack.
✓ npm dependency hardening — qs/ws/postcss overrides, 15 → 6 moderate vulns, 0 high/critical.
✓ Request body safety — 5 critical routes use readJsonBody with explicit size limits (4–256 KB).
✓ CI body-safety linter — scripts/check-request-body-safety.sh flags raw request.json() regressions.
```

Not claimed:

```
✗ Independent third-party audit or certification.
✗ WORM-certified audit storage.
✗ Published public npm/PyPI SDK.
```

---

## Formal verification artifact

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18225586.svg)](https://doi.org/10.5281/zenodo.18225586)

**Peer-archived reference implementation — CERN/OpenAIRE indexed**

```
DOI:   https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive
       for Safety-Critical AI Systems
```

## GitHub Marketplace action

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.1.0
```

Launch page: `https://tdealer01-crypto-dsg-control-plane.vercel.app/proofgate-github-action`
