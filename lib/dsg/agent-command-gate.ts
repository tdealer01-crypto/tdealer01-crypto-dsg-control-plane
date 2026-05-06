import { createHash } from "crypto";
import type { DataClass, GateDecision, RiskLevel } from "./midmarket-governance-autopilot";

export type AgentActionType = "observe" | "read" | "write" | "delete" | "payment" | "deploy" | "admin";
export type AgentResultStatus = "SUCCESS" | "FAILED" | "SKIPPED" | "BLOCKED_BY_TARGET" | "PARTIAL";

export interface AgentCommandRuntime {
  agentId: string;
  agentName?: string;
  agentType: "ai-agent" | "workflow-agent" | "code-agent" | "external-agent";
  sessionId: string;
  agentWillExecuteAction: true;
  requiresResultCallback: true;
  resultCallbackUrl?: string;
}

export interface AgentCommandProposal {
  commandId: string;
  actionType: AgentActionType;
  targetSystemId: string;
  operationName: string;
  method?: string;
  path?: string;
  riskLevel: RiskLevel;
  dataClasses: DataClass[];
  payloadHash?: string;
  idempotencyKey?: string;
  rollbackPlanId?: string;
  expectedResultHash?: string;
}

export interface AgentCommandRbacProof {
  actorId: string;
  role: "viewer" | "operator" | "approver" | "admin" | "owner";
  permissions: string[];
  approvalRequestId?: string;
  approvalDecision?: "approved" | "rejected" | "pending";
  approvedBy?: string;
  approvedAt?: string;
}

export interface AgentCommandAuditBinding {
  preAuditEventId: string;
  ledgerId: string;
  chainHeadHash: string;
}

export interface AgentCommandEvidenceBinding {
  evidenceManifestId: string;
  policySnapshotHash: string;
  runtimeBindingHash?: string;
}

export interface AgentCommandGateRequest {
  workspaceId: string;
  customerName?: string;
  runtime: AgentCommandRuntime;
  command: AgentCommandProposal;
  rbac: AgentCommandRbacProof;
  audit: AgentCommandAuditBinding;
  evidence: AgentCommandEvidenceBinding;
}

export interface AgentCommandInvariantCheck {
  name: string;
  status: GateDecision;
  severity: "HARD" | "SOFT";
  reason: string;
}

export interface AgentActionEnvelope {
  envelopeId: string;
  workspaceId: string;
  agentId: string;
  sessionId: string;
  commandId: string;
  decisionHash: string;
  allowedAction: AgentActionType;
  targetSystemId: string;
  operationName: string;
  actionScope: string[];
  expiresAt: string;
  mustReturnResultTo: "/api/dsg/agent-command-gate/result";
  requiredResultFields: string[];
}

export interface AgentCommandGateResult {
  gateVersion: string;
  decision: GateDecision;
  canAgentExecute: boolean;
  status: "AGENT_ACTION_ALLOWED" | "AGENT_ACTION_REVIEW_REQUIRED" | "AGENT_ACTION_BLOCKED";
  reasons: string[];
  invariantChecks: AgentCommandInvariantCheck[];
  commandHash: string;
  decisionHash: string;
  actionEnvelope?: AgentActionEnvelope;
  generatedAt: string;
  truthBoundary: string;
}

export interface AgentActionResultRequest {
  workspaceId: string;
  agentId: string;
  sessionId: string;
  commandId: string;
  envelopeId: string;
  decisionHash: string;
  status: AgentResultStatus;
  startedAt: string;
  completedAt: string;
  observedResultHash: string;
  evidenceItemIds: string[];
  targetSystemReceiptId?: string;
  errorClass?: string;
  errorMessage?: string;
}

export interface AgentActionResultReceipt {
  gateVersion: string;
  accepted: boolean;
  workspaceId: string;
  agentId: string;
  commandId: string;
  envelopeId: string;
  status: AgentResultStatus;
  resultHash: string;
  receiptHash: string;
  reasons: string[];
  recordedAt: string;
}

