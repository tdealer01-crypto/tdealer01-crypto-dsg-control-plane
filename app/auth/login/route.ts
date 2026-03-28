import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: false,
      },
    });

    if (error) {
      redirectToLogin.searchParams.set('error', 'send-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    redirectToLogin.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  } catch {
    redirectToLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }
}
