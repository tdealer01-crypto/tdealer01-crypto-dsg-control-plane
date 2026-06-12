import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_CALLBACK_PATH = '/stripe/oauth/callback';
const STATE_COOKIE = 'dsg_stripe_connect_state';
const MODE_COOKIE = 'dsg_stripe_connect_mode';
const USER_COOKIE = 'dsg_stripe_connect_user_id';
const STATE_MAX_AGE_SECONDS = 10 * 60;

type InstallMode = 'live' | 'sandbox';

function getAppOrigin(requestUrl: string) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  return new URL(requestUrl).origin;
}

function resolveMode(request: NextRequest): InstallMode {
  return request.nextUrl.searchParams.get('mode') === 'sandbox' ? 'sandbox' : 'live';
}

function resolveClientId(mode: InstallMode) {
  if (mode === 'sandbox') {
    return (
      process.env.NEXT_PUBLIC_STRIPE_SANDBOX_CLIENT_ID ||
      process.env.STRIPE_SANDBOX_CONNECT_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID ||
      process.env.STRIPE_CONNECT_CLIENT_ID
    );
  }

  return process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID || process.env.STRIPE_CONNECT_CLIENT_ID;
}

function resolveConfiguredInstallUrl(mode: InstallMode) {
  if (mode === 'sandbox') {
    return (
      process.env.STRIPE_SANDBOX_INSTALL_URL ||
      process.env.NEXT_PUBLIC_STRIPE_SANDBOX_INSTALL_URL ||
      process.env.STRIPE_EXTERNAL_TEST_URL ||
      // Current Stripe External Test URL used for QA. Keep env vars above as the primary override.
      'https://marketplace.stripe.com/oauth/v2/chnlink_61UpJ0wqNe8NQ3pYF41AZNzhgTUPV4R6/authorize?client_id=ca_UfEPAC4NcvG2nYAYjohDQ9GtDlIdajy6'
    );
  }

  return process.env.STRIPE_LIVE_INSTALL_URL || process.env.NEXT_PUBLIC_STRIPE_LIVE_INSTALL_URL || null;
}

function buildAuthorizeUrl({
  mode,
  clientId,
  redirectUri,
  state,
}: {
  mode: InstallMode;
  clientId: string;
  redirectUri: URL;
  state: string;
}) {
  const configuredUrl = resolveConfiguredInstallUrl(mode);
  const url = configuredUrl
    ? new URL(configuredUrl)
    : new URL('/oauth/v2/authorize', 'https://marketplace.stripe.com');

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri.toString());
  url.searchParams.set('state', state);

  return url;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', '/dashboard/stripe-app');
    return NextResponse.redirect(loginUrl.toString(), { status: 302 });
  }

  const mode = resolveMode(request);
  const clientId = resolveClientId(mode);

  if (!clientId) {
    return NextResponse.json(
      { error: `${mode === 'sandbox' ? 'Sandbox' : 'Live'} Stripe client_id is not configured` },
      { status: 503 },
    );
  }

  const callbackPath = process.env.STRIPE_CONNECT_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
  const redirectUri = new URL(callbackPath, getAppOrigin(request.url));
  const state = crypto.randomUUID();
  const authorizeUrl = buildAuthorizeUrl({ mode, clientId, redirectUri, state });

  const response = NextResponse.redirect(authorizeUrl.toString(), { status: 302 });
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: STATE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure,
  });
  response.cookies.set(MODE_COOKIE, mode, {
    httpOnly: true,
    maxAge: STATE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure,
  });
  response.cookies.set(USER_COOKIE, user.id, {
    httpOnly: true,
    maxAge: STATE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure,
  });

  return response;
}
