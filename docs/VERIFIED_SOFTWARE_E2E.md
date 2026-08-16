# DSG Verified Software E2E

Status: implementation branch

## User flow

```text
AI-generated change
→ static scan/check
→ findings + evidence
→ autonomous Codex/Claude candidate generation when a repair request is supplied
→ host-side candidate validation against real source snapshots
→ verified-repair (QUBO/Ising → Z3 → controlled worktree → fixed validations)
→ tests
→ build
→ security scan
→ release-only live benchmark
→ deterministic software evidence gate
→ canonical DSG production gate
→ immutable promotion handoff
→ audited promotion request for the exact current main commit
→ sole governed production workflow
→ environment approval + exact-commit checks + preview verification
→ production deployment + health verification + rollback/finalization controls
```

The software evidence gate is deliberately **not** a second production authorization engine. Its highest result is `READY_FOR_DSG_GATE`. Production mutation remains controlled by the repository's existing audited promotion boundary and sole production workflow.

## What the user sees

The GitHub Actions summary reports:

- result: `READY_FOR_DSG_GATE` or `BLOCK`
- evidence bundle hash
- exact blockers
- next action
- truth boundary

A blocked verification run can now be turned into a structured repair request and passed to `scripts/autonomous-repair.ts`. The candidate provider is not trusted with repository write authority; generated candidates must pass host validation and the existing verified-repair chain.

## Evidence stages

| Stage | Evidence meaning |
|---|---|
| scan | static analysis/lint evidence for the checked commit |
| typecheck | measured TypeScript compiler result |
| unit | measured unit-test result |
| build | measured production build result |
| security | static dependency-security scan result |
| benchmark | measured live benchmark only when release evidence requires it |

Every required stage carries a SHA-256 evidence hash. Missing evidence, invalid hashes, failed required stages, unresolved findings, or an unverified repair state fail closed.

## Autonomous repair candidate generation

The repair candidate generator supports:

- `auto`
- `codex` / `openai`
- `claude` / `anthropic`

The generator reads only real files named by both `finding.affectedFiles` and `allowedFiles`. It supplies those snapshots and real diagnostics to the configured provider using structured output. Before any candidate reaches QUBO/Z3, DSG validates that:

1. the path is safe and inside scope;
2. `expected` occurs exactly once in the real source snapshot;
3. the replacement is not a no-op;
4. high-confidence secret-like replacement material is rejected;
5. candidate references are valid;
6. model-provided risk flags cannot downgrade sensitive paths or HIGH/CRITICAL execution risk.

Generation evidence records provider/model, provider response id when available, attempted providers, prompt hash, diagnostic hash, source snapshot hashes, raw structured-output hash, and normalized candidate-set hash.

See `docs/AUTONOMOUS_REPAIR.md` for the request shape and CLI usage.

## Repair execution boundary

`npx tsx scripts/autonomous-repair.ts --request ... --execute --validation full` performs:

```text
real finding + diagnostics + approved file scope
→ Codex/Claude structured candidates
→ deterministic host validation
→ QUBO/Ising proposal
→ Z3 exact verification
→ disposable worktree
→ git diff check
→ typecheck
→ unit tests
→ build
→ dependency security scan
→ evidence/audit/replay result
```

The disposable worktree is removed after verification. The base checkout is not mutated by this command. Therefore `VERIFIED_IN_SIMULATION` must not be represented as a merged or deployed fix.

## Release flow

Release verification is reachable from a manual `workflow_dispatch` on `main` with `release=true`, but that workflow does **not** mutate production.

1. Scan/typecheck/unit/build/security evidence must pass.
2. A release-verification run must provide a real live benchmark target and benchmark credentials; the benchmark must pass.
3. The workflow calls the real DSG production gate client with `DSG_API_KEY`.
4. `REVIEW`, `BLOCK`, `UNSUPPORTED`, authentication failures, quota failures, malformed responses, or network failures stop the release verification.
5. Only a real remote `PASS` may produce `dsg.verified-release-handoff.v1` evidence.
6. The handoff binds the exact commit, software evidence hash, DSG proof hash, and the repository's sole governed production workflow. It explicitly records `productionExecuted: false`.
7. After merge, an audited promotion must be requested for the exact current `main` commit through the existing promotion API.
8. `.github/workflows/promoted-production-deploy.yml` is then dispatched with the promotion id, exact commit SHA, and workspace key.
9. That existing workflow owns the environment approval, exact-current-main check, preview verification, production deployment, production health verification, rollback, and promotion finalization.
10. No second production path is added by this feature.

The deployment runbook is authoritative for production promotion details: `docs/RUNBOOK_DEPLOY.md`.

## Required GitHub/runtime secrets

For autonomous candidate generation:

- OpenAI path: `OPENAI_API_KEY`; `OPENAI_REPAIR_MODEL` recommended
- Anthropic path: `ANTHROPIC_API_KEY`; `ANTHROPIC_REPAIR_MODEL` optional

For the DSG production gate:

- `DSG_API_KEY` — key with `gates:evaluate`
- `DSG_CONTROL_PLANE_URL` — optional; empty means the production-gate client uses its documented production default

For release benchmark evidence:

- benchmark base URL is provided as the workflow input
- `BENCHMARK_API_KEY`
- `BENCHMARK_AGENT_ID`

Production deployment credentials remain owned by `.github/workflows/promoted-production-deploy.yml`; this verification workflow does not consume them.

Missing required verification credentials fail closed. No mock fallback is permitted for production authorization or release evidence.

## Human release boundary

The verified-software workflow can prove readiness for promotion but cannot approve or execute a production mutation. The audited promotion record and the protected production workflow remain the human/release boundary. Do not represent manual verification dispatch as an independent production approval.

## Truth boundaries

- model-generated repair candidates are proposals, not fixes
- static scan PASS is not production proof
- unit tests PASS is not production proof
- build PASS is not production proof
- benchmark arithmetic/estimates are not live benchmark evidence
- `VERIFIED_IN_SIMULATION` does not mean a branch changed
- `READY_FOR_DSG_GATE` is not `ALLOW`
- DSG `PASS` authorizes only the exact action/context evaluated
- `dsg.verified-release-handoff.v1` is not a production deployment receipt
- production completion remains governed by the existing promotion/deployment workflow and its observed health/finalization evidence

## Current implementation files

- `lib/dsg/verified-repair/candidate-generator.ts`
- `lib/dsg/verified-repair/pipeline.ts`
- `lib/dsg/verified-repair/executor.ts`
- `lib/dsg/ai/openai-adapter.ts`
- `lib/model-provider/anthropic.ts`
- `scripts/autonomous-repair.ts`
- `scripts/build-software-evidence.mjs`
- `scripts/verified-software-gate.mjs`
- `scripts/create-software-release-receipt.mjs` (utility/tested receipt builder; not invoked by the governed promotion path in this PR)
- `tests/unit/dsg/repair-candidate-generator.test.ts`
- `tests/unit/dsg/verified-software-gate.test.mjs`
- `tests/unit/dsg/software-release-receipt.test.mjs`
- `.github/workflows/verified-software-e2e.yml`

The existing `.github/workflows/agent-prod-readiness.yml` remains a baseline check and must not claim that build + typecheck + deployment config alone prove production readiness.
