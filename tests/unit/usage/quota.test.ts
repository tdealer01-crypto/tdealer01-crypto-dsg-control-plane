import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
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
  it('inserts a new row when no existing counter', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const chain = makeChain();
      chain.insert = insertMock;
      if (callCount === 1) {
        // select existing row — none found
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      }
      return chain;
    });

    await incrementQuota('org-1', 'agent-1');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: 'org-1', agent_id: 'agent-1', executions: 1 })
    );
  });

  it('increments existing counter by 1', async () => {
    const updateChain = { update: vi.fn(), eq: vi.fn() };
    updateChain.update.mockReturnValue(updateChain);
    updateChain.eq.mockResolvedValue({ error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain = makeChain();
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: 'ctr-1', executions: 5 },
          error: null,
        });
        return chain;
      }
      return updateChain;
    });

    await incrementQuota('org-1', 'agent-1');
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ executions: 6 })
    );
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'ctr-1');
  });
});
