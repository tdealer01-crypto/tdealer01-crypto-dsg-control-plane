import { createHash } from 'crypto';
import {
  evaluateAgentCommandGate,
  type AgentCommandGateRequest,
  type AgentCommandGateResult,
  type AgentActionType,
} from './agent-command-gate';
import type { RiskLevel } from './midmarket-governance-autopilot';

export interface EvaluateActionInput {
  workspaceId: string;
  agentId: string;
  sessionId: string;
  /** Human-readable action identifier */
  action: string;
  actionType: AgentActionType;
  targetSystemId: string;
  riskLevel: RiskLevel;
  /** Actor performing the action */
  actorId: string;
  actorRole?: 'viewer' | 'operator' | 'approver' | 'admin' | 'owner';
  /** Pre-approval proof when required (high-risk / payment / deploy / admin / delete) */
  approvalRequestId?: string;
  approvalDecision?: 'approved' | 'rejected' | 'pending';
  approvedBy?: string;
  /** Optional payload to hash for audit */
  payload?: unknown;
  idempotencyKey?: string;
  rollbackPlanId?: string;
  /** Evidence manifest bound before evaluation */
  evidenceManifestId?: string;
  policySnapshotHash?: string;
  /** Pre-audit hook bound before evaluation */
  preAuditEventId?: string;
  ledgerId?: string;
  chainHeadHash?: string;
  /** Approved plan hash — satisfies idempotency, rollback, audit, and evidence binding when present */
  planHash?: string;
}

export interface EvaluateActionResult {
  ok: boolean;
  decision: AgentCommandGateResult['decision'];
  canExecute: boolean;
  status: AgentCommandGateResult['status'];
  reasons: string[];
  commandHash: string;
  decisionHash: string;
  actionEnvelope?: AgentCommandGateResult['actionEnvelope'];
  gateResult: AgentCommandGateResult;
  truthBoundary: string;
}

const PERMISSIONS_BY_RISK: Record<RiskLevel, string[]> = {
  low: ['tool:execute_low'],
  medium: ['tool:execute_medium', 'tool:execute_low'],
  high: ['tool:execute_high', 'tool:execute_medium', 'tool:execute_low'],
  critical: ['tool:execute_critical', 'tool:execute_high', 'tool:execute_medium', 'tool:execute_low'],
};

function sha256(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

/**
 * Lightweight action evaluation for internal/MCP use.
 * Builds a full AgentCommandGateRequest from simplified input and runs evaluateAgentCommandGate.
 * Does not require HTTP auth — caller is responsible for authorisation before invoking.
 */
export function evaluateAction(input: EvaluateActionInput): EvaluateActionResult {
  const commandId = sha256({
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    sessionId: input.sessionId,
    action: input.action,
    idempotencyKey: input.idempotencyKey ?? Date.now(),
  }).slice(0, 32);

  const permissions = PERMISSIONS_BY_RISK[input.riskLevel] ?? ['tool:execute_low'];

  const request: AgentCommandGateRequest = {
    workspaceId: input.workspaceId,
    runtime: {
      agentId: input.agentId,
      agentType: 'ai-agent',
      sessionId: input.sessionId,
      agentWillExecuteAction: true,
      requiresResultCallback: true,
    },
    command: {
      commandId,
      actionType: input.actionType,
      targetSystemId: input.targetSystemId,
      operationName: input.action,
      riskLevel: input.riskLevel,
      dataClasses: [],
      payloadHash: input.payload ? sha256(input.payload) : undefined,
      idempotencyKey: input.idempotencyKey,
      rollbackPlanId: input.rollbackPlanId,
      planHash: input.planHash,
    },
    rbac: {
      actorId: input.actorId,
      role: input.actorRole ?? 'operator',
      permissions,
      approvalRequestId: input.approvalRequestId,
      approvalDecision: input.approvalDecision,
      approvedBy: input.approvedBy,
    },
    audit: {
      preAuditEventId: input.preAuditEventId ?? `auto:${commandId}`,
      ledgerId: input.ledgerId ?? `ledger:${input.workspaceId}`,
      chainHeadHash: input.chainHeadHash ?? sha256({ workspaceId: input.workspaceId, commandId }),
    },
    evidence: {
      evidenceManifestId: input.evidenceManifestId ?? `manifest:${commandId}`,
      policySnapshotHash: input.policySnapshotHash ?? sha256({ policyVersion: '1.0', workspaceId: input.workspaceId }),
    },
  };

  const result = evaluateAgentCommandGate(request);

  return {
    ok: result.canAgentExecute,
    decision: result.decision,
    canExecute: result.canAgentExecute,
    status: result.status,
    reasons: result.reasons,
    commandHash: result.commandHash,
    decisionHash: result.decisionHash,
    actionEnvelope: result.actionEnvelope,
    gateResult: result,
    truthBoundary: result.truthBoundary,
  };
}