export const AGENT_COMMAND_GATE_VERSION = "dsg-agent-command-gate-v1.0";

const RISK_EXECUTION_PERMISSION: Record<RiskLevel, string> = {
  low: "tool:execute_low",
  medium: "tool:execute_medium",
  high: "tool:execute_high",
  critical: "tool:execute_critical",
};

export function evaluateAgentCommandGate(
  input: AgentCommandGateRequest,
  now: Date = new Date(),
): AgentCommandGateResult {
  const generatedAt = now.toISOString();
  const commandHash = sha256(input);
  const invariantChecks = evaluateInvariants(input);
  const blocked = invariantChecks.some((check) => check.status === "BLOCK" && check.severity === "HARD");
  const review = invariantChecks.some((check) => check.status === "REVIEW");
  const decision: GateDecision = blocked ? "BLOCK" : review ? "REVIEW" : "PASS";
  const unsigned = {
    gateVersion: AGENT_COMMAND_GATE_VERSION,
    workspaceId: input.workspaceId,
    agentId: input.runtime.agentId,
    sessionId: input.runtime.sessionId,
    commandId: input.command.commandId,
    commandHash,
    decision,
    generatedAt,
  };
  const decisionHash = sha256(unsigned);
  const actionEnvelope = decision === "PASS" ? buildEnvelope(input, decisionHash, now) : undefined;

  return {
    gateVersion: AGENT_COMMAND_GATE_VERSION,
    decision,
    canAgentExecute: decision === "PASS",
    status:
      decision === "PASS"
        ? "AGENT_ACTION_ALLOWED"
        : decision === "REVIEW"
          ? "AGENT_ACTION_REVIEW_REQUIRED"
          : "AGENT_ACTION_BLOCKED",
    reasons: buildReasons(decision, invariantChecks),
    invariantChecks,
    commandHash,
    decisionHash,
    actionEnvelope,
    generatedAt,
    truthBoundary:
      decision === "PASS"
        ? "DSG has approved this command envelope. The agent may execute the action itself, then must post the observed result back to DSG for audit/evidence/replay recording."
        : "DSG has not approved this command for agent execution. The agent must not perform the action.",
  };
}

export function buildAgentActionResultReceipt(
  input: AgentActionResultRequest,
  now: Date = new Date(),
): AgentActionResultReceipt {
  const missing = [
    ["workspaceId", input.workspaceId],
    ["agentId", input.agentId],
    ["sessionId", input.sessionId],
    ["commandId", input.commandId],
    ["envelopeId", input.envelopeId],
    ["decisionHash", input.decisionHash],
    ["startedAt", input.startedAt],
    ["completedAt", input.completedAt],
    ["observedResultHash", input.observedResultHash],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => String(name));
  const accepted = missing.length === 0 && input.evidenceItemIds.length > 0;
  const recordedAt = now.toISOString();
  const resultHash = sha256(input);
  const receiptHash = sha256({ gateVersion: AGENT_COMMAND_GATE_VERSION, input, resultHash, accepted, recordedAt });

  return {
    gateVersion: AGENT_COMMAND_GATE_VERSION,
    accepted,
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    commandId: input.commandId,
    envelopeId: input.envelopeId,
    status: input.status,
    resultHash,
    receiptHash,
    reasons: accepted
      ? ["agent_result_record_accepted"]
      : [`missing_or_invalid:${missing.concat(input.evidenceItemIds.length ? [] : ["evidenceItemIds"]).join(",")}`],
    recordedAt,
  };
}

