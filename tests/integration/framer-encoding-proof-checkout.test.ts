import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/framer/encoding-proof/checkout/route';

describe('Framer Encoding Proof checkout handoff', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects unauthenticated visitors to login and preserves return path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )));

    const request = new Request('https://control.example/framer/encoding-proof/checkout');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://control.example/login?next=%2Fframer%2Fencoding-proof%2Fcheckout',
    );
  });

  it('redirects an authenticated visitor to the Stripe Checkout URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, url: 'https://checkout.stripe.com/c/pay/test' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));

    const request = new Request('https://control.example/framer/encoding-proof/checkout', {
      headers: { cookie: 'sb-session=test' },
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://checkout.stripe.com/c/pay/test');
  });

  it('falls back to pricing when Checkout cannot be created', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Missing Stripe price configuration' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )));

    const request = new Request('https://control.example/framer/encoding-proof/checkout');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/pricing?checkout=error&source=framer-encoding-proof');
  });
});
