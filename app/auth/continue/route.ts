import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getResend } from '../../../lib/resend';
import { resolveLoginContext } from '../../../lib/auth/login-context';
import { resolveAccessModeForEmail } from '../../../lib/auth/access-policy';
import { logSignInEvent } from '../../../lib/auth/sign-in-events';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '../../../lib/security/rate-limit';
import { getSafeNext } from '../../../lib/auth/safe-next';
import { validateAuthConfig } from '../../../lib/auth/preflight';
import { logSecurityEvent, toSafeErrorInfo } from '../../../lib/security/safe-log';

const AUTH_CONTINUE_RATE_LIMIT = 8;
const AUTH_CONTINUE_RATE_WINDOW_MS = 60 * 1000;
const AUTH_CONTINUE_EMAIL_RATE_LIMIT = 3;
const AUTH_CONTINUE_EMAIL_RATE_WINDOW_MS = 60 * 1000;

type ContinueForm = {
  email: string;
  workspaceName: string;
  fullName: string;
  next: string;
  orgSlug: string;
};

type RedirectHeaders = Record<string, string>;

function buildRetryAfterHeader(resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return String(retryAfterSeconds);
}

function buildRateLimitedResponse(headers: RedirectHeaders, resetAt: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        ...headers,
        'Retry-After': buildRetryAfterHeader(resetAt),
      },
    }
  );
}

function parseContinueForm(request: NextRequest, formData: FormData): ContinueForm {
  return {
    email: String(formData.get('email') || '').trim().toLowerCase(),
    workspaceName: String(formData.get('workspace_name') || '').trim(),
    fullName: String(formData.get('full_name') || '').trim(),
    next: getSafeNext(String(formData.get('next') || '')),
    orgSlug: String(formData.get('org') || '').trim(),
  };
}

function buildLoginRedirect(request: NextRequest, next: string, orgSlug?: string) {
  const redirectToLogin = new URL('/login', request.url);
  redirectToLogin.searchParams.set('next', next);

  if (orgSlug) {
    redirectToLogin.searchParams.set('org', orgSlug);
  }

  return redirectToLogin;
}

function redirectWithHeaders(
  location: URL,
  headers: RedirectHeaders,
  status = 302
) {
  return NextResponse.redirect(location, { status, headers });
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

async function sendMagicLink(
  authClient: Awaited<ReturnType<typeof createClient>>,
  email: string,
  redirectUrl: string
): Promise<{ error: { message: string } | null }> {
  const resend = getResend();

  const { error } = await authClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error };
  }

  if (resend.configured) {
    logSecurityEvent('info', 'auth_continue_resend_configured');
  }

  return { error: null };
}

async function applyIpRateLimitOrRespond(request: NextRequest) {
  const requestPathname =
    request.nextUrl?.pathname ?? new URL(request.url).pathname;
  const rateLimitKeyBase = `${getRateLimitKey(request, 'auth-continue')}:${requestPathname}`;

  const ipRateLimit = await applyRateLimit({
    key: rateLimitKeyBase,
    limit: AUTH_CONTINUE_RATE_LIMIT,
    windowMs: AUTH_CONTINUE_RATE_WINDOW_MS,
  });

  const ipRateLimitHeaders = buildRateLimitHeaders(
    ipRateLimit,
    AUTH_CONTINUE_RATE_LIMIT
  );

  if (!ipRateLimit.allowed) {
    return {
      ok: false as const,
      response: buildRateLimitedResponse(ipRateLimitHeaders, ipRateLimit.resetAt),
    };
  }

  return {
    ok: true as const,
    rateLimitKeyBase,
    headers: ipRateLimitHeaders,
  };
}

async function applyEmailRateLimitOrRespond(
  email: string,
  rateLimitKeyBase: string
) {
  const emailHash = createHash('sha256').update(email).digest('hex');
  const emailRateLimitKey = `${rateLimitKeyBase}:${emailHash}`;

  const emailRateLimit = await applyRateLimit({
    key: emailRateLimitKey,
    limit: AUTH_CONTINUE_EMAIL_RATE_LIMIT,
    windowMs: AUTH_CONTINUE_EMAIL_RATE_WINDOW_MS,
  });

  const emailRateLimitHeaders = buildRateLimitHeaders(
    emailRateLimit,
    AUTH_CONTINUE_EMAIL_RATE_LIMIT
  );

  if (!emailRateLimit.allowed) {
    return {
      ok: false as const,
      response: buildRateLimitedResponse(
        emailRateLimitHeaders,
        emailRateLimit.resetAt
      ),
    };
  }

  return {
    ok: true as const,
    headers: emailRateLimitHeaders,
  };
}

