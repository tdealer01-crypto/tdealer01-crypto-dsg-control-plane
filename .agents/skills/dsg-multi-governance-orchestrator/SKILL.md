---
name: dsg-multi-governance-orchestrator
description: Use this skill for DSG multi-source governance work that combines UI trust upgrades, action-layer permission gates, deterministic execution, marketplace/enterprise cutover, portable SaaS architecture pages, DSG ONE architecture pages, Termux/Codex/Multica bootstrap planning, and production GO/NO-GO validation. Trigger when the user says DSG multi, 5 files, ผสานมัลติ, ทำเป็นสกิว, architecture page, action layer gate, marketplace cutover, M1/M2, deterministic execution, or launch readiness.
---

# DSG Multi Governance Orchestrator

This skill merges the five DSG uploaded sources plus the user-supplied deterministic/marketplace patch into one reusable SaaS operating standard.

## Source map

1. `skill.zip` -> DSG UI / visual system / trust-first product posture.
2. `skill_archive.zip` -> DSG Action Layer GED: plan pane, execution pane, permission gate, audit model, runtime state machine, starter app direction.
3. `dsg-agent-os-portable-deploy.zip` -> portable SaaS/control-plane Next.js app surface.
4. `dsg-one-agent-ready-autonomy-v3.zip` -> DSG ONE dashboard/backend app surface.
5. `dsg_action_layer_gate_debug_report_2026-04-25.md` -> NO-GO launch gate evidence: production build/readiness/lockfile must be green.
6. `ข้อความที่วาง (1).txt` -> deterministic 10x execution protocol, marketplace acceptance, M1/M2 cutover, and Termux/Codex/Multica bootstrap scripts.

## Core rule

Be direct. Protect production. Do not mix demo-only changes with launch readiness.

Default release posture:

- **NO-GO** when build, lockfile, health, readiness, manifest, or trust pages are missing/failing.
- **GO** only when all gates are green with current evidence.
- Never claim production readiness from static UI alone.

## Deterministic execution protocol

Use this sequence for multi-agent or parallel work:

1. **T0 Input Lock**: freeze schema, code, config, tests, constraints, and desired output.
2. **T1 Dependency Graph Build**: parse work into a DAG and classify independent/dependent/write-conflict domains.
3. **T2 Parallel Execute**: run independent read-only or partitioned-write tasks in isolated scopes.
4. **T3 Deterministic Merge**: normalize outputs, sort by `(stage, topo_index, task_id)`, merge with explicit conflict log.
5. **T4 Verification Gate**: replay merge, compare hashes, validate dependency order, run correctness checks.

Fail fast if replay hash differs.

## Permission and action-layer model

Always separate major work into:

1. user-facing plan,
2. explicit approval,
3. live execution with evidence.

Only checkpoint the user for external login, new app connections, privileged external settings, destructive actions, publishing, sending, payment, booking, billing, or equivalent public actions.

Use only these permission verdicts:

- `allow`
- `needs user takeover`
- `deny`

## Production cutover standard

Use only two production milestones:

- `M1: Production Cutover`
- `M2: Hardening + Launch`

Reject mock routes, server-memory source of truth, localStorage persistence, demo-only workflows/actions/pages, and work unrelated to marketplace readiness.

Production acceptance requires DB-backed submit/approve/reject/escalate, server-side org/RBAC, DB-backed dashboard state, complete audit trails, entitlement gates, trust pages, and green health/readiness/smoke checks.

## Launch GO/NO-GO gate

For any launch claim, verify in this order:

```bash
npm install --package-lock-only
npm ci
npm run typecheck || true
npm run test || true
npm run build
npm run verify:production-manifest || true
./scripts/go-no-go-gate.sh <base-url> || true
```

Required runtime checks:

- `/api/health` returns HTTP 200 and `ok: true`.
- `/api/readiness` returns HTTP 200 and `ok: true`.
- `/terms`, `/privacy`, `/security`, `/support` are reachable.
- Protected routes return expected `401` or `403` when unauthenticated.

## Architecture page generation

When asked to add the architecture page without replacing existing pages:

### Portable SaaS Next.js app

Create `app/dsg-architecture/page.tsx`. Do not replace `app/page.tsx`.

Route: `/dsg-architecture`

### DSG ONE dashboard app

Create `frontend/app/dashboard/architecture/page.tsx`.

Patch nav in `frontend/app/dashboard/layout.tsx` with a new Architecture item using `Workflow` from `lucide-react`.

Route: `/dashboard/architecture`

## UI/UX trust standard

Use references in `references/multi-source-ui-action-reference.md` and launch gates in `references/launch-gate-debug-report-2026-04-25.md`.

Design direction: premium, credible, enterprise-safe, futuristic control-room/NASA energy, readable on mobile and desktop, trust-first, task-first, low-friction.

Avoid touching auth, billing, DB, runtime gates, production env, or deployment config unless explicitly requested.

## Output format

```markdown
## What I changed / would add
[direct summary]

## Files
[file paths]

## Code
[copy/paste code or commands]

## Validation
[commands]

## GO/NO-GO
[current verdict]
```

## Included references and assets

- `references/source-inventory.md` maps the 5 uploaded files plus the patch file.
- `references/multi-source-ui-action-reference.md` contains the UI, action-layer, deterministic, marketplace, and cutover operating standards.
- `references/launch-gate-debug-report-2026-04-25.md` contains launch readiness evidence and blocker rules.
- `scripts/apply-architecture-page.sh` contains a copy/paste helper for adding architecture pages to supported repo layouts.
