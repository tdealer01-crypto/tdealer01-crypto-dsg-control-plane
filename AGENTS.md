# AGENTS.md — DSG Control Plane Permanent Agent Memory

Scope: this file applies to the entire repository unless a deeper `AGENTS.md` overrides it.

## User-first operating rules

- Do not put false text, fake evidence, invented status, or guessed facts into the computer system, repository, docs, PRs, commits, tests, or responses.
- Alternate between the user perspective and the implementer perspective; never optimize for convenience if it conflicts with the user's real benefit.
- Do not try to please the user by overstating progress. If something is bad, unsafe, incomplete, or not production-ready, say so directly with current evidence.
- Do the correct thing, not the flattering thing.
- Never claim a file, route, test, deployment, database state, or external system exists unless you have inspected real evidence.
- Do not forget active context. If context is near the limit, stop, warn the user, summarize the current state, and propose a safe continuation plan.
- Do not randomize, assume, or guess when a deterministic check, repository inspection, or source lookup is possible.
- Prefer concrete, visible user value: simple flow, real result, observable evidence, and measurable acceptance.

## Deterministic reasoning and design

- Use Z3/formal-logic style thinking for critical design: state invariants, preconditions, postconditions, deny cases, and proof obligations before changing production logic.
- For parallel or multi-agent execution, follow the deterministic protocol in `docs/DETERMINISTIC_EXECUTION_PROTOCOL_10X_2026-04-11.md`:
  1. T0 input lock.
  2. T1 dependency graph build.
  3. T2 isolated parallel execution for independent work.
  4. T3 deterministic merge by stable ordering.
  5. T4 verification gate with replay/hash/check evidence.
- Same input snapshot must produce the same final artifacts, test outcomes, and release decision.
- Fail fast on nondeterministic output, hidden shared state, wall-clock leakage, flaky evidence, or write collisions.

## DSG production posture

- Default to **NO-GO** for production/marketplace/enterprise claims unless current evidence proves every required gate is green.
- Use only two launch milestones unless the user explicitly changes scope:
  - `M1: Production Cutover`
  - `M2: Hardening + Launch`
- Reject new demo-only scope for launch readiness work, including new mock routes, server-memory source-of-truth, localStorage persistence, demo-only workflows, and demo-only pages.
- Production readiness requires DB-backed submit/approve/reject/escalate flows, server-side org/RBAC enforcement, DB-backed dashboard/read models, complete audit trails, entitlement gates, trust pages, health/readiness checks, and smoke evidence.
- Follow the marketplace and cutover standards in these repo references:
  - `docs/PRODUCTION_CUTOVER_2_ROUNDS_2026-04-11.md`
  - `docs/PRODUCTION_START_TIMELINE_2026-04-11.md`
  - `docs/MARKETPLACE_TOP_TIER_GAP_AND_GET_STARTED_2026-04-11.md`
  - `docs/MARKETPLACE_GET_STARTED_ACCEPTANCE_CHECKLIST_2026-04-11.md`
  - `docs/ORCHESTRATION_PLAN_M1_M2_2026-04-11.md`
  - `docs/ONE_DAY_14_TEAM_FEASIBILITY_2026-04-11.md`

## Evidence and verification rules

- Before answering repo-status questions or making claims, inspect the actual files and cite the exact files or commands used.
- For code changes, run the most relevant checks available in the repository and report exact commands with pass/fail/warning status.
- Do not hide failing tests. If a command fails because of an environment limitation, label it as a warning and explain the limitation.
- For launch claims, prefer the launch gate sequence documented by the DSG skills and scripts, including typecheck, tests, build, production manifest, health/readiness, trust pages, and protected-route behavior.
- For OpenAI API or OpenAPI function-calling work, prefer official OpenAI documentation and cookbook examples, including the OpenAI Cookbook OpenAPI function-calling notebook when relevant: `https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/Function_calling_with_an_OpenAPI_spec.ipynb`.

## User-facing delivery standard

- Always make the result easy for a real user to see, verify, and use.
- Explain decisions in plain language, but keep implementation evidence precise.
- If the best answer is “not ready,” say “not ready” and provide the shortest safe path to readiness.
- Preserve Thai/English context where useful, but avoid mojibake. Store Thai text as valid UTF-8.

## Termux / Codex / Multica memory

- The practical path is Termux host → `proot-distro` → Debian guest → Codex CLI + Multica CLI/daemon.
- Use `scripts/termux-proot-codex-multica-setup.sh` and `docs/TERMUX_CODEX_MULTICA_STATUS_AND_PLAN.md` as the repo source of truth.
- Do not mark the Termux/Codex/Multica setup as merged or validated until real-device validation passes bootstrap, auth, daemon status, and an end-to-end smoke task.

## Commit and PR hygiene

- Keep changes focused and evidence-backed.
- Commit changes on the current branch when asked to modify the repository.
- Use clear commit messages that describe the actual repository change.
- PR bodies must summarize changed files, verification, and any known limitations without exaggerating readiness.
