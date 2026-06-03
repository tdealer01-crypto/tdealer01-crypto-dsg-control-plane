import { createHash } from "crypto";
import type { RiskLevel } from "./midmarket-governance-autopilot";
import type {
  DsgPlanAuditDecision,
  DsgPlanAlignmentResult,
  HermesActionEvent,
  HermesEvidenceReceipt,
  HermesPlanScopeContract,
} from "./plan-scope-contract";
import type { AgentResultStatus } from "./agent-command-gate";

export type { DsgPlanAuditDecision, DsgPlanAlignmentResult, HermesActionEvent, HermesEvidenceReceipt, HermesPlanScopeContract };

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

function riskExceeds(actual: RiskLevel, max: RiskLevel): boolean {
  return RISK_ORDER.indexOf(actual) > RISK_ORDER.indexOf(max);
}

export function evaluatePlanAlignment(
  contract: HermesPlanScopeContract,
  event: HermesActionEvent,
  now: Date = new Date(),
): DsgPlanAlignmentResult {
  const decidedAt = now.toISOString();
  const reasons: string[] = [];

  if (contract.expiresAt && now > new Date(contract.expiresAt)) {
    reasons.push("plan_expired");
    return seal("OUT_OF_PLAN_DENY", contract, event, reasons, false, decidedAt);
  }

  if (contract.workspaceId !== event.workspaceId) {
    reasons.push("workspace_mismatch");
    return seal("OUT_OF_PLAN_DENY", contract, event, reasons, false, decidedAt);
  }

  if (contract.agentId !== event.agentId) {
    reasons.push("agent_mismatch");
    return seal("OUT_OF_PLAN_DENY", contract, event, reasons, false, decidedAt);
  }

  const actionAllowed = contract.allowedActionTypes.includes(event.actionType);
  const targetAllowed = contract.allowedTargetSystems.includes(event.targetSystemId);
  const riskAllowed = !riskExceeds(event.riskLevel, contract.maxRiskLevel);

  if (!actionAllowed) reasons.push(`action_type_not_in_plan:${event.actionType}`);
  if (!targetAllowed) reasons.push(`target_system_not_in_plan:${event.targetSystemId}`);
  if (!riskAllowed) reasons.push(`risk_level_exceeds_plan:${event.riskLevel}_max_${contract.maxRiskLevel}`);

  if (!actionAllowed || !targetAllowed || !riskAllowed) {
    return seal("OUT_OF_PLAN_DENY", contract, event, reasons, false, decidedAt);
  }

  if (event.planHash !== contract.planHash) {
    reasons.push("plan_hash_mismatch:action_references_different_plan_version");
    return seal("PLAN_RELATED_REPLAN", contract, event, reasons, false, decidedAt);
  }

  const req = contract.evidenceRequirements;
  const evidenceGaps: string[] = [];
  if (req.requireIdempotency && !event.idempotencyKey) evidenceGaps.push("idempotency_key_missing");
  if (req.requireRollback && !event.rollbackPlanId) evidenceGaps.push("rollback_plan_missing");
  if (req.requireEvidence && !event.evidenceManifestId) evidenceGaps.push("evidence_manifest_missing");
  if (req.requireEvidence && !event.policySnapshotHash) evidenceGaps.push("policy_snapshot_missing");

  if (evidenceGaps.length > 0) {
    evidenceGaps.forEach((g) => reasons.push(g));
    return seal("CLAIM_EVIDENCE_DENY", contract, event, reasons, false, decidedAt);
  }

  reasons.push(`plan_matched:planHash=${contract.planHash.slice(0, 16)}…`);
  return seal("PLAN_MATCHED_ALLOW_AUDIT", contract, event, reasons, true, decidedAt);
}

function seal(
  decision: DsgPlanAuditDecision,
  contract: HermesPlanScopeContract,
  event: HermesActionEvent,
  reasons: string[],
  claimAllowed: boolean,
  decidedAt: string,
): DsgPlanAlignmentResult {
  const decisionHash = sha256({ decision, planHash: contract.planHash, eventId: event.eventId, reasons, decidedAt });
  return {
    decision,
    canProceed: decision === "PLAN_MATCHED_ALLOW_AUDIT",
    planId: contract.planId,
    planHash: contract.planHash,
    scopeHash: contract.scopeHash,
    eventId: event.eventId,
    reasons,
    requiresReplan: decision === "PLAN_RELATED_REPLAN",
    claimAllowed,
    decisionHash,
    decidedAt,
  };
}

export function buildHermesEvidenceReceipt(
  contract: HermesPlanScopeContract,
  event: HermesActionEvent,
  alignment: DsgPlanAlignmentResult,
  params: {
    commandId?: string;
    envelopeId?: string;
    actionStatus: AgentResultStatus;
    observedResultHash?: string;
    evidenceItemIds: string[];
    claimVerified: boolean;
  },
  now: Date = new Date(),
): HermesEvidenceReceipt {
  const recordedAt = now.toISOString();
  const receiptId = sha256({ planId: contract.planId, eventId: event.eventId, recordedAt }).slice(0, 32);
  const receiptHash = sha256({
    receiptId,
    planHash: contract.planHash,
    scopeHash: contract.scopeHash,
    alignment: alignment.decision,
    params,
    recordedAt,
  });

  return {
    receiptId,
    planId: contract.planId,
    planHash: contract.planHash,
    scopeHash: contract.scopeHash,
    eventId: event.eventId,
    commandId: params.commandId,
    envelopeId: params.envelopeId,
    decision: alignment.decision,
    actionStatus: params.actionStatus,
    observedResultHash: params.observedResultHash,
    evidenceItemIds: params.evidenceItemIds,
    claimVerified: params.claimVerified,
    receiptHash,
    recordedAt,
    claimBoundary: contract.claimBoundary,
  };
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
