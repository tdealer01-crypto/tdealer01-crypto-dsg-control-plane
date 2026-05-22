import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/defi/config', () => ({
  CONTRACT_ADDRESSES: {
    get kubLiquidStake() { return process.env.KUB_LIQUID_STAKE_ADDRESS ?? ''; },
    get kubLend() { return process.env.KUB_LEND_ADDRESS ?? ''; },
    get kubswapRouter() { return process.env.KUBSWAP_ROUTER_ADDRESS ?? ''; },
    get kkub() { return process.env.KKUB_ADDRESS ?? ''; },
    get usdt() { return process.env.KUB_USDT_ADDRESS ?? ''; },
  },
  KUB_RPC_URL: 'https://rpc.test',
}));

vi.mock('@/lib/defi/rpc', () => ({
  ethCall: vi.fn(),
  encodeSelector: vi.fn((sig: string) => {
    const map: Record<string, string> = {
      'annualRewardRate()': '0x4a5f5db4',
      'getSupplyApy()': '0x8d8f1e2b',
      'getLpApy()': '0x5b3d9f1a',
    };
    return map[sig] ?? '0x00000000';
  }),
  decodeUint256: vi.fn((hex: string) => BigInt(hex === '0x' ? '0' : hex)),
}));

import { getLiquidStakeApy, getKubLendApy, getKubswapLpApy, getAllYields } from '@/lib/defi/protocols';
import { ethCall } from '@/lib/defi/rpc';

const mockEthCall = vi.mocked(ethCall);

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.KUB_LIQUID_STAKE_ADDRESS;
  delete process.env.KUB_LEND_ADDRESS;
  delete process.env.KUBSWAP_ROUTER_ADDRESS;
});

describe('getLiquidStakeApy', () => {
  it('returns available:false when contract address env is not set', async () => {
    const result = await getLiquidStakeApy();
    expect(result).toEqual({ protocol: 'kub-liquid-stake', apyPct: 0, available: false });
  });

  it('converts basis points to percent on valid call', async () => {
    process.env.KUB_LIQUID_STAKE_ADDRESS = '0xStake';
    mockEthCall.mockResolvedValueOnce('0x3E8'); // 1000 bps = 10%
    const result = await getLiquidStakeApy();
    expect(result.available).toBe(true);
    expect(result.apyPct).toBeCloseTo(10);
  });

  it('returns apyPct:0 via safeApy when RPC throws', async () => {
    process.env.KUB_LIQUID_STAKE_ADDRESS = '0xStake';
    mockEthCall.mockRejectedValueOnce(new Error('RPC error'));
    const result = await getLiquidStakeApy();
    expect(result.apyPct).toBe(0);
    expect(result.available).toBe(true);
  });
});

describe('getKubLendApy', () => {
  it('returns available:false when contract address env is not set', async () => {
    const result = await getKubLendApy();
    expect(result).toEqual({ protocol: 'kub-lend', apyPct: 0, available: false });
  });

  it('converts basis points to percent on valid call', async () => {
    process.env.KUB_LEND_ADDRESS = '0xLend';
    mockEthCall.mockResolvedValueOnce('0x1F4'); // 500 bps = 5%
    const result = await getKubLendApy();
    expect(result.available).toBe(true);
    expect(result.apyPct).toBeCloseTo(5);
  });

  it('returns apyPct:0 when RPC throws', async () => {
    process.env.KUB_LEND_ADDRESS = '0xLend';
    mockEthCall.mockRejectedValueOnce(new Error('timeout'));
    const result = await getKubLendApy();
    expect(result.apyPct).toBe(0);
  });
});

describe('getKubswapLpApy', () => {
  it('returns available:false when contract address env is not set', async () => {
    const result = await getKubswapLpApy();
    expect(result).toEqual({ protocol: 'kubswap', apyPct: 0, available: false });
  });

  it('converts basis points to percent on valid call', async () => {
    process.env.KUBSWAP_ROUTER_ADDRESS = '0xRouter';
    mockEthCall.mockResolvedValueOnce('0x2BC'); // 700 bps = 7%
    const result = await getKubswapLpApy();
    expect(result.available).toBe(true);
    expect(result.apyPct).toBeCloseTo(7);
  });
});

describe('getAllYields', () => {
  it('returns 3-element array when all protocols succeed', async () => {
    process.env.KUB_LIQUID_STAKE_ADDRESS = '0xStake';
    process.env.KUB_LEND_ADDRESS = '0xLend';
    process.env.KUBSWAP_ROUTER_ADDRESS = '0xRouter';
    mockEthCall.mockResolvedValue('0x3E8');
    const results = await getAllYields();
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.protocol)).toEqual(['kub-liquid-stake', 'kub-lend', 'kubswap']);
  });

  it('returns 3 elements with all unavailable when no env vars set', async () => {
    const results = await getAllYields();
    expect(results).toHaveLength(3);
    expect(results.every((r) => !r.available && r.apyPct === 0)).toBe(true);
  });
});
