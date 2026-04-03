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

    console.log('[magic-link] input received');

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', email)
      .eq('is_active', true)
      .not('org_id', 'is', null)
      .maybeSingle();

    if (userErr) {
      console.error('[magic-link] operator validation query failed:', userErr.message);
      throw userErr;
    }

    console.log('[magic-link] operator validation:', { allowed: !!userRow });

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
        shouldCreateUser: true,
      },
    });

    console.log('[magic-link] OTP result:', { ok: !error });

    if (error) {
      console.log('[magic-link] OTP send failed after operator validation');
      redirectToLogin.searchParams.set('error', 'send-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    redirectToLogin.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  } catch (err) {
    console.error('[magic-link] failed:', err instanceof Error ? err.message : 'unknown-error');
    redirectToLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }
}
