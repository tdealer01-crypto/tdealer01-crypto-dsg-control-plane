import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/workspace';
  return value;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const next = getSafeNext(String(formData.get('next') || ''));

  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (!email) {
    redirectToLogin.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  try {
    const supabase = await createClient();
    const confirmUrl = new URL('/auth/confirm', request.nextUrl.origin);
    confirmUrl.searchParams.set('next', next);

    console.log('[magic-link] input:', { email });
    console.log('[magic-link] calling signInWithOtp (self-serve enabled)...');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: true,
      },
    });

    console.log('[magic-link] OTP RESULT:', {
      email,
      ok: !error,
      message: error?.message ?? null,
      status: error?.status ?? null,
      code: error?.code ?? null,
    });

    if (error) {
      redirectToLogin.searchParams.set('error', 'send-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    redirectToLogin.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  } catch (err) {
    console.log('[magic-link] CRASH:', err);
    redirectToLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }
}
