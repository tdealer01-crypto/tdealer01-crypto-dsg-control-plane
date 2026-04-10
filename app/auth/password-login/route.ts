import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
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

    return NextResponse.redirect(new URL(next, request.url), { status: 302 });
  } catch {
    redirectToPasswordLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToPasswordLogin, { status: 302 });
  }
}
