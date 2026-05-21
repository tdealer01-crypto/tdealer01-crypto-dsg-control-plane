import type { GatewayToolRequest, GatewayToolExecutionResult } from './types';
import { buildGatewayAuditProof } from './audit';
import { executeGatewayTool } from './executor';
import { validateDeFiTransaction, type DeFiTransaction } from './defi-validator';

export type DeFiGatewayRequest = GatewayToolRequest & { defiTx: DeFiTransaction };

/**
 * Wraps executeGatewayTool() with DeFi transaction pre-validation.
 *
 * validateDeFiTransaction() runs BEFORE policy evaluation, enforcing
 * mathematically proven bounds (Z3 Theorems 6–8). Even an org admin
 * with a valid approval token cannot bypass amount or slippage limits.
 */
export async function executeDeFiGatewayTool(
  request: DeFiGatewayRequest
): Promise<GatewayToolExecutionResult> {
  const txCheck = validateDeFiTransaction(request.defiTx);
  if (!txCheck.ok) {
    return {
      ok: false,
      decision: 'block',
      reason: txCheck.reason,
      audit: buildGatewayAuditProof(request, null, 'block', txCheck.reason),
    };
  }
  return executeGatewayTool(request);
}
