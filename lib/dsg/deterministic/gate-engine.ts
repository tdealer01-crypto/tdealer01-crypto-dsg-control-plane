import type { DeterministicGateDecision, DeterministicProof, DeterministicProofStatus, DeterministicRiskLevel } from './types';
import { proveDeterministicPlan } from './proof-engine';
import { evaluateProofWithHybridStrategy } from './proof-cache';
import type { DeterministicProofRequest } from './types';

export function proofToGateStatus(
  proofStatus: DeterministicProofStatus,
  riskLevel: DeterministicRiskLevel
): 'PASS' | 'BLOCK' | 'REVIEW' {
  if (proofStatus === 'PASS') return 'PASS';
  if (proofStatus === 'BLOCK') return 'BLOCK';
  if (proofStatus === 'REVIEW') return 'REVIEW';
  if (proofStatus === 'UNSUPPORTED') {
    return riskLevel === 'low' ? 'REVIEW' : 'BLOCK';
  }
  return 'BLOCK';
}

export interface DeterministicGateOptions {
  orgId?: string;
  verifyFresh?: boolean;
  recordResult?: boolean;
}

export async function evaluateDeterministicGate(
  request: DeterministicProofRequest,
  options?: DeterministicGateOptions,
): Promise<DeterministicGateDecision & { source?: 'cached' | 'live' }> {
  const riskLevel = request.riskLevel ?? 'medium';

  let proof: DeterministicProof;
  let source: 'cached' | 'live' | undefined;

  if (options?.orgId) {
    // Use hybrid caching strategy when orgId is provided
    const hybrid = await evaluateProofWithHybridStrategy(
      request,
      {
        orgId: options.orgId,
        verifyFresh: options.verifyFresh,
        recordResult: options.recordResult !== false, // Default to true
      },
      proveDeterministicPlan,
    );
    proof = hybrid.proof;
    source = hybrid.source;
  } else {
    // Fall back to direct proof generation (backward compatibility)
    proof = await proveDeterministicPlan(request);
  }

  const gateStatus = proofToGateStatus(proof.status, riskLevel);

  return {
    ok: gateStatus === 'PASS',
    gateStatus,
    proofStatus: proof.status,
    riskLevel,
    reason: gateStatus === 'PASS' ? undefined : proof.failureReasons[0]?.code ?? 'deterministic_gate_not_passed',
    proof,
    source,
  };
}
