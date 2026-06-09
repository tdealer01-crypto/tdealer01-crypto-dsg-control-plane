import { NextResponse } from 'next/server';

const DEFAULT_CONNECT_LINK_ID = 'chnlink_61UpJ0wqNe8NQ3pYF41AZNzhgTUPV4R6';
const DEFAULT_CLIENT_ID = 'ca_UfEPAC4NcvG2nYAYjohDQ9GtDlIdajy6';
const DEFAULT_CALLBACK_PATH = '/stripe/oauth/callback';

function getAppOrigin(requestUrl: string) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  return new URL(requestUrl).origin;
}

export function GET(request: Request) {
  const installUrl = process.env.STRIPE_INSTALL_URL || process.env.NEXT_PUBLIC_STRIPE_INSTALL_URL;
  if (installUrl) {
    return NextResponse.redirect(installUrl, { status: 302 });
  }

  const linkId = process.env.STRIPE_CONNECT_LINK_ID || DEFAULT_CONNECT_LINK_ID;
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || DEFAULT_CLIENT_ID;
  const callbackPath = process.env.STRIPE_CONNECT_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
  const redirectUri = new URL(callbackPath, getAppOrigin(request.url));

  const url = new URL(`/oauth/v2/${linkId}/authorize`, 'https://marketplace.stripe.com');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri.toString());

  return NextResponse.redirect(url.toString(), { status: 302 });
}
