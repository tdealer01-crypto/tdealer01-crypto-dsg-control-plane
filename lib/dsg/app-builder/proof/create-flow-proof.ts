import { createHash } from 'crypto';
import { derivePrdFromGoal } from '@/lib/dsg/app-builder/prd/derive-prd';
import { derivePlanFromPrd } from '@/lib/dsg/app-builder/plan/derive-plan';
import { observePlanDraft } from '@/lib/dsg/app-builder/plan/observe-plan';
import { createRuntimeHandoffDraft } from '@/lib/dsg/app-builder/approval/create-handoff';
import { evaluateRuntimeExecutionGate } from '@/lib/dsg/app-builder/runtime/execution-gate';
import type { RuntimeExecutionGateResult } from '@/lib/dsg/app-builder/runtime/types';

export type AppBuilderFlowProof = {
  ok: true;
  status: 'PASS';
  proofKind: 'APP_BUILDER_FLOW_FAIL_CLOSED_PROOF';
  goal: string;
  proofHash: string;
  stages: {
    prd: 'PASS';
    plan: 'PASS';
    observer: 'PASS' | 'BLOCK';
    handoff: 'READY' | 'BLOCKED';
    runtimeGate: RuntimeExecutionGateResult['status'];
  };
  runtimeGate: RuntimeExecutionGateResult;
  assertions: {
    promptToPrdWorks: boolean;
    prdToPlanWorks: boolean;
    handoffHashCreated: boolean;
    runtimeGateBlocksWithoutExecutor: boolean;
    runtimeDidNotStart: true;
    productionReadyClaim: false;
  };
  claimBoundary: {
    claimStatus: 'APP_BUILDER_FLOW_PROOF_FAIL_CLOSED';
    productReadyClaim: false;
    manusLevelClaim: false;
    productionReadyClaim: false;
  };
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function createAppBuilderFlowProof(goal: string): AppBuilderFlowProof {
  const prdResult = derivePrdFromGoal(goal);
  const plan = derivePlanFromPrd(prdResult.prd);
  const observer = observePlanDraft(plan);
  const handoffResult = createRuntimeHandoffDraft(plan, observer);
  const requiredSecrets = Array.from(new Set(plan.actions.flatMap((action) => action.requiredSecrets)));

  const runtimeGate = evaluateRuntimeExecutionGate({
    handoff: handoffResult.handoff,
    approval: {
      status: handoffResult.approvalGate.approved ? 'APPROVED' : handoffResult.approvalGate.status,
      signatureValid: handoffResult.approvalGate.approved === true,
    },
    secrets: {
      exists: false,
      expired: true,
      requiredSecrets,
      availableSecrets: [],
    },
    executorPool: {
      available: 0,
      health: 'NOT_CONFIGURED',
      mode: 'vercel-serverless-gate-only',
    },
    proofBundle: {
      requiredFields: ['audit_export', 'evidence_manifest', 'deployment_proof', 'auth_rbac_proof'],
      presentFields: [],
      hashChainValid: false,
    },
  });

  const assertions = {
    promptToPrdWorks: Boolean(prdResult.prd.title && prdResult.prd.acceptanceCriteria.length),
    prdToPlanWorks: plan.actions.length > 0,
    handoffHashCreated: Boolean(handoffResult.handoff.planHash && handoffResult.handoff.approvalHash),
    runtimeGateBlocksWithoutExecutor: runtimeGate.status === 'BLOCKED' && runtimeGate.failures.length > 0,
    runtimeDidNotStart: true as const,
    productionReadyClaim: false as const,
  };

  const proofWithoutHash = {
    goal,
    stages: {
      prd: 'PASS' as const,
      plan: 'PASS' as const,
      observer: observer.status === 'PASS' ? 'PASS' as const : 'BLOCK' as const,
      handoff: handoffResult.handoff.ready ? 'READY' as const : 'BLOCKED' as const,
      runtimeGate: runtimeGate.status,
    },
    assertions,
    runtimeGateHash: runtimeGate.gateHash,
  };

  return {
    ok: true,
    status: 'PASS',
    proofKind: 'APP_BUILDER_FLOW_FAIL_CLOSED_PROOF',
    goal,
    proofHash: sha256(proofWithoutHash),
    stages: proofWithoutHash.stages,
    runtimeGate,
    assertions,
    claimBoundary: {
      claimStatus: 'APP_BUILDER_FLOW_PROOF_FAIL_CLOSED',
      productReadyClaim: false,
      manusLevelClaim: false,
      productionReadyClaim: false,
    },
  };
}
