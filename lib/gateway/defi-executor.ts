import type { GatewayToolRequest, GatewayToolExecutionResult } from './types';
import { buildGatewayAuditProof } from './audit';
import { executeGatewayTool } from './executor';
import { validateDeFiTransaction, type DeFiTransaction } from './defi-validator';

export type DeFiGatewayRequest = GatewayToolRequest & { defiTx: DeFiTransaction };

export async function executeDeFiGatewayTool(
  request: DeFiGatewayRequest
): Promise<GatewayToolExecutionResult> {
  const txCheck = validateDeFiTransaction(request.defiTx);
  if (txCheck.ok === false) {
    return {
      ok: false,
      decision: 'block',
      reason: txCheck.reason,
      audit: buildGatewayAuditProof(request, null, 'block', txCheck.reason),
    };
  }
  return executeGatewayTool(request);
}
