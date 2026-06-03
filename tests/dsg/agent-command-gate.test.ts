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

  it("PASS for plan-authorized mutation without idempotencyKey, rollbackPlanId, audit, or evidence bindings", () => {
    const request = baseRequest();
    request.command.idempotencyKey = undefined;
    request.command.rollbackPlanId = undefined;
    request.command.planHash = "approved-plan-hash-abc123";
    request.audit = { preAuditEventId: "", ledgerId: "", chainHeadHash: "" };
    request.evidence = { evidenceManifestId: "", policySnapshotHash: "" };

    const result = evaluateAgentCommandGate(request, fixedNow);

    expect(result.decision).toBe("PASS");
    expect(result.canAgentExecute).toBe(true);
    expect(result.invariantChecks.find((c) => c.name === "idempotency_for_mutation")?.status).toBe("PASS");
    expect(result.invariantChecks.find((c) => c.name === "rollback_for_mutation")?.status).toBe("PASS");
    expect(result.invariantChecks.find((c) => c.name === "audit_hook_bound")?.status).toBe("PASS");
    expect(result.invariantChecks.find((c) => c.name === "evidence_hook_bound")?.status).toBe("PASS");
    expect(result.invariantChecks.find((c) => c.name === "plan_authorization")?.status).toBe("PASS");
  });

  it("plan-authorized action still requires approved approval proof for high-risk commands", () => {
    const request = baseRequest();
    request.command.planHash = "approved-plan-hash-abc123";
    request.rbac.approvalDecision = "pending";

    const result = evaluateAgentCommandGate(request, fixedNow);

    expect(result.decision).toBe("BLOCK");
    expect(result.invariantChecks.find((c) => c.name === "approval_for_high_risk_or_sensitive_action")?.status).toBe("BLOCK");
  });

  it("plan_authorization invariant always reports PASS status (informational)", () => {
    const request = baseRequest();
    const resultWithPlan = evaluateAgentCommandGate({ ...request, command: { ...request.command, planHash: "some-hash" } }, fixedNow);
    const resultWithoutPlan = evaluateAgentCommandGate(request, fixedNow);

    const withPlanCheck = resultWithPlan.invariantChecks.find((c) => c.name === "plan_authorization");
    const withoutPlanCheck = resultWithoutPlan.invariantChecks.find((c) => c.name === "plan_authorization");

    expect(withPlanCheck?.status).toBe("PASS");
    expect(withoutPlanCheck?.status).toBe("PASS");
    expect(withPlanCheck?.reason).toContain("plan-authorized");
    expect(withoutPlanCheck?.reason).toContain("RBAC");
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
