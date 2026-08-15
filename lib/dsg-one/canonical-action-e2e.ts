import { createHash } from 'node:crypto';
import type { VerifiedOptimizationRequest } from './verified-optimization-pipeline';
import { runCanonicalE2EOptimization } from './canonical-e2e-pipeline';
import {
  callVerifiedActionTool,
  type ActionPlan,
} from '@/lib/mcp/verified-action-tools';
import {
  evaluateAgentCommandGate,
  buildAgentActionResultReceipt,
  type AgentCommandGateRequest,
  type AgentCommandRuntime,
  type AgentCommandRbacProof,
  type AgentCommandAuditBinding,
  type AgentCommandEvidenceBinding,
  type AgentActionType,
} from '@/lib/dsg/agent-command-gate';

type JsonRecord = Record<string, unknown>;

export type CanonicalActionSolution = {
  database?: 'supabase';
  runtime?: 'render' | 'netlify';
  environment: string;
  commitSha: string;
};

export type CanonicalGateContext = {
  workspaceId: string;
  runtime: AgentCommandRuntime;
  rbac: AgentCommandRbacProof;
  audit: AgentCommandAuditBinding;
  evidence: AgentCommandEvidenceBinding;
  /**
   * True only when the caller has already validated actionPlanHash against the
   * server-side approved plan/scope contract. This library never invents that proof.
   */
  planContractVerified?: boolean;
};

export type PreExecutionSimulationResult = {
  ok: boolean;
  witnessHash: string;
  reason?: string;
};

export type ControlledExecutionResult = {
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  observations: Record<string, unknown>;
  evidence: Array<{
    fact: string;
    observerRole: 'verifier';
    hash: string;
    [key: string]: unknown;
  }>;
  observedResultHash: string;
  evidenceItemIds: string[];
};

export interface CanonicalActionE2ERequest {
  optimization: VerifiedOptimizationRequest;
  actionSolution: CanonicalActionSolution;
  gate: CanonicalGateContext;
  simulate: (plan: ActionPlan) => Promise<PreExecutionSimulationResult>;
  execute: (plan: ActionPlan) => Promise<ControlledExecutionResult>;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const record = value as JsonRecord;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stable(record[key])]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function actionTypeForStep(action: string): AgentActionType {
  if (action.includes('deploy')) return 'deploy';
  return 'write';
}

/**
 * Canonical product chain:
 * Simulation witness -> QUBO -> Ising -> Z3 -> exact proof ->
 * VERIFIED_GLOBAL_OPTIMUM -> Action IR -> DSG ALLOW/BLOCK ->
 * pre-execution simulation -> controlled executor -> evidence -> receipt/replay.
 *
 * Trinity/Unify are transport/surface adapters and must call this same chain,
 * not reimplement a second decision engine.
 */
