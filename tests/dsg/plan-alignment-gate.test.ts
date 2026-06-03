import { describe, expect, it } from "vitest";
import { evaluatePlanAlignment, buildHermesEvidenceReceipt } from "../../lib/dsg/plan-alignment-gate";
import type { HermesPlanScopeContract, HermesActionEvent } from "../../lib/dsg/plan-scope-contract";

const fixedNow = new Date("2026-05-06T00:00:00.000Z");

const baseContract: HermesPlanScopeContract = {
  planId: "plan-001",
  planHash: "approved-plan-hash-abc123",
  scopeHash: "scope-hash-xyz",
  workspaceId: "ws-001",
  agentId: "agent-001",
  approvedBy: "operator-1",
  approvedAt: "2026-05-06T00:00:00.000Z",
  expiresAt: "2026-05-07T00:00:00.000Z",
  allowedActionTypes: ["payment", "write", "read"],
  allowedTargetSystems: ["stripe-billing", "supabase-prod"],
  allowedOperations: ["issue refund", "fetch_user"],
  maxRiskLevel: "critical",
  evidenceRequirements: {
    requireIdempotency: true,
    requireRollback: false,
    requireAudit: true,
    requireEvidence: true,
  },
  claimBoundary: "Actions within this plan scope are DSG-audited.",
};

function baseEvent(): HermesActionEvent {
  return {
    eventId: "event-001",
    planId: "plan-001",
    planHash: "approved-plan-hash-abc123",
    workspaceId: "ws-001",
    agentId: "agent-001",
    sessionId: "session-001",
    actionType: "payment",
    targetSystemId: "stripe-billing",
    operationName: "issue refund",
    riskLevel: "critical",
    idempotencyKey: "idem-001",
    evidenceManifestId: "manifest-001",
    policySnapshotHash: "policy-snap-001",
    requestedAt: "2026-05-06T00:00:00.000Z",
  };
}