function evaluateInvariants(input: AgentCommandGateRequest): AgentCommandInvariantCheck[] {
  const mutation = ["write", "delete", "payment", "deploy", "admin"].includes(input.command.actionType);
  const highRisk = input.command.riskLevel === "high" || input.command.riskLevel === "critical";
  const requiredPermission = RISK_EXECUTION_PERMISSION[input.command.riskLevel];
  const hasRequiredPermission = input.rbac.permissions.includes(requiredPermission);
  const requiresApproval = highRisk || ["delete", "payment", "deploy", "admin"].includes(input.command.actionType);

  return [
    {
      name: "command_locked",
      status:
        input.workspaceId &&
        input.command.commandId &&
        input.command.targetSystemId &&
        input.command.operationName &&
        input.command.riskLevel
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: "workspace, command id, target system, operation, and risk level must be locked before action",
    },
    {
      name: "agent_identity_bound",
      status:
        input.runtime.agentId &&
        input.runtime.sessionId &&
        input.runtime.agentWillExecuteAction === true &&
        input.runtime.requiresResultCallback === true
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: "agent identity and result callback obligation must be bound before DSG returns an action envelope",
    },
    {
      name: "rbac_permission_bound",
      status: hasRequiredPermission ? "PASS" : "BLOCK",
      severity: "HARD",
      reason: hasRequiredPermission ? "actor has required execution permission" : `missing permission ${requiredPermission}`,
    },
    {
      name: "approval_for_high_risk_or_sensitive_action",
      status:
        !requiresApproval || (input.rbac.approvalDecision === "approved" && Boolean(input.rbac.approvalRequestId))
          ? "PASS"
          : "BLOCK",
      severity: "HARD",
      reason: requiresApproval
        ? "high-risk, payment, delete, deploy, and admin commands require approved approval proof"
        : "approval is not required for this low-risk command",
    },
    {
      name: "idempotency_for_mutation",
      status: !mutation || Boolean(input.command.idempotencyKey) ? "PASS" : "BLOCK",
      severity: "HARD",
      reason: mutation ? "mutation commands require idempotencyKey" : "read/observe commands do not require idempotency",
    },
    {
      name: "rollback_for_mutation",
      status: !mutation || Boolean(input.command.rollbackPlanId) ? "PASS" : "BLOCK",
      severity: "HARD",
      reason: mutation ? "mutation commands require rollbackPlanId or compensating plan" : "read/observe commands do not require rollback",
    },
    {
      name: "audit_hook_bound",
      status: input.audit.preAuditEventId && input.audit.ledgerId && input.audit.chainHeadHash ? "PASS" : "BLOCK",
      severity: "HARD",
      reason: "DSG must have pre-action audit event, ledger id, and chain head hash before returning an action envelope",
    },
    {
      name: "evidence_hook_bound",
      status: input.evidence.evidenceManifestId && input.evidence.policySnapshotHash ? "PASS" : "BLOCK",
      severity: "HARD",
      reason: "DSG must bind evidence manifest and policy snapshot before returning an action envelope",
    },
  ];
}

function buildEnvelope(input: AgentCommandGateRequest, decisionHash: string, now: Date): AgentActionEnvelope {
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  return {
    envelopeId: sha256({ decisionHash, commandId: input.command.commandId, agentId: input.runtime.agentId }).slice(0, 32),
    workspaceId: input.workspaceId,
    agentId: input.runtime.agentId,
    sessionId: input.runtime.sessionId,
    commandId: input.command.commandId,
    decisionHash,
    allowedAction: input.command.actionType,
    targetSystemId: input.command.targetSystemId,
    operationName: input.command.operationName,
    actionScope: [input.command.targetSystemId, input.command.operationName, input.command.actionType],
    expiresAt,
    mustReturnResultTo: "/api/dsg/agent-command-gate/result",
    requiredResultFields: [
      "workspaceId",
      "agentId",
      "sessionId",
      "commandId",
      "envelopeId",
      "decisionHash",
      "status",
      "startedAt",
      "completedAt",
      "observedResultHash",
      "evidenceItemIds",
    ],
  };
}

function buildReasons(decision: GateDecision, checks: AgentCommandInvariantCheck[]): string[] {
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
