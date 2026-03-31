import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

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
    const authClient = await createClient();
    const admin = getSupabaseAdmin();
    const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(request));
    confirmUrl.searchParams.set('next', next);

    console.log('[magic-link] input:', { email });

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', email)
      .eq('is_active', true)
      .not('org_id', 'is', null)
      .maybeSingle();

    if (userErr) {
      console.log('[magic-link] operator validation query failed:', {
        message: userErr.message,
        details: userErr.details ?? null,
        hint: userErr.hint ?? null,
      });
      throw userErr;
    }

    console.log('[magic-link] operator validation:', {
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
      console.log('[magic-link] BLOCKED BEFORE OTP: not provisioned/active');
      redirectToLogin.searchParams.set('error', 'not-allowed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    console.log('[magic-link] calling signInWithOtp...');

    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: false,
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
      console.log('[magic-link] OTP send failed after operator validation');
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
