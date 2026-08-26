# DSG ONE Agentic Organization E2E — Durable Work Context

Created: 2026-08-25T07:53:00+07:00
Canonical owner: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
Context branch: `workstream/agentic-org-e2e-context`

## Purpose

This directory is the durable source of working context for the cross-repository DSG ONE Agentic Organization project. It exists so the work can be resumed after a chat/session/agent handoff without relying on conversational memory.

The target system is:

`Goal -> Approved Plan -> Agent/Skill/Tool/Workflow organization -> Controlled Execution -> Observation/Metric -> AGI Simulation/Eval -> Candidate Improvement -> Test/Build -> Cinema Independent Proof -> Promotion Gate -> PR -> Deploy -> Observe Again -> Evidence/Replay`

## Canonical roles

- Control Plane: canonical authority for goal, plan, scope, approval, policy and promotion decision.
- DSG ONE v1: operating/runtime layer for planner, agents, skills, tools and controlled execution.
- AGI Simulation: deterministic candidate/evaluation engine; may propose improvements but never authorize itself.
- Cinema Proof Agent: independent verifier for plan alignment, evidence, proof receipts and replay.
- Unified Data Monitoring: observe/metric/evidence-intake layer; it does not issue execution authority.
- GitHub Actions: execution/evidence substrate for CI, build, test, artifacts, PR automation and scheduled checks.

## Non-negotiable invariants

1. Self-improvement is not self-authority.
2. No direct production mutation outside an approved plan/scope.
3. Plan-authorized execution is allowed; DSG must not invent additional blocking prompts for actions already covered by the approved plan.
4. No mock/placeholder result may be reported as PASS or production evidence.
5. Missing/unavailable checks report `NOT_RUN`, `REVIEW`, or `BLOCK` with reason and next action.
6. Candidate promotion requires measurable evidence, constraints, tests, plan alignment and independent proof.
7. No agent may silently change the goal, success metric, policy authority, or approval boundary.
8. Every meaningful state transition must be recoverable from GitHub state/evidence without chat history.
9. Secrets are never stored in this directory; only symbolic secret names and verification status are stored.
10. Final delivery is not complete until positive and negative E2E proof flows are recorded.

## Resume protocol — mandatory

Before any new mutation:

1. Read `README.md`, `WORKSTREAM.json`, `REQUIREMENTS.md`, `DECISIONS.md`, `STATE.md`, `EVIDENCE_INDEX.md`, and `HANDOFF.md` in this directory.
2. Refresh current HEAD SHA for every repository listed in `WORKSTREAM.json`.
3. If any pinned baseline changed, record the drift before editing.
4. Continue from `next_action`; never infer completion from an old chat message.
5. Re-read repository-local agent instructions before editing that repository.

After every meaningful mutation or verification result:

1. Update phase/task status in `WORKSTREAM.json`.
2. Append concrete evidence in `EVIDENCE_INDEX.md` (repo, SHA/run/PR/artifact, result, timestamp).
3. Update `HANDOFF.md` with exact current state, blockers and next action.
4. If a decision changed, append it to `DECISIONS.md`; do not silently rewrite history.
5. Commit the context checkpoint before ending a work session or handing off to another agent.

## Delivery rule

The project may be called delivered only when the Definition of Done in `REQUIREMENTS.md` is satisfied with linked evidence. If implementation exists but proof is incomplete, report `IMPLEMENTED_UNVERIFIED` or `PARTIALLY_VERIFIED`, not `DONE`.
