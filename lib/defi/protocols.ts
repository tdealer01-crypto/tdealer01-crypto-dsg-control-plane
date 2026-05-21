import { CONTRACT_ADDRESSES } from './config';
import { ethCall, encodeSelector, decodeUint256 } from './rpc';
import type { ProtocolYield } from './types';

async function safeApy(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

export async function getLiquidStakeApy(): Promise<ProtocolYield> {
  const addr = CONTRACT_ADDRESSES.kubLiquidStake;
  if (!addr) return { protocol: 'kub-liquid-stake', apyPct: 0, available: false };
  const apyPct = await safeApy(async () => {
    const raw = await ethCall(addr, encodeSelector('annualRewardRate()'));
    // annualRewardRate returns basis points (1000 = 10%)
    return Number(decodeUint256(raw)) / 100;
  });
  return { protocol: 'kub-liquid-stake', apyPct, available: !!addr };
}

export async function getKubLendApy(): Promise<ProtocolYield> {
  const addr = CONTRACT_ADDRESSES.kubLend;
  if (!addr) return { protocol: 'kub-lend', apyPct: 0, available: false };
  const apyPct = await safeApy(async () => {
    const raw = await ethCall(addr, encodeSelector('getSupplyApy()'));
    // Returns basis points
    return Number(decodeUint256(raw)) / 100;
  });
  return { protocol: 'kub-lend', apyPct, available: !!addr };
}

export async function getKubswapLpApy(): Promise<ProtocolYield> {
  const addr = CONTRACT_ADDRESSES.kubswapRouter;
  if (!addr) return { protocol: 'kubswap', apyPct: 0, available: false };
  const apyPct = await safeApy(async () => {
    const raw = await ethCall(addr, encodeSelector('getLpApy()'));
    return Number(decodeUint256(raw)) / 100;
  });
  return { protocol: 'kubswap', apyPct, available: !!addr };
}

export async function getAllYields(): Promise<ProtocolYield[]> {
  return Promise.all([getLiquidStakeApy(), getKubLendApy(), getKubswapLpApy()]);
}
