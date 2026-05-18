import { createHash } from "crypto";
import type { GateDecision, MidMarketAutopilotResult, RiskLevel } from "./midmarket-governance-autopilot";

export type ProductionRuntimeStatus =
  | "BLOCKED"
  | "READY_FOR_PRODUCTION_RUNTIME"
  | "RUNNING"
  | "VERIFYING"
  | "COMPLETED";

export type RuntimeAction = "observe" | "read" | "write" | "delete" | "payment" | "deploy" | "admin";

export interface ControlledExecutorBinding {
  executorId: string;
  executorType: "dsg-controlled-executor" | "external-runner" | "github-actions" | "container-runner";
  allowDirectModelToApi: false;
  commandAllowlist: string[];
  connectorAllowlist: string[];
  secretBindingIds: string[];
  dryRunOnly?: boolean;
  killSwitchEnabled: boolean;
  pauseResumeEnabled: boolean;
}

export interface RbacRuntimeProof {
  workspaceId: string;
  actorId: string;
  role: "operator" | "approver" | "admin" | "owner";
  permissions: string[];
  approvalRequestId?: string;
  approvalDecision?: "approved" | "rejected" | "pending";
  approvedBy?: string;
  approvedAt?: string;
}

export interface AuditLedgerProof {
  ledgerId: string;
  chainHeadHash: string;
  previousHash?: string;
  currentHash: string;
  eventsRecorded: number;
  exportedAt?: string;
}

export interface EvidenceManifestProof {
  manifestId: string;
  manifestHash: string;
  evidenceItemIds: string[];
  includesAssessment: boolean;
  includesPolicySnapshot: boolean;
  includesApproval: boolean;
  includesExecutorBinding: boolean;
  includesRuntimeMonitor: boolean;
}

export interface ReplayProof {
  replayId: string;
  replayHash: string;
  requestHash: string;
  decisionHash: string;
  deterministic: boolean;
  verifiedAt?: string;
}

export interface ProductionRuntimeActionRequest {
  actionId: string;
  actionType: RuntimeAction;
  riskLevel: RiskLevel;
  systemId: string;
  operationName: string;
  idempotencyKey: string;
  rollbackPlanId?: string;
  requiresApproval?: boolean;
}

export interface ProductionRuntimeBindingRequest {
  workspaceId: string;
  customerName?: string;
  assessment: Pick<
    MidMarketAutopilotResult,
    "decision" | "overallRisk" | "riskScore" | "requestHash" | "decisionHash" | "evidenceRequired" | "runtimeMonitor"
  >;
  executor: ControlledExecutorBinding;
  rbac: RbacRuntimeProof;
  auditLedger: AuditLedgerProof;
  evidenceManifest: EvidenceManifestProof;
  replayProof: ReplayProof;
  actions: ProductionRuntimeActionRequest[];
}

export interface RuntimeInvariantCheck {
  name: string;
  status: GateDecision;
  severity: "HARD" | "SOFT";
  reason: string;
}

export interface ProductionRuntimeBindingResult {
  gateVersion: string;
  status: ProductionRuntimeStatus;
  decision: GateDecision;
  canExecuteProductionRuntime: boolean;
  reasons: string[];
  invariantChecks: RuntimeInvariantCheck[];
  allowedActionIds: string[];
  blockedActionIds: string[];
  requiredOperatorControls: string[];
  runtimeTruthBoundary: string;
  requestHash: string;
  productionRuntimeHash: string;
  generatedAt: string;
}

export const MIDMARKET_PRODUCTION_RUNTIME_GATE_VERSION = "midmarket-production-runtime-binding-v1.0";

const RISK_EXECUTION_PERMISSION: Record<RiskLevel, string> = {
  low: "tool:execute_low",
  medium: "tool:execute_medium",
  high: "tool:execute_high",
  critical: "tool:execute_critical",
};

export function evaluateMidMarketProductionRuntimeBinding(
  input: ProductionRuntimeBindingRequest,
  now: Date = new Date(),
): ProductionRuntimeBindingResult {
  const requestHash = sha256(input);
  const invariantChecks = evaluateRuntimeInvariants(input);
  const blockedByHardInvariant = invariantChecks.some((check) => check.severity === "HARD" && check.status === "BLOCK");
  const reviewBySoftInvariant = invariantChecks.some((check) => check.status === "REVIEW");
  const decision: GateDecision = blockedByHardInvariant ? "BLOCK" : reviewBySoftInvariant ? "REVIEW" : "PASS";
  const allowedActionIds = decision === "PASS" ? input.actions.map((action) => action.actionId) : [];
  const blockedActionIds = decision === "PASS" ? [] : input.actions.map((action) => action.actionId);
  const generatedAt = now.toISOString();
  const unsigned = {
    gateVersion: MIDMARKET_PRODUCTION_RUNTIME_GATE_VERSION,
    workspaceId: input.workspaceId,
    assessmentDecisionHash: input.assessment.decisionHash,
    requestHash,
    decision,
    allowedActionIds,
    blockedActionIds,
    generatedAt,
  };

  return {
    gateVersion: MIDMARKET_PRODUCTION_RUNTIME_GATE_VERSION,
    status: decision === "PASS" ? "READY_FOR_PRODUCTION_RUNTIME" : "BLOCKED",
    decision,
    canExecuteProductionRuntime: decision === "PASS",
    reasons: buildRuntimeReasons(decision, invariantChecks),
    invariantChecks,
    allowedActionIds,
    blockedActionIds,
    requiredOperatorControls: ["pause", "resume", "kill", "approval_escalation", "audit_export", "replay_verify"],
    runtimeTruthBoundary:
      decision === "PASS"
        ? "Production runtime may execute only through the controlled executor binding in this proof. Direct model-to-API execution remains forbidden."
        : "Production runtime is blocked until all HARD invariants pass. Do not claim production execution.",
    requestHash,
    productionRuntimeHash: sha256(unsigned),
    generatedAt,
  };
}

