import { describe, it, expect } from 'vitest';
import { validateDeFiTransaction } from '../../../lib/gateway/defi-validator';
import constraints from '../../../lib/gateway/verified-constraints.json';

const VALID: Parameters<typeof validateDeFiTransaction>[0] = {
  tokenIn: 'KUB',
  tokenOut: 'USDT',
  amountUSD: 100,
  slippageBps: 30,
  protocol: 'kubswap',
  dailySpentUSD: 0,
};

describe('validateDeFiTransaction — happy path', () => {
  it('returns ok for a valid transaction', () => {
    expect(validateDeFiTransaction(VALID)).toEqual({ ok: true });
  });

  it('allows amount exactly at single-tx limit (boundary)', () => {
    expect(validateDeFiTransaction({ ...VALID, amountUSD: constraints.defi.maxSingleTxUSD })).toEqual({ ok: true });
  });

  it('allows slippage exactly at max (boundary)', () => {
    expect(validateDeFiTransaction({ ...VALID, slippageBps: constraints.defi.maxSlippageBps })).toEqual({ ok: true });
  });

  it('allows all whitelisted token pairs and protocols', () => {
    for (const tokenIn of constraints.defi.allowedTokens) {
      for (const protocol of constraints.defi.allowedProtocols) {
        expect(validateDeFiTransaction({ ...VALID, tokenIn, protocol }), `${tokenIn}/${protocol}`).toEqual({ ok: true });
      }
    }
  });
});

describe('validateDeFiTransaction — Theorem 6: amount bounds', () => {
  it('blocks zero amount', () => {
    const r = validateDeFiTransaction({ ...VALID, amountUSD: 0 });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe('amount_non_positive');
  });

  it('blocks negative amount', () => {
    const r = validateDeFiTransaction({ ...VALID, amountUSD: -1 });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe('amount_non_positive');
  });

  it('blocks amount exceeding single-tx limit', () => {
    const r = validateDeFiTransaction({ ...VALID, amountUSD: constraints.defi.maxSingleTxUSD + 1 });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.reason).toBe('exceeds_single_tx_limit');
      expect(r.field).toBe('amountUSD');
      expect(r.bound).toBe(constraints.defi.maxSingleTxUSD);
    }
  });

  it('blocks when daily cumulative exceeds maxDailyUSD', () => {
    const r = validateDeFiTransaction({ ...VALID, amountUSD: 500, dailySpentUSD: constraints.defi.maxDailyUSD - 400 });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toBe('exceeds_daily_limit');
  });
});

describe('validateDeFiTransaction — Theorem 7: slippage bound', () => {
  it('blocks slippage exceeding maxSlippageBps', () => {
    const r = validateDeFiTransaction({ ...VALID, slippageBps: constraints.defi.maxSlippageBps + 1 });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.reason).toBe('exceeds_max_slippage');
      expect(r.field).toBe('slippageBps');
      expect(r.bound).toBe(constraints.defi.maxSlippageBps);
    }
  });
});

describe('validateDeFiTransaction — allowlists', () => {
  it('blocks unknown tokenIn', () => {
    const r = validateDeFiTransaction({ ...VALID, tokenIn: 'DOGE' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toBe('token_not_whitelisted');
  });

  it('blocks unknown tokenOut', () => {
    const r = validateDeFiTransaction({ ...VALID, tokenOut: 'SHIB' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toBe('token_not_whitelisted');
  });

  it('blocks unknown protocol', () => {
    const r = validateDeFiTransaction({ ...VALID, protocol: 'uniswap-v3' });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toBe('protocol_not_whitelisted');
  });
});
