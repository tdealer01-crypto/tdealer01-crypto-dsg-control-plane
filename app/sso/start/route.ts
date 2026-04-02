import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getOrgSsoConfig } from '../../../lib/auth/sso-config';

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
  const orgSlug = String(url.searchParams.get('org') || '').trim();
  const next = safeNext(url.searchParams.get('next'));
  const returnTo = safeNext(url.searchParams.get('return_to'));

  const redirectUnavailable = new URL('/login', request.url);
  redirectUnavailable.searchParams.set('error', 'sso-unavailable');
  redirectUnavailable.searchParams.set('next', next);
  if (orgSlug) redirectUnavailable.searchParams.set('org', orgSlug);

  const admin = getSupabaseAdmin();

  let org: { id: string; slug: string } | null = null;
  if (orgSlug) {
    const found = await admin.from('organizations').select('id, slug').eq('slug', orgSlug).maybeSingle();
    if (found.error || !found.data) return NextResponse.redirect(redirectUnavailable, { status: 302 });
    org = found.data;
  } else if (email) {
    const userOrg = await admin.from('users').select('org_id').eq('email', email).eq('is_active', true).not('org_id', 'is', null).limit(1);
    if (!userOrg.error && Array.isArray(userOrg.data) && userOrg.data.length === 1) {
      const found = await admin.from('organizations').select('id, slug').eq('id', userOrg.data[0].org_id).maybeSingle();
      if (found.data) org = found.data;
    }
  }

  if (!org?.id) return NextResponse.redirect(redirectUnavailable, { status: 302 });

  const config = await getOrgSsoConfig(org.id);
  if (!config?.is_enabled) return NextResponse.redirect(redirectUnavailable, { status: 302 });

  if (config.provider === 'workos' && process.env.WORKOS_CLIENT_ID) {
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/auth/confirm`;

    const workos = new URL('https://api.workos.com/sso/authorize');
    workos.searchParams.set('client_id', process.env.WORKOS_CLIENT_ID);
    workos.searchParams.set('redirect_uri', redirectUri);
    if (config.connection_id) workos.searchParams.set('connection', config.connection_id);
    workos.searchParams.set('state', Buffer.from(JSON.stringify({ org: org.slug, next, return_to: returnTo })).toString('base64url'));
    return NextResponse.redirect(workos, { status: 302 });
  }

  return NextResponse.redirect(redirectUnavailable, { status: 302 });
}
