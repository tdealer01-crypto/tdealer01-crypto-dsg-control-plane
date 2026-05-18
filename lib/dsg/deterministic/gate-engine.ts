import type { DeterministicGateDecision, DeterministicProof, DeterministicProofStatus, DeterministicRiskLevel } from './types';
import { proveDeterministicPlan } from './proof-engine';
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

export function evaluateDeterministicGate(request: DeterministicProofRequest): DeterministicGateDecision {
  const riskLevel = request.riskLevel ?? 'medium';
  const proof: DeterministicProof = proveDeterministicPlan(request);
  const gateStatus = proofToGateStatus(proof.status, riskLevel);

  return {
    ok: gateStatus === 'PASS',
    gateStatus,
    proofStatus: proof.status,
    riskLevel,
    reason: gateStatus === 'PASS' ? undefined : proof.failureReasons[0]?.code ?? 'deterministic_gate_not_passed',
    proof,
  };
}
