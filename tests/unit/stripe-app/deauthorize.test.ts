import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deauthorizeStripeAccount } from '@/lib/stripe-app/deauthorize';

describe('Stripe OAuth deauthorization', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    process.env.STRIPE_CONNECT_CLIENT_ID = 'ca_live';
    process.env.STRIPE_SECRET_KEY = 'sk_live_example';
    process.env.STRIPE_SANDBOX_CONNECT_CLIENT_ID = 'ca_sandbox';
    process.env.STRIPE_SANDBOX_SECRET_KEY = 'sk_test_example';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STRIPE_CONNECT_CLIENT_ID;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SANDBOX_CONNECT_CLIENT_ID;
    delete process.env.STRIPE_SANDBOX_SECRET_KEY;
  });

  it('uses mode-matched credentials and the Stripe deauthorize endpoint', async () => {
    await deauthorizeStripeAccount('sandbox', 'acct_sandbox');
    expect(fetch).toHaveBeenCalledWith('https://connect.stripe.com/oauth/deauthorize', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: `Basic ${Buffer.from('sk_test_example:').toString('base64')}` }),
      body: new URLSearchParams({ client_id: 'ca_sandbox', stripe_user_id: 'acct_sandbox' }),
    }));
  });

  it('fails closed when mode-matched credentials are absent', async () => {
    delete process.env.STRIPE_SANDBOX_SECRET_KEY;
    await expect(deauthorizeStripeAccount('sandbox', 'acct_sandbox')).rejects.toThrow('sandbox Stripe deauthorization is not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails when Stripe does not confirm revocation', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400 } as Response);
    await expect(deauthorizeStripeAccount('live', 'acct_live')).rejects.toThrow('HTTP 400');
  });
});
