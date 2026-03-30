import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/workspace';
  return value;
}

function buildOrgId() {
  return `org_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function buildOrgName(email: string) {
  const localPart = email.split('@')[0] || 'dsg';
  return `${localPart}-org`;
}

function buildOrgSlug(email: string) {
  const localPart = (email.split('@')[0] || 'dsg')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${localPart || 'dsg'}-${randomUUID().slice(0, 8)}`;
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

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    redirectToLogin.searchParams.set('error', 'server-misconfigured');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const { data: existingProfile } = await admin
    .from('users')
    .select('id, org_id, is_active, auth_user_id')
    .eq('email', user.email)
    .maybeSingle();

  if (existingProfile?.id) {
    let orgId = existingProfile.org_id || null;
    if (!orgId) {
      orgId = buildOrgId();
      const orgName = buildOrgName(user.email);
      const orgSlug = buildOrgSlug(user.email);
      const { error: orgError } = await admin.from('organizations').insert({
        id: orgId,
        name: orgName,
        slug: orgSlug,
        plan: 'trial',
        status: 'active',
      });
      if (orgError) {
        redirectToLogin.searchParams.set('error', 'self-serve-failed');
        return NextResponse.redirect(redirectToLogin, { status: 302 });
      }
    }

    await admin
      .from('users')
      .update({
        auth_user_id: existingProfile.auth_user_id || user.id,
        org_id: orgId,
        is_active: true,
      })
      .eq('id', existingProfile.id);
  } else {
    const orgId = buildOrgId();
    const orgName = buildOrgName(user.email);
    const orgSlug = buildOrgSlug(user.email);

    const { error: orgError } = await admin.from('organizations').insert({
      id: orgId,
      name: orgName,
      slug: orgSlug,
      plan: 'trial',
      status: 'active',
    });

    if (orgError) {
      redirectToLogin.searchParams.set('error', 'self-serve-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    const { error: userError } = await admin.from('users').insert({
      auth_user_id: user.id,
      org_id: orgId,
      email: user.email,
      role: 'owner',
      auth_provider: 'magic_link',
      is_active: true,
    });

    if (userError) {
      redirectToLogin.searchParams.set('error', 'self-serve-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }
  }

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
