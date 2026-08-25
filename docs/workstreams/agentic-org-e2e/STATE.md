# Work State and Checkpoint Protocol

## State vocabulary

Workstream states:

- `CONTEXT_READY_IMPLEMENTATION_PENDING_APPROVAL`
- `APPROVED_NOT_STARTED`
- `IN_PROGRESS`
- `WAITING_EXTERNAL_PREREQUISITE`
- `BLOCKED`
- `IMPLEMENTED_UNVERIFIED`
- `PARTIALLY_VERIFIED`
- `READY_FOR_DELIVERY_REVIEW`
- `DELIVERED`

Task/check states:

- `NOT_STARTED`
- `IN_PROGRESS`
- `PASS`
- `REVIEW`
- `BLOCK`
- `NOT_RUN`
- `FAILED`

## Current state

Workstream: `PARTIALLY_VERIFIED`

Updated: `2026-08-25T16:27:32+07:00`

### Verified facts

- Control Plane remains the sole canonical promotion/execution authority.
- Wave 1 implementation join passed in GitHub Actions run `32808841798`, final join job `97684455603`; this is implementation evidence only, not production authority.
- AGI Simulation candidate-admission code checkpoint `dd3180d5423df65ccca851f7a3690444bf060334` passed CI run `32812605204` and ENS run `32812605259`.
- Candidate admission requires measurable improvement plus protected-metric non-regression before proposal.
- Unified Monitoring was rebuilt on `integration/unified-monitoring-e2e` from `main`; unrelated historical `master` is not merged into `main`.
- Unified Monitoring head `06e3c266855d0d6d883265e3f9c051436826cf06` passed `Unified Monitoring CI` run `32831029832`: lockfile, npm ci, lint, typecheck, unit tests, build and Docker build all succeeded.
- Unified Monitoring now evaluates baseline-vs-canary performance and emits only `ROLLBACK_RECOMMENDED`, `HOLD_REVIEW`, or `ACCEPT_NEXT_BASELINE` evidence. It remains `OBSERVATION_ONLY`.
- Unified Monitoring can HMAC-forward post-deploy evidence to Control Plane over an HTTPS endpoint when runtime URL/secret binding is present.

### Implemented but current-head verification pending

Control Plane branch `feat/agentic-org-orchestrator` implements:

- canonical promotion receipt minting only after Cinema raw evidence + deterministic `ALLOW` with zero failures;
- durable `agentic_promotion_receipts` so submitted downstream receipts are references, not authority;
- HMAC-authenticated post-deploy feedback intake;
- strict binding of Monitoring evidence, canonical promotion receipt, exact deployment, baseline/candidate commits and configured provider;
- durable post-deploy receipts;
- atomic compare-and-swap next-baseline commit to reject stale canary results;
- provider-neutral rollback authorization with allowlisted adapter names and HTTPS endpoint requirement;
- HMAC-signed rollback requests;
- strict provider rollback evidence binding and idempotency by deployment id;
- service-role-only durable promotion/post-deploy/baseline/rollback state.

The implementation code checkpoint before context-only checkpoint updates was `da57e5fe4e697ba3ca4bfef7677df9bc18be4607`. Its GitHub Actions runs were queued/pending at the checkpoint; subsequent documentation commits may create a newer PR head and must be verified as the current head before a PASS claim.

### Current blockers

1. Control Plane current-head CI/validation must finish successfully; queued is not PASS.
2. `supabase/migrations/20260825083000_agentic_post_deploy_feedback.sql` has not been proven applied to a live Supabase environment.
3. Cinema live OIDC/raw-evidence runtime endpoint binding is not yet verified.
4. Monitoring → Control Plane URL/secret binding is not yet verified in a live runtime.
5. Production provider is `UNBOUND`; `deploymentAdapter`, `healthProbe`, `rollbackTarget`, and `rollbackAdapterEndpoint` are null.
6. Vercel and Render are retired/not used and must not be reintroduced as defaults.
7. Production deployment and production rollback therefore remain fail-closed.

## Closed-loop truth

```text
Technology observation
        ↓
Frequent deterministic simulation
        ↓
Candidate admission: measurable improvement + no protected regression
        ↓
Candidate pool / slower batch review
        ↓
Cinema VERIFIED_RAW_EVIDENCE
        ↓
Control Plane ALLOW → canonical persisted promotion receipt
        ↓
Approved batch merge
        ↓
One deployment for the batch             [BLOCKED while provider UNBOUND]
        ↓
Canary + health/readiness
        ↓
Unified Monitoring
   ├─ regression → ROLLBACK_RECOMMENDED
   ├─ neutral/insufficient → HOLD_REVIEW
   └─ improved → ACCEPT_NEXT_BASELINE
        ↓ signed handoff
Control Plane canonical receipt/deployment binding
   ├─ rollback → signed provider adapter + verified rollback evidence
   ├─ hold → no mutation
   └─ improve → atomic next-baseline commit
        ↓
Next simulation cycle
```

A code path existing is not evidence that a production mutation occurred. A provider must be explicitly bound and live evidence must exist before any production-deploy/rollback claim.

## Checkpoint policy

A checkpoint is mandatory after:

1. creating or changing an integration branch;
2. changing a contract/schema;
3. changing plan/approval/promotion logic;
4. completing a CI run that changes project truth;
5. creating/updating a PR;
6. receiving independent Cinema verification;
7. discovering a new blocker or invalid assumption;
8. completing a phase;
9. ending a work session or handing off to another agent.

A checkpoint updates at minimum:

- `WORKSTREAM.json.updated_at`
- affected phase/task status
- `current_blockers`
- `next_action`
- `EVIDENCE_INDEX.md`
- `HANDOFF.md`

## Drift protocol

At resume, compare pinned repository SHA with current target branch HEAD.

- No drift: continue.
- Expected drift caused by this workstream: record the new SHA/evidence and continue.
- External drift: inspect diff/PR/commit before any mutation; update assumptions and decisions if required.
- Unknown/uninspectable drift: set workstream to REVIEW/BLOCK rather than guessing.

## Context integrity rules

- Never mark a task PASS from prose-only claims.
- Never delete old evidence entries to hide a failure; append corrected evidence and mark superseded entries.
- Never store credentials, tokens, OTPs, private keys, or session cookies.
- Never overwrite a decision history entry; append a superseding decision with reason.
- Never advance a phase solely because code exists; required proof obligations must be satisfied.
- Never trust a promotion receipt returned by Simulation/Monitoring as authority; Control Plane must resolve the canonical persisted receipt it minted.
- Never execute rollback from arbitrary configuration commands; use only an allowlisted bound adapter with signed request/verified evidence.

## Context compaction rule

When this directory becomes large, do not delete decision/evidence history. Instead:

1. keep `WORKSTREAM.json` as the compact current machine state;
2. keep `HANDOFF.md` as the compact human resume point;
3. move older detailed evidence into dated files under `evidence/` and reference them from `EVIDENCE_INDEX.md`;
4. preserve hashes/PR/run identifiers required to reconstruct project truth.
