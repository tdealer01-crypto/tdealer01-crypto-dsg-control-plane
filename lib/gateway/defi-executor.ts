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
 *
 * Execution path:
 *   1. DeFi bounds check (Z3-proven constraints) → block if violated
 *   2. Policy evaluation (role, plan, approval)  → block/review if denied
 *   3. Provider execution                        → run the on-chain action
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
