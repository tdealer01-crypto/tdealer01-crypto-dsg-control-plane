import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeConfiguredOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function resolvePublicOrigin(request: Request): string {
  const configured =
    normalizeConfiguredOrigin(process.env.APP_URL) ||
    normalizeConfiguredOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  const requestUrl = new URL(request.url);
  if (!LOOPBACK_HOSTS.has(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  // Reverse proxies such as Render can expose the internal listener as
  // localhost in request.url while preserving the external host/protocol in
  // forwarded headers. This fallback is only used when no canonical APP_URL is
  // configured and the request URL is loopback.
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const protocol = forwardedProto === 'http' ? 'http' : 'https';
    return new URL(`${protocol}://${forwardedHost}`).origin;
  }

  throw new Error('public_app_origin_not_configured');
}

function resolveInternalOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  if (!LOOPBACK_HOSTS.has(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  // Render terminates TLS before forwarding to the container. The Next.js
  // listener itself is HTTP, so a self-call must not use the proxy-facing
  // https://localhost URL exposed on request.url.
  const port = requestUrl.port || process.env.PORT || '10000';
  return `http://127.0.0.1:${port}`;
}

/**
 * One-click revenue handoff for the public Framer Encoding Proof product page.
 *
 * Framer never receives Stripe secrets or DSG session internals. This route
 * forwards the browser's existing authenticated session to the canonical DSG
 * billing endpoint, then redirects the user to the Stripe-hosted Checkout URL.
 */
export async function GET(request: Request) {
  let publicOrigin: string;
  try {
    publicOrigin = resolvePublicOrigin(request);
  } catch {
    return new Response(
      JSON.stringify({ error: 'public_app_origin_not_configured' }),
      {
        status: 503,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  const internalOrigin = resolveInternalOrigin(request);
  const headers = new Headers({ 'content-type': 'application/json' });
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.set('cookie', cookie);
  if (authorization) headers.set('authorization', authorization);

  try {
    const checkout = await fetch(`${internalOrigin}/api/billing/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plan: 'pro',
        interval: 'monthly',
      }),
      cache: 'no-store',
      redirect: 'manual',
    });

    if (checkout.status === 401) {
      const next = encodeURIComponent('/framer/encoding-proof/checkout');
      return NextResponse.redirect(`${publicOrigin}/login?next=${next}`);
    }

    const payload = await checkout.json().catch(() => null) as { url?: string; error?: string } | null;
    if (!checkout.ok || !payload?.url) {
      const reason = encodeURIComponent(payload?.error || `checkout_http_${checkout.status}`);
      return NextResponse.redirect(`${publicOrigin}/pricing?checkout=error&source=framer-encoding-proof&reason=${reason}`);
    }

    return NextResponse.redirect(payload.url);
  } catch {
    return NextResponse.redirect(`${publicOrigin}/pricing?checkout=error&source=framer-encoding-proof`);
  }
}
