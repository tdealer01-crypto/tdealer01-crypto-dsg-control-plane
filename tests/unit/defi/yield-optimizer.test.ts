import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/defi/protocols', () => ({
  getAllYields: vi.fn(),
}));

vi.mock('@/lib/defi/on-chain-executor', () => ({
  executeRebalance: vi.fn(),
}));

vi.mock('@/lib/gateway/defi-validator', () => ({
  validateDeFiTransaction: vi.fn(),
}));

vi.mock('@/lib/defi/supabase-defi', () => ({
  getAllDefiAccounts: vi.fn(),
  updateUserDeposit: vi.fn(),
  logDefiTxn: vi.fn(),
}));

import { runYieldOptimizer, runYieldOptimizerForAllUsers } from '@/lib/defi/yield-optimizer';
import { getAllYields } from '@/lib/defi/protocols';
import { executeRebalance } from '@/lib/defi/on-chain-executor';
import { validateDeFiTransaction } from '@/lib/gateway/defi-validator';
import { getAllDefiAccounts, updateUserDeposit, logDefiTxn } from '@/lib/defi/supabase-defi';
import type { ProtocolYield } from '@/lib/defi/types';

const mockGetAllYields = vi.mocked(getAllYields);
const mockExecuteRebalance = vi.mocked(executeRebalance);
const mockValidateDeFiTransaction = vi.mocked(validateDeFiTransaction);
const mockGetAllDefiAccounts = vi.mocked(getAllDefiAccounts);
const mockUpdateUserDeposit = vi.mocked(updateUserDeposit);
const mockLogDefiTxn = vi.mocked(logDefiTxn);

const availableYields: ProtocolYield[] = [
  { protocol: 'kub-liquid-stake', apyPct: 10, available: true },
  { protocol: 'kub-lend', apyPct: 5, available: true },
  { protocol: 'kubswap', apyPct: 3, available: true },
];

function setCurrentPosition(protocol = 'kub-lend', usdValue = 1000) {
  process.env.YIELD_OPTIMIZER_CURRENT_PROTOCOL = protocol;
  process.env.YIELD_OPTIMIZER_CURRENT_USD = String(usdValue);
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.YIELD_OPTIMIZER_ENABLED;
  delete process.env.KUB_WALLET_ADDRESS;
  delete process.env.YIELD_OPTIMIZER_CURRENT_PROTOCOL;
  delete process.env.YIELD_OPTIMIZER_CURRENT_USD;
  mockGetAllYields.mockResolvedValue(availableYields);
  mockValidateDeFiTransaction.mockReturnValue({ ok: true });
  mockExecuteRebalance.mockResolvedValue({ ok: true, txHash: 'sim_abc', simulated: true });
  mockGetAllDefiAccounts.mockResolvedValue([]);
  mockUpdateUserDeposit.mockResolvedValue(undefined as any);
  mockLogDefiTxn.mockResolvedValue(undefined as any);
});

describe('runYieldOptimizer', () => {
  it("returns action:'disabled' when YIELD_OPTIMIZER_ENABLED is not set", async () => {
    const result = await runYieldOptimizer();
    expect(result.action).toBe('disabled');
  });

  it("returns action:'error' when KUB_WALLET_ADDRESS is not set", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    const result = await runYieldOptimizer();
    expect(result.action).toBe('error');
    expect(result.reason).toMatch(/KUB_WALLET_ADDRESS/);
  });

  it("returns action:'no_position' when no active position", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    const result = await runYieldOptimizer();
    expect(result.action).toBe('no_position');
  });

  it("returns action:'hold' when APY gain is below threshold", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-liquid-stake', 1000); // already at best (10%)
    const result = await runYieldOptimizer();
    expect(result.action).toBe('hold');
  });

  it("returns action:'blocked' when Z3 validation rejects the transaction", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-lend', 1000); // 5% → best is 10%, gain = 5%
    mockValidateDeFiTransaction.mockReturnValue({
      ok: false,
      reason: 'exceeds_single_tx_limit',
      field: 'amountUSD',
      bound: 1000,
    });
    const result = await runYieldOptimizer();
    expect(result.action).toBe('blocked');
    expect(result.reason).toMatch(/Z3 bound violated/);
    expect(mockExecuteRebalance).not.toHaveBeenCalled();
  });

  it("returns action:'rebalance' when all conditions are met", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-lend', 500); // 5% → best is 10%, gain = 5%
    const result = await runYieldOptimizer();
    expect(result.action).toBe('rebalance');
    expect(result.targetProtocol).toBe('kub-liquid-stake');
    expect(mockExecuteRebalance).toHaveBeenCalledOnce();
  });

  it("returns action:'error' when executeRebalance fails", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-lend', 500);
    mockExecuteRebalance.mockResolvedValue({ ok: false, error: 'no private key', simulated: true });
    const result = await runYieldOptimizer();
    expect(result.action).toBe('error');
  });
});

