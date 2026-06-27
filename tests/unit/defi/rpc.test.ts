import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/defi/config', () => ({
  KUB_RPC_URL: 'https://rpc.test',
}));

import { decodeUint256, encodeSelector, ethCall, ethGetBalance } from '@/lib/defi/rpc';

function mockFetchJson(body: unknown) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('decodeUint256', () => {
  it('returns 0n for empty 0x', () => {
    expect(decodeUint256('0x')).toBe(BigInt(0));
  });

  it('parses a valid hex value', () => {
    expect(decodeUint256('0x64')).toBe(BigInt(100));
  });

  it('handles 0x0', () => {
    expect(decodeUint256('0x0')).toBe(BigInt(0));
  });
});

describe('encodeSelector', () => {
  it('returns correct selector for annualRewardRate()', () => {
    expect(encodeSelector('annualRewardRate()')).toBe('0x4a5f5db4');
  });

  it('returns correct selector for getSupplyApy()', () => {
    expect(encodeSelector('getSupplyApy()')).toBe('0x8d8f1e2b');
  });

  it('returns correct selector for getLpApy()', () => {
    expect(encodeSelector('getLpApy()')).toBe('0x5b3d9f1a');
  });

  it('returns 0x00000000 for unknown signature', () => {
    expect(encodeSelector('unknownFn()')).toBe('0x00000000');
  });
});

describe('ethCall', () => {
  it('returns result on success', async () => {
    mockFetchJson({ result: '0x64' });
    const result = await ethCall('0xaddr', '0xdata');
    expect(result).toBe('0x64');
  });

  it('throws when response contains error field', async () => {
    mockFetchJson({ error: { message: 'execution reverted' } });
    await expect(ethCall('0xaddr', '0xdata')).rejects.toThrow('execution reverted');
  });

  it("returns '0x0' when result is missing", async () => {
    mockFetchJson({});
    const result = await ethCall('0xaddr', '0xdata');
    expect(result).toBe('0x0');
  });
});

describe('ethGetBalance', () => {
  it('parses balance as bigint', async () => {
    mockFetchJson({ result: '0x1000' });
    const balance = await ethGetBalance('0xaddr');
    expect(balance).toBe(BigInt('0x1000'));
  });

  it('returns 0n when result is missing', async () => {
    mockFetchJson({});
    const balance = await ethGetBalance('0xaddr');
    expect(balance).toBe(BigInt(0));
  });
});
