# Evidence Index

This file is append-only evidence routing. Do not paste secrets or oversized logs. Record durable identifiers: repository, commit SHA, workflow run/job, PR, proof receipt, artifact hash/path, and result.

## Baseline evidence — 2026-08-25

### E-001 Control Plane baseline

- Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Branch: `main`
- SHA: `05660b19303861ac6f6023e78b18eb3933562eb5`
- Result: BASELINE_PINNED

### E-002 DSG ONE v1 baseline

- Repo: `tdealer01-crypto/dsg-one-v1`
- Branch: `main`
- SHA: `27c4463262bff3712ce5956fb0ce8140ccb869a5`
- Result: BASELINE_PINNED

### E-003 AGI Simulation baseline

- Repo: `tdealer01-crypto/dsg-agi-simulation`
- Branch: `master`
- SHA: `ff969f9bda2d101a5f9c062a60535709a40cfb5a`
- Result: BASELINE_PINNED

### E-004 Cinema baseline

- Repo: `tdealer01-crypto/DSG-Cinema-Proof-Agent`
- Branch: `main`
- SHA: `aef371d8930e6ee72afc8fb06738f9fc4a4e12cc`
- Result: BASELINE_PINNED

### E-005 Unified Monitoring main baseline

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch: `main`
- SHA: `73a443e13e1e0bcd72cc68a9059b06c9f5fb8324`
- Result: BASELINE_PINNED

### E-006 Unified Monitoring source baseline

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch: `master`
- SHA: `cc06be7a37f05ae44a1ba968cc31fd6c85dc617b`
- Result: SOURCE_PINNED
- Note: GitHub compare reports no common ancestor between `main` and `master`.

### E-007 Unified Monitoring legacy CI failure

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Workflow run: `31999238949`
- Job: `95296348845`
- Head SHA: `cc06be7a37f05ae44a1ba968cc31fd6c85dc617b`
- Result: FAILED
- Finding: legacy `master` failed at `npm ci` because no compatible lockfile existed. This is retained as historical evidence and is not a current implementation result.

### E-008 Unified Monitoring legacy placeholder API

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch: `master`
- File: `api/endpoints.ts`
- Result: REVIEW
- Finding: historical helper paths contained placeholder/overclaimed behavior and are not accepted as production evidence.

### E-009 Unified Monitoring source implementation candidate

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch: `master`
- File: `monitoring/src/data-sync-monitor.ts`
- Result: IMPLEMENTATION_CANDIDATE
- Finding: real Supabase-backed monitoring intent existed and was selectively rebuilt on a `main`-derived integration branch rather than merging unrelated history.

## Implementation and closed-loop evidence — 2026-08-25

### E-010 Wave 1 implementation join

- Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Workflow: `DSG Agentic Organization Wave Orchestrator`
- Run ID: `32808841798`
- Final join job ID: `97684455603`
- Result: PASS
- Claim supported: Wave 1 implementation lanes reached the implementation join gate.
- Limitation: this is not runtime promotion authority and not production deployment evidence.

### E-011 AGI candidate admission and technology-evolution checkpoint

- Repo: `tdealer01-crypto/dsg-agi-simulation`
- PR: `#16 feat/governed-candidate-envelope`
- Verified code head: `dd3180d5423df65ccca851f7a3690444bf060334`
- CI run: `32812605204` — SUCCESS
- ENS run: `32812605259` — SUCCESS
- Result: PASS
- Claim supported: candidate admission requires measurable improvement and protected-metric non-regression; TypeScript/AIMO/contracts/nondeterminism/Rust/WASM/integration checks passed at this checkpoint.
- Limitation: candidate authority remains `SIMULATION_ONLY`; no self-promotion.

### E-012 Governed technology intake activation

- Repo: `tdealer01-crypto/dsg-agi-simulation`
- Default-branch merges: `c029d5096974dea6e1b7a39a2405fa1e88290385`, `aa87cb4d9f9e2aa9c3cd5e7c6d533d2acc8f412a`, `a53d39bd4cb85160344bf88fb08179f18102f199`
- Workflow: `Daily Governed Technology Intake`
- Result: PASS / ACTIVE_READ_ONLY
- Claim supported: daily allowlisted technology observation is scheduled and evidence-only; repository mutation and production authority are NONE.

### E-013 Unified Monitoring observed-truth and post-deploy feedback

- Timestamp: `2026-08-25T16:27:32+07:00`
- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch/PR: `integration/unified-monitoring-e2e` / PR `#1`
- Head SHA: `06e3c266855d0d6d883265e3f9c051436826cf06`
- Workflow run: `32831029832`
- Job: `97749510235`
- Result: PASS
- Verified steps: committed lockfile, `npm ci`, lint, typecheck, unit tests, build, Docker build.
- Claim supported: critical-table observation, org-binding divergence, canonical ref observation, deterministic baseline-vs-canary evaluation, rollback/hold/next-baseline recommendation semantics, and signed HTTPS handoff helper are CI verified on this head.
- Authority: `monitoringAuthority=OBSERVATION_ONLY`; `executionAuthority=DSG_CONTROL_PLANE`.
- Limitation: live Supabase/RLS proof and Control Plane runtime URL/secret binding are not established by this CI run.

### E-014 Control Plane canonical promotion receipt and post-deploy control implementation

- Timestamp: `2026-08-25T16:27:32+07:00`
- Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Branch/PR: `feat/agentic-org-orchestrator` / PR `#1151`
- Current head SHA: `da57e5fe4e697ba3ca4bfef7677df9bc18be4607`
- Result: IMPLEMENTED_UNVERIFIED_CURRENT_HEAD
- Implemented evidence paths:
  - `lib/agent-governance/agentic-org/promotion-receipt.ts`
  - `app/api/dsg/agentic-org/promotion/evaluate/route.ts`
  - `lib/agent-governance/agentic-org/post-deploy-control.ts`
  - `app/api/dsg/agentic-org/post-deploy/route.ts`
  - `lib/agent-governance/agentic-org/rollback-executor.ts`
  - `supabase/migrations/20260825083000_agentic_post_deploy_feedback.sql`
- Claim supported by code inspection: canonical ALLOW receipts are minted/persisted only by Control Plane; post-deploy handoff looks up the canonical persisted receipt rather than trusting the submitted copy; next-baseline commit uses compare-and-swap; rollback uses an allowlisted HTTPS adapter with HMAC and strict returned evidence binding.
- Current CI: run `32831859945` and associated validation/security/schema workflows are queued/pending at this checkpoint.
- Limitation: do not call this head PASS until those current-head checks complete successfully.

### E-015 Production deployment/rollback target truth

- Timestamp: `2026-08-25T16:27:32+07:00`
- Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- File: `config/production-deployment-target.json`
- Result: BLOCK
- Current state: `provider=UNBOUND`, `productionDeployEnabled=false`, `deploymentAdapter=null`, `healthProbe=null`, `rollbackTarget=null`, `rollbackAdapterEndpoint=null`.
- Claim supported: production deploy and rollback execution must fail closed.
- Explicit retired targets: Vercel, Render.
- Next action: bind an actually selected provider adapter, health probe, rollback target, HTTPS rollback endpoint, required credentials/secrets and live evidence contract before production mutation.

## Future evidence entry template

### E-XXX <title>

- Timestamp:
- Repo:
- Branch/PR:
- Commit SHA:
- Workflow/run/job or proof/artifact:
- Plan hash:
- Evidence hash/ref:
- Result: PASS | REVIEW | BLOCK | NOT_RUN | FAILED
- Claim supported:
- Limitation:
- Next action:
