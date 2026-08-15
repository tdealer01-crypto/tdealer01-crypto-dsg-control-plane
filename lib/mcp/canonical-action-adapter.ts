import type { UnifiedAuthContext } from './unified-auth';
import {
  runCanonicalActionE2E,
  type CanonicalActionE2ERequest,
  type ControlledExecutionResult,
  type PreExecutionSimulationResult,
} from '@/lib/dsg-one/canonical-action-e2e';
import type { ActionPlan } from './verified-action-tools';

export type CanonicalActionAdapterSurface = 'api' | 'unify' | 'trinity-mcp';

export type CanonicalActionAdapterHooks = {
  simulate: (plan: ActionPlan) => Promise<PreExecutionSimulationResult>;
  execute: (plan: ActionPlan) => Promise<ControlledExecutionResult>;
};

export type CanonicalActionAdapterRequest = Omit<
  CanonicalActionE2ERequest,
  'simulate' | 'execute' | 'gate'
> & {
  surface: CanonicalActionAdapterSurface;
  sessionId: string;
  agentId?: string;
  agentName?: string;
  planContractVerified?: boolean;
  approval?: {
    requestId?: string;
    decision?: 'approved' | 'rejected' | 'pending';
    approvedBy?: string;
    approvedAt?: string;
  };
  audit?: {
    preAuditEventId?: string;
    ledgerId?: string;
    chainHeadHash?: string;
  };
  evidence?: {
    evidenceManifestId?: string;
    policySnapshotHash?: string;
    runtimeBindingHash?: string;
  };
};

function executionPermissions(auth: UnifiedAuthContext): string[] {
  const canOperate = auth.roles.includes('operator') || auth.roles.includes('org_admin');
  if (!canOperate) return [];
  return [
    'tool:execute_low',
    'tool:execute_medium',
    'tool:execute_high',
    'tool:execute_critical',
  ];
}

/**
 * Transport adapter for both Unify Desktop and Trinity MCP.
 *
 * This adapter intentionally contains no independent ALLOW/BLOCK logic. It maps
 * authenticated transport context into the canonical DSG ONE chain and returns
 * the canonical hashes/receipts produced there.
 */
export async function runCanonicalActionFromSurface(
  input: CanonicalActionAdapterRequest,
  auth: UnifiedAuthContext,
  hooks: CanonicalActionAdapterHooks,
) {
  const agentId = input.agentId?.trim() || auth.actorId;
  const approval = input.approval ?? {};
  const audit = input.audit ?? {};
  const evidence = input.evidence ?? {};

  const result = await runCanonicalActionE2E({
    optimization: input.optimization,
    actionSolution: input.actionSolution,
    gate: {
      workspaceId: auth.orgId,
      runtime: {
        agentId,
        agentName: input.agentName ?? `${input.surface}:${agentId}`,
        agentType: input.surface === 'unify' ? 'external-agent' : 'ai-agent',
        sessionId: input.sessionId,
        agentWillExecuteAction: true,
        requiresResultCallback: true,
      },
      rbac: {
        actorId: auth.actorId,
        role: auth.roles.includes('org_admin') ? 'admin' : auth.roles.includes('operator') ? 'operator' : 'viewer',
        permissions: executionPermissions(auth),
        approvalRequestId: approval.requestId,
        approvalDecision: approval.decision,
        approvedBy: approval.approvedBy,
        approvedAt: approval.approvedAt,
      },
      audit: {
        preAuditEventId: audit.preAuditEventId ?? '',
        ledgerId: audit.ledgerId ?? '',
        chainHeadHash: audit.chainHeadHash ?? '',
      },
      evidence: {
        evidenceManifestId: evidence.evidenceManifestId ?? '',
        policySnapshotHash: evidence.policySnapshotHash ?? '',
        runtimeBindingHash: evidence.runtimeBindingHash,
      },
      planContractVerified: input.planContractVerified === true,
    },
    simulate: hooks.simulate,
    execute: hooks.execute,
  });

  return {
    surface: input.surface,
    canonical: true as const,
    result,
    boundary:
      'Unify and Trinity MCP are transport/executor surfaces only. They do not create a second authorization or verification engine; the canonical DSG ONE chain remains authoritative.',
  };
}