async function logMagicLinkRequest(args: {
  email: string;
  success: boolean;
  metadata: Record<string, unknown>;
  orgId?: string | null;
  authUserId?: string | null;
}) {
  await logSignInEvent({
    email: args.email,
    orgId: args.orgId || null,
    authUserId: args.authUserId || null,
    eventType: 'magic_link_requested',
    source: 'auth-continue',
    success: args.success,
    metadata: args.metadata,
  }).catch(() => null);
}

async function upsertPendingTrialSignup(args: {
  email: string;
  workspaceName: string;
  fullName: string;
}) {
  const admin = getSupabaseAdmin();

  const { data: existingPending, error: existingPendingError } = await admin
    .from('trial_signups')
    .select('id')
    .eq('email', args.email)
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
        workspace_name: args.workspaceName,
        full_name: args.fullName || null,
      })
      .eq('id', existingPending.id);

    if (updateErr) {
      throw updateErr;
    }

    return;
  }

  const { error: insertErr } = await admin.from('trial_signups').insert({
    email: args.email,
    workspace_name: args.workspaceName,
    full_name: args.fullName || null,
    status: 'pending',
  });

  if (insertErr) {
    throw insertErr;
  }
}

async function handleExistingOperatorLogin(args: {
  request: NextRequest;
  authClient: Awaited<ReturnType<typeof createClient>>;
  email: string;
  next: string;
  loginRedirect: URL;
  headers: RedirectHeaders;
  operatorRow: {
    org_id: string | null;
    auth_user_id: string | null;
  };
}) {
  const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(args.request));
  confirmUrl.searchParams.set('next', args.next);

  const { error } = await sendMagicLink(
    args.authClient,
    args.email,
    confirmUrl.toString()
  );

  if (error) {
    logSecurityEvent(
      'error',
      'auth_continue_operator_send_failed',
      toSafeErrorInfo(error)
    );

    await logMagicLinkRequest({
      email: args.email,
      orgId: args.operatorRow.org_id,
      authUserId: args.operatorRow.auth_user_id,
      success: false,
      metadata: { mode: 'operator', next: args.next },
    });

    args.loginRedirect.searchParams.set('error', 'send-failed');
    return redirectWithHeaders(args.loginRedirect, args.headers);
  }

  await logMagicLinkRequest({
    email: args.email,
    orgId: args.operatorRow.org_id,
    authUserId: args.operatorRow.auth_user_id,
    success: true,
    metadata: { mode: 'operator', next: args.next },
  });

  args.loginRedirect.searchParams.set('message', 'check-email');
  return redirectWithHeaders(args.loginRedirect, args.headers);
}

async function handleTrialSignup(args: {
  request: NextRequest;
  authClient: Awaited<ReturnType<typeof createClient>>;
  email: string;
  workspaceName: string;
  fullName: string;
  loginRedirect: URL;
  headers: RedirectHeaders;
}) {
  if (!args.workspaceName) {
    args.loginRedirect.searchParams.set('error', 'missing-workspace');
    return redirectWithHeaders(args.loginRedirect, args.headers);
  }

  await upsertPendingTrialSignup({
    email: args.email,
    workspaceName: args.workspaceName,
    fullName: args.fullName,
  });

  const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin(args.request));
  confirmUrl.searchParams.set('next', '/quickstart');
  confirmUrl.searchParams.set('signup', 'trial');

  const { error } = await sendMagicLink(
    args.authClient,
    args.email,
    confirmUrl.toString()
  );

  if (error) {
    logSecurityEvent(
      'error',
      'auth_continue_trial_send_failed',
      toSafeErrorInfo(error)
    );

    await logMagicLinkRequest({
      email: args.email,
      success: false,
      metadata: { mode: 'trial', workspace_name: args.workspaceName },
    });

    args.loginRedirect.searchParams.set('error', 'signup-failed');
    return redirectWithHeaders(args.loginRedirect, args.headers);
  }

  await logMagicLinkRequest({
    email: args.email,
    success: true,
    metadata: { mode: 'trial', workspace_name: args.workspaceName },
  });

  args.loginRedirect.searchParams.set('message', 'check-email');
  return redirectWithHeaders(args.loginRedirect, args.headers);
}

