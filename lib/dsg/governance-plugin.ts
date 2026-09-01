import { createHash } from 'node:crypto';
import type { UnifiedAuthContext } from '@/lib/mcp/unified-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { lookupPlanContract } from './plan-contract-repository';
import { evaluatePlanAlignment } from './plan-alignment-gate';
import type { AgentActionType } from './agent-command-gate';
import type { HermesActionEvent } from './plan-scope-contract';

export type GovernanceMode = 'observe' | 'enforce';
export type GovernanceStatus = 'PASS' | 'BLOCKED' | 'WAITING_PERMISSION' | 'UNVERIFIED';
export type GovernanceRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GovernancePreflightInput {
  mode: GovernanceMode;
  eventId: string;
  planHash: string;
  agentId: string;
  sessionId: string;
  actionType: AgentActionType;
  targetSystemId: string;
  operationName: string;
  riskLevel: GovernanceRiskLevel;
  payloadHash?: string;
  idempotencyKey?: string;
  rollbackPlanId?: string;
  evidenceManifestId?: string;
  policySnapshotHash?: string;
  claimedOutcome?: string;
  evidenceRefs?: string[];
}

export interface GovernancePreflightResult {
  ok: true;
  mode: GovernanceMode;
  status: GovernanceStatus;
  policyAllowsAction: boolean;
  shouldBlock: boolean;
  claimAllowed: boolean;
  decisionHash: string;
  panels: {
    action: Record<string, unknown>;
    planAlignment: Record<string, unknown>;
    permission: Record<string, unknown>;
    evidence: Record<string, unknown>;
    executionAudit: Record<string, unknown>;
  };
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(sortStable(value))).digest('hex');
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function hasExecutionRole(auth: UnifiedAuthContext): boolean {
  return auth.roles.includes('operator') || auth.roles.includes('org_admin');
}

function validateInput(input: GovernancePreflightInput): string | null {
  if (!['observe', 'enforce'].includes(input.mode)) return 'mode must be observe or enforce';
  if (!input.eventId) return 'eventId is required';
  if (!/^[0-9a-f]{64}$/i.test(input.planHash)) return 'planHash must be a 64-character SHA-256 hex string';
  if (!input.agentId) return 'agentId is required';
  if (!input.sessionId) return 'sessionId is required';
  if (!['observe', 'read', 'write', 'delete', 'payment', 'deploy', 'admin'].includes(input.actionType)) {
    return 'actionType is invalid';
  }
  if (!input.targetSystemId) return 'targetSystemId is required';
  if (!input.operationName) return 'operationName is required';
  if (!['low', 'medium', 'high', 'critical'].includes(input.riskLevel)) return 'riskLevel is invalid';
  return null;
}

