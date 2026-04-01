import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { resolveAccessPolicyForEmail } from '../../../lib/auth/access-policy';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

function getTrustedAppOrigin(request: NextRequest) {
  const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const appUrl = process.env.APP_URL;
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl && publicAppUrl && appUrl !== publicAppUrl) {
    console.warn('[auth-continue] APP_URL and NEXT_PUBLIC_APP_URL differ. Ensure Supabase Site URL / Redirect URLs match the active origin.', {
      APP_URL: appUrl,
      NEXT_PUBLIC_APP_URL: publicAppUrl,
    });
  }

  if (!configuredAppUrl) {
    console.warn('[auth-continue] APP_URL is not configured. Using request origin; verify Supabase Site URL / Redirect URLs include this origin.', {
      origin: request.nextUrl.origin,
    });
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

async function upsertTrialSignup(email: string, workspaceName: string, fullName: string) {
  const admin = getSupabaseAdmin();

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

    return;
  }

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

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const emailInput = String(formData.get('email') || '');
  const workspaceName = String(formData.get('workspace_name') || '').trim();
  const fullName = String(formData.get('full_name') || '').trim();
  const next = getSafeNext(String(formData.get('next') || ''));

  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (!String(emailInput || '').trim()) {
    redirectToLogin.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(String(emailInput).trim())) {
    redirectToLogin.searchParams.set('error', 'invalid-email');
    return NextResponse.redirect(redirectToLogin, { status: 302 });
  }

  try {
    const authClient = await createClient();
    const policy = await resolveAccessPolicyForEmail(emailInput);

    if (policy.isExistingOperatorMember) {
      const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(request));
      confirmUrl.searchParams.set('next', next);

      const { error } = await authClient.auth.signInWithOtp({
        email: policy.email,
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

    if (policy.accessMode === 'approved_domains_require_approval') {
      redirectToLogin.searchParams.set('error', 'approval-required');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    if (policy.accessMode === 'sso_required') {
      redirectToLogin.searchParams.set('error', 'sso-required');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    if (policy.accessMode === 'invite_only' || policy.accessMode === 'scim_managed') {
      redirectToLogin.searchParams.set('error', 'not-allowed');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    // Batch 1 behavior:
    // - self_serve_trial => trial signup flow
    // - approved_domains_auto_join => same as trial for now, with policy preserved for logs/future divergence
    if (!workspaceName) {
      redirectToLogin.searchParams.set('error', 'missing-workspace');
      return NextResponse.redirect(redirectToLogin, { status: 302 });
    }

    await upsertTrialSignup(policy.email, workspaceName, fullName);

    const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(request));
    confirmUrl.searchParams.set('next', '/quickstart');
    confirmUrl.searchParams.set('signup', 'trial');

    if (policy.accessMode === 'approved_domains_auto_join') {
      console.info('[auth-continue] approved domain auto-join fallback to trial path (batch1)', {
        email: policy.email,
        domain: policy.domain,
      });
    }

    const { error } = await authClient.auth.signInWithOtp({
      email: policy.email,
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
