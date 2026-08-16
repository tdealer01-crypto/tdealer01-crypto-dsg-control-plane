# DSG Verified Software E2E

Status: implementation branch

## User flow

```text
AI-generated change
→ static scan/check
→ findings + evidence
→ AI repair handoff when blocked
→ tests
→ build
→ security scan
→ credentialed release benchmark
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
- warnings such as missing measured capacity evidence
- next action
- truth boundary

A blocked run should be repaired by the coding agent (Codex, Claude Code, or another approved agent) on the same PR. The new commit triggers the verification flow again.

## Evidence stages

| Stage | Evidence meaning |
|---|---|
| scan | static analysis/lint evidence for the checked commit |
| typecheck | measured TypeScript compiler result |
| unit | measured unit-test result, including the verified-software gate and release-receipt contract tests |
| build | measured production build result |
| security | static dependency-security scan result |
| benchmark | credentialed measured benchmark against a public/staging DSG URL for a production release request |

Every required stage carries a SHA-256 evidence hash. Missing evidence, invalid hashes, failed required stages, unresolved findings, or an unverified repair state fail closed.

A normal pull request does not have to possess live benchmark credentials. Its benchmark stage is marked `SKIP`, the gate records `CAPACITY_NOT_MEASURED_FOR_RELEASE_CLAIM`, and no capacity claim is allowed. A production release request makes benchmark evidence required.

## Repair loop

The verification workflow does not give GitHub Actions write access to source code. That boundary is intentional.

```text
BLOCK
→ machine-readable blockers/evidence artifact
→ approved AI coding agent proposes exact repair candidates
→ existing verified-repair QUBO/Ising + Z3 path validates the candidate plan
→ controlled worktree executor applies only selected exact-text candidates
→ fixed validation profile runs
→ approved agent updates the PR
→ PR synchronize event
→ full verification reruns
```

The existing verified-repair engine accepts exact `file`, `expected`, and `replacement` candidates. It does not generate Codex/Claude candidates itself. Automatic candidate generation therefore still requires a provider adapter and must not be claimed as complete until that adapter is implemented and tested.

The deterministic software gate supports bounded repair metadata (`attempts`, `maxAttempts`). This workflow does **not yet persist a cross-commit repair-attempt counter**. Do not claim the five-attempt limit is enforced across separate PR commits until persistent attempt tracking is added.

## Release flow

Production release is only reachable from a manual `workflow_dispatch` on `main` with `release=true`.

1. Scan, typecheck, unit tests, build, and dependency security evidence must pass.
2. The release request must provide `benchmark_base_url` and repository secrets `BENCHMARK_API_KEY` and `BENCHMARK_AGENT_ID`.
3. The measured benchmark must pass. Missing benchmark configuration fails closed.
4. The workflow calls the real DSG production gate client with `DSG_API_KEY`.
5. `REVIEW`, `BLOCK`, `UNSUPPORTED`, authentication failures, quota failures, malformed responses, or network failures stop the release.
6. Only a real remote `PASS` may continue.
7. The production deployment job uses the GitHub `production` environment as the release boundary.
8. Vercel deploy runs only after the previous gates pass.
9. `/api/health` and `/api/readiness` are observed on the returned deployment URL.
10. `/api/readiness` must return `ready: true`.
11. A deterministic receipt binds commit, software evidence hash, DSG proof hash, deployment URL, and observed postcondition hashes.

## Required GitHub secrets

For the release benchmark:

- `BENCHMARK_API_KEY`
- `BENCHMARK_AGENT_ID`

For the DSG gate:

- `DSG_API_KEY` — key with `gates:evaluate`
- `DSG_CONTROL_PLANE_URL` — optional; empty means the production-gate client uses its documented production default

For controlled Vercel deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Missing required credentials fail closed. No mock fallback is permitted.

## Human release boundary

Configure the GitHub `production` environment with required reviewers if organizational policy requires a separate reviewer. Manual dispatch itself is an explicit human request, but it must not be represented as an independent reviewer approval unless the environment protection rule is actually configured.

## Truth boundaries

- static scan PASS is not production proof
- unit tests PASS is not production proof
- build PASS is not production proof
- skipped benchmark means no measured capacity claim
- benchmark arithmetic/estimates are not load-test evidence
- `READY_FOR_DSG_GATE` is not `ALLOW`
- DSG `PASS` authorizes only the exact action/context evaluated
- deployment success alone is not completion
- completion requires observed postconditions and release evidence
- the release receipt proves the recorded evidence chain; it does not invent compliance or capacity claims

## Current implementation files

- `scripts/build-software-evidence.mjs`
- `scripts/verified-software-gate.mjs`
- `scripts/create-software-release-receipt.mjs`
- `tests/unit/dsg/verified-software-gate.test.mjs`
- `tests/unit/dsg/software-release-receipt.test.mjs`
- `.github/workflows/verified-software-e2e.yml`

The existing `.github/workflows/agent-prod-readiness.yml` is reduced to a baseline check and must no longer claim that build + typecheck + deployment config alone prove production readiness.
