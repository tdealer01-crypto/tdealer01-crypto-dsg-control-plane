import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { linkGithubMarketplaceAccount } from '../../../../../lib/marketplace/account-link';
import { logSignInEvent } from '../../../../../lib/auth/sign-in-events';

export const dynamic = 'force-dynamic';

type GithubUser = {
  id: number;
  login: string;
  name: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function getAppOrigin(request: NextRequest) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {}
  }
  return request.nextUrl.origin;
}

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL('/github-app', getAppOrigin(request));
  url.searchParams.set('error', code);
  return NextResponse.redirect(url, { status: 302 });
}

async function exchangeCodeForToken(code: string): Promise<string | null> {
  const clientId = process.env.GITHUB_MARKETPLACE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_MARKETPLACE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { access_token?: string; error?: string };
  return data.access_token ?? null;
}

async function fetchGithubUser(token: string): Promise<GithubUser | null> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  return res.json() as Promise<GithubUser>;
}

async function fetchVerifiedPrimaryEmail(token: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const emails = await res.json() as GithubEmail[];
  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email ?? emails.find((e) => e.verified)?.email ?? null;
}

/**
 * GitHub App OAuth callback for the DSG Control Plane Marketplace listing
 * (separate from app/api/github-app/callback, which is the *other*,
 * long-lived governance-gate GitHub App's one-time manifest-creation
 * conversion endpoint — do not conflate the two).
 *
 * Flow: exchange code -> access token -> verified GitHub email ->
 * link an existing org, or start passwordless signup for a new one.
 * Reuses the same magic-link + /auth/confirm bootstrap path as the
 * normal trial signup form, so a new organization gets identical
 * seat/billing/onboarding setup either way.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const installationIdParam = searchParams.get('installation_id');
  const installationId = installationIdParam ? Number(installationIdParam) : null;

  if (!code) {
    return errorRedirect(request, 'missing_code');
  }

  const accessToken = await exchangeCodeForToken(code);
  if (!accessToken) {
    return errorRedirect(request, 'token_exchange_failed');
  }

  const githubUser = await fetchGithubUser(accessToken);
  if (!githubUser) {
    return errorRedirect(request, 'github_user_lookup_failed');
  }

  const email = await fetchVerifiedPrimaryEmail(accessToken);
  if (!email) {
    return errorRedirect(request, 'no_verified_email');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = getSupabaseAdmin();

  const { data: existingLink } = await (admin as any)
    .from('marketplace_account_links')
    .select('org_id')
    .eq('github_account_id', githubUser.id)
    .maybeSingle();

  if (existingLink?.org_id) {
    const dashboard = new URL('/dashboard', getAppOrigin(request));
    return NextResponse.redirect(dashboard, { status: 302 });
  }

  const { data: existingUser } = await (admin as any)
    .from('users')
    .select('id, org_id, is_active')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .not('org_id', 'is', null)
    .maybeSingle();

  if (existingUser?.org_id) {
    await linkGithubMarketplaceAccount({
      orgId: String(existingUser.org_id),
      githubAccountId: githubUser.id,
      githubLogin: githubUser.login,
      installationId,
    }).catch((err) => console.error('[github-app/marketplace/callback] link failed:', err));

    const dashboard = new URL('/dashboard', getAppOrigin(request));
    return NextResponse.redirect(dashboard, { status: 302 });
  }

  // No existing DSG account for this email — start passwordless signup,
  // carrying the GitHub identity through trial_signups so /auth/confirm
  // can finish linking once the org is created.
  const workspaceName = githubUser.name || githubUser.login;

  const { data: existingPending } = await (admin as any)
    .from('trial_signups')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const pendingPayload = {
    email: normalizedEmail,
    workspace_name: workspaceName,
    full_name: githubUser.name || null,
    github_account_id: githubUser.id,
    github_login: githubUser.login,
    installation_id: installationId,
  };

  if (existingPending?.id) {
    await (admin as any).from('trial_signups').update(pendingPayload).eq('id', existingPending.id);
  } else {
    await (admin as any).from('trial_signups').insert({ ...pendingPayload, status: 'pending' });
  }

  const confirmUrl = new URL('/auth/confirm', getAppOrigin(request));
  confirmUrl.searchParams.set('next', '/dashboard/welcome');
  confirmUrl.searchParams.set('signup', 'trial');

  const authClient = await createClient();
  const { error: otpError } = await authClient.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: confirmUrl.toString(), shouldCreateUser: true },
  });

  await logSignInEvent({
    email: normalizedEmail,
    orgId: null,
    authUserId: null,
    eventType: 'magic_link_requested',
    source: 'github-marketplace-oauth',
    success: !otpError,
    metadata: { github_login: githubUser.login, installation_id: installationId },
  }).catch(() => null);

  if (otpError) {
    return errorRedirect(request, 'signup_send_failed');
  }

  const checkEmail = new URL('/login', getAppOrigin(request));
  checkEmail.searchParams.set('message', 'check-email');
  return NextResponse.redirect(checkEmail, { status: 302 });
}
