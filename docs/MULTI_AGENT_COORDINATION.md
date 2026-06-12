# Multi-Agent Deterministic Coordination (10 Agents + Z3)

Status: deterministic coordination scaffold — verified by local tests and `next build`.
This is **not** a production go-live claim. Execution defaults to `dry_run` and never
touches a real website.

## What this is

A coordinator that splits a task batch (DAG with dependencies) across up to 10
Hermes agents using the **Z3 SMT solver** (`z3-solver` npm, WASM, v4.16.x) for
constraint-based assignment, with a fully deterministic greedy fallback. Every
stage emits hashes so the whole run is replayable and verifiable.

```
Task DAG ──► Z3 constraint solve ──► per-agent assignment ──► parallel agents
   │            (capacity bounds)        (topological order)    (ROM + Safe DOM
   │                                                             + policy gate)
   └─ taskDagHash   └─ z3ProofHash       └─ assignmentHash       └─ evidence chain
                                                                   └─ masterEvidenceHash
                                                                   └─ coordinationProof
```

## Design decisions

### Broad Z3 model, not over-constrained

Per request ("ทำงานได้กว้างขึ้น ไม่เข้มเกินไป"), the Z3 model encodes only hard
feasibility constraints:

- each task variable `task_i_agent ∈ [0, numAgents)`
- per-agent capacity: `count(agent_a) <= maxTotalTasks_a`

Dependency ordering is **not** pushed into Z3. It is enforced afterwards by a
deterministic Kahn topological sort (ties broken by task id), applied to each
agent's `startOrder`. This keeps solves fast and avoids infeasibility from
over-constraining.

### Determinism strategy

- Task variables are created in canonical (sorted-by-id) order, so input array
  order does not change the model.
