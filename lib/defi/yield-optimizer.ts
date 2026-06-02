import { validateDeFiTransaction } from '../gateway/defi-validator';
import { getAllYields } from './protocols';
import { executeRebalance } from './on-chain-executor';
import { REBALANCE_THRESHOLD_PCT, MAX_ALLOCATION_USD } from './config';
import type { ProtocolYield, OptimizerResult, YieldProtocol } from './types';
import { getAllDefiAccounts, updateUserDeposit, logDefiTxn, getLatestPoolProtocol, getDefiConfig } from './supabase-defi';

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
  // Prefer Supabase position derived from the latest completed rebalance txn.
  // Falls back to env vars for the first run before any rebalance has been logged.
  try {
    const row = await getLatestPoolProtocol();
    if (row) return { protocol: row.protocol as YieldProtocol, usdValue: row.depositUSD };
  } catch {
    // Supabase unavailable — fall through to env fallback
  }

  const protocol = process.env.YIELD_OPTIMIZER_CURRENT_PROTOCOL as YieldProtocol | undefined;
  const usdValue = parseFloat(process.env.YIELD_OPTIMIZER_CURRENT_USD ?? '0');
  if (!protocol || usdValue <= 0) return null;
  return { protocol, usdValue };
}

export async function runYieldOptimizer(): Promise<OptimizerResult> {
  const timestamp = new Date().toISOString();

  // Read config from Supabase defi_config table; fall back to env vars.
  let dbConfig: Record<string, string> = {};
  try { dbConfig = await getDefiConfig(); } catch { /* env fallback */ }

  const enabled = (dbConfig['YIELD_OPTIMIZER_ENABLED'] ?? process.env.YIELD_OPTIMIZER_ENABLED) === 'true';
  if (!enabled) return { action: 'disabled', timestamp };

  const walletAddress = dbConfig['KUB_WALLET_ADDRESS'] || process.env.KUB_WALLET_ADDRESS;
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

/**
 * Runs the yield optimizer for all registered users.
 * Distributes yield gains proportionally based on each user's share_pct,
 * then logs per-user yield transactions and updates their deposit balances.
 */
export async function runYieldOptimizerForAllUsers(): Promise<{
  optimizerResult: OptimizerResult;
  userUpdates: Array<{ wallet: string; yieldUSD: number; newDepositUSD: number }>;
}> {
  const optimizerResult = await runYieldOptimizer();
  const userUpdates: Array<{ wallet: string; yieldUSD: number; newDepositUSD: number }> = [];

  // Only distribute yield on a successful rebalance or hold with active position
  const hasYield =
    optimizerResult.action === 'rebalance' ||
    optimizerResult.action === 'hold';

  if (!hasYield) {
    return { optimizerResult, userUpdates };
  }

  const accounts = await getAllDefiAccounts();
  if (accounts.length === 0) {
    return { optimizerResult, userUpdates };
  }

  const totalPoolUSD = accounts.reduce((s, a) => s + Number(a.deposit_usd), 0);
  if (totalPoolUSD <= 0) {
    return { optimizerResult, userUpdates };
  }

  // Use the current APY to compute a daily yield amount for the whole pool
  const currentApyPct: number =
    (optimizerResult as { currentApyPct?: number }).currentApyPct ?? 0;
  const dailyYieldFactor = currentApyPct / 100 / 365;
  const totalDailyYieldUSD = totalPoolUSD * dailyYieldFactor;

  // Distribute to each user proportionally and update their balances
  await Promise.all(
    accounts.map(async (account) => {
      const userDepositUSD = Number(account.deposit_usd);
      if (userDepositUSD <= 0) return;

      const userShareFraction = userDepositUSD / totalPoolUSD;
      const userYieldUSD = totalDailyYieldUSD * userShareFraction;
      const newDepositUSD = userDepositUSD + userYieldUSD;
      const newSharePct = (newDepositUSD / (totalPoolUSD + totalDailyYieldUSD)) * 100;

      await updateUserDeposit(account.wallet_address, newDepositUSD, newSharePct);
      await logDefiTxn(account.wallet_address, 'yield', userYieldUSD, {
        protocol: (optimizerResult as { currentProtocol?: string }).currentProtocol,
        status: 'completed',
      });

      userUpdates.push({
        wallet: account.wallet_address,
        yieldUSD: userYieldUSD,
        newDepositUSD,
      });
    })
  );

  return { optimizerResult, userUpdates };
}

// Suppress unused variable warning for OPTIMIZER_ACTOR (used by downstream tooling)
void OPTIMIZER_ACTOR;
