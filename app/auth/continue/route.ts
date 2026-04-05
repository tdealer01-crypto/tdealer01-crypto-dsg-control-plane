import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getResend } from '../../../lib/resend';
import { resolveLoginContext } from '../../../lib/auth/login-context';
import { resolveAccessModeForEmail } from '../../../lib/auth/access-policy';
import { logSignInEvent } from '../../../lib/auth/sign-in-events';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';
import { getSafeNext } from '../../../lib/auth/safe-next';
import { validateAuthConfig } from '../../../lib/auth/preflight';

const AUTH_CONTINUE_RATE_LIMIT = 8;
const AUTH_CONTINUE_RATE_WINDOW_MS = 60 * 1000;
const AUTH_CONTINUE_EMAIL_RATE_LIMIT = 3;
const AUTH_CONTINUE_EMAIL_RATE_WINDOW_MS = 60 * 1000;

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

async function sendMagicLink(
  authClient: Awaited<ReturnType<typeof createClient>>,
  email: string,
  redirectUrl: string,
  context: 'login' | 'trial',
): Promise<{ error: { message: string } | null }> {
  const resend = getResend();

  // Always create the OTP via Supabase (generates the magic link)
  const { data, error } = await authClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error };
  }

  // If Resend is configured, we rely on Supabase's OTP but could send
  // a branded email. However, Supabase already sends the email with the
  // magic link when signInWithOtp is called. Resend integration is useful
  // when Supabase email is disabled and a custom SMTP/API is preferred.
  // For now, log that Resend is available for future custom email templates.
  if (resend.configured) {
    console.info('[auth-continue] Resend is configured — Supabase OTP email sent.');
  }

  return { error: null };
}

export async function POST(request: NextRequest) {
  const ipRateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'auth-continue'),
    limit: AUTH_CONTINUE_RATE_LIMIT,
    windowMs: AUTH_CONTINUE_RATE_WINDOW_MS,
  });
  const ipRateLimitHeaders = buildRateLimitHeaders(ipRateLimit, AUTH_CONTINUE_RATE_LIMIT);

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
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: ipRateLimitHeaders });
  }

  if (!ipRateLimit.allowed) {
    redirectToLogin.searchParams.set('error', 'rate-limited');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: ipRateLimitHeaders });
  }

  const emailRateLimit = await applyRateLimit({
    key: `auth-continue-email:${email}`,
    limit: AUTH_CONTINUE_EMAIL_RATE_LIMIT,
    windowMs: AUTH_CONTINUE_EMAIL_RATE_WINDOW_MS,
  });
  const emailRateLimitHeaders = buildRateLimitHeaders(emailRateLimit, AUTH_CONTINUE_EMAIL_RATE_LIMIT);

  if (!emailRateLimit.allowed) {
    redirectToLogin.searchParams.set('error', 'rate-limited');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
  }

  const preflight = validateAuthConfig();
  if (preflight.warnings.length) {
    console.warn('[auth-continue] preflight warnings:', preflight.warnings);
  }

  if (!preflight.ok) {
    const firstError = preflight.errors[0];
    console.error('[auth-continue] preflight failed:', preflight.errors);
    redirectToLogin.searchParams.set('error', firstError ? firstError.code : 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
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
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
    }

    if (loginContext.mode === 'approval-required') {
      const requestAccess = new URL('/request-access', request.url);
      requestAccess.searchParams.set('email', email);
      if (workspaceName) requestAccess.searchParams.set('workspace_name', workspaceName);
      return NextResponse.redirect(requestAccess, { status: 302, headers: emailRateLimitHeaders });
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

      const { error } = await sendMagicLink(authClient, email, confirmUrl.toString(), 'login');

      if (error) {
        console.error('[auth-continue] operator send failed:', error);
        await logSignInEvent({
          email,
          orgId: operatorRow.org_id,
          authUserId: operatorRow.auth_user_id,
          eventType: 'magic_link_requested',
          source: 'auth-continue',
          success: false,
          metadata: { mode: 'operator', next },
        }).catch(() => null);
        redirectToLogin.searchParams.set('error', 'send-failed');
        return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
      }

      await logSignInEvent({
        email,
        orgId: operatorRow.org_id,
        authUserId: operatorRow.auth_user_id,
        eventType: 'magic_link_requested',
        source: 'auth-continue',
        success: true,
        metadata: { mode: 'operator', next },
      }).catch(() => null);

      redirectToLogin.searchParams.set('message', 'check-email');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
    }

    if (orgSlug && loginContext.mode === 'sso-first') {
      redirectToLogin.searchParams.set('error', 'org-self-serve-disabled');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
    }

    const accessMode = resolveAccessModeForEmail(email);
    if (accessMode === 'invite_only' || accessMode === 'scim_managed') {
      redirectToLogin.searchParams.set('error', 'not-allowed');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
    }

    if (accessMode === 'approved_domains_require_approval') {
      const requestAccess = new URL('/request-access', request.url);
      requestAccess.searchParams.set('email', email);
      if (workspaceName) requestAccess.searchParams.set('workspace_name', workspaceName);
      return NextResponse.redirect(requestAccess, { status: 302, headers: emailRateLimitHeaders });
    }

    if (accessMode === 'sso_required') {
      redirectToLogin.searchParams.set('error', 'sso-required');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
    }

    if (!workspaceName) {
      redirectToLogin.searchParams.set('error', 'missing-workspace');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
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

    const { error } = await sendMagicLink(authClient, email, confirmUrl.toString(), 'trial');

    if (error) {
      console.error('[auth-continue] trial send failed:', error);
      await logSignInEvent({
        email,
        eventType: 'magic_link_requested',
        source: 'auth-continue',
        success: false,
        metadata: { mode: 'trial', workspace_name: workspaceName },
      }).catch(() => null);
      redirectToLogin.searchParams.set('error', 'signup-failed');
      return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
    }

    await logSignInEvent({
      email,
      eventType: 'magic_link_requested',
      source: 'auth-continue',
      success: true,
      metadata: { mode: 'trial', workspace_name: workspaceName },
    }).catch(() => null);

    redirectToLogin.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
  } catch (err) {
    console.error('[auth-continue] failed:', err);
    redirectToLogin.searchParams.set('error', 'unexpected');
    return NextResponse.redirect(redirectToLogin, { status: 302, headers: emailRateLimitHeaders });
  }
}