describe('runYieldOptimizerForAllUsers', () => {
  it('returns empty userUpdates when optimizer is disabled', async () => {
    const { userUpdates } = await runYieldOptimizerForAllUsers();
    expect(userUpdates).toEqual([]);
  });

  it('returns empty userUpdates when accounts array is empty', async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-liquid-stake', 1000); // hold
    mockGetAllDefiAccounts.mockResolvedValue([]);
    const { userUpdates } = await runYieldOptimizerForAllUsers();
    expect(userUpdates).toEqual([]);
  });

  it('returns empty userUpdates when totalPool <= 0', async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-liquid-stake', 1000);
    mockGetAllDefiAccounts.mockResolvedValue([
      { wallet_address: '0xA', deposit_usd: 0 } as any,
    ]);
    const { userUpdates } = await runYieldOptimizerForAllUsers();
    expect(userUpdates).toEqual([]);
  });

  it('distributes yield proportionally for 2 users (60%/40% split)', async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-liquid-stake', 1000); // hold — currentApyPct = 10%
    mockGetAllDefiAccounts.mockResolvedValue([
      { wallet_address: '0xUserA', deposit_usd: 600 } as any,
      { wallet_address: '0xUserB', deposit_usd: 400 } as any,
    ]);

    const { userUpdates } = await runYieldOptimizerForAllUsers();

    expect(userUpdates).toHaveLength(2);
    const userA = userUpdates.find((u) => u.wallet === '0xUserA')!;
    const userB = userUpdates.find((u) => u.wallet === '0xUserB')!;

    // daily yield = 1000 * (10/100/365) ≈ 0.2740
    const totalDailyYield = 1000 * (10 / 100 / 365);
    expect(userA.yieldUSD).toBeCloseTo(totalDailyYield * 0.6, 8);
    expect(userB.yieldUSD).toBeCloseTo(totalDailyYield * 0.4, 8);
    expect(userA.newDepositUSD).toBeCloseTo(600 + totalDailyYield * 0.6, 8);
    expect(userB.newDepositUSD).toBeCloseTo(400 + totalDailyYield * 0.4, 8);
  });

  it('skips users with deposit <= 0', async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-liquid-stake', 500);
    mockGetAllDefiAccounts.mockResolvedValue([
      { wallet_address: '0xActive', deposit_usd: 500 } as any,
      { wallet_address: '0xZero', deposit_usd: 0 } as any,
    ]);

    const { userUpdates } = await runYieldOptimizerForAllUsers();
    expect(userUpdates).toHaveLength(1);
    expect(userUpdates[0].wallet).toBe('0xActive');
  });

  it("distributes yield on 'hold' action (not just rebalance)", async () => {
    process.env.YIELD_OPTIMIZER_ENABLED = 'true';
    process.env.KUB_WALLET_ADDRESS = '0xWallet';
    setCurrentPosition('kub-liquid-stake', 1000); // already at best → hold
    mockGetAllDefiAccounts.mockResolvedValue([
      { wallet_address: '0xUser', deposit_usd: 1000 } as any,
    ]);

    const { optimizerResult, userUpdates } = await runYieldOptimizerForAllUsers();
    expect(optimizerResult.action).toBe('hold');
    expect(userUpdates).toHaveLength(1);
    expect(userUpdates[0].yieldUSD).toBeGreaterThan(0);
  });
});
