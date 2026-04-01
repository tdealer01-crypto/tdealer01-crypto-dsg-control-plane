import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { resolveLoginContext } from '../../../lib/auth/login-context';
import { resolveAccessModeForEmail } from '../../../lib/auth/access-policy';

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
  const workspaceName = String(formData.get('workspace_name') || '').trim();
  const fullName = String(formData.get('full_name') || '').trim();
  const next = getSafeNext(String(formData.get('next') || ''));
  const orgSlug = String(formData.get('org') || '').trim();

  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (orgSlug) redirectToLogin.searchParams.set('org', orgSlug);

  if (!email) {
    redirectToLogin.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  try {
    const authClient = await createClient();
    const admin = getSupabaseAdmin();

    const loginContext = await resolveLoginContext({ email, orgSlug: orgSlug || undefined });
    if (loginContext.org?.slug) {
      redirectToLogin.searchParams.set('org', loginContext.org.slug);
    }

    if (loginContext.mode === 'sso-only') {
      redirectToLogin.searchParams.set('error', 'sso-required');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    if (loginContext.mode === 'approval-required') {
      const requestAccess = new URL('/request-access', request.url);
      requestAccess.searchParams.set('email', email);
      if (workspaceName) requestAccess.searchParams.set('workspace_name', workspaceName);
      return NextResponse.redirect(requestAccess, { status: 302 });
    }

    const { data: operatorRow, error: operatorErr } = await admin
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', email)
      .eq('is_active', true)
      .not('org_id', 'is', null)
      .maybeSingle();

    if (operatorErr) {
      throw operatorErr;
    }

    if (operatorRow) {
      const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(request));
      confirmUrl.searchParams.set('next', next);

      const { error } = await authClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: confirmUrl.toString(),
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('[auth-continue] operator send failed:', error);
        redirectToLogin.searchParams.set('error', 'send-failed');
        return NextResponse.redirect(redirectToLogin, { status: 302 });
      }

      redirectToLogin.searchParams.set('message', 'check-email');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    if (orgSlug && loginContext.mode === 'sso-first') {
      redirectToLogin.searchParams.set('error', 'org-self-serve-disabled');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    const accessMode = resolveAccessModeForEmail(email);
    if (accessMode === 'invite_only' || accessMode === 'scim_managed') {
      redirectToLogin.searchParams.set('error', 'not-allowed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    if (accessMode === 'approved_domains_require_approval') {
      const requestAccess = new URL('/request-access', request.url);
      requestAccess.searchParams.set('email', email);
      if (workspaceName) requestAccess.searchParams.set('workspace_name', workspaceName);
      return NextResponse.redirect(requestAccess, { status: 302 });
    }

    if (accessMode === 'sso_required') {
      redirectToLogin.searchParams.set('error', 'sso-required');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    if (!workspaceName) {
      redirectToLogin.searchParams.set('error', 'missing-workspace');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    const { data: existingPending, error: existingPendingError } = await admin
      .from('trial_signups')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPendingError) {
      throw existingPendingError;
    }

    if (existingPending?.id) {
      const { error: updateErr } = await admin
        .from('trial_signups')
        .update({
          workspace_name: workspaceName,
          full_name: fullName || null,
        })
        .eq('id', existingPending.id);

      if (updateErr) {
        throw updateErr;
      }
    } else {
      const { error: insertErr } = await admin.from('trial_signups').insert({
        email,
        workspace_name: workspaceName,
        full_name: fullName || null,
        status: 'pending',
      });

      if (insertErr) {
        throw insertErr;
      }
    }

    const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(request));
    confirmUrl.searchParams.set('next', '/quickstart');
    confirmUrl.searchParams.set('signup', 'trial');

    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[auth-continue] trial send failed:', error);
      redirectToLogin.searchParams.set('error', 'signup-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    redirectToLogin.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  } catch (err) {
    console.error('[auth-continue] failed:', err);
    redirectToLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }
}
