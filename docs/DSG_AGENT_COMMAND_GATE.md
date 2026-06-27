# DSG Agent Command Gate

## Correct production model

DSG is the command checkpoint, not the universal executor.

The correct flow is:

```text
Agent proposes command
↓
DSG checks policy / invariant / RBAC / approval / audit hook / evidence hook
↓
DSG records the command decision
↓
DSG returns action envelope to the agent
↓
Agent executes the action in its own permitted tool/runtime
↓
Agent posts observed result back to DSG
↓
DSG records result receipt, evidence ids, target receipt id, and hashes
```

This avoids fake completion claims. DSG can say it approved a command envelope only after the gate passes. DSG can say the agent reported completion only after the result callback is recorded. DSG cannot claim the customer system changed unless the returned evidence proves it.

## APIs

### Check command

`POST /api/dsg/agent-command-gate`

Returns:

- `200` with `AGENT_ACTION_ALLOWED` and `actionEnvelope` when gate passes
- `409` with `AGENT_ACTION_BLOCKED` or `AGENT_ACTION_REVIEW_REQUIRED` when gate fails
- `400` when request parsing/evaluation fails

### Record result

`POST /api/dsg/agent-command-gate/result`

Returns:

- `200` when the result receipt is accepted
- `422` when required result fields/evidence are missing
- `400` when request parsing/evaluation fails

## Hard gates before returning action envelope

- `command_locked`
- `agent_identity_bound`
- `rbac_permission_bound`
- `approval_for_high_risk_or_sensitive_action`
- `idempotency_for_mutation`
- `rollback_for_mutation`
- `audit_hook_bound`
- `evidence_hook_bound`

## Required command request

```json
{
  "workspaceId": "workspace-1",
  "runtime": {
    "agentId": "agent-1",
    "agentType": "workflow-agent",
    "sessionId": "session-1",
    "agentWillExecuteAction": true,
    "requiresResultCallback": true
  },
  "command": {
    "commandId": "cmd-1",
    "actionType": "payment",
    "targetSystemId": "stripe-billing",
    "operationName": "issue refund",
    "method": "POST",
    "path": "/refunds",
    "riskLevel": "critical",
    "dataClasses": ["payment", "restricted"],
    "payloadHash": "payload-hash",
    "idempotencyKey": "cmd-1-20260506",
    "rollbackPlanId": "rollback-1"
  },
  "rbac": {
    "actorId": "operator-1",
    "role": "owner",
    "permissions": ["tool:execute_critical"],
    "approvalRequestId": "approval-1",
    "approvalDecision": "approved"
  },
  "audit": {
    "preAuditEventId": "audit-event-1",
    "ledgerId": "ledger-1",
    "chainHeadHash": "chain-head-hash"
  },
  "evidence": {
    "evidenceManifestId": "manifest-1",
    "policySnapshotHash": "policy-hash",
    "runtimeBindingHash": "runtime-binding-hash"
  }
}
```

## Example allowed response

```json
{
  "ok": true,
  "result": {
    "decision": "PASS",
    "canAgentExecute": true,
    "status": "AGENT_ACTION_ALLOWED",
    "actionEnvelope": {
      "commandId": "cmd-1",
      "allowedAction": "payment",
      "targetSystemId": "stripe-billing",
      "operationName": "issue refund",
      "mustReturnResultTo": "/api/dsg/agent-command-gate/result"
    }
  }
}
```

## Required result callback

```json
{
  "workspaceId": "workspace-1",
  "agentId": "agent-1",
  "sessionId": "session-1",
  "commandId": "cmd-1",
  "envelopeId": "envelope-id",
  "decisionHash": "decision-hash",
  "status": "SUCCESS",
  "startedAt": "2026-05-06T00:01:00.000Z",
  "completedAt": "2026-05-06T00:01:03.000Z",
  "observedResultHash": "observed-result-hash",
  "evidenceItemIds": ["evidence-1"],
  "targetSystemReceiptId": "stripe-request-id"
}
```

## Claim boundary

Allowed after command gate PASS:

> DSG approved the agent command envelope.

Allowed after result receipt accepted:

> The agent returned an action result receipt to DSG.

Still forbidden unless separately verified by evidence:

- the target system definitely changed
- payment/refund completed
- deployment completed
- production operation succeeded
- post-execution replay/evidence has passed

## DB-backed source of truth

Migration:

- `supabase/migrations/202605060002_create_dsg_agent_command_gate.sql`

Tables:

- `dsg_agent_command_gate_decisions`
- `dsg_agent_action_result_receipts`

Both tables enable RLS and are intended to be written by server-side RBAC/service-role code only.