describe("evaluatePlanAlignment", () => {
  it("PLAN_MATCHED_ALLOW_AUDIT when event fully matches contract", () => {
    const result = evaluatePlanAlignment(baseContract, baseEvent(), fixedNow);

    expect(result.decision).toBe("PLAN_MATCHED_ALLOW_AUDIT");
    expect(result.canProceed).toBe(true);
    expect(result.claimAllowed).toBe(true);
    expect(result.requiresReplan).toBe(false);
    expect(result.planHash).toBe("approved-plan-hash-abc123");
    expect(result.scopeHash).toBe("scope-hash-xyz");
    expect(result.decisionHash).toBeTruthy();
  });

  it("OUT_OF_PLAN_DENY when action type is not in contract", () => {
    const event = { ...baseEvent(), actionType: "deploy" as const };
    const result = evaluatePlanAlignment(baseContract, event, fixedNow);

    expect(result.decision).toBe("OUT_OF_PLAN_DENY");
    expect(result.canProceed).toBe(false);
    expect(result.reasons.some((r) => r.includes("action_type_not_in_plan"))).toBe(true);
  });

  it("OUT_OF_PLAN_DENY when target system is not in contract", () => {
    const event = { ...baseEvent(), targetSystemId: "k8s-prod" };
    const result = evaluatePlanAlignment(baseContract, event, fixedNow);

    expect(result.decision).toBe("OUT_OF_PLAN_DENY");
    expect(result.canProceed).toBe(false);
    expect(result.reasons.some((r) => r.includes("target_system_not_in_plan"))).toBe(true);
  });

  it("OUT_OF_PLAN_DENY when risk level exceeds contract max", () => {
    const contract: HermesPlanScopeContract = { ...baseContract, maxRiskLevel: "medium" };
    const event = { ...baseEvent(), riskLevel: "critical" as const };
    const result = evaluatePlanAlignment(contract, event, fixedNow);

    expect(result.decision).toBe("OUT_OF_PLAN_DENY");
    expect(result.reasons.some((r) => r.includes("risk_level_exceeds_plan"))).toBe(true);
  });

  it("OUT_OF_PLAN_DENY when workspace does not match contract", () => {
    const event = { ...baseEvent(), workspaceId: "ws-other" };
    const result = evaluatePlanAlignment(baseContract, event, fixedNow);

    expect(result.decision).toBe("OUT_OF_PLAN_DENY");
    expect(result.reasons).toContain("workspace_mismatch");
  });

  it("OUT_OF_PLAN_DENY when plan is expired", () => {
    const contract: HermesPlanScopeContract = {
      ...baseContract,
      expiresAt: "2026-05-05T00:00:00.000Z",
    };
    const result = evaluatePlanAlignment(contract, baseEvent(), fixedNow);

    expect(result.decision).toBe("OUT_OF_PLAN_DENY");
    expect(result.reasons).toContain("plan_expired");
  });

  it("PLAN_RELATED_REPLAN when planHash in event does not match contract", () => {
    const event = { ...baseEvent(), planHash: "different-plan-hash" };
    const result = evaluatePlanAlignment(baseContract, event, fixedNow);

    expect(result.decision).toBe("PLAN_RELATED_REPLAN");
    expect(result.requiresReplan).toBe(true);
    expect(result.canProceed).toBe(false);
    expect(result.reasons.some((r) => r.includes("plan_hash_mismatch"))).toBe(true);
  });

  it("CLAIM_EVIDENCE_DENY when required idempotency key is missing", () => {
    const event = { ...baseEvent(), idempotencyKey: undefined };
    const result = evaluatePlanAlignment(baseContract, event, fixedNow);

    expect(result.decision).toBe("CLAIM_EVIDENCE_DENY");
    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain("idempotency_key_missing");
  });

  it("CLAIM_EVIDENCE_DENY when required evidence manifest is missing", () => {
    const event = { ...baseEvent(), evidenceManifestId: undefined };
    const result = evaluatePlanAlignment(baseContract, event, fixedNow);

    expect(result.decision).toBe("CLAIM_EVIDENCE_DENY");
    expect(result.reasons).toContain("evidence_manifest_missing");
  });

  it("PLAN_MATCHED when evidence requirements are not required by contract", () => {
    const contract: HermesPlanScopeContract = {
      ...baseContract,
      evidenceRequirements: {
        requireIdempotency: false,
        requireRollback: false,
        requireAudit: false,
        requireEvidence: false,
      },
    };
    const event = {
      ...baseEvent(),
      idempotencyKey: undefined,
      evidenceManifestId: undefined,
      policySnapshotHash: undefined,
    };
    const result = evaluatePlanAlignment(contract, event, fixedNow);

    expect(result.decision).toBe("PLAN_MATCHED_ALLOW_AUDIT");
    expect(result.canProceed).toBe(true);
  });

  it("produces deterministic decisionHash for same inputs", () => {
    const r1 = evaluatePlanAlignment(baseContract, baseEvent(), fixedNow);
    const r2 = evaluatePlanAlignment(baseContract, baseEvent(), fixedNow);

    expect(r1.decisionHash).toBe(r2.decisionHash);
  });
});

describe("buildHermesEvidenceReceipt", () => {
  it("builds receipt binding plan, scope, and action evidence", () => {
    const event = baseEvent();
    const alignment = evaluatePlanAlignment(baseContract, event, fixedNow);
    const receipt = buildHermesEvidenceReceipt(
      baseContract,
      event,
      alignment,
      {
        commandId: "cmd-001",
        envelopeId: "env-001",
        actionStatus: "SUCCESS",
        observedResultHash: "result-hash-001",
        evidenceItemIds: ["ev-001"],
        claimVerified: true,
      },
      fixedNow,
    );

    expect(receipt.decision).toBe("PLAN_MATCHED_ALLOW_AUDIT");
    expect(receipt.planHash).toBe("approved-plan-hash-abc123");
    expect(receipt.scopeHash).toBe("scope-hash-xyz");
    expect(receipt.claimVerified).toBe(true);
    expect(receipt.actionStatus).toBe("SUCCESS");
    expect(receipt.receiptHash).toBeTruthy();
    expect(receipt.claimBoundary).toContain("DSG-audited");
  });

  it("receipt reflects deny decision when alignment blocked", () => {
    const event = { ...baseEvent(), targetSystemId: "unauthorized-system" };
    const alignment = evaluatePlanAlignment(baseContract, event, fixedNow);
    const receipt = buildHermesEvidenceReceipt(
      baseContract,
      event,
      alignment,
      {
        actionStatus: "BLOCKED_BY_TARGET",
        observedResultHash: undefined,
        evidenceItemIds: [],
        claimVerified: false,
      },
      fixedNow,
    );

    expect(receipt.decision).toBe("OUT_OF_PLAN_DENY");
    expect(receipt.claimVerified).toBe(false);
    expect(receipt.actionStatus).toBe("BLOCKED_BY_TARGET");
  });
});