async function appendAuditEvent(params: {
  auth: UnifiedAuthContext;
  input: GovernancePreflightInput;
  status: GovernanceStatus;
  policyAllowsAction: boolean;
  shouldBlock: boolean;
  claimAllowed: boolean;
  decisionHash: string;
  planDecision: string;
  reasons: string[];
}): Promise<{ persisted: boolean; auditHash?: string; reason?: string }> {
  try {
    const db = getSupabaseAdmin();
    const latest = await db
      .from('dsg_audit_events')
      .select('current_hash')
      .eq('owner_open_id', params.auth.actorId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = latest.data?.current_hash ?? null;
    const occurredAt = new Date().toISOString();
    const currentHash = sha256({
      previousHash,
      occurredAt,
      actorId: params.auth.actorId,
      orgId: params.auth.orgId,
      eventId: params.input.eventId,
      planHash: params.input.planHash,
      agentId: params.input.agentId,
      actionType: params.input.actionType,
      targetSystemId: params.input.targetSystemId,
      operationName: params.input.operationName,
      status: params.status,
      policyAllowsAction: params.policyAllowsAction,
      shouldBlock: params.shouldBlock,
      claimAllowed: params.claimAllowed,
      decisionHash: params.decisionHash,
      planDecision: params.planDecision,
      reasons: params.reasons,
    });

    const { error } = await db.from('dsg_audit_events').insert({
      owner_open_id: params.auth.actorId,
      execution_id: params.input.eventId,
      attempt_number: 0,
      event_type: 'governance_preflight',
      agent_id: params.input.agentId,
      adapter_kind: 'mcp-openapi-governance-plugin',
      action_kind: params.input.actionType,
      decision: params.status,
      status: params.shouldBlock ? 'BLOCKED' : 'OBSERVED',
      policy_version: 'dsg-governance-plugin-v1',
      evidence_hash: params.decisionHash,
      previous_hash: previousHash,
      current_hash: currentHash,
      metadata: {
        org_id: params.auth.orgId,
        auth_source: params.auth.source,
        roles: params.auth.roles,
        mode: params.input.mode,
        plan_hash: params.input.planHash,
        target_system_id: params.input.targetSystemId,
        operation_name: params.input.operationName,
        risk_level: params.input.riskLevel,
        plan_decision: params.planDecision,
        reasons: params.reasons,
        policy_allows_action: params.policyAllowsAction,
        should_block: params.shouldBlock,
        claim_allowed: params.claimAllowed,
        evidence_refs: params.input.evidenceRefs ?? [],
      },
      occurred_at: occurredAt,
    });

    if (error) return { persisted: false, reason: error.message };
    return { persisted: true, auditHash: currentHash };
  } catch (error) {
    return { persisted: false, reason: error instanceof Error ? error.message : 'AUDIT_WRITE_FAILED' };
  }
}

export async function governAction(
  input: GovernancePreflightInput,
  auth: UnifiedAuthContext,
): Promise<GovernancePreflightResult | { ok: false; error: string }> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, error: invalid };

  const contract = await lookupPlanContract(input.planHash, auth.orgId);
  const permissionPassed = hasExecutionRole(auth);

  let planDecision = 'OUT_OF_PLAN_DENY';
  let planReasons = ['plan_contract_not_found'];
  let policyAllowsAction = false;
  let claimAllowed = false;
  let alignmentDecisionHash = sha256({
    eventId: input.eventId,
    planHash: input.planHash,
    decision: planDecision,
    reasons: planReasons,
  });

  if (contract) {
    const event: HermesActionEvent = {
      eventId: input.eventId,
      planId: contract.planId,
      planHash: input.planHash,
      workspaceId: auth.orgId,
      agentId: input.agentId,
      sessionId: input.sessionId,
      actionType: input.actionType,
      targetSystemId: input.targetSystemId,
      operationName: input.operationName,
      riskLevel: input.riskLevel,
      payloadHash: input.payloadHash,
      idempotencyKey: input.idempotencyKey,
      rollbackPlanId: input.rollbackPlanId,
      evidenceManifestId: input.evidenceManifestId,
      policySnapshotHash: input.policySnapshotHash,
      claimedOutcome: input.claimedOutcome,
      requestedAt: new Date().toISOString(),
    };

    const alignment = evaluatePlanAlignment(contract, event);
    planDecision = alignment.decision;
    planReasons = alignment.reasons;
    alignmentDecisionHash = alignment.decisionHash;
    policyAllowsAction =
      alignment.decision === 'PLAN_MATCHED_ALLOW_AUDIT' ||
      alignment.decision === 'CLAIM_EVIDENCE_DENY';
    claimAllowed = alignment.claimAllowed;
  }

  const evidenceRefs = input.evidenceRefs ?? [];
  const claimNeedsEvidence = Boolean(input.claimedOutcome) && evidenceRefs.length === 0;
  if (claimNeedsEvidence) claimAllowed = false;

  let status: GovernanceStatus;
  if (!policyAllowsAction) {
    status = 'BLOCKED';
  } else if (!permissionPassed) {
    status = 'WAITING_PERMISSION';
  } else if (!claimAllowed || planDecision === 'CLAIM_EVIDENCE_DENY') {
    status = 'UNVERIFIED';
  } else {
    status = 'PASS';
  }

  // Observe mode never blocks the downstream call. Enforce mode blocks only
  // out-of-plan actions or callers without DSG execution permission.
  // Unsupported claims remain UNVERIFIED but do not stop a plan-authorized action.
  const shouldBlock = input.mode === 'enforce' && (status === 'BLOCKED' || status === 'WAITING_PERMISSION');
  const decisionHash = sha256({
    alignmentDecisionHash,
    mode: input.mode,
    status,
    permissionPassed,
    policyAllowsAction,
    claimAllowed,
  });

  const audit = await appendAuditEvent({
    auth,
    input,
    status,
    policyAllowsAction,
    shouldBlock,
    claimAllowed,
    decisionHash,
    planDecision,
    reasons: planReasons,
  });

  return {
    ok: true,
    mode: input.mode,
    status,
    policyAllowsAction,
    shouldBlock,
    claimAllowed,
    decisionHash,
    panels: {
      action: {
        status,
        eventId: input.eventId,
        agentId: input.agentId,
        actionType: input.actionType,
        targetSystemId: input.targetSystemId,
        operationName: input.operationName,
        riskLevel: input.riskLevel,
      },
      planAlignment: {
        status: policyAllowsAction ? 'PASS' : 'BLOCKED',
        decision: planDecision,
        planHash: input.planHash,
        reasons: planReasons,
      },
      permission: {
        status: permissionPassed ? 'PASS' : 'WAITING_PERMISSION',
        authenticatedBy: auth.source,
        roles: auth.roles,
        actorId: auth.actorId,
      },
      evidence: {
        status: claimAllowed && planDecision !== 'CLAIM_EVIDENCE_DENY' ? 'PASS' : 'UNVERIFIED',
        claim: input.claimedOutcome ?? null,
        evidenceRefs,
        evidenceManifestId: input.evidenceManifestId ?? null,
        policySnapshotHash: input.policySnapshotHash ?? null,
      },
      executionAudit: {
        status: audit.persisted ? 'PASS' : 'UNVERIFIED',
        persisted: audit.persisted,
        auditHash: audit.auditHash ?? null,
        auditFailure: audit.persisted ? null : audit.reason ?? 'AUDIT_WRITE_FAILED',
        shouldBlock,
        downstreamInstruction: shouldBlock ? 'DO_NOT_EXECUTE' : 'CONTINUE_TO_TARGET',
      },
    },
  };
}
