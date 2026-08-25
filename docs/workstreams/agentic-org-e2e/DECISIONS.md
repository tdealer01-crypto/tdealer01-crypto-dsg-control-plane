# Decision Log

Decisions are append-only. If a decision changes, add a new entry that supersedes the old one; do not rewrite history.

## D-001 — Canonical authority

Date: 2026-08-25
Status: ACTIVE

Decision: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` is the canonical authority for goal, approved plan, allowed scope, policy and promotion decision.

Reason: Prevent a second independent production decision engine and keep approval semantics deterministic.

## D-002 — Runtime ownership

Date: 2026-08-25
Status: ACTIVE

Decision: `dsg-one-v1` is the operating/runtime layer for planner, agent organization, skills/tools selection and controlled execution. Reuse its existing plan -> approval -> runtime handoff -> agent runtime -> manifest -> PR -> audit-evidence flow where compatible.

## D-003 — AGI Simulation is candidate/eval only

Date: 2026-08-25
Status: ACTIVE

Decision: `dsg-agi-simulation` may evolve parameters, generate candidates and evaluate fitness/constraints, but may not directly promote itself or mutate production authority state.

Reason: Self-improvement must not equal self-authority.

## D-004 — Cinema is independent proof authority

Date: 2026-08-25
Status: ACTIVE

Decision: `DSG-Cinema-Proof-Agent` independently verifies raw evidence, plan alignment, receipts and replay. Caller-asserted success is not accepted as proof.

## D-005 — Unified Monitoring role

Date: 2026-08-25
Status: ACTIVE

Decision: `dsg-unified-data-monitoring` is the observation/metric/evidence-intake layer, not a policy or execution authority.

## D-006 — Do not merge unrelated monitoring histories

Date: 2026-08-25
Status: ACTIVE

Decision: Do not directly merge Unified Monitoring `master` into `main` because GitHub reports no common ancestor. Start an integration branch from `main` and transplant/rebuild inspected required source from `master`.

## D-007 — Fail-closed CI truth

Date: 2026-08-25
Status: ACTIVE

Decision: Required CI cannot use `|| true`, “no tests configured” success fallbacks, or placeholder outputs as proof. Dependency install, lint/typecheck, tests, build and required runtime checks must fail when broken.

## D-008 — Plan-approved actions do not need redundant prompts

Date: 2026-08-25
Status: ACTIVE

Decision: Once an implementation plan explicitly authorizes a class of low-risk actions, those actions may execute without repeated user approval. User takeover remains for items explicitly outside/at the boundary of the approved plan, unavailable credentials/OTP/CAPTCHA, or separately gated high-impact actions.

## D-009 — Repository-backed context is mandatory

Date: 2026-08-25
Status: ACTIVE

Decision: This workstream directory is the durable resume source. Chat memory alone is insufficient for completion claims. Every meaningful phase transition must update the machine state, evidence index and handoff.

## D-010 — Current authorization boundary

Date: 2026-08-25
Status: ACTIVE

Decision: The user has explicitly authorized creation of this context store. Full implementation/deploy execution remains pending the user's decision on the previously presented E2E plan.
