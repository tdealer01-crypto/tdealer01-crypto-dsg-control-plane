import { describe, it, expect, beforeEach } from 'vitest';
import { executeRebalance } from '@/lib/defi/on-chain-executor';
import type { RebalancePlan } from '@/lib/defi/on-chain-executor';

const plan: RebalancePlan = {
  fromProtocol: 'kub-lend',
  toProtocol: 'kub-liquid-stake',
  amountUSD: 500,
  walletAddress: '0xWallet',
};

beforeEach(() => {
  delete process.env.KUB_WALLET_PRIVATE_KEY;
});

describe('executeRebalance', () => {
  it('returns ok:false with simulated:true when private key is missing', async () => {
    const result = await executeRebalance(plan);
    expect(result.ok).toBe(false);
    expect(result.simulated).toBe(true);
    expect(result.error).toMatch(/KUB_WALLET_PRIVATE_KEY/);
  });

  it('returns ok:true with simulated:true when private key is set', async () => {
    process.env.KUB_WALLET_PRIVATE_KEY = 'fake-private-key';
    const result = await executeRebalance(plan);
    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.txHash).toBeTruthy();
  });

  it('does not throw regardless of env state', async () => {
    await expect(executeRebalance(plan)).resolves.toBeDefined();
  });
});
