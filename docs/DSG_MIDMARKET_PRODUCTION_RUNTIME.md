# DSG Mid-Market Production Runtime Binding

## Purpose

This layer upgrades the mid-market governance autopilot from readiness/evaluation into a fail-closed production runtime gate.

It does **not** directly execute customer APIs. It decides whether production runtime is allowed to execute through a controlled executor binding.

Production execution is allowed only when these proofs are present and consistent:

- Controlled Executor binding
- RBAC permission binding
- high/critical approval proof
- audit ledger proof
- evidence manifest proof
- replay proof
- operator controls: pause, resume, kill
- action idempotency keys
- rollback or compensating action plan for mutations

## API

`POST /api/dsg/midmarket-governance-autopilot/production-runtime`

Returns:

- `200` when `READY_FOR_PRODUCTION_RUNTIME`
- `409` when `BLOCKED`
- `400` for invalid request parsing/evaluation failure

## Hard runtime invariants

- `assessment_not_blocked`
- `controlled_executor_bound`
- `operator_kill_switch`
- `rbac_permission_binding`
- `approval_for_high_risk_actions`
- `audit_ledger_ready`
- `evidence_manifest_complete`
- `replay_proof_matches_assessment`
- `action_idempotency`

## Soft runtime invariant

- `rollback_for_mutations`

Current behavior: missing rollback for mutation/payment/admin/deploy action produces `REVIEW`. Because the final decision requires all checks to be clean, the runtime still does not return `READY_FOR_PRODUCTION_RUNTIME` unless the missing rollback issue is resolved.

## Truth boundary

Allowed claim after this gate passes:

> This action is ready for production runtime execution through the DSG controlled executor binding referenced by the runtime proof.

Forbidden unless real downstream execution and verification are separately recorded:

- production execution completed
- customer API mutated successfully
- payment/refund completed
- deployment completed
- audit/replay verified after execution

## Minimum production runtime request shape

```json
{
  "workspaceId": "workspace-1",
  "assessment": {
    "decision": "REVIEW",
    "overallRisk": "critical",
    "riskScore": 100,
    "requestHash": "assessment-request-hash",
    "decisionHash": "assessment-decision-hash",
    "evidenceRequired": ["approval_policy", "audit_export"],
    "runtimeMonitor": []
  },
  "executor": {
    "executorId": "executor-1",
    "executorType": "dsg-controlled-executor",
    "allowDirectModelToApi": false,
    "commandAllowlist": ["connector.execute"],
    "connectorAllowlist": ["stripe-billing"],
    "secretBindingIds": ["secret-binding-1"],
    "killSwitchEnabled": true,
    "pauseResumeEnabled": true
  },
  "rbac": {
    "workspaceId": "workspace-1",
    "actorId": "operator-1",
    "role": "owner",
    "permissions": ["tool:execute_critical"],
    "approvalRequestId": "approval-1",
    "approvalDecision": "approved"
  },
  "auditLedger": {
    "ledgerId": "ledger-1",
    "chainHeadHash": "chain-head-hash",
    "currentHash": "current-hash",
    "eventsRecorded": 3
  },
  "evidenceManifest": {
    "manifestId": "manifest-1",
    "manifestHash": "manifest-hash",
    "evidenceItemIds": ["evidence-1"],
    "includesAssessment": true,
    "includesPolicySnapshot": true,
    "includesApproval": true,
    "includesExecutorBinding": true,
    "includesRuntimeMonitor": true
  },
  "replayProof": {
    "replayId": "replay-1",
    "replayHash": "replay-hash",
    "requestHash": "assessment-request-hash",
    "decisionHash": "assessment-decision-hash",
    "deterministic": true
  },
  "actions": [
    {
      "actionId": "refund-1",
      "actionType": "payment",
      "riskLevel": "critical",
      "systemId": "stripe-billing",
      "operationName": "issue refund",
      "idempotencyKey": "refund-1-20260506",
      "rollbackPlanId": "rollback-1",
      "requiresApproval": true
    }
  ]
}
```

## Production next step

To claim real production runtime, wire this gate to the existing DSG runtime execution layer so that a PASS result becomes a queued controlled-executor job, not a direct API call.

Required follow-up wiring:

- persist runtime binding decision to DB
- write audit ledger event before execution
- create evidence item for the runtime binding
- create replay proof after deterministic evaluation
- enqueue controlled executor action
- update runtime monitor stream
- verify customer-system result after executor completion
- write post-execution audit/evidence/replay proof
