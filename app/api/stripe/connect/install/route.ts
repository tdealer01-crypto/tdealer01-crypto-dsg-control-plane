import { createHmac, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_CALLBACK_PATH = '/stripe/oauth/callback';
const STATE_COOKIE = 'dsg_stripe_connect_state';
const MODE_COOKIE = 'dsg_stripe_connect_mode';
const USER_COOKIE = 'dsg_stripe_connect_user_id';
const STATE_MAX_AGE_SECONDS = 30 * 60;
const DEFAULT_STRIPE_INSTALL_URL =
  'https://marketplace.stripe.com/oauth/v2/' +
  'chnlink_61UpJ0wqNe8NQ3pYF41AZNzhgTUPV4R6' +
  '/authorize?client_id=' +
  'ca_UfEPAC4NcvG2nYAYjohDQ9GtDlIdajy6';

type InstallMode = 'live' | 'sandbox';

type StripeStatePayload = {
  nonce: string;
  mode: InstallMode;
  userId: string;
  iat: number;
};

function getStateSecret() {
  return (
    process.env.STRIPE_CONNECT_STATE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dsg-local-state-secret'
  );
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signState(payload: StripeStatePayload) {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', getStateSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

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
      DEFAULT_STRIPE_INSTALL_URL
    );
  }

  return (
    process.env.STRIPE_LIVE_INSTALL_URL ||
    process.env.NEXT_PUBLIC_STRIPE_LIVE_INSTALL_URL ||
    DEFAULT_STRIPE_INSTALL_URL
  );
}

function buildAuthorizeUrl({
  mode,
  clientId,
  redirectUri,
  state,
}: {
  mode: InstallMode;
  clientId: string | null;
  redirectUri: URL;
  state: string;
}) {
  const configuredUrl = resolveConfiguredInstallUrl(mode);
  const url = new URL(configuredUrl);

  if (!url.searchParams.get('client_id')) {
    if (!clientId) throw new Error(`${mode} Stripe client_id is not configured`);
    url.searchParams.set('client_id', clientId);
  }

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
  const clientId = resolveClientId(mode) ?? null;
  const callbackPath = process.env.STRIPE_CONNECT_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
  const redirectUri = new URL(callbackPath, getAppOrigin(request.url));
  const state = signState({
    nonce: randomUUID(),
    mode,
    userId: user.id,
    iat: Math.floor(Date.now() / 1000),
  });

  let authorizeUrl: URL;
  try {
    authorizeUrl = buildAuthorizeUrl({ mode, clientId, redirectUri, state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stripe OAuth link is not configured' },
      { status: 503 },
    );
  }

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
