import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

import { checkQuota, incrementQuota } from '../../../lib/usage/quota';

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    ...overrides,
  };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe('checkQuota', () => {
  it('allows execution when under quota', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain();
      if (callCount === 1) {
        // organizations query
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { plan: 'pro' }, error: null });
      } else {
        // usage_counters query
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { executions: 100 }, error: null });
      }
      return chain;
    });

    const result = await checkQuota('org-1', 'agent-1');
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.limit).toBe(10000); // pro plan
      expect(result.used).toBe(100);
    }
  });

  it('blocks execution when at quota', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain();
      if (callCount === 1) {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { plan: 'free' }, error: null });
      } else {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { executions: 60 }, error: null });
      }
      return chain;
    });

    const result = await checkQuota('org-1', 'agent-1');
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(60);
    expect(result.limit).toBe(60);
    expect(result.upgradeUrl).toContain('/pricing');
  });

  it('uses free plan quota when org has no plan set', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain();
      if (callCount === 1) {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { plan: null }, error: null });
      } else {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      }
      return chain;
    });

    const result = await checkQuota('org-1', 'agent-1');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(60); // FREE_QUOTA
    expect(result.used).toBe(0);
  });

  it('returns upgrade_url from NEXT_PUBLIC_APP_URL env', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain();
      if (callCount === 1) {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { plan: 'free' }, error: null });
      } else {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { executions: 60 }, error: null });
      }
      return chain;
    });

    const result = await checkQuota('org-1', 'agent-1');
    expect(result.allowed).toBe(false);
    expect(result.upgradeUrl).toBe('https://app.example.com/pricing');
  });
});

describe('incrementQuota', () => {
  it('calls increment_quota_atomic RPC with correct params', async () => {
    await incrementQuota('org-1', 'agent-1');
    expect(mockRpc).toHaveBeenCalledWith('increment_quota_atomic', expect.objectContaining({
      p_org_id: 'org-1',
      p_agent_id: 'agent-1',
    }));
  });

  it('includes billing_period in RPC params', async () => {
    await incrementQuota('org-1', 'agent-1');
    const call = mockRpc.mock.calls[0];
    expect(call[0]).toBe('increment_quota_atomic');
    expect(call[1].p_billing_period).toMatch(/^\d{4}-\d{2}$/);
  });

  it('throws when RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'function not found' } });
    await expect(incrementQuota('org-1', 'agent-1')).rejects.toThrow('incrementQuota failed');
  });
});
