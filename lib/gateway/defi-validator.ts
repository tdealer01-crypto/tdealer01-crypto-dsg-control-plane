import type { GatewayToolRequest } from './types';
import constraints from './verified-constraints.json';

export interface DeFiTransaction {
  tokenIn: string;
  tokenOut: string;
  amountUSD: number;
  slippageBps: number;
  protocol: string;
  dailySpentUSD: number;
}

export type DeFiValidationResult =
  | { ok: true }
  | { ok: false; reason: string; field: keyof DeFiTransaction; bound: number | string[] };

/**
 * Pure, deterministic DeFi transaction validator.
 * Constraints are sourced from verified-constraints.json, which is produced
 * by Z3 formal proofs in lib/gateway/z3/. All bounds are mathematically proven:
 *   - amount_bound  (Theorem 6): maxSingleTxUSD, maxDailyUSD
 *   - slippage_bound (Theorem 7): maxSlippageBps
 *   - token/protocol allowlists are enumerated and constraint_consistency (Theorem 8)
 *     proves the set is non-trivially satisfiable.
 */
export function validateDeFiTransaction(tx: DeFiTransaction): DeFiValidationResult {
  if (tx.amountUSD <= 0)
    return { ok: false, reason: 'amount_non_positive', field: 'amountUSD', bound: 0 };

  if (tx.amountUSD > constraints.defi.maxSingleTxUSD)
    return {
      ok: false,
      reason: 'exceeds_single_tx_limit',
      field: 'amountUSD',
      bound: constraints.defi.maxSingleTxUSD,
    };

  if (tx.dailySpentUSD + tx.amountUSD > constraints.defi.maxDailyUSD)
    return {
      ok: false,
      reason: 'exceeds_daily_limit',
      field: 'dailySpentUSD',
      bound: constraints.defi.maxDailyUSD,
    };

  if (tx.slippageBps > constraints.defi.maxSlippageBps)
    return {
      ok: false,
      reason: 'exceeds_max_slippage',
      field: 'slippageBps',
      bound: constraints.defi.maxSlippageBps,
    };

  if (!constraints.defi.allowedTokens.includes(tx.tokenIn))
    return {
      ok: false,
      reason: 'token_not_whitelisted',
      field: 'tokenIn',
      bound: constraints.defi.allowedTokens,
    };

  if (!constraints.defi.allowedTokens.includes(tx.tokenOut))
    return {
      ok: false,
      reason: 'token_not_whitelisted',
      field: 'tokenOut',
      bound: constraints.defi.allowedTokens,
    };

  if (!constraints.defi.allowedProtocols.includes(tx.protocol))
    return {
      ok: false,
      reason: 'protocol_not_whitelisted',
      field: 'protocol',
      bound: constraints.defi.allowedProtocols,
    };

  return { ok: true };
}
