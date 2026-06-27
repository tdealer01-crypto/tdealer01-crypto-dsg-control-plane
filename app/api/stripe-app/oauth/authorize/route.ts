import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_CLIENT_ID = 'ca_UfEPAC4NcvG2nYAYjohDQ9GtDlIdajy6';
const REDIRECT_URI = 'https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback';

/**
 * GET /api/stripe-app/oauth/authorize
 *
 * Returns the Stripe OAuth authorization URL.
 * Used by the dashboard Connect Stripe button.
 * Secrets stay server-side — only the public client_id goes in the URL.
 */
export function GET() {
  const clientId =
    process.env.STRIPE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID ||
    process.env.STRIPE_CONNECT_CLIENT_ID ||
    DEFAULT_CLIENT_ID;

  const url = new URL('/oauth/v2/authorize', 'https://marketplace.stripe.com');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');

  return NextResponse.json({ url: url.toString() });
}
