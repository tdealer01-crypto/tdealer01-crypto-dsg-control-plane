import { createHash } from 'crypto';
import type { DsgPlanDraft, DsgPlanObserverResult } from '@/lib/dsg/app-builder/plan/types';
import type { DsgAppBuilderApprovalGate, DsgApprovalHandoffResult, DsgRuntimeHandoffDraft } from './types';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function highRiskActionIds(plan: DsgPlanDraft): string[] {
  return plan.actions.filter((action) => action.risk === 'HIGH' || action.risk === 'CRITICAL').map((action) => action.id);
}

export function evaluateApprovalGate(plan: DsgPlanDraft, observer: DsgPlanObserverResult): DsgAppBuilderApprovalGate {
  const highRiskIds = highRiskActionIds(plan);
  const reasons: DsgAppBuilderApprovalGate['reasons'] = [];

  if (!observer.pass) {
    reasons.push(...observer.reasons.map((reason) => ({ code: reason.code, message: reason.message, actionId: reason.actionId })));
  }

  for (const action of plan.actions) {
    if ((action.risk === 'HIGH' || action.risk === 'CRITICAL') && !action.approved) {
      reasons.push({ code: 'APPROVAL_REQUIRED', message: 'High-risk action must be approved before runtime handoff.', actionId: action.id });
    }
  }

  const status = reasons.length ? 'BLOCKED' : highRiskIds.length ? 'REVIEW' : 'APPROVABLE';

  return {
    status,
    pass: status === 'APPROVABLE',
    approvalRequired: highRiskIds.length > 0,
    approved: status === 'APPROVABLE',
    reasons,
    summary: {
      totalActions: plan.actions.length,
      highRiskActions: highRiskIds.length,
      blockedReasons: reasons.length,
    },
  };
}

export function createRuntimeHandoffDraft(plan: DsgPlanDraft, observer: DsgPlanObserverResult): DsgApprovalHandoffResult {
  const approvalGate = evaluateApprovalGate(plan, observer);
  const planHash = sha256({ jobId: plan.jobId, workspaceId: plan.workspaceId, actions: plan.actions, claimBoundary: plan.claimBoundary });
  const approvalHash = sha256({ planHash, approvalGate });
  const blockedActionIds = new Set(approvalGate.reasons.map((reason) => reason.actionId).filter(Boolean));

  const handoff: DsgRuntimeHandoffDraft = {
    ready: approvalGate.pass && observer.pass,
    status: approvalGate.pass && observer.pass ? 'RUNTIME_HANDOFF_READY' : 'RUNTIME_HANDOFF_BLOCKED',
    jobId: plan.jobId,
    workspaceId: plan.workspaceId,
    planHash,
    approvalHash,
    allowedActions: plan.actions.filter((action) => !blockedActionIds.has(action.id)).map((action) => action.id),
    blockedActions: plan.actions.filter((action) => blockedActionIds.has(action.id)).map((action) => action.id),
    claimBoundary: {
      claimStatus: 'RUNTIME_HANDOFF_DRAFT_ONLY',
      runtimeExecutionStarted: false,
      productionReadyClaim: false,
    },
  };

  return { ok: true, approvalGate, handoff, plan, observer };
}
