import { createHmac, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError } from '@/lib/security/api-error';
import { buildStripeInstallUrl, resolveStripeInstallMode } from '@/lib/stripe-app/install-url';
import { resolveStripeClientId, resolveStripeConfiguredInstallUrl, type StripeInstallMode } from '@/lib/stripe-app/oauth-config';

const DEFAULT_CALLBACK_PATH = '/stripe/oauth/callback';
const STATE_COOKIE = 'dsg_stripe_connect_state';
const MODE_COOKIE = 'dsg_stripe_connect_mode';
const USER_COOKIE = 'dsg_stripe_connect_user_id';
const STATE_MAX_AGE_SECONDS = 30 * 60;
type StripeStatePayload = {
  nonce: string;
  mode: StripeInstallMode;
  userId: string;
  iat: number;
};

function getStateSecret() {
  const secret = process.env.STRIPE_CONNECT_STATE_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error('STRIPE_CONNECT_STATE_SECRET is not configured');
  return secret;
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

  let mode: StripeInstallMode;
  try {
    mode = resolveStripeInstallMode(request.nextUrl.searchParams.get('mode'));
  } catch (error) {
    logApiError('api/stripe/connect/install', error);
    return NextResponse.json(
      { error: 'Invalid Stripe install mode' },
      { status: 400 },
    );
  }
  const clientId = resolveStripeClientId(mode) ?? null;
  const callbackPath = process.env.STRIPE_CONNECT_CALLBACK_PATH || DEFAULT_CALLBACK_PATH;
  const redirectUri = new URL(callbackPath, getAppOrigin(request.url));
  let state: string;
  try {
    state = signState({
      nonce: randomUUID(),
      mode,
      userId: user.id,
      iat: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    logApiError('api/stripe/connect/install', error);
    return NextResponse.json(
      { error: 'Stripe OAuth state is not configured' },
      { status: 503 },
    );
  }

  let authorizeUrl: URL;
  try {
    authorizeUrl = buildStripeInstallUrl({
      mode,
      configuredUrl: resolveStripeConfiguredInstallUrl(mode),
      clientId: clientId ?? undefined,
      redirectUri: redirectUri.toString(),
      state,
    });
  } catch (error) {
    logApiError('api/stripe/connect/install', error);
    return NextResponse.json(
      { error: 'Stripe OAuth link is not configured' },
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