export async function POST(request: NextRequest) {
  const ipRateLimit = await applyIpRateLimitOrRespond(request);
  if (!ipRateLimit.ok) {
    return ipRateLimit.response;
  }

  const formData = await request.formData();
  const { email, workspaceName, fullName, next, orgSlug } = parseContinueForm(
    request,
    formData
  );

  const redirectToLogin = buildLoginRedirect(request, next, orgSlug);

  if (!email) {
    redirectToLogin.searchParams.set('error', 'missing-email');
    return redirectWithHeaders(redirectToLogin, ipRateLimit.headers);
  }

  const emailRateLimit = await applyEmailRateLimitOrRespond(
    email,
    ipRateLimit.rateLimitKeyBase
  );
  if (!emailRateLimit.ok) {
    return emailRateLimit.response;
  }

  const preflight = validateAuthConfig();
  if (preflight.warnings.length > 0) {
    logSecurityEvent('warn', 'auth_continue_preflight_warnings', {
      warnings: preflight.warnings,
    });
  }

  if (!preflight.ok) {
    const firstError = preflight.errors[0];
    logSecurityEvent('error', 'auth_continue_preflight_failed', {
      errors: preflight.errors.map((item) => item.code),
    });
    redirectToLogin.searchParams.set(
      'error',
      firstError ? firstError.code : 'unexpected'
    );
    return redirectWithHeaders(redirectToLogin, emailRateLimit.headers);
  }

  try {
    const authClient = await createClient();
    const admin = getSupabaseAdmin();

    const loginContext = await resolveLoginContext({
      email,
      orgSlug: orgSlug || undefined,
    });

    if (loginContext.org?.slug) {
      redirectToLogin.searchParams.set('org', loginContext.org.slug);
    }

    if (loginContext.mode === 'sso-only') {
      redirectToLogin.searchParams.set('error', 'sso-required');
      return redirectWithHeaders(redirectToLogin, emailRateLimit.headers);
    }

    if (loginContext.mode === 'approval-required') {
      const requestAccess = new URL('/request-access', request.url);
      requestAccess.searchParams.set('email', email);
      if (workspaceName) {
        requestAccess.searchParams.set('workspace_name', workspaceName);
      }
      return redirectWithHeaders(requestAccess, emailRateLimit.headers);
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
      return handleExistingOperatorLogin({
        request,
        authClient,
        email,
        next,
        loginRedirect: redirectToLogin,
        headers: emailRateLimit.headers,
        operatorRow: {
          org_id: operatorRow.org_id,
          auth_user_id: operatorRow.auth_user_id,
        },
      });
    }

    if (orgSlug && loginContext.mode === 'sso-first') {
      redirectToLogin.searchParams.set('error', 'org-self-serve-disabled');
      return redirectWithHeaders(redirectToLogin, emailRateLimit.headers);
    }

    const accessMode = resolveAccessModeForEmail(email);

    if (accessMode === 'invite_only' || accessMode === 'scim_managed') {
      redirectToLogin.searchParams.set('error', 'not-allowed');
      return redirectWithHeaders(redirectToLogin, emailRateLimit.headers);
    }

    if (accessMode === 'approved_domains_require_approval') {
      const requestAccess = new URL('/request-access', request.url);
      requestAccess.searchParams.set('email', email);
      if (workspaceName) {
        requestAccess.searchParams.set('workspace_name', workspaceName);
      }
      return redirectWithHeaders(requestAccess, emailRateLimit.headers);
    }

    if (accessMode === 'sso_required') {
      redirectToLogin.searchParams.set('error', 'sso-required');
      return redirectWithHeaders(redirectToLogin, emailRateLimit.headers);
    }

    return handleTrialSignup({
      request,
      authClient,
      email,
      workspaceName,
      fullName,
      loginRedirect: redirectToLogin,
      headers: emailRateLimit.headers,
    });
  } catch (error) {
    logSecurityEvent('error', 'auth_continue_failed', toSafeErrorInfo(error));
    redirectToLogin.searchParams.set('error', 'unexpected');
    return redirectWithHeaders(redirectToLogin, emailRateLimit.headers);
  }
}
