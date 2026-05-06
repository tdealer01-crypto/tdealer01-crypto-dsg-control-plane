import { describe, expect, it } from "vitest";
import {
  buildAgentActionResultReceipt,
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
} from "../../lib/dsg/agent-command-gate";

const fixedNow = new Date("2026-05-06T00:00:00.000Z");

function baseRequest(): AgentCommandGateRequest {
  return {
    workspaceId: "workspace-1",
    runtime: {
      agentId: "agent-1",
      agentType: "workflow-agent",
      sessionId: "session-1",
      agentWillExecuteAction: true,
      requiresResultCallback: true,
    },
    command: {
      commandId: "cmd-1",
      actionType: "payment",
      targetSystemId: "stripe-billing",
      operationName: "issue refund",
      method: "POST",
      path: "/refunds",
      riskLevel: "critical",
      dataClasses: ["payment", "restricted"],
      payloadHash: "payload-hash",
      idempotencyKey: "cmd-1-20260506",
      rollbackPlanId: "rollback-1",
    },
    rbac: {
      actorId: "operator-1",
      role: "owner",
      permissions: ["tool:execute_critical"],
      approvalRequestId: "approval-1",
      approvalDecision: "approved",
      approvedBy: "approver-1",
      approvedAt: "2026-05-06T00:00:00.000Z",
    },
    audit: {
      preAuditEventId: "audit-event-1",
      ledgerId: "ledger-1",
      chainHeadHash: "chain-head-hash",
    },
    evidence: {
      evidenceManifestId: "manifest-1",
      policySnapshotHash: "policy-hash",
      runtimeBindingHash: "runtime-binding-hash",
    },
  };
}

describe("agent command gate", () => {
  it("returns an action envelope when command proof is complete", () => {
    const result = evaluateAgentCommandGate(baseRequest(), fixedNow);

    expect(result.decision).toBe("PASS");
    expect(result.canAgentExecute).toBe(true);
    expect(result.actionEnvelope?.mustReturnResultTo).toBe("/api/dsg/agent-command-gate/result");
    expect(result.actionEnvelope?.allowedAction).toBe("payment");
  });

  it("blocks sensitive action without approved approval proof", () => {
    const request = baseRequest();
    request.rbac.approvalDecision = "pending";

    const result = evaluateAgentCommandGate(request, fixedNow);

    expect(result.decision).toBe("BLOCK");
    expect(result.canAgentExecute).toBe(false);
    expect(result.actionEnvelope).toBeUndefined();
  });

  it("blocks mutation without idempotency key", () => {
    const request = baseRequest();
    request.command.idempotencyKey = undefined;

    const result = evaluateAgentCommandGate(request, fixedNow);

    expect(result.decision).toBe("BLOCK");
    expect(result.invariantChecks.find((check) => check.name === "idempotency_for_mutation")?.status).toBe("BLOCK");
  });

  it("builds a receipt when agent returns observed result and evidence ids", () => {
    const gate = evaluateAgentCommandGate(baseRequest(), fixedNow);
    const receipt = buildAgentActionResultReceipt(
      {
        workspaceId: "workspace-1",
        agentId: "agent-1",
        sessionId: "session-1",
        commandId: "cmd-1",
        envelopeId: gate.actionEnvelope?.envelopeId || "missing",
        decisionHash: gate.decisionHash,
        status: "SUCCESS",
        startedAt: "2026-05-06T00:01:00.000Z",
        completedAt: "2026-05-06T00:01:03.000Z",
        observedResultHash: "observed-result-hash",
        evidenceItemIds: ["evidence-1"],
        targetSystemReceiptId: "stripe-request-id",
      },
      fixedNow,
    );

    expect(receipt.accepted).toBe(true);
    expect(receipt.status).toBe("SUCCESS");
  });
});
