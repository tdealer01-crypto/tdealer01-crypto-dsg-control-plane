import { describe, expect, it } from "vitest";
import { evaluateMidMarketProductionRuntimeBinding, type ProductionRuntimeBindingRequest } from "../../lib/dsg/midmarket-production-runtime";

const fixedNow = new Date("2026-05-06T00:00:00.000Z");

function baseRequest(): ProductionRuntimeBindingRequest {
  return {
    workspaceId: "workspace-1",
    customerName: "MidMarket Finance Ops",
    assessment: {
      decision: "REVIEW",
      overallRisk: "critical",
      riskScore: 100,
      requestHash: "assessment-request-hash",
      decisionHash: "assessment-decision-hash",
      evidenceRequired: ["approval_policy", "audit_export"],
      runtimeMonitor: [
        { title: "Gate decision rate", metric: "PASS / REVIEW / BLOCK", threshold: "BLOCK > 5%", action: "review" },
      ],
    },
    executor: {
      executorId: "executor-1",
      executorType: "dsg-controlled-executor",
      allowDirectModelToApi: false,
      commandAllowlist: ["connector.execute"],
      connectorAllowlist: ["stripe-billing"],
      secretBindingIds: ["secret-binding-1"],
      killSwitchEnabled: true,
      pauseResumeEnabled: true,
    },
    rbac: {
      workspaceId: "workspace-1",
      actorId: "operator-1",
      role: "owner",
      permissions: ["tool:execute_critical"],
      approvalRequestId: "approval-1",
      approvalDecision: "approved",
      approvedBy: "approver-1",
      approvedAt: "2026-05-06T00:00:00.000Z",
    },
    auditLedger: {
      ledgerId: "ledger-1",
      chainHeadHash: "chain-head-hash",
      currentHash: "current-hash",
      eventsRecorded: 3,
    },
    evidenceManifest: {
      manifestId: "manifest-1",
      manifestHash: "manifest-hash",
      evidenceItemIds: ["evidence-1"],
      includesAssessment: true,
      includesPolicySnapshot: true,
      includesApproval: true,
      includesExecutorBinding: true,
      includesRuntimeMonitor: true,
    },
    replayProof: {
      replayId: "replay-1",
      replayHash: "replay-hash",
      requestHash: "assessment-request-hash",
      decisionHash: "assessment-decision-hash",
      deterministic: true,
    },
    actions: [
      {
        actionId: "refund-1",
        actionType: "payment",
        riskLevel: "critical",
        systemId: "stripe-billing",
        operationName: "issue refund",
        idempotencyKey: "refund-1-20260506",
        rollbackPlanId: "rollback-1",
        requiresApproval: true,
      },
    ],
  };
}

describe("mid-market production runtime binding", () => {
  it("passes only when executor, RBAC, audit, evidence, approval, idempotency, rollback, and replay proofs are complete", () => {
    const result = evaluateMidMarketProductionRuntimeBinding(baseRequest(), fixedNow);

    expect(result.decision).toBe("PASS");
    expect(result.status).toBe("READY_FOR_PRODUCTION_RUNTIME");
    expect(result.canExecuteProductionRuntime).toBe(true);
    expect(result.allowedActionIds).toEqual(["refund-1"]);
  });

  it("blocks direct model-to-api execution", () => {
    const request = baseRequest();
    request.executor = { ...request.executor, allowDirectModelToApi: true as false };

    const result = evaluateMidMarketProductionRuntimeBinding(request, fixedNow);

    expect(result.decision).toBe("BLOCK");
    expect(result.canExecuteProductionRuntime).toBe(false);
    expect(result.invariantChecks.find((check) => check.name === "controlled_executor_bound")?.status).toBe("BLOCK");
  });

  it("blocks high risk actions without approval", () => {
    const request = baseRequest();
    request.rbac.approvalDecision = "pending";

    const result = evaluateMidMarketProductionRuntimeBinding(request, fixedNow);

    expect(result.decision).toBe("BLOCK");
    expect(result.invariantChecks.find((check) => check.name === "approval_for_high_risk_actions")?.status).toBe("BLOCK");
  });

  it("blocks replay mismatch", () => {
    const request = baseRequest();
    request.replayProof.decisionHash = "wrong-hash";

    const result = evaluateMidMarketProductionRuntimeBinding(request, fixedNow);

    expect(result.decision).toBe("BLOCK");
    expect(result.invariantChecks.find((check) => check.name === "replay_proof_matches_assessment")?.status).toBe("BLOCK");
  });
});
