import { randomUUID } from 'crypto';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { ensureSeatActivatedForUser } from '../../../lib/billing/seat-activation';
import { bootstrapOrgStarterState } from '../../../lib/onboarding/bootstrap';
import { getSafeNext } from '../../../lib/auth/safe-next';

const TRIAL_DAYS = 14;

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
    .select('id, auth_user_id, email, org_id, is_active, role')
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
    .select('id, auth_user_id, email, org_id, is_active, role')
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
  const signupMode = searchParams.get('signup');

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
    await ensureSeatActivatedForUser({
      orgId: String(existingUser.org_id),
      email: normalizedEmail,
      userId: String(existingUser.id),
      role: existingUser.role || 'viewer',
      source: 'auth_confirm',
    });

    const redirectTo = new URL(next, request.url);
    return NextResponse.redirect(redirectTo, { status: 302 });
  }

  if (signupMode !== 'trial') {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const { data: pendingSignup, error: pendingSignupError } = await admin
    .from('trial_signups')
    .select('id, workspace_name, full_name, status')
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingSignupError || !pendingSignup) {
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

  let provisionedUser: { id: string; role: string | null } | null = null;

  if (existingUser?.id) {
    const { data: updatedUser, error: userUpdateError } = await admin
      .from('users')
      .update({
        auth_user_id: user.id,
        org_id: orgId,
        is_active: true,
        updated_at: nowIso,
      })
      .select('id, role')
      .eq('id', existingUser.id);

    if (userUpdateError) {
      redirectToLogin.searchParams.set('error', 'not-provisioned');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    provisionedUser = updatedUser?.[0] ?? null;
  } else {
    const { data: insertedUser, error: userInsertError } = await admin
      .from('users')
      .insert({
        auth_user_id: user.id,
        email: normalizedEmail,
        org_id: orgId,
        role: 'owner',
        auth_provider: 'magic_link',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id, role')
      .single();

    if (userInsertError) {
      redirectToLogin.searchParams.set('error', 'not-provisioned');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    provisionedUser = insertedUser;
  }

  if (!provisionedUser?.id) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const { error: runtimeRoleError } = await admin
    .from('runtime_roles')
    .upsert(
      [
        { org_id: orgId, user_id: provisionedUser.id, role: 'org_admin' },
        { org_id: orgId, user_id: provisionedUser.id, role: 'operator' },
        { org_id: orgId, user_id: provisionedUser.id, role: 'billing_admin' },
      ],
      { onConflict: 'org_id,user_id,role' }
    );

  if (runtimeRoleError) {
    redirectToLogin.searchParams.set('error', 'not-provisioned');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
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

  await ensureSeatActivatedForUser({
    orgId,
    email: normalizedEmail,
    userId: provisionedUser.id,
    role: provisionedUser.role || existingUser?.role || 'owner',
    source: 'auth_confirm',
  });

  try {
    await bootstrapOrgStarterState(orgId, { initiatedByUserId: user.id });
  } catch (bootstrapError) {
    console.error('[auth-confirm] bootstrap failed:', bootstrapError);
    await admin.from('org_onboarding_states').upsert({
      org_id: orgId,
      bootstrap_status: 'failed',
      checklist: {
        steps: [
          'Create or inspect your first agent',
          'Review a starter policy',
          'Run your first controlled execution',
          'Inspect evidence or audit output',
          'Review quota/billing basics',
        ],
        next_action: 'Set up starter workspace',
      },
      updated_at: nowIso,
    }, { onConflict: 'org_id' });
  }

  const redirectTo = new URL(next || '/quickstart', request.url);
  return NextResponse.redirect(redirectTo, { status: 302 });
}
