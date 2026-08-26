# Requirements and Definition of Done

## Product objective

DSG ONE becomes the operating and governance layer for agentic organizations. A user states the goal once. The system organizes agents, skills, tools, cron and workflows, but every external action remains bound to the approved plan, measurable success criteria and evidence.

## User-visible outcome

The user must be able to see, without reading raw logs:

- what the system is doing now;
- whether the current step passed, is under review, is blocked, or was not run;
- the baseline metric and candidate metric;
- whether the metric improved;
- what failed and why;
- the evidence reference;
- the exact next action.

## System boundaries

### Control Plane
Owns goal, canonical plan, scope, approval, authorization, policy and promotion decision.

### DSG ONE v1
Owns orchestration, agent organization, skills/tools selection, controlled runtime and implementation execution.

### AGI Simulation
Owns deterministic candidate generation, fitness/evaluation and constraint-oriented simulation. It cannot authorize execution or promotion.

### Cinema Proof Agent
Owns independent verification of raw evidence, plan alignment, proof receipt and replay.

### Unified Data Monitoring
Owns observation, metrics, drift/divergence detection and evidence intake. It cannot authorize execution.

### GitHub Actions
Owns CI/test/build/artifact/scheduled execution substrate with least-privilege permissions.

## Functional requirements

R1. Every execution action must reference an approved plan hash and declared allowed scope.
R2. Actions inside an approved plan must not require redundant approval unless the plan/policy explicitly requires user takeover.
R3. Out-of-plan actions must fail closed.
R4. Monitoring must use real observations or report NOT_RUN/REVIEW/BLOCK; placeholder/empty defaults cannot be treated as PASS.
R5. Every observation must bind repository, commit SHA, metric name/value, source and evidence hash/reference.
R6. AGI Simulation outputs improvement candidates with baseline/candidate metrics and constraint results; it cannot write production authority state.
R7. Implementation agents write only approved paths on non-production branches, run required verification, and produce commits/PRs rather than directly mutating main/master.
R8. Cinema verifies raw evidence and must reject caller-asserted success as proof.
R9. Promotion requires plan alignment, required tests, evidence completeness, declared constraints and independent verification.
R10. Post-deploy observation must compare actual results against the promoted candidate expectation.
R11. A detected regression must produce BLOCK/REVIEW plus remediation or rollback action; it cannot silently become the next baseline.
R12. Replay must bind to pinned hashes/versions and report mismatch/unverifiable explicitly.
R13. Context state and evidence must survive chat/session/agent boundaries through this repository-backed work ledger.
R14. Secrets are referenced symbolically only; secret values must never be committed to work-context files.

## Unified Monitoring repair requirements

M1. Work starts from a branch descended from Unified Monitoring `main`; do not directly merge unrelated `master` history into `main`.
M2. Transplant/rebuild only inspected source from `master` that is required by the accepted architecture.
M3. Commit a valid dependency lockfile and make `npm ci` reproducible.
M4. Add/fix TypeScript configuration and actual root entrypoints/scripts referenced by package scripts.
M5. Required CI must fail on dependency, lint, typecheck, test or build failure; remove `|| true` and equivalent masking.
M6. Add actual tests for observation, divergence, error/NOT_RUN behavior and API integration.
M7. Wire API handlers to the real monitoring implementation; remove placeholder production responses.
M8. Separate service-role administrative observation from non-bypass tenant-isolation proof.
M9. Docker build/runtime health checks must validate the actual application entrypoint.
M10. Scheduled endpoint checks must distinguish unavailable credentials/environment from a successful check.

## Acceptance matrix

- Missing lockfile -> CI BLOCK.
- Dependency install failure -> CI BLOCK.
- TypeScript error -> CI BLOCK.
- Unit/integration test failure -> CI BLOCK.
- Empty placeholder metrics -> never PASS.
- Missing live credential -> NOT_RUN/BLOCK with reason and next action.
- Plan hash mismatch -> BLOCK and no executor call.
- Candidate outside approved scope -> BLOCK and no executor call.
- Candidate improves metric but breaks constraint -> BLOCK.
- Candidate regresses objective beyond tolerance -> BLOCK.
- Evidence tampering -> verification failure.
- Same canonical inputs/versions -> deterministic replay match where the component contract promises determinism.
- Valid candidate + all required tests + evidence + Cinema proof -> promotion ALLOW.
- Promotion ALLOW -> PR/promotion path may proceed according to approved plan.
- Promotion BLOCK -> no production mutation.
- Post-deploy regression -> detected and surfaced with remediation/rollback path.
- Plan-authorized normal action -> executes without invented redundant approval.

## Definition of Done

The complete project is DONE only when all items below have concrete evidence references:

1. Unified Monitoring has a reviewable integration PR into `main` from a branch with valid ancestry.
2. Real CI passes dependency install, lint, typecheck, tests, build and Docker checks with no masked failures.
3. Monitoring API reports real observations or explicit NOT_RUN/REVIEW/BLOCK; no placeholder is used as PASS evidence.
4. All five repositories are registered with role, branch, exact commit SHA and contract version where applicable.
5. AGI Simulation consumes observed/evaluation data and produces a measurable candidate with reproducible evidence.
6. Control Plane binds candidate implementation to an approved plan/scope.
7. DSG ONE v1 executes an approved implementation through a controlled branch/test/build flow.
8. Cinema independently verifies evidence bound to the candidate commit/plan and emits a proof/replay result.
9. Promotion Gate produces a deterministic ALLOW/REVIEW/BLOCK result with exact reason and next action.
10. Positive E2E proof exists: Goal -> Observe -> Plan -> Approval -> Candidate -> Implement -> Test -> Evaluate -> Cinema Proof -> PR/Promotion -> Observe Again -> Evidence/Replay.
11. Negative E2E proof exists: invalid/regressing/out-of-plan candidate -> BLOCK -> no production promotion.
12. Final delivery report links the relevant commits, PRs, workflow runs, proof receipts, metric deltas and unresolved limitations.

If code is complete but one or more proof obligations are missing, use `IMPLEMENTED_UNVERIFIED` or `PARTIALLY_VERIFIED`, never `DONE`.
