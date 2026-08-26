# Agentic Organization Orchestrator Protocol

## Purpose
Coordinate multiple repository lanes in parallel without losing plan authorization, evidence, or state continuity.

## Required lifecycle
1. Load `WORKSTREAM.json`, `WAVES.json`, `REQUIREMENTS.md`, `STATE.md`, and `HANDOFF.md`.
2. Refresh the target repository HEAD and compare it with the recorded baseline/refreshed SHA.
3. If drift exists, record it before mutation. Never silently rebase assumptions.
4. Execute only the lane outputs and paths authorized by the approved workstream.
5. Every mutation must occur on the lane branch, never directly on `main`/`master`.
6. Run secret-independent validation first. Missing production credentials must produce `NOT_RUN` or an explicit blocker, never synthetic PASS.
7. Record commit SHA, test/run evidence, blockers and next action after every material checkpoint.
8. A lane may report `READY_TO_JOIN` only when its contract and required tests pass.
9. Join gates compare canonical schema versions and evidence bindings across all lanes.
10. No candidate, simulation or runtime agent may authorize its own production promotion.

## Lane status vocabulary
`QUEUED | RUNNING | BLOCKED | FAILED | READY_TO_JOIN | JOINED | COMPLETED`

## Evidence vocabulary
`commit | workflow_run | test_output | build_output | contract_check | observation | metric | candidate | proof | pr | deployment | replay`

## Fail-closed rules
- Unknown schema version: BLOCK.
- Missing repository/commit binding: BLOCK.
- Plan/scope mismatch: BLOCK.
- Missing required evidence: BLOCK.
- Secret-dependent check without verified secret: NOT_RUN, never PASS.
- Regression outside approved tolerance: BLOCK.
- Self-issued promotion verdict: BLOCK.

## Parallelism rule
Lanes W1-A through W1-E are independent and should progress concurrently. Cross-repo integration begins only after the W1 join gate. A blocked lane does not erase evidence from successful lanes; the orchestrator records partial completion and remediation.
