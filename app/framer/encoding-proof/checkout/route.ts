import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * One-click revenue handoff for the public Framer Encoding Proof product page.
 *
 * Framer never receives Stripe secrets or DSG session internals. This route
 * forwards the browser's existing authenticated session to the canonical DSG
 * billing endpoint, then redirects the user to the Stripe-hosted Checkout URL.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const headers = new Headers({ 'content-type': 'application/json' });
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.set('cookie', cookie);
  if (authorization) headers.set('authorization', authorization);

  try {
    const checkout = await fetch(`${origin}/api/billing/checkout`, {
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
      return NextResponse.redirect(`${origin}/login?next=${next}`);
    }

    const payload = await checkout.json().catch(() => null) as { url?: string; error?: string } | null;
    if (!checkout.ok || !payload?.url) {
      const reason = encodeURIComponent(payload?.error || `checkout_http_${checkout.status}`);
      return NextResponse.redirect(`${origin}/pricing?checkout=error&source=framer-encoding-proof&reason=${reason}`);
    }

    return NextResponse.redirect(payload.url);
  } catch {
    return NextResponse.redirect(`${origin}/pricing?checkout=error&source=framer-encoding-proof`);
  }
}
