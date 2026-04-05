import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';
import { getSafeNext } from '../../../lib/auth/safe-next';
import { validateAuthConfig } from '../../../lib/auth/preflight';

const AUTH_LOGIN_RATE_LIMIT = 8;
const AUTH_LOGIN_RATE_WINDOW_MS = 60 * 1000;

function getTrustedAppOrigin(request: NextRequest) {
  const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!configuredAppUrl) {
    return request.nextUrl.origin;
  }

  try {
    const parsed = new URL(configuredAppUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {}

  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'auth-login'),
    limit: AUTH_LOGIN_RATE_LIMIT,
    windowMs: AUTH_LOGIN_RATE_WINDOW_MS,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit, AUTH_LOGIN_RATE_LIMIT);

  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const next = getSafeNext(String(formData.get('next') || ''));

  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (!email) {
    redirectToLogin.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
  }

  if (!rateLimit.allowed) {
    redirectToLogin.searchParams.set('error', 'rate-limited');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
  }

  const preflight = validateAuthConfig();
  if (preflight.warnings.length) {
    console.warn('[magic-link] preflight warnings:', preflight.warnings);
  }

  if (!preflight.ok) {
    const firstError = preflight.errors[0];
    console.error('[magic-link] preflight failed:', preflight.errors);
    redirectToLogin.searchParams.set('error', firstError ? firstError.code : 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
  }

  try {
    const authClient = await createClient();
    const admin = getSupabaseAdmin();
    const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(request));
    confirmUrl.searchParams.set('next', next);

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', email)
      .eq('is_active', true)
      .not('org_id', 'is', null)
      .maybeSingle();

    if (userErr) {
      console.error('[magic-link] operator validation query failed');
      throw userErr;
    }

    if (!userRow) {
      redirectToLogin.searchParams.set('error', 'not-allowed');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
    }

    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      redirectToLogin.searchParams.set('error', 'send-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
    }

    redirectToLogin.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
  } catch {
    console.error('[magic-link] failed');
    redirectToLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: rateLimitHeaders });
  }
}
