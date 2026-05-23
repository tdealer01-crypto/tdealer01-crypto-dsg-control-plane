import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrgUsageSnapshot, normalizeBillingPeriod } from '../../../lib/revenue/upgrade-nudge';

const eqCalls: Array<[string, unknown]> = [];

function makeChain(data: unknown) {
  const chain: any = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (resolve: any, reject: any) => Promise.resolve({ data, error: null }).then(resolve, reject),
    catch: (reject: any) => Promise.resolve({ data, error: null }).catch(reject),
  };
  return chain;
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'organizations') return makeChain({ plan: 'pro' });
  if (table === 'usage_counters') return makeChain([{ executions: 4200 }]);
  return makeChain(null);
});

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

describe('upgrade-nudge explicit billing period', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eqCalls.length = 0;
  });

  it('uses the requested billing period for usage_counters queries', async () => {
    const snapshot = await getOrgUsageSnapshot('org-period', '2026-04');

    expect(snapshot.used).toBe(4200);
    expect(eqCalls).toContainEqual(['org_id', 'org-period']);
    expect(eqCalls).toContainEqual(['billing_period', '2026-04']);
  });

  it('normalizes invalid period values to a safe YYYY-MM fallback', () => {
    const normalized = normalizeBillingPeriod('not-a-period');
    expect(normalized).toMatch(/^\d{4}-\d{2}$/);
    expect(normalized).not.toBe('not-a-period');
  });
});
