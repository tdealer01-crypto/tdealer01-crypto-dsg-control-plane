# Execution Checklist

This checklist is operational, not evidence by itself. Mark an item complete only after `EVIDENCE_INDEX.md` contains supporting evidence.

## P0 Context and baseline freeze

- [x] Pin Control Plane baseline SHA.
- [x] Pin DSG ONE v1 baseline SHA.
- [x] Pin AGI Simulation baseline SHA.
- [x] Pin Cinema baseline SHA.
- [x] Pin Unified Monitoring main/source SHAs.
- [x] Record monitoring CI failure truth.
- [x] Record monitoring placeholder API truth.
- [x] Create durable context branch/store.
- [ ] Receive user approval to execute implementation plan.

## P1 Unified Monitoring repair

- [ ] Refresh all five repository HEADs and record drift.
- [ ] Create integration branch from Unified Monitoring main.
- [ ] Transplant/rebuild required inspected source from master.
- [ ] Add package lockfile.
- [ ] Fix package scripts and real entrypoint.
- [ ] Add tsconfig/lint config as required.
- [ ] Add unit/integration tests.
- [ ] Remove all required-check failure masking.
- [ ] Verify `npm ci`.
- [ ] Verify lint/typecheck/test/build.
- [ ] Verify Docker build/runtime health.
- [ ] Open reviewable PR into main.

## P2 Real observation layer

- [ ] Wire API to real DataSyncMonitor/observation implementation.
- [ ] Define PASS/REVIEW/BLOCK/NOT_RUN semantics.
- [ ] Define evidence reference/hash structure.
- [ ] Separate service-role admin observation from tenant-isolation proof.
- [ ] Add deterministic normalization where required for hashes.
- [ ] Add negative tests for missing credentials/unavailable tables.

## P3 Five-repo registry

- [ ] Canonical repo registry with role/branch/SHA/contract version.
- [ ] Drift detection.
- [ ] Observation binding to exact commit SHA.
- [ ] Evidence storage/index contract.

## P4 Metric and AGI evaluation loop

- [ ] Define goal metric/eval schema.
- [ ] Feed real observations/eval workload to AGI Simulation.
- [ ] Produce baseline/candidate metric pair.
- [ ] Produce simulation/fitness/constraint evidence.
- [ ] Ensure simulation cannot self-authorize promotion.

## P5 Governed implementation runtime

- [ ] Bind improvement candidate to canonical approved plan hash.
- [ ] Bind allowed repo/path/tool/command scope.
- [ ] Execute implementation on a non-production branch.
- [ ] Run required tests/build/benchmark.
- [ ] Produce candidate commit and implementation evidence.
- [ ] Verify no direct main/master mutation occurred outside plan.

## P6 Cinema independent proof

- [ ] Submit raw plan/commit/metric/test/evidence inputs.
- [ ] Verify plan alignment.
- [ ] Verify evidence hashes/binding.
- [ ] Generate proof receipt.
- [ ] Verify replay/mismatch behavior.

## P7 Promotion and PR

- [ ] Define promotion envelope schema.
- [ ] Gate on objective/constraints/tests/evidence/plan/Cinema proof.
- [ ] ALLOW path opens/updates PR according to approved plan.
- [ ] BLOCK path proves no production promotion.
- [ ] Surface reason and nextAction.

## P8 Post-deploy feedback

- [ ] Verify deploy target before mutation.
- [ ] Execute authorized deploy/promotion only when gate allows.
- [ ] Observe production metrics/postconditions.
- [ ] Compare actual vs expected candidate result.
- [ ] Detect regression and surface remediation/rollback.
- [ ] Feed verified outcome into next evaluation generation.

## P9 Delivery proof

- [ ] Positive E2E: full goal-to-proof-to-promotion-to-observe flow.
- [ ] Negative E2E: invalid/regressing/out-of-plan candidate is blocked with no production mutation.
- [ ] Evidence/replay packet complete.
- [ ] Final delivery report created.
- [ ] All unresolved limitations explicitly documented.
- [ ] `WORKSTREAM.json.delivery_status = DELIVERED` only after all mandatory Definition of Done items pass.
