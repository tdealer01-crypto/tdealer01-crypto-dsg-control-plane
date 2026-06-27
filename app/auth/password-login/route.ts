import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getSafeNext } from '../../../lib/auth/safe-next';
import { applyRateLimit, getRateLimitKey } from '../../../lib/security/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'password-login'),
    limit: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    const redirectUrl = new URL('/password-login', request.url);
    redirectUrl.searchParams.set('error', 'too-many-attempts');
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = getSafeNext(String(formData.get('next') || '/dashboard'));

  const redirectToPasswordLogin = new URL('/password-login', request.url);
  redirectToPasswordLogin.searchParams.set('next', next);

  if (!email) {
    redirectToPasswordLogin.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToPasswordLogin, { status: 302 });
  }

  if (!password) {
    redirectToPasswordLogin.searchParams.set('error', 'missing-password');
    return NextResponse.redirect(redirectToPasswordLogin, { status: 302 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirectToPasswordLogin.searchParams.set('error', 'invalid-credentials');
      return NextResponse.redirect(redirectToPasswordLogin, { status: 302 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id && user.email) {
      const admin = getSupabaseAdmin();
      const { data: provisionResult, error: provisionError } = await (admin as any).rpc('dsg_provision_user_access', {
        p_auth_user_id: user.id,
        p_email: user.email,
      });

      if (provisionError) {
        console.error('[password-login] access provisioning failed:', provisionError);
        redirectToPasswordLogin.searchParams.set('error', 'provision-failed');
        return NextResponse.redirect(redirectToPasswordLogin, { status: 302 });
      }

      if (provisionResult?.ok === false && provisionResult?.reason !== 'NO_ACTIVE_INVITE') {
        console.warn('[password-login] access provisioning returned non-ok:', provisionResult);
      }
    }

    return NextResponse.redirect(new URL(next, request.url), { status: 302 });
  } catch {
    redirectToPasswordLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToPasswordLogin, { status: 302 });
  }
}
