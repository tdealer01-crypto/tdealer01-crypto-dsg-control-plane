import { NextResponse } from 'next/server';

const DEFAULT_CALLBACK_PATH = '/stripe/oauth/callback';

function getAppOrigin(requestUrl: string) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  return new URL(requestUrl).origin;
}

export function GET(request: Request) {
  // Canonical env var for the Stripe app client_id (Live mode, public)
  const clientId =
    process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID ||
    process.env.STRIPE_CONNECT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_STRIPE_CLIENT_ID is not configured' },
      { status: 503 },
    );
  }

  const callbackPath = process.env.STRIPE_CONNECT_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
  const redirectUri = new URL(callbackPath, getAppOrigin(request.url));

  // Live mode public OAuth URL — https://marketplace.stripe.com/oauth/v2/authorize
  const url = new URL('/oauth/v2/authorize', 'https://marketplace.stripe.com');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri.toString());

  return NextResponse.redirect(url.toString(), { status: 302 });
}
