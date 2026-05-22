import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdate = vi.fn().mockResolvedValue({ error: null });
const mockEq = vi.fn().mockReturnValue({ error: null });
const mockFrom = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

import { fulfillSubscription, revokeSubscription } from '../../../lib/billing/fulfillment';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

function setupMock(error: unknown = null) {
  const chain = { update: vi.fn(), eq: vi.fn() };
  chain.update.mockReturnValue(chain);
  chain.eq.mockResolvedValue({ error });
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fulfillSubscription', () => {
  it('returns ok:false for empty orgId', async () => {
    const result = await fulfillSubscription('', 'pro', 'active');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for empty planKey', async () => {
    const result = await fulfillSubscription('org-1', '', 'active');
    expect(result.ok).toBe(false);
  });

  it('calls organizations.update with correct plan on active status', async () => {
    const chain = setupMock(null);
    const result = await fulfillSubscription('org-1', 'pro', 'active');
    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('organizations');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro' })
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'org-1');
  });

  it('sets plan=free when status is canceled (via effectivePlan)', async () => {
    const chain = setupMock(null);
    const result = await fulfillSubscription('org-1', 'pro', 'canceled');
    expect(result.ok).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free' })
    );
  });

  it('returns ok:false when supabase returns error', async () => {
    setupMock({ message: 'DB error' });
    const result = await fulfillSubscription('org-1', 'pro', 'active');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('DB error');
    }
  });

  it('is idempotent: calling twice produces same final state', async () => {
    const chain = setupMock(null);
    await fulfillSubscription('org-1', 'pro', 'active');
    await fulfillSubscription('org-1', 'pro', 'active');
    expect(chain.update).toHaveBeenCalledTimes(2);
    // Both calls write the same value — final state is deterministic
    const calls = chain.update.mock.calls;
    expect(calls[0][0].plan).toBe(calls[1][0].plan);
  });
});

describe('revokeSubscription', () => {
  it('returns ok:false for empty orgId', async () => {
    const result = await revokeSubscription('');
    expect(result.ok).toBe(false);
  });

  it('sets plan=free on organizations', async () => {
    const chain = setupMock(null);
    const result = await revokeSubscription('org-1');
    expect(result.ok).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free' })
    );
  });

  it('returns ok:false on supabase error', async () => {
    setupMock({ message: 'network timeout' });
    const result = await revokeSubscription('org-1');
    expect(result.ok).toBe(false);
  });
});