- Z3 with identical input and version returns the identical model
  (verified by repeated-solve check in this repo's environment).
- The greedy fallback (topological order → least-loaded agent, ties by lowest
  agentId) contains no randomness, so a fallback run is also reproducible.
- Hashes: `taskDagHash`, `constraintSetHash`, `z3ProofHash`, `assignmentHash`
  are all derived from canonicalized inputs with no timestamps.
- Execution evidence hashes are content-derived per task; the per-batch
  evidence chain is hash-linked and re-verifiable (`verifyEvidenceChain`).

### Safety reuse

Each agent executes through the existing Hermes E2E path, so all of these gates
apply per task:

1. `evaluateActionPolicy` — blocks credential-sensitive tasks (`CRITICAL`),
   routes high-impact ops to `REVIEW`/`SAFE_ALTERNATIVE`.
2. Safe DOM mirror — dangerous elements are filtered before the agent sees them.
3. `verifySafeDomCommand` — operation/element allow-list check.
4. Execution mode — `dry_run` (default) and `create_session_only` only;
   live execution stays disabled by default.

A blocked task is recorded as evidence and the agent continues with its next
task — one gated task does not silence the rest of the audit trail.

## Files

- `lib/dsg/multi-agent/types.ts` — Task/DAG/assignment/result types (reuses
  `ActionDescriptor` unions so tasks can't carry invalid domains/operations).
- `lib/dsg/multi-agent/z3-constraint-solver.ts` — Z3 WASM solve (cached init,
  timeout → fallback), greedy fallback, topological sort.
- `lib/dsg/multi-agent/task-assignment-engine.ts` — canonical hashing
  (`taskDagHash`, `constraintSetHash`, `assignmentHash`) and assignment validation.
- `lib/dsg/multi-agent/agent-executor.ts` — per-agent execution through
  ROM + Safe DOM + policy gates.
- `lib/dsg/multi-agent/result-aggregator.ts` — hash-linked evidence chain,
  per-agent evidence hashes, master evidence hash, chain verification.
- `lib/dsg/multi-agent/coordinator-service.ts` — batch orchestration
  (agents run in parallel; each agent runs its tasks sequentially in
  deterministic order) and input validation.
- `app/api/hermes/multi-agent/execute/route.ts` —
  `POST /api/hermes/multi-agent/execute` (size-limited body via `readJsonBody`,
  max 200 tasks per batch, `dry_run` default).
- `tests/integration/multi-agent-coordination.test.ts` — 12 tests covering the
  10-agent × 50-task DAG scenario.

## Measured behavior (this environment, 2026-06-12)

| Check | Result |
| --- | --- |
| Z3 WASM init (`z3-solver` npm) | ~2.1s (once per process, cached) |
| Z3 solve 50 tasks / 10 agents (capacity 10) | ~0.5–0.8s |
| Repeated solve, same input | identical model → identical `assignmentHash` |
| 50-task batch, dry_run | 40 SUCCESS / 10 BLOCKED (all credential tasks) |
| `browserbaseTouchedRealWebsite` | `false` for every result |
| Evidence chain verification | valid |
| `npm run typecheck` / `next build` | pass |

## Research summary (online, 2026-06)

- `z3-solver` (npm) 4.16.0, WASM build with TypeScript bindings, actively
  maintained by Microsoft Research; ~40k weekly downloads. Single async solve at
  a time per context — coordinator solves sequentially.
- Academic SMT multi-robot allocation results (arXiv 2403.11737) report ~1–2s
  solves around 10 agents / 20–30 tasks and poor scaling past ~100 tasks; this
  matches our measured envelope, hence the 200-task API cap and greedy fallback.
- Hash-based deterministic dispatch and master-worker patterns mirror existing
  in-repo precedents (`lib/parallel/harmony-engine.ts`, orchestrator skill).

## Self-hosted browser executor (touch real websites without Browserbase)

`lib/executors/local-browser.ts` is the self-hosted equivalent of the
Browserbase adapter. It drives a real Chromium via `playwright-core` (already a
repo dependency) instead of a paid cloud session, so an agent can act on a real
DOM with no external browser provider.

It runs behind the SAME safety layers, checked in this order:

1. `evaluateActionPolicy` — credential actions blocked (`CRITICAL`),
   high-impact actions routed to approval.
2. **Domain allowlist** — `allowedHosts` must match the target host (exact or
   subdomain); anything else returns `HOST_NOT_IN_ALLOWLIST`.
3. **`HERMES_LOCAL_BROWSER_LIVE` env flag** — live navigation is off by default;
   without it, `live` mode returns `LIVE_EXECUTE_DISABLED_BY_DEFAULT...`.
4. Safe DOM manifest — real DOM is extracted, dangerous elements filtered, only
   exposed element ids are actionable.
5. `verifySafeDomCommand` — element/operation allow-list check before any click
   or type.

Raw selectors never leave the server; evidence carries only `selectorHash`,
`domMirrorHash`, page title, and a screenshot SHA-256.

Modes: `dry_run` (default — checks policy + allowlist, never launches a
browser) and `live` (launches Chromium, requires the env flag).

### Verified locally (2026-06-12)

`npm run test:local-browser` — 5/5 passed against a real Chromium driving a
**local** HTML page (served from an in-process http server, no external site):

| Test | Result |
| --- | --- |
| dry_run host allowed, no browser launched | pass, `touchedRealWebsite=false` |
| host not in allowlist → blocked | pass |
| live without env flag → blocked | pass |
| credential action blocked before launch | pass (`CRITICAL`) |
| live: real Chromium types into real DOM input + screenshot evidence | pass, `touchedRealWebsite=true`, screenshot SHA-256 captured |

Requires Chromium installed (`npm run test:e2e:install`). On Vercel serverless,
prefer the existing `effect-callback` webhook pattern over driving a browser
inside one request (binary size / timeout). For continuous live use, run this
executor on a host/VPS/GitHub Actions, not in a serverless function.

### Browserbase vs self-hosted

| | Browserbase | Self-hosted (this file) |
| --- | --- | --- |
| touches real websites | yes | yes |
| external account / cost | yes | no |
| serverless-friendly | yes | no (run on host/VPS/Actions) |
| safety gates | shared | shared (identical policy + Safe DOM) |

## Claim boundaries

- OK to claim: deterministic assignment scaffold, Z3-solved capacity
  constraints, hash-linked per-agent evidence, dry-run safety.
- NOT claimable without new evidence: production deployment of this route,
  live (non-dry-run) browser execution, formal end-to-end proof of the whole
  pipeline, performance beyond the measured 50-task scale.
