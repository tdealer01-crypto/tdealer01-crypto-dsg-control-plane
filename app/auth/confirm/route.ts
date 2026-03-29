import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/workspace';
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = getSafeNext(searchParams.get('next'));

  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (!tokenHash || !type) {
    redirectToLogin.searchParams.set('error', 'invalid-link');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    redirectToLogin.searchParams.set('error', 'invalid-link');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    redirectToLogin.searchParams.set('error', 'invalid-link');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const admin = getSupabaseAdmin();

  await admin
    .from('users')
    .update({ auth_user_id: user.id })
    .eq('email', user.email)
    .is('auth_user_id', null);

  const { data: profile } = await admin
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const redirectTo = new URL(next, request.url);
  return NextResponse.redirect(redirectTo, { status: 302 });
}
