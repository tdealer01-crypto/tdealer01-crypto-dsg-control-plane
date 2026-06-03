import { createHash } from "crypto";
import type { AgentActionType, AgentResultStatus } from "./agent-command-gate";
import type { RiskLevel } from "./midmarket-governance-autopilot";

export type DsgPlanAuditDecision =
  | "PLAN_MATCHED_ALLOW_AUDIT"
  | "PLAN_RELATED_REPLAN"
  | "OUT_OF_PLAN_DENY"
  | "CLAIM_EVIDENCE_DENY";

export interface HermesPlanScopeContract {
  planId: string;
  planHash: string;
  scopeHash: string;
  workspaceId: string;
  agentId: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt?: string;
  allowedActionTypes: AgentActionType[];
  allowedTargetSystems: string[];
  allowedOperations: string[];
  maxRiskLevel: RiskLevel;
  evidenceRequirements: {
    requireIdempotency: boolean;
    requireRollback: boolean;
    requireAudit: boolean;
    requireEvidence: boolean;
  };
  claimBoundary: string;
}

export interface HermesActionEvent {
  eventId: string;
  planId: string;
  planHash: string;
  workspaceId: string;
  agentId: string;
  sessionId: string;
  actionType: AgentActionType;
  targetSystemId: string;
  operationName: string;
  riskLevel: RiskLevel;
  payloadHash?: string;
  idempotencyKey?: string;
  rollbackPlanId?: string;
  evidenceManifestId?: string;
  policySnapshotHash?: string;
  claimedOutcome?: string;
  requestedAt: string;
}

export interface DsgPlanAlignmentResult {
  decision: DsgPlanAuditDecision;
  canProceed: boolean;
  planId: string;
  planHash: string;
  scopeHash: string;
  eventId: string;
  reasons: string[];
  requiresReplan: boolean;
  claimAllowed: boolean;
  decisionHash: string;
  decidedAt: string;
}

export interface HermesEvidenceReceipt {
  receiptId: string;
  planId: string;
  planHash: string;
  scopeHash: string;
  eventId: string;
  commandId?: string;
  envelopeId?: string;
  decision: DsgPlanAuditDecision;
  actionStatus: AgentResultStatus;
  observedResultHash?: string;
  evidenceItemIds: string[];
  claimVerified: boolean;
  receiptHash: string;
  recordedAt: string;
  claimBoundary: string;
}

export function buildPlanScopeHash(contract: Omit<HermesPlanScopeContract, "planHash" | "scopeHash">): string {
  return sha256({
    planId: contract.planId,
    workspaceId: contract.workspaceId,
    agentId: contract.agentId,
    allowedActionTypes: [...contract.allowedActionTypes].sort(),
    allowedTargetSystems: [...contract.allowedTargetSystems].sort(),
    allowedOperations: [...contract.allowedOperations].sort(),
    maxRiskLevel: contract.maxRiskLevel,
    evidenceRequirements: contract.evidenceRequirements,
  });
}

export function buildPlanHash(contract: Omit<HermesPlanScopeContract, "planHash">): string {
  return sha256({
    scopeHash: contract.scopeHash,
    approvedBy: contract.approvedBy,
    approvedAt: contract.approvedAt,
    expiresAt: contract.expiresAt,
    claimBoundary: contract.claimBoundary,
  });
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(sortStable(value)))
    .digest("hex");
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
