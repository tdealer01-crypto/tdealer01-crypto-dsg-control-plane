import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

type RowResult = { data: unknown; error: null | { message: string } };

function buildResolvedChain(result: RowResult) {
  const chain: Record<string, unknown> = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    contains: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    then: undefined,
  };

  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.contains = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (
    onFulfilled?: (value: RowResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return chain;
}

describe('quota helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current quota tier from billing subscriptions', async () => {
    mockFrom.mockImplementationOnce(() =>
      buildResolvedChain({
        data: {
          plan_key: 'business',
          billing_interval: 'monthly',
          current_period_start: '2026-07-01T00:00:00.000Z',
          current_period_end: '2026-08-01T00:00:00.000Z',
          status: 'active',
        },
        error: null,
      })
    );

    const { getUserQuotaTier } = await import('../../../lib/database/quotas');
    const tier = await getUserQuotaTier('org-1');

    expect(tier.planKey).toBe('business');
    expect(tier.limit).toBe(100000);
    expect(tier.currentPeriodEnd).toBe('2026-08-01T00:00:00.000Z');
  });

  it('aggregates usage from usage counters, delivery proof events, and API key usage', async () => {
    mockFrom
      .mockImplementationOnce(() =>
        buildResolvedChain({
          data: {
            plan_key: 'pro',
            billing_interval: 'monthly',
            current_period_start: '2026-07-01T00:00:00.000Z',
            current_period_end: '2026-08-01T00:00:00.000Z',
            status: 'active',
          },
          error: null,
        })
      )
      .mockImplementationOnce(() =>
        buildResolvedChain({
          data: [{ executions: 12 }, { executions: 8 }],
          error: null,
        })
      )
      .mockImplementationOnce(() =>
        buildResolvedChain({
          data: [
            { event_type: 'delivery_proof_scan', amount: 2 },
            { event_type: 'delivery_proof_scan', amount: null },
            { event_type: 'mcp_request', amount: 5 },
          ],
          error: null,
        })
      )
      .mockImplementationOnce(() =>
        buildResolvedChain({
          data: [{ requests_this_month: 7 }, { requests_this_month: 3 }],
          error: null,
        })
      );

    const { getQuotaUsage } = await import('../../../lib/database/quotas');
    const usage = await getQuotaUsage('org-1', '2026-07');

    expect(usage.apiExecutions).toBe(20);
    expect(usage.deliveryProofScans).toBe(3);
    expect(usage.mcpRequests).toBe(10);
    expect(usage.totalUsed).toBe(33);
  });

  it('logs quota consumption into revenue_events', async () => {
    mockFrom.mockImplementationOnce(() =>
      buildResolvedChain({
        data: {
          id: 'rev_evt_1',
          created_at: '2026-07-01T00:00:00.000Z',
          org_id: 'org-1',
          user_id: null,
          event_type: 'api_execution',
          plan_id: null,
          amount: 1,
          currency: 'USD',
          source: '/api/spine/execute',
          metadata: { quotaType: 'api_execution' },
        },
        error: null,
      })
    );

    const { logQuotaConsumption } = await import('../../../lib/database/quotas');
    const event = await logQuotaConsumption('org-1', 'api_execution', 1, {
      source: '/api/spine/execute',
    });

    expect(event.eventType).toBe('api_execution');
    expect(event.source).toBe('/api/spine/execute');
  });
});