export async function runCanonicalActionE2E(req: CanonicalActionE2ERequest) {
  const upstream = await runCanonicalE2EOptimization(req.optimization);
  const optimization = upstream.stages.optimization;

  if (optimization.verdict !== 'VERIFIED_GLOBAL_OPTIMUM') {
    return {
      verdict: 'BLOCK' as const,
      stage: 'optimization' as const,
      executionPerformed: false,
      upstream,
      reason: `Action compilation requires VERIFIED_GLOBAL_OPTIMUM; got ${optimization.verdict}.`,
    };
  }

  const compiled = await callVerifiedActionTool('dsg.action.compile', {
    profile: 'software.deploy.v1',
    solution: req.actionSolution,
    proof: {
      verdict: optimization.verdict,
      proofHash: optimization.proof.proofHash,
    },
  });
  if (compiled.ok === false) {
    return {
      verdict: 'BLOCK' as const,
      stage: 'compile' as const,
      executionPerformed: false,
      upstream,
      reason: compiled.message,
    };
  }

  const compiledResult = asRecord(compiled.result);
  const plan = asRecord(compiledResult?.plan) as ActionPlan | null;
  if (compiledResult?.verdict !== 'PASS' || !plan || !Array.isArray(plan.steps) || plan.steps.length === 0) {
    return {
      verdict: 'BLOCK' as const,
      stage: 'compile' as const,
      executionPerformed: false,
      upstream,
      compilation: compiled.result,
      reason: String(compiledResult?.reason ?? 'Verified Action Compiler did not emit an executable Action IR.'),
    };
  }

  const firstStep = plan.steps[0];
  const target = String(firstStep.args.target ?? firstStep.executorTool);
  const planHashForGate = req.gate.planContractVerified ? plan.actionPlanHash : undefined;
  const gateRequest: AgentCommandGateRequest = {
    workspaceId: req.gate.workspaceId,
    runtime: req.gate.runtime,
    rbac: req.gate.rbac,
    audit: req.gate.audit,
    evidence: req.gate.evidence,
    command: {
      commandId: firstStep.id,
      actionType: actionTypeForStep(firstStep.action),
      targetSystemId: target,
      operationName: firstStep.action,
      riskLevel: firstStep.risk,
      dataClasses: [],
      payloadHash: sha256(firstStep.args),
      idempotencyKey: String(firstStep.args.idempotencyKey ?? ''),
      rollbackPlanId: firstStep.rollback ?? undefined,
      planHash: planHashForGate,
    },
  };

  const gate = evaluateAgentCommandGate(gateRequest);
  if (!gate.canAgentExecute || !gate.actionEnvelope) {
    return {
      verdict: 'BLOCK' as const,
      stage: 'dsg-gate' as const,
      executionPerformed: false,
      upstream,
      compilation: compiled.result,
      gate,
      reason: gate.reasons.join(','),
    };
  }

  const simulation = await req.simulate(plan);
  if (!simulation.ok) {
    return {
      verdict: 'BLOCK' as const,
      stage: 'pre-execution-simulation' as const,
      executionPerformed: false,
      upstream,
      compilation: compiled.result,
      gate,
      simulation,
      reason: simulation.reason ?? 'Pre-execution simulation failed.',
    };
  }

  const startedAt = new Date().toISOString();
  const execution = await req.execute(plan);
  const completedAt = new Date().toISOString();

  const resultReceipt = buildAgentActionResultReceipt({
    workspaceId: req.gate.workspaceId,
    agentId: req.gate.runtime.agentId,
    sessionId: req.gate.runtime.sessionId,
    commandId: firstStep.id,
    envelopeId: gate.actionEnvelope.envelopeId,
    decisionHash: gate.decisionHash,
    status: execution.status,
    startedAt,
    completedAt,
    observedResultHash: execution.observedResultHash,
    evidenceItemIds: execution.evidenceItemIds,
    planHash: planHashForGate,
  });

  const acceptance = await callVerifiedActionTool('dsg.action.verifyAcceptance', {
    plan,
    observations: execution.observations,
    evidence: execution.evidence,
    proofChain: {
      problemHash: optimization.quboHash,
      formalModelHash: optimization.z3.proofHash,
      encodingHash: optimization.exact.proofHash,
    },
  });

  const acceptanceResult = acceptance.ok ? asRecord(acceptance.result) : null;
  const completed =
    resultReceipt.accepted &&
    acceptance.ok &&
    acceptanceResult?.verdict === 'PASS' &&
    acceptanceResult?.completed === true;

  const deterministicReceiptHash = sha256({
    canonicalChainHash: upstream.binding.chainHash,
    optimizationProofHash: optimization.proof.proofHash,
    actionPlanHash: plan.actionPlanHash,
    gateDecisionHash: gate.decisionHash,
    simulationWitnessHash: simulation.witnessHash,
    resultReceiptHash: resultReceipt.receiptHash,
    acceptanceHash: acceptanceResult?.acceptanceHash ?? null,
    finalReceiptHash: acceptanceResult?.finalReceiptHash ?? null,
  });

  return {
    verdict: completed ? ('PASS' as const) : ('BLOCK' as const),
    stage: completed ? ('complete' as const) : ('acceptance' as const),
    executionPerformed: true,
    upstream,
    compilation: compiled.result,
    gate,
    simulation,
    execution,
    resultReceipt,
    acceptance: acceptance.ok ? acceptance.result : acceptance,
    deterministicReceiptHash,
    replay: {
      replayable: completed,
      chainHash: upstream.binding.chainHash,
      actionPlanHash: plan.actionPlanHash,
      deterministicReceiptHash,
    },
    trinityUnifyBoundary:
      'Trinity MCP and Unify must invoke this canonical chain (or its API wrapper) and return its hashes/receipts; they must not create an alternate ALLOW/BLOCK path.',
  };
}
