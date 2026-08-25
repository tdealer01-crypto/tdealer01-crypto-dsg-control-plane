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

Workstream: `CONTEXT_READY_IMPLEMENTATION_PENDING_APPROVAL`

Current completed facts:

- Cross-repository architecture has been designed.
- Control Plane is the canonical authority.
- Baseline SHAs for the five repositories have been pinned in `WORKSTREAM.json`.
- Unified Monitoring `main` and `master` have no common ancestor.
- Unified Monitoring production code is primarily in `master`; `main` currently contains only the initial repository baseline plus LICENSE state.
- Unified Monitoring CI run at `cc06be7...` failed at `npm ci` because no `package-lock.json` exists.
- The existing required CI masks later failures with `|| true` / fallback behavior.
- Unified Monitoring API endpoints still contain placeholder return paths and cannot be accepted as production evidence.
- Unified Monitoring contains a real `DataSyncMonitor` implementation that can be reused after integration/verification.
- GitHub connector write access is available for repository/branch/file/PR operations.
- Production secret presence remains unverified.

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

## Context compaction rule

When this directory becomes large, do not delete decision/evidence history. Instead:

1. keep `WORKSTREAM.json` as the compact current machine state;
2. keep `HANDOFF.md` as the compact human resume point;
3. move older detailed evidence into dated files under `evidence/` and reference them from `EVIDENCE_INDEX.md`;
4. preserve hashes/PR/run identifiers required to reconstruct project truth.
