---
name: dsg-multi-governance-orchestrator
description: >-
  Use this skill for DSG multi-source governance work that combines UI trust
  upgrades, action-layer permission gates, deterministic execution,
  marketplace/enterprise cutover, portable SaaS architecture pages, DSG ONE
  architecture pages, Termux/Codex/Multica bootstrap planning, and production
  GO/NO-GO validation. Trigger when the user says DSG multi, 5 files, ผสานมัลติ,
  ทำเป็นสกิว, architecture page, action layer gate, marketplace cutover, M1/M2,
  deterministic execution, or launch readiness.
version: 1.0.0
author: DSG Team
license: MIT
---

# DSG Multi-Governance Orchestrator

This skill coordinates **multi-source governance work** across the DSG Control Plane —
combining UI trust upgrades, deterministic gate execution, marketplace cutover,
architecture documentation, and production GO/NO-GO validation into a single
explainable plan.

---

## When to use this skill

| Trigger phrase | Task |
|---|---|
| "DSG multi" / "ผสานมัลติ" | Multi-source governance orchestration |
| "M1 cutover" / "M2 hardening" | Milestone cutover planning and validation |
| "marketplace cutover" | Enterprise marketplace launch readiness |
| "architecture page" / "DSG ONE architecture" | Architecture page generation |
| "action layer gate" | Permission gate integration across multiple services |
| "deterministic execution" | Deterministic pipeline coordination |
| "production GO/NO-GO" | Full production readiness gate |
| "Termux/Codex/Multica bootstrap" | Mobile/local agent setup |
| "5 files" / "ทำเป็นสกิว" | Multi-file governance deliverable |
| "launch readiness" | M1/M2 launch checklist and validation |

---

## M1 / M2 Launch Milestones

### M1: Production Cutover

Required green gates before M1 GO:

- [ ] `GET /api/health` → `{ ok: true }`
- [ ] `GET /api/readiness` → `{ ok: true, db: true }`
- [ ] `GET /api/agent/status` → correct commit + environment
- [ ] `POST /api/dsg/v1/gates/evaluate` → PASS with proof hash
- [ ] Supabase migrations applied (verified by query, not file existence)
- [ ] Protected routes reject unauthenticated access (401/redirect)
- [ ] `npm run go:no-go <production-url>` → PASS
- [ ] Revenue events route functional (authenticated)
- [ ] DSG gate quota enforced (Free: 50 evals, Pro: 5k, Enterprise: unlimited)

**Default posture: NO-GO until all gates above are green with current evidence.**

### M2: Hardening + Launch

Additional gates for M2:

- [ ] Compliance evidence pack generated (`npm run ccvs:pipeline`)
- [ ] Secret scanning clean (`npm run test:secrets` or gitleaks CI)
- [ ] CodeQL clean (no high/critical alerts)
- [ ] Delivery Proof scan returns shareable report
- [ ] Stripe billing active (not test mode) for paid tiers
- [ ] Hermes executor integration test passing (Enterprise tier)
- [ ] End-to-end replay test: evaluate → store → replay → match

---

## Multi-source orchestration plan format

When the user says "plan the governance for X", produce a plan in this structure:

```
Goal: <what the user wants to achieve>

Architecture:
  <describe the governance layers involved>

Ordered Work Stages:
  Stage 1: Gate evaluation (Before execution)
  Stage 2: Execution + conformance (During)
  Stage 3: Evidence commit + replay storage (After)
  Stage 4: Compliance pack generation (Periodic)
  Stage 5: Audit export (On demand)

Risks:
  - <risk 1> → <mitigation>
  - <risk 2> → <mitigation>

Permission Checkpoints:
  - HIGH/CRITICAL actions require explicit operator approval
  - Policy version must be pinned before evaluation
  - UNSUPPORTED → REVIEW/BLOCK (never PASS)

GO/NO-GO gate:
  <list the specific evidence items needed before proceeding>
```

---

## Architecture page generation

When asked to generate a DSG ONE architecture page, include:

1. **Control Plane layers** — Gate / Spine / Evidence / Audit
2. **Trust boundaries** — what the agent can and cannot do
3. **Evidence flow** — from gate call to Supabase to replay
4. **Pricing surface** — Free / Pro / Enterprise entitlements
5. **Marketplace entry points** — how external teams integrate

Architecture pages are portable SaaS documentation artifacts.
Do not claim "production-ready architecture" unless all M1 gates are green.

---

## Termux/Codex/Multica bootstrap

Practical path: `Termux host → proot-distro → Debian guest → Codex CLI + Multica CLI/daemon`

Setup source of truth:
- `scripts/termux-proot-codex-multica-setup.sh`
- `docs/TERMUX_CODEX_MULTICA_STATUS_AND_PLAN.md`

Do not mark Termux/Codex/Multica setup as merged or validated until real-device validation passes:
bootstrap + auth + daemon status + end-to-end smoke task.

---

## Deterministic execution protocol

For multi-agent / parallel work:

1. **T0** — Input lock (snapshot all inputs)
2. **T1** — Dependency graph build
3. **T2** — Isolated parallel execution for independent work
4. **T3** — Deterministic merge by stable ordering
5. **T4** — Verification gate with replay/hash/check evidence

Same input snapshot must produce same final artifacts, test outcomes, and release decision.
Fail fast on: nondeterministic output, hidden shared state, wall-clock leakage, flaky evidence, write collisions.

---

## References

- <references/m1-m2-checklist.md> — Full M1/M2 gate checklist
- <references/architecture-template.md> — Architecture page template
- Gate API: see `dsg-action-layer-ged` skill → `references/gate-evaluate.md`
- Hermes: see `dsg-action-layer-ged` skill → `references/hermes-executor.md`
