import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { isStripeInstallMode, resolveStripeSecretKey, type StripeInstallMode } from '@/lib/stripe-app/oauth-config';
import { deauthorizeStripeAccount } from '@/lib/stripe-app/deauthorize';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'dsg_stripe_connect_state';
const MODE_COOKIE = 'dsg_stripe_connect_mode';
const USER_COOKIE = 'dsg_stripe_connect_user_id';
const CONNECTED_COOKIE = 'dsg_stripe_connected';
const CONNECTED_ACCOUNT_COOKIE = 'dsg_stripe_account_id';
const CONNECTED_MODE_COOKIE = 'dsg_stripe_connected_mode';
const CONNECTED_AT_COOKIE = 'dsg_stripe_connected_at';
const CONNECTED_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const STATE_MAX_AGE_SECONDS = 30 * 60;

type SignedState = {
  nonce?: string;
  mode?: string;
  userId?: string;
  iat?: number;
};

function getStateSecret() {
  return process.env.STRIPE_CONNECT_STATE_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || null;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySignedState(state: string): SignedState | null {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) return null;

  const secret = getStateSecret();
  if (!secret) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!safeCompare(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedState;
    const issuedAt = typeof payload.iat === 'number' ? payload.iat : 0;
    const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;

    if (ageSeconds < 0 || ageSeconds > STATE_MAX_AGE_SECONDS) return null;
    if (!isStripeInstallMode(payload.mode)) return null;
    if (typeof payload.nonce !== 'string' || payload.nonce.length < 16) return null;
    if (typeof payload.userId !== 'string' || payload.userId.length === 0) return null;

    return payload;
  } catch {
    return null;
  }
}

function jsonWithConnectionCookies(
  body: Record<string, unknown>,
  status: number,
  connection?: { accountId: string; mode: StripeInstallMode; connectedAt: string },
) {
  const response = NextResponse.json(body, { status });

  if (connection) {
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set(CONNECTED_COOKIE, 'true', {
      httpOnly: true,
      maxAge: CONNECTED_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure,
    });
    response.cookies.set(CONNECTED_ACCOUNT_COOKIE, connection.accountId, {
      httpOnly: true,
      maxAge: CONNECTED_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure,
    });
    response.cookies.set(CONNECTED_MODE_COOKIE, connection.mode, {
      httpOnly: true,
      maxAge: CONNECTED_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure,
    });
    response.cookies.set(CONNECTED_AT_COOKIE, connection.connectedAt, {
      httpOnly: true,
      maxAge: CONNECTED_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure,
    });

    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(MODE_COOKIE);
    response.cookies.delete(USER_COOKIE);
  }

  return response;
}

async function resolveOrgId(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  try {
    const { data } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            limit: (count: number) => Promise<{ data: Array<{ org_id?: string; organization_id?: string }> | null; error: { message: string } | null }>;
          };
        };
      };
    })
      .from('org_members')
      .select('org_id, organization_id')
      .eq('user_id', userId)
      .limit(1);

    const membership = data?.[0];
    return membership?.org_id || membership?.organization_id || null;
  } catch (error) {
    console.error('[stripe-app/oauth/callback] Could not resolve org membership:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body as { code?: string; state?: string };

    if (!code) {
      return NextResponse.json({ message: 'Missing authorization code' }, { status: 400 });
    }

    if (!state) {
      console.warn('[stripe-app/oauth/callback] Rejecting request: missing state parameter');
      return NextResponse.json({ message: 'Missing state parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const expectedState = cookieStore.get(STATE_COOKIE)?.value;
    const installMode = cookieStore.get(MODE_COOKIE)?.value;
    const installUserId = cookieStore.get(USER_COOKIE)?.value;
    const signedState = verifySignedState(state);

    if (!signedState || !expectedState || !safeCompare(expectedState, state)) {
      console.warn('[stripe-app/oauth/callback] Rejecting request: invalid, expired, or mismatched state');
      return NextResponse.json({ message: 'Invalid state parameter' }, { status: 400 });
    }

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user || user.id !== signedState.userId || installUserId !== signedState.userId) {
      console.warn('[stripe-app/oauth/callback] Rejecting request: OAuth state user mismatch');
      return NextResponse.json({ message: 'Invalid state user' }, { status: 403 });
    }

    const userId = user.id;
    if (!isStripeInstallMode(signedState.mode) || installMode !== signedState.mode) {
      return NextResponse.json({ message: 'Invalid install mode state' }, { status: 400 });
    }
    const mode = signedState.mode;

    console.info('[stripe-app/oauth/callback] State accepted for mode:', mode);

    const stripeSecretKey = resolveStripeSecretKey(mode);
    if (!stripeSecretKey) {
      return NextResponse.json({ message: 'Stripe not configured' }, { status: 503 });
    }

    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      stripe_user_id?: string;
      scope?: string;
      token_type?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || tokenData.error) {
      return NextResponse.json(
        { message: tokenData.error_description || 'Token exchange failed' },
        { status: 400 },
      );
    }

    const stripeAccountId = tokenData.stripe_user_id;
    if (!stripeAccountId) {
      return NextResponse.json({ message: 'No Stripe account ID in response' }, { status: 400 });
    }

    const connectedAt = new Date().toISOString();
    let persisted = false;
    let persistError: string | null = null;

    try {
      const supabase = getSupabaseAdmin();
      const dsgOrgId = await resolveOrgId(userId);
      if (!dsgOrgId) {
        return NextResponse.json({ message: 'No DSG organization membership found' }, { status: 403 });
      }
      const { error: upsertError } = await (supabase as unknown as {
        from: (table: string) => {
          upsert: (
            data: Record<string, unknown>,
            opts: { onConflict: string }
          ) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from('stripe_app_accounts')
        .upsert(
          {
            stripe_account_id: stripeAccountId,
            dsg_org_id: dsgOrgId,
            status: 'active',
            installed_at: connectedAt,
            updated_at: connectedAt,
            metadata: {
              scope: tokenData.scope ?? null,
              install_source: 'oauth_callback',
              install_mode: mode,
              linked_user_id: userId ?? null,
              dashboard_sync: true,
              state_verified: true,
            },
            disconnected_at: null,
            disconnect_reason: null,
            last_lifecycle_event_id: null,
          },
          { onConflict: 'stripe_account_id' },
        );

      if (upsertError) {
        persistError = upsertError.message;
        console.error('[stripe-app/oauth/callback] Supabase upsert error:', upsertError.message);
      } else {
        persisted = true;
      }
    } catch (dbErr) {
      persistError = dbErr instanceof Error ? dbErr.message : 'Unknown DB error';
      console.error('[stripe-app/oauth/callback] DB error:', dbErr);
    }

    if (!persisted) {
      let compensationSucceeded = false;
      try {
        await deauthorizeStripeAccount(mode, stripeAccountId);
        compensationSucceeded = true;
      } catch (compensationError) {
        console.error('[stripe-app/oauth/callback] Failed to compensate unpersisted OAuth connection:', compensationError);
      }
      return NextResponse.json(
        {
          message: 'Stripe connection could not be persisted',
          persist_error: persistError,
          stripe_access_revoked: compensationSucceeded,
        },
        { status: 503 },
      );
    }

    return jsonWithConnectionCookies(
      {
        success: true,
        account_id: stripeAccountId,
        mode,
        connected_at: connectedAt,
        persisted,
        persist_error: persistError,
      },
      200,
      { accountId: stripeAccountId, mode, connectedAt },
    );
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
