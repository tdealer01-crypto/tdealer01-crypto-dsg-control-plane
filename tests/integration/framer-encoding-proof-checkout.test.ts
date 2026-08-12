import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/framer/encoding-proof/checkout/route';

describe('Framer Encoding Proof checkout handoff', () => {
  beforeEach(() => {
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('RENDER_EXTERNAL_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

  it('uses canonical APP_URL and HTTP loopback behind the Render proxy', async () => {
    vi.stubEnv('APP_URL', 'https://control.example');
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('https://localhost:10000/framer/encoding-proof/checkout', {
      headers: {
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
      },
    });
    const response = await GET(request);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:10000/api/billing/checkout',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://control.example/login?next=%2Fframer%2Fencoding-proof%2Fcheckout',
    );
  });

  it('uses RENDER_EXTERNAL_URL when APP_URL is absent and ignores forwarded host spoofing', async () => {
    vi.stubEnv('RENDER_EXTERNAL_URL', 'https://dsg-control.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )));

    const request = new Request('https://localhost:10000/framer/encoding-proof/checkout', {
      headers: {
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'http',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://dsg-control.example/login?next=%2Fframer%2Fencoding-proof%2Fcheckout',
    );
  });

  it('fails closed for loopback when no canonical public origin is configured', async () => {
    const request = new Request('https://localhost:10000/framer/encoding-proof/checkout', {
      headers: {
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'public_app_origin_not_configured',
    });
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
