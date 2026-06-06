import { evaluateGatewayProof, type GatewayInvariantInput } from './gateway-proof-bridge';

export function evaluateRuntimeStartGate(input: GatewayInvariantInput & { approvedPlanHash?: string | null }): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.approvedPlanHash) reasons.push('NO_APPROVED_PLAN');
  const proof = evaluateGatewayProof(input);
  if (proof.decision !== 'PASS') reasons.push('GATEWAY_PROOF_BLOCKED');
  return { ok: reasons.length === 0, reasons };
}
