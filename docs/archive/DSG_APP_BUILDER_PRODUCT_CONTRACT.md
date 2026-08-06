# DSG App Builder Product Contract

## Purpose

Step 15 turns a user goal into a governed app-builder planning record.
It does not execute commands, patch files, create pull requests, provision environments, deploy previews, or claim production.

## Canonical Flow

```txt
User Goal
Builder Job
Goal Lock
PRD Draft
Proposed Plan
Plan Gate
Approval
planHash plus approvalHash
Runtime Handoff
Ready for Step 16
```

## Required Boundary

- No locked goal means no PRD.
- No PRD means no plan.
- Gate BLOCK means no approval.
- No planHash means no runtime handoff.
- No approved plan means no runtime handoff.
- No READY_FOR_RUNTIME status means no runtime handoff.
- Header context is dev or smoke only, not production trust.

## Hash Rules

`planHash` is the stable runtime authorization hash from proposed plan and gate result.

`approvalHash` is the approval audit hash from planHash, actor, timestamp, and decision.

Step 16 must verify planHash again before execution.

## Allowed Step 15 Claims

```txt
APP_BUILDER_PRODUCT_CONTRACT_READY
APP_BUILDER_PLANNING_LAYER_READY
READY_FOR_STEP_16_RUNTIME_FOUNDATION
```

## Blocked Claims

```txt
RUNTIME_READY
DEPLOY_READY
PRODUCTION_READY
MANUS_CLONE_COMPLETE
```
