import { validateDeFiTransaction } from '../gateway/defi-validator';
import { getAllYields } from './protocols';
import { executeRebalance } from './on-chain-executor';
import { REBALANCE_THRESHOLD_PCT, MAX_ALLOCATION_USD } from './config';
import type { ProtocolYield, OptimizerResult, YieldProtocol } from './types';

const OPTIMIZER_ACTOR = {
  orgId: process.env.YIELD_OPTIMIZER_ORG_ID ?? 'system',
  actorId: 'yield-optimizer-agent',
  actorRole: 'agent_operator',
  orgPlan: 'enterprise',
} as const;

function pickBest(yields: ProtocolYield[]): ProtocolYield | null {
  const available = yields.filter((y) => y.available && y.apyPct > 0);
  if (available.length === 0) return null;
  return available.reduce((best, y) => (y.apyPct > best.apyPct ? y : best));
}

async function getCurrentProtocol(): Promise<{ protocol: YieldProtocol; usdValue: number } | null> {
  // TODO: query on-chain positions for each protocol
  // For now, read from env or Supabase position tracking table
  const protocol = process.env.YIELD_OPTIMIZER_CURRENT_PROTOCOL as YieldProtocol | undefined;
  const usdValue = parseFloat(process.env.YIELD_OPTIMIZER_CURRENT_USD ?? '0');
  if (!protocol || usdValue <= 0) return null;
  return { protocol, usdValue };
}

export async function runYieldOptimizer(): Promise<OptimizerResult> {
  const timestamp = new Date().toISOString();

  if (process.env.YIELD_OPTIMIZER_ENABLED !== 'true') {
    return { action: 'disabled', timestamp };
  }

  const walletAddress = process.env.KUB_WALLET_ADDRESS;
  if (!walletAddress) {
    return { action: 'error', reason: 'KUB_WALLET_ADDRESS not configured', timestamp };
  }

  // 1. Fetch current APYs from all protocols
  const yields = await getAllYields();

  // 2. Pick best available protocol
  const best = pickBest(yields);
  if (!best) {
    return { action: 'error', reason: 'No protocol APYs available — check contract addresses', yields, timestamp };
  }

  // 3. Get current position
  const current = await getCurrentProtocol();
  if (!current) {
    return { action: 'no_position', reason: 'No active position — deposit funds to start', yields, timestamp };
  }

  const currentApy = yields.find((y) => y.protocol === current.protocol)?.apyPct ?? 0;
  const gainPct = best.apyPct - currentApy;

  // 4. Hold if not worth rebalancing
  if (best.protocol === current.protocol || gainPct < REBALANCE_THRESHOLD_PCT) {
    return {
      action: 'hold',
      currentProtocol: current.protocol,
      currentApyPct: currentApy,
      targetProtocol: best.protocol,
      targetApyPct: best.apyPct,
      yields,
      timestamp,
    };
  }

  // 5. Validate DeFi transaction bounds (Z3-proven constraints)
  const amountUSD = Math.min(current.usdValue, MAX_ALLOCATION_USD);
  const txValidation = validateDeFiTransaction({
    tokenIn: 'KUB',
    tokenOut: 'KKUB',
    amountUSD,
    slippageBps: 30,
    protocol: best.protocol,
    dailySpentUSD: 0,
  });

  if (txValidation.ok === false) {
    return {
      action: 'blocked',
      reason: `Z3 bound violated: ${txValidation.reason} (field: ${txValidation.field})`,
      currentProtocol: current.protocol,
      targetProtocol: best.protocol,
      amountUSD,
      yields,
      timestamp,
    };
  }

  // 6. Execute rebalance
  const result = await executeRebalance({
    fromProtocol: current.protocol,
    toProtocol: best.protocol,
    amountUSD,
    walletAddress,
  });

  if (!result.ok) {
    return { action: 'error', reason: result.error, yields, timestamp };
  }

  return {
    action: 'rebalance',
    currentProtocol: current.protocol,
    targetProtocol: best.protocol,
    currentApyPct: currentApy,
    targetApyPct: best.apyPct,
    amountUSD,
    txHash: result.txHash,
    yields,
    timestamp,
  };
}
