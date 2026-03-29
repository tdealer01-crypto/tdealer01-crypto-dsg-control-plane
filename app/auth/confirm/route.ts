import { randomUUID } from 'crypto';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const TRIAL_DAYS = 14;

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

function slugifyWorkspace(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);

  const fallback = `workspace-${randomUUID().slice(0, 8)}`;
  const normalized = base || fallback;
  return `${normalized}-${randomUUID().slice(0, 6)}`;
}

async function findProvisionedUser(admin: ReturnType<typeof getSupabaseAdmin>, userId: string, email: string) {
  const { data: byAuth, error: byAuthError } = await admin
    .from('users')
    .select('id, auth_user_id, email, org_id, is_active')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (byAuthError) {
    throw byAuthError;
  }

  if (byAuth) {
    return byAuth;
  }

  const { data: byEmail, error: byEmailError } = await admin
    .from('users')
    .select('id, auth_user_id, email, org_id, is_active')
    .eq('email', email)
    .maybeSingle();

  if (byEmailError) {
    throw byEmailError;
  }

  return byEmail;
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

  const normalizedEmail = user.email.trim().toLowerCase();
  const admin = getSupabaseAdmin();

  const existingUser = await findProvisionedUser(admin, user.id, normalizedEmail);

  if (existingUser?.id && !existingUser.auth_user_id) {
    await admin.from('users').update({ auth_user_id: user.id }).eq('id', existingUser.id);
  }

  if (existingUser?.org_id && existingUser.is_active) {
    const redirectTo = new URL(next, request.url);
    return NextResponse.redirect(redirectTo, { status: 302 });
  }

  const { data: pendingSignup, error: pendingSignupError } = await admin
    .from('trial_signups')
    .select('id, workspace_name, full_name, status')
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingSignupError) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  if (!pendingSignup) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const orgId = `org_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
  const orgSlug = slugifyWorkspace(String(pendingSignup.workspace_name));

  const { error: orgError } = await admin.from('organizations').insert({
    id: orgId,
    name: pendingSignup.workspace_name,
    slug: orgSlug,
    plan: 'trial',
    status: 'active',
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (orgError) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  if (existingUser?.id) {
    const { error: userUpdateError } = await admin
      .from('users')
      .update({
        auth_user_id: user.id,
        org_id: orgId,
        is_active: true,
        updated_at: nowIso,
      })
      .eq('id', existingUser.id);

    if (userUpdateError) {
      redirectToLogin.searchParams.set('error', 'not-provisioned');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }
  } else {
    const { error: userInsertError } = await admin.from('users').insert({
      auth_user_id: user.id,
      email: normalizedEmail,
      org_id: orgId,
      role: 'owner',
      auth_provider: 'magic_link',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (userInsertError) {
      redirectToLogin.searchParams.set('error', 'not-provisioned');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }
  }

  const { error: billingError } = await admin.from('billing_subscriptions').insert({
    stripe_subscription_id: `trial_${orgId}`,
    stripe_customer_id: null,
    org_id: orgId,
    customer_email: normalizedEmail,
    status: 'active',
    plan_key: 'trial',
    billing_interval: 'trial',
    current_period_start: nowIso,
    current_period_end: trialEnd,
    trial_start: nowIso,
    trial_end: trialEnd,
    metadata: {
      source: 'trial-signup',
      full_name: pendingSignup.full_name,
      signup_id: pendingSignup.id,
    },
    updated_at: nowIso,
  });

  if (billingError) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  await admin
    .from('trial_signups')
    .update({ status: 'completed', completed_at: nowIso })
    .eq('id', pendingSignup.id);

  const redirectToQuickstart = new URL('/quickstart', request.url);
  return NextResponse.redirect(redirectToQuickstart, { status: 302 });
}
