import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '');
  const normalizedEmail = email.trim().toLowerCase();
  const next = getSafeNext(String(formData.get('next') || ''));

  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (!normalizedEmail) {
    redirectToLogin.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  try {
    const supabase = await createClient();
    const confirmUrl = new URL('/auth/confirm', request.nextUrl.origin);
    confirmUrl.searchParams.set('next', next);

    console.log('[magic-link] input:', { email: normalizedEmail });

    const { data: anyActiveRow, error: anyActiveErr } = await supabase
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[magic-link] ANY ACTIVE:', {
      ok: !anyActiveErr,
      anyActiveErrMessage: anyActiveErr?.message ?? null,
      userRowPresent: !!anyActiveRow,
      userRow: anyActiveRow
        ? {
            id: anyActiveRow.id,
            email: anyActiveRow.email,
            is_active: anyActiveRow.is_active,
            org_id: anyActiveRow.org_id ?? null,
            auth_user_id: anyActiveRow.auth_user_id ?? null,
          }
        : null,
    });

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .not('org_id', 'is', null)
      .maybeSingle();

    if (userErr) {
      console.log('[magic-link] FINAL validation query failed:', {
        message: userErr.message,
        details: userErr.details ?? null,
        hint: userErr.hint ?? null,
      });
      throw userErr;
    }

    console.log('[magic-link] FINAL validation:', {
      operatorAllowed: !!userRow,
      userRow: userRow
        ? {
            id: userRow.id,
            email: userRow.email,
            is_active: userRow.is_active,
            org_id: userRow.org_id ?? null,
            auth_user_id: userRow.auth_user_id ?? null,
          }
        : null,
    });

    if (!userRow) {
      console.log('[magic-link] BLOCKED BEFORE OTP');
      redirectToLogin.searchParams.set('error', 'send-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: false,
      },
    });

    console.log('[magic-link] OTP RESULT:', {
      email: normalizedEmail,
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