function evaluateRuntimeInvariants(input: ProductionRuntimeBindingRequest): RuntimeInvariantCheck[] {
  const highRiskActions = input.actions.filter((action) => action.riskLevel === "high" || action.riskLevel === "critical");
  const criticalActions = input.actions.filter((action) => action.riskLevel === "critical");
  const requiredPermissions = Array.from(new Set(input.actions.map((action) => RISK_EXECUTION_PERMISSION[action.riskLevel])));
  const missingPermissions = requiredPermissions.filter((permission) => !input.rbac.permissions.includes(permission));
  const missingIdempotency = input.actions.filter((action) => !action.idempotencyKey);
  const missingRollbackForMutation = input.actions.filter((action) => ["write", "delete", "payment", "deploy", "admin"].includes(action.actionType) && !action.rollbackPlanId);
  const approvalRequired = highRiskActions.length > 0 || input.actions.some((action) => action.requiresApproval);

  return [
    {
      name: "assessment_not_blocked",
      status: input.assessment.decision === "BLOCK" ? "BLOCK" : "PASS",
      severity: "HARD",
      reason:
        input.assessment.decision === "BLOCK"
          ? "readiness assessment is blocked; production runtime cannot start"
          : "readiness assessment allows runtime binding",
    },
    {
      name: "controlled_executor_bound",
      status:
        input.executor.executorId &&
        input.executor.allowDirectModelToApi === false &&
        input.executor.connectorAllowlist.length > 0 &&
        input.executor.secretBindingIds.length > 0
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: "executor must be bound, connector-scoped, secret-scoped, and must forbid direct model-to-API execution",
    },
    {
      name: "operator_kill_switch",
      status: input.executor.killSwitchEnabled && input.executor.pauseResumeEnabled ? "PASS" : "BLOCK",
      severity: "HARD",
      reason: "production runtime requires pause/resume and kill controls before execution",
    },
    {
      name: "rbac_permission_binding",
      status: missingPermissions.length === 0 ? "PASS" : "BLOCK",
      severity: "HARD",
      reason:
        missingPermissions.length === 0
          ? "actor has all required risk execution permissions"
          : `missing permissions: ${missingPermissions.join(", ")}`,
    },
    {
      name: "approval_for_high_risk_actions",
      status:
        !approvalRequired || (input.rbac.approvalDecision === "approved" && Boolean(input.rbac.approvalRequestId))
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: approvalRequired
        ? "high/critical or declared approval-required actions must have approved approvalRequestId"
        : "no high-risk approval required",
    },
    {
      name: "audit_ledger_ready",
      status:
        input.auditLedger.ledgerId && input.auditLedger.currentHash && input.auditLedger.chainHeadHash && input.auditLedger.eventsRecorded > 0
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: "audit ledger must have a current hash, chain head hash, and recorded events",
    },
    {
      name: "evidence_manifest_complete",
      status:
        input.evidenceManifest.manifestId &&
        input.evidenceManifest.manifestHash &&
        input.evidenceManifest.evidenceItemIds.length > 0 &&
        input.evidenceManifest.includesAssessment &&
        input.evidenceManifest.includesPolicySnapshot &&
        input.evidenceManifest.includesExecutorBinding &&
        input.evidenceManifest.includesRuntimeMonitor &&
        (criticalActions.length === 0 || input.evidenceManifest.includesApproval)
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: "manifest must include assessment, policy, executor binding, runtime monitor, and approval evidence for critical actions",
    },
    {
      name: "replay_proof_matches_assessment",
      status:
        input.replayProof.deterministic &&
        input.replayProof.requestHash === input.assessment.requestHash &&
        input.replayProof.decisionHash === input.assessment.decisionHash
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: "replay proof must be deterministic and match the assessment requestHash and decisionHash",
    },
    {
      name: "action_idempotency",
      status: missingIdempotency.length === 0 ? "PASS" : "BLOCK",
      severity: "HARD",
      reason:
        missingIdempotency.length === 0
          ? "all production actions have idempotency keys"
          : `actions missing idempotency keys: ${missingIdempotency.map((action) => action.actionId).join(", ")}`,
    },
    {
      name: "rollback_for_mutations",
      status: missingRollbackForMutation.length === 0 ? "PASS" : "REVIEW",
      severity: "SOFT",
      reason:
        missingRollbackForMutation.length === 0
          ? "mutation/payment/admin/deploy actions have rollback or compensating plan ids"
          : `mutation actions missing rollback plan: ${missingRollbackForMutation.map((action) => action.actionId).join(", ")}`,
    },
  ];
}

function buildRuntimeReasons(decision: GateDecision, checks: RuntimeInvariantCheck[]): string[] {
  return Array.from(
    new Set([
      `decision_${decision.toLowerCase()}`,
      ...checks.filter((check) => check.status !== "PASS").map((check) => `${check.status.toLowerCase()}:${check.name}`),
    ]),
  ).sort((a, b) => a.localeCompare(b));
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(value));
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
