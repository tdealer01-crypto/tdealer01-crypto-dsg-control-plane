import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { constructEvent, select, lte, eq, update, from } = vi.hoisted(() => {
  const constructEvent = vi.fn();
  const select = vi.fn();
  const lte = vi.fn(() => ({ select }));
  const eq = vi.fn(() => ({ lte }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { constructEvent, select, lte, eq, update, from };
});

vi.mock('stripe', () => ({
  default: { webhooks: { constructEvent } },
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

import { POST } from '@/app/api/stripe-app/webhook/route';

const deauthorizedEvent = {
  id: 'evt_deauthorized',
  type: 'account.application.deauthorized',
  account: 'acct_revoked',
  created: 1_750_000_000,
  data: { object: {} },
};

describe('Stripe App deauthorization webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_APP_WEBHOOK_SECRET = 'whsec_example';
    select.mockResolvedValue({ data: [{ stripe_account_id: 'acct_revoked' }], error: null });
  });

  afterEach(() => delete process.env.STRIPE_APP_WEBHOOK_SECRET);

  it('only requires the dedicated webhook signing secret', async () => {
    constructEvent.mockReturnValue(deauthorizedEvent);
    const response = await POST(new Request('https://dsg.example/api/stripe-app/webhook', {
      method: 'POST', headers: { 'stripe-signature': 'valid' }, body: '{}',
    }) as any);
    expect(response.status).toBe(200);
  });

  it('fails closed when the dedicated Stripe App webhook is not configured', async () => {
    delete process.env.STRIPE_APP_WEBHOOK_SECRET;
    const response = await POST(new Request('https://dsg.example/api/stripe-app/webhook', { method: 'POST' }) as any);
    expect(response.status).toBe(503);
  });

  it('rejects missing signatures before processing', async () => {
    const response = await POST(new Request('https://dsg.example/api/stripe-app/webhook', { method: 'POST' }) as any);
    expect(response.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('persists deauthorization evidence and protects a newer reconnect from stale events', async () => {
    constructEvent.mockReturnValue(deauthorizedEvent);
    const response = await POST(new Request('https://dsg.example/api/stripe-app/webhook', {
      method: 'POST', headers: { 'stripe-signature': 'valid' }, body: '{}',
    }) as any);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'revoked', disconnect_reason: 'account.application.deauthorized', last_lifecycle_event_id: 'evt_deauthorized',
    }));
    expect(eq).toHaveBeenCalledWith('stripe_account_id', 'acct_revoked');
    expect(lte).toHaveBeenCalledWith('installed_at', new Date(deauthorizedEvent.created * 1000).toISOString());
  });

  it('returns handled false when a stale event does not match the current installation', async () => {
    constructEvent.mockReturnValue(deauthorizedEvent);
    select.mockResolvedValue({ data: [], error: null });
    const response = await POST(new Request('https://dsg.example/api/stripe-app/webhook', {
      method: 'POST', headers: { 'stripe-signature': 'valid' }, body: '{}',
    }) as any);
    expect(await response.json()).toEqual({ received: true, handled: false });
  });

  it('returns 500 so Stripe retries when persistence fails', async () => {
    constructEvent.mockReturnValue(deauthorizedEvent);
    select.mockResolvedValue({ data: null, error: { message: 'db unavailable' } });
    const response = await POST(new Request('https://dsg.example/api/stripe-app/webhook', {
      method: 'POST', headers: { 'stripe-signature': 'valid' }, body: '{}',
    }) as any);
    expect(response.status).toBe(500);
  });
});
