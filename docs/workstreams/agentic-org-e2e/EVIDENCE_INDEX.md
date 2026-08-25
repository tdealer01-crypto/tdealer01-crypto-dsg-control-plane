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

### E-007 Unified Monitoring CI failure

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Workflow: `Build and Test Monitoring System`
- Run ID: `31999238949`
- Job ID: `95296348845`
- Head SHA: `cc06be7a37f05ae44a1ba968cc31fd6c85dc617b`
- Result: FAIL
- Failing step: `Install dependencies`
- Root evidence: `npm ci` requires an existing `package-lock.json` or compatible shrinkwrap; repository does not contain a lockfile and `.gitignore` ignores `package-lock.json`.
- Consequence: typecheck/build/test skipped; this run is not proof of readiness.

### E-008 Unified Monitoring placeholder API

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch: `master`
- File: `api/endpoints.ts`
- Result: REVIEW/BLOCK_FOR_PRODUCTION_EVIDENCE
- Finding: several helper paths return empty metrics/divergences, health_score 0 or consistent false with implementation comments instead of real monitor integration.

### E-009 Unified Monitoring real monitor candidate

- Repo: `tdealer01-crypto/dsg-unified-data-monitoring`
- Branch: `master`
- File: `monitoring/src/data-sync-monitor.ts`
- Result: IMPLEMENTATION_CANDIDATE
- Finding: real Supabase-backed table monitoring/divergence/cross-repo logic exists and can be reused after path/contract/test review.

### E-010 Wave 1 implementation join

- Timestamp: 2026-08-25
- Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Branch/PR: `feat/agentic-org-orchestrator` / PR `#1151`
- Commit SHA: `fc6903da2b70e715292143e2fc633fde853b6f97`
- Workflow/run: `DSG Agentic Organization Wave Orchestrator` run `32808841798`
- Result: PASS
- Claim supported: canonical gate, W1-A/B/C/E public refs, W1-D pinned private CI checkpoint, and final implementation join gate all completed successfully.
- Limitation: implementation join grants no production, merge, or runtime promotion authority.

### E-011 Daily governed technology intake activated

- Timestamp: 2026-08-25
- Repo: `tdealer01-crypto/dsg-agi-simulation`
- Default branch: `master`
- Scheduler PRs: `#17`, `#18`, `#19`
- Active master commit after hardening: `a53d39b05f02ebeeea0b971e1d9422b71441ec06`
- Workflow: `.github/workflows/daily-technology-intake.yml`
- Schedule: daily GitHub Actions cron; `workflow_dispatch` retained for manual verification.
- Result: PASS_FOR_SCHEDULER_ACTIVATION
- Claim supported: GitHub Actions is the daily scheduler/source-of-truth for technology intake; ChatGPT task is reporting-only.
- Authority boundary: workflow has `contents: read` only, performs no repository mutation, and carries no merge/deploy/promotion authority.

### E-012 Daily technology intake first real self-test

- Timestamp: 2026-08-25T04:42:06Z
- Repo: `tdealer01-crypto/dsg-agi-simulation`
- Workflow run ID embedded in checkpoint commit message: `32809939691`
- Generated checkpoint commit: `f347041c22b6c6545e7bbeaad4c6224dd5db5334`
- Collection result: `OBSERVATION_UPDATED`
- Feed items fetched: `1174`
- Relevant signals in first classifier pass: `7`
- Evaluation: `PROPOSE`
- Candidate authority: `SIMULATION_ONLY`
- Promotion authority: `DSG_CONTROL_PLANE`
- Self-promotion: `false`
- Result: PASS_WITH_CLASSIFIER_REVIEW
- Finding: execution path worked end-to-end, but generic `snapshot`/`workflow` wording caused false-positive capability classifications.
- Remediation: strict classifier + regression tests added on PR `#16`; generic snapshot/runner/workflow wording no longer creates evolution signals and duplicate signal scoring was removed.
- Limitation: this is technology observation/evaluation evidence, not permission to change code or production policy.

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
