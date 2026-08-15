# DSG ONE Canonical Product E2E Plan

Date baseline: 2026-08-15

## Product position

DSG ONE is a verification layer for agent actions after authorization and before/after execution.

Primary customer question:

> Can this agent action be independently verified, executed as authorized, and replayed from evidence?

DSG ONE should not compete on generic approval prompts, policy toggles, dashboards, or basic monitoring. Those are increasingly platform features. DSG ONE differentiates on deterministic verification, exact/constraint proof, execution binding, evidence receipts, and replay.

## Canonical chain

Authenticated AGI/AIMO request
→ deterministic Simulation / scenario witness
→ canonical QUBO problem
→ Ising candidate search
→ Z3 feasibility verification
→ exact optimality proof when tractable
→ VERIFIED_GLOBAL_OPTIMUM only when the optimum claim is actually proven
→ Verified Action Compiler / Action IR
→ DSG plan + scope + authorization gate
→ ALLOW or BLOCK
→ pre-execution ROM/Desktop/Browser/Shell simulation
→ controlled executor
→ observed postconditions
→ local/runtime evidence
→ deterministic receipt
→ replay / audit verification
→ Trinity MCP / Unify surface

No stage may silently create a second independent production decision engine.

## Truth boundaries

1. Simulation may generate candidates or predict outcomes. It does not authorize execution.
2. Ising may produce a candidate. Candidate quality is not itself a proof.
3. Z3 SAT proves feasibility of the pinned assignment under encoded constraints. SAT alone is not proof of global optimality.
4. VERIFIED_GLOBAL_OPTIMUM may be emitted only when the objective and constraints are bound to the same canonical problem and exact optimality is actually proven.
5. Compilation PASS is not execution permission.
6. ALLOW is issued only after verified plan/scope/authorization checks.
7. An execution is complete only after observed postconditions and evidence are recorded.
8. Replay must bind to the same hashes/versions and clearly report mismatch or unverifiable states.

## Immediate technical blocker before strong global-optimum marketing

The current QUBO builder is primarily feasibility/penalty oriented. Before using VERIFIED_GLOBAL_OPTIMUM as a paid product claim for business optimization, DSG ONE needs an explicit domain objective with versioned semantics, for example cost, risk, latency, capital usage, expected loss, or deployment risk. The objective hash must be included in the canonical problem hash and used by Ising and exact/Z3 verification.

For problem sizes above the exact proof bound, the product must downgrade the claim to VERIFIED_FEASIBLE or another accurately scoped verdict rather than claiming global optimum.

## Paid offers

### Offer A — Verified Agent Action

Customer supplies or authorizes an agent plan. DSG verifies constraints and plan alignment before execution, then produces evidence and replay receipt after execution.

Customer-visible result:
- VERIFIED + ALLOW + EXECUTED + REPLAYABLE
- or BLOCK with exact reason and remediation

Best initial use cases: finance operations, payment workflows, approvals with external effects, deployment agents, regulated automation.

### Offer B — Verified Deployment Proof

GitHub/Vercel workflow:
Authorize repository/project → bind commit and plan → verify constraints → deploy → observe health/postconditions → issue deployment proof receipt → replay.

Positioning:
GitHub authorization/policy → DSG verification → controlled execution → evidence/replay receipt.

Do not position DSG as a replacement for GitHub enterprise policy controls.

### Offer C — Audit Evidence Pack

Convert logs, runtime telemetry, Supabase evidence, plan hashes, proof hashes, execution receipts, and replay results into a human-readable/exportable evidence pack.

Do not compete with Grafana/Supabase as a monitoring dashboard. Monitoring data is input evidence; verified evidence is the paid output.

## User experience

The core product flow must be shorter than the current integration burden:

Install → Connect → Choose verification profile → Run first verified action → See proof

The main execution screen should show only the information needed to make a decision:

Plan | Constraints | Decision | Execution | Evidence | Replay

BLOCK states must show:
- what failed
- why it failed
- what the user must change

ALLOW states must show:
- what was authorized
- what actually ran
- observed postconditions
- receipt/proof hashes
- replay status

Advanced solver, Z3, Ising, and QUBO details belong in an expandable proof view, not the first screen.

## Distribution order

### 1. GitHub Action first

Goal: zero-new-dashboard adoption for engineering teams.

Installation target:
Add DSG GitHub Action → authenticate → select verification profile → next PR/deployment receives proof status/check and receipt.

GitHub Action should block only unsupported or unverified execution claims/actions outside the authorized plan. It must not block plan-authorized execution merely because DSG is present.

### 2. Direct DSG ONE API + MCP

Expose canonical verification through DSG ONE API and Trinity MCP so desktop/agent clients can request verify → execute → evidence → replay using the same proof model.

### 3. Vercel integration / Marketplace preparation

Target install path:
Install → authorize project → choose policy/profile → run first verification → see proof.

Provisioning, authentication, usage metering, billing handoff, project linking, and first-run verification must be automated before marketplace submission.

### 4. Finance vertical package

Ship one concrete finance demo rather than a generic agent demo.

Recommended first scenario:
Agent proposes a financial or deployment action with an external effect → simulation → constraint/objective model → Ising candidate → Z3/exact verification → approved action compilation → controlled execution → evidence → replay.

The demo must measure:
- replay match rate
- evidence completeness
- constraint/policy violation detection
- deterministic receipt consistency
- time-to-first-proof

## Revenue funnel

Landing page claim → interactive verified-action demo → GitHub/Vercel install → first proof → evidence history → paid quota / team / audit export.

The paid conversion event should be tied to a useful verified outcome, not account creation or dashboard access.

Suggested packaging logic:
- one-time Verified Readiness / Deployment Proof
- Solo: limited projects/executions
- Team: shared evidence/replay and alerts
- Production: higher execution limits, audit export, policy/constraint profiles, support

Pricing must be validated from actual conversion data before being treated as final.

## Implementation phases and Definition of Done

### Phase 0 — Canonical truth contract

Deliver:
- one canonical problem schema
- objective version + constraint version
- problemHash/objectiveHash/constraintHash
- one verdict vocabulary
- no duplicate production gates

Done when same normalized input produces the same canonical hashes and different objective/constraint versions produce different hashes.

### Phase 1 — Simulation → QUBO → Ising → Z3 → exact proof

Deliver:
- bind deterministic simulation witness to canonical problem
- build QUBO from the same canonical data
- Ising candidate with solutionHash
- Z3 pinned-assignment feasibility proof
- exact optimality proof for tractable sizes
- accurate downgrade for unproven optimum

Done when:
- same input + seed → same hashes/verdict
- invalid candidate → BLOCKED_INFEASIBLE
- better candidate exists → BLOCKED_NOT_GLOBAL_OPTIMUM
- proven optimum → VERIFIED_GLOBAL_OPTIMUM
- oversized exact case → no false global-optimum claim

### Phase 2 — Verified Action Compiler

Deliver:
- map verified solution into deterministic Action IR
- preserve every supported parameter
- reject unsupported or dropped parameters
- bind upstream proofHash to actionPlanHash

Done when plan mutation, missing parameter, unsupported mapping, or proof mismatch fails closed.

### Phase 3 — DSG ALLOW/BLOCK

Deliver:
- plan hash verification
- scope/RBAC/authorization verification
- action envelope verification
- idempotency / replay protection

Done when:
- plan-authorized valid action → ALLOW
- plan mismatch → BLOCK
- scope mismatch → BLOCK
- unsupported action → BLOCK
- same idempotency key cannot cause duplicate execution

### Phase 4 — Pre-execution simulation + executor

Deliver:
- ROM/Desktop/Browser/Shell simulation for the compiled Action IR
- controlled executor invoked only after ALLOW
- execution exactly once

Done when BLOCK never invokes executor and ALLOW invokes only the approved action/arguments.

### Phase 5 — Evidence + deterministic receipt + replay

Deliver:
- observed result/postconditions
- evidence hashes
- solver and policy versions
- chainHash/receiptHash
- durable evidence storage
- replay endpoint and UI

Done when tampering with plan, proof, evidence, outcome, or version is detected and replay gives a clear deterministic/mismatch/unverifiable result.

### Phase 6 — Trinity MCP + Unify

Deliver:
- same canonical tools available through Trinity MCP
- no alternate decision logic in MCP/Desktop surfaces
- local executors return result receipt to DSG ONE

Done when MCP/Desktop requests produce the same proof/decision hashes as the API path for the same canonical request.

### Phase 7 — GitHub Action paid wedge

Deliver:
- installable workflow/action
- verification check on PR/deploy
- proof receipt artifact/status
- one-click route to evidence view

Done when a new customer can install and obtain a first real proof without manually wiring solver internals.

### Phase 8 — Vercel distribution

Deliver:
- automated project authorization/linking
- provisioning
- environment setup
- first verification
- usage/billing integration
- marketplace-ready metadata/docs

Done when install-to-first-proof is a short guided flow with no secret hunting for normal customers.

### Phase 9 — Finance launch

Deliver:
- one finance-specific verification profile
- benchmark against non-verified baseline
- finance evidence pack
- case-study/demo flow

Done when DSG can demonstrate measurable improvement in verification/replay/evidence quality without claiming capabilities not proven by the benchmark.

## Priority order from now

P0: finish canonical proof chain and eliminate false/ambiguous global-optimum claims.

P1: connect VERIFIED_GLOBAL_OPTIMUM → Action IR → DSG ALLOW/BLOCK → executor → evidence → replay → Trinity/Unify in one automated E2E test.

P2: ship GitHub Action + Verified Deployment Proof as the first low-friction paid wedge.

P3: expose Evidence Pack and replay UI.

P4: automate Vercel install/provisioning and prepare marketplace distribution.

P5: package the first finance vertical and benchmark it.

## Product success metrics

Technical:
- deterministic replay match rate
- evidence completeness rate
- false ALLOW rate
- false BLOCK rate
- proof verification latency
- exact-proof coverage by problem size
- executor duplicate rate

Product/revenue:
- install → first proof conversion
- time to first proof
- first proof → second verified action rate
- free → paid conversion after verified outcome
- verified actions per active project
- evidence-pack export rate
- paid retention by project/team

## Stop-doing list

Do not prioritize another generic dashboard, generic monitoring, another approval UI, or a second policy engine before the canonical verified-action flow is complete.

Do not market Z3 SAT as global optimality.

Do not market deterministic replay unless the same input, objective, constraints, solver/policy versions, and evidence bindings are actually preserved or the product explicitly reports the boundary.

Do not add distribution channels before install-to-first-proof works reliably in the existing GitHub/Vercel path.
