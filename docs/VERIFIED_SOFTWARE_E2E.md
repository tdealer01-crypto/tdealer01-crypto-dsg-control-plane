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
→ human release
→ controlled production deploy
→ observed health/readiness postconditions
→ deterministic release receipt
```

The software evidence gate is deliberately **not** a second production authorization engine. Its highest result is `READY_FOR_DSG_GATE`. Production execution remains controlled by the existing DSG production gate and release boundary.

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

Production release is only reachable from a manual `workflow_dispatch` on `main` with `release=true`.

1. Scan/typecheck/unit/build/security evidence must pass.
2. A release run must also provide a real live benchmark target and benchmark credentials; the benchmark must pass.
3. The workflow calls the real DSG production gate client with `DSG_API_KEY`.
4. `REVIEW`, `BLOCK`, `UNSUPPORTED`, authentication failures, quota failures, malformed responses, or network failures stop the release.
5. Only a real remote `PASS` may continue.
6. The production deployment job uses the GitHub `production` environment as the release boundary.
7. Vercel deploy runs only after the previous gates pass.
8. `/api/health` and `/api/readiness` are observed on the returned deployment URL.
9. `/api/readiness` must return `ready: true`.
10. A deterministic receipt binds commit, software evidence hash, DSG proof hash, deployment URL, and observed postcondition hashes.

## Required GitHub/runtime secrets

For autonomous candidate generation:

- OpenAI path: `OPENAI_API_KEY`; `OPENAI_REPAIR_MODEL` recommended
- Anthropic path: `ANTHROPIC_API_KEY`; `ANTHROPIC_REPAIR_MODEL` optional

For the DSG production gate:

- `DSG_API_KEY` — key with `gates:evaluate`
- `DSG_CONTROL_PLANE_URL` — optional; empty means the production-gate client uses its documented production default

For release benchmark evidence:

- `BENCHMARK_BASE_URL`
- `BENCHMARK_API_KEY`
- `BENCHMARK_AGENT_ID`

For controlled Vercel deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Missing required credentials fail closed. No mock fallback is permitted for production authorization or release evidence.

## Human release boundary

Configure the GitHub `production` environment with required reviewers if organizational policy requires a separate reviewer. Manual dispatch itself is an explicit human request, but it must not be represented as an independent reviewer approval unless the environment protection rule is actually configured.

## Truth boundaries

- model-generated repair candidates are proposals, not fixes
- static scan PASS is not production proof
- unit tests PASS is not production proof
- build PASS is not production proof
- benchmark arithmetic/estimates are not live benchmark evidence
- `VERIFIED_IN_SIMULATION` does not mean a branch changed
- `READY_FOR_DSG_GATE` is not `ALLOW`
- DSG `PASS` authorizes only the exact action/context evaluated
- deployment success alone is not completion
- completion requires observed postconditions and release evidence
- the release receipt proves the recorded evidence chain; it does not invent compliance or capacity claims

## Current implementation files

- `lib/dsg/verified-repair/candidate-generator.ts`
- `lib/dsg/verified-repair/pipeline.ts`
- `lib/dsg/verified-repair/executor.ts`
- `lib/dsg/ai/openai-adapter.ts`
- `lib/model-provider/anthropic.ts`
- `scripts/autonomous-repair.ts`
- `scripts/build-software-evidence.mjs`
- `scripts/verified-software-gate.mjs`
- `scripts/create-software-release-receipt.mjs`
- `tests/unit/dsg/repair-candidate-generator.test.ts`
- `tests/unit/dsg/verified-software-gate.test.mjs`
- `tests/unit/dsg/software-release-receipt.test.mjs`
- `.github/workflows/verified-software-e2e.yml`

The existing `.github/workflows/agent-prod-readiness.yml` remains a baseline check and must not claim that build + typecheck + deployment config alone prove production readiness.
