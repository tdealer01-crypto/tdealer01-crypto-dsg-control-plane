import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({ rpc: mockRpc })),
}));

import {
  fulfillSubscription,
  revokeSubscription,
} from '../../../lib/billing/fulfillment';

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
});

describe('fulfillSubscription', () => {
  it('rejects incomplete input', async () => {
    await expect(fulfillSubscription('', 'pro', 'active')).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
    await expect(fulfillSubscription('org-1', '', 'active')).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
    await expect(fulfillSubscription('org-1', 'pro', '')).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls the atomic database entitlement RPC', async () => {
    const result = await fulfillSubscription('org-1', 'pro', 'active');

    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith('sync_dsg_paid_entitlement', {
      p_org_id: 'org-1',
      p_plan_key: 'pro',
      p_status: 'active',
    });
  });

  it('is retry-safe because every call writes the same target state', async () => {
    await fulfillSubscription('org-1', 'enterprise', 'trialing');
    await fulfillSubscription('org-1', 'enterprise', 'trialing');

    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc.mock.calls[0]).toEqual(mockRpc.mock.calls[1]);
  });

  it('throws on database failure so the Stripe webhook can release its event claim and retry', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'transaction failed' } });

    await expect(
      fulfillSubscription('org-1', 'pro', 'active'),
    ).rejects.toThrow('paid_entitlement_sync_failed:transaction failed');
  });
});

describe('revokeSubscription', () => {
  it('rejects an empty organization', async () => {
    await expect(revokeSubscription('')).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('revokes organization and gate access through the same RPC', async () => {
    const result = await revokeSubscription('org-1');

    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith('sync_dsg_paid_entitlement', {
      p_org_id: 'org-1',
      p_plan_key: 'free',
      p_status: 'canceled',
    });
  });
});
