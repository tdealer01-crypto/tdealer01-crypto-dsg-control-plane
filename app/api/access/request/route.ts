import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { logSignInEvent } from '../../../../lib/auth/sign-in-events';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function extractDomain(email: string) {
  return email.split('@')[1] || '';
}


async function resolveRequesterOrgId() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return null;

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', auth.user.id)
      .eq('is_active', true)
      .maybeSingle();

    return profile?.org_id || null;
  } catch {
    return null;
  }
}

async function resolveOrgIdByDomain(domain: string) {
  if (!domain) return null;
  try {
    const admin = getSupabaseAdmin();
    const usersTable = admin.from('users') as any;

    if (typeof usersTable.select !== 'function') return null;

    const { data, error } = await usersTable
      .select('org_id')
      .eq('is_active', true)
      .ilike('email', `%@${domain}`)
      .not('org_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data?.org_id || null;
  } catch {
    return null;
  }
}

async function parseBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, unknown>;
  }

  const form = await request.formData();
  return {
    email: form.get('email'),
    workspace_name: form.get('workspace_name'),
    full_name: form.get('full_name'),
    reason: form.get('reason'),
  } as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const rateLimit = applyRateLimit({
    key: getRateLimitKey(request, 'access-request'),
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit, 10) }
    );
  }

  const body = await parseBody(request);
  const email = normalizeEmail(body.email);
  const domain = extractDomain(email);
  const workspaceName = String(body.workspace_name || '').trim() || null;
  const fullName = String(body.full_name || '').trim() || null;
  const reason = String(body.reason || '').trim() || null;
  const explicitOrgId = String(body.org_id || '').trim() || null;

  if (!email || !domain) {
    return NextResponse.json(
      { error: 'A valid email is required.' },
      { status: 400, headers: buildRateLimitHeaders(rateLimit, 10) }
    );
  }

  const admin = getSupabaseAdmin();
  const orgId = explicitOrgId || (await resolveRequesterOrgId()) || (await resolveOrgIdByDomain(domain));
  const { data: existingPending } = await admin
    .from('access_requests')
    .select('id, created_at')
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const createdAt = existingPending?.created_at ? new Date(existingPending.created_at).getTime() : 0;
  const isRecent = Date.now() - createdAt < 24 * 60 * 60 * 1000;

  if (!existingPending?.id || !isRecent) {
    await admin.from('access_requests').insert({
      org_id: orgId,
      email,
      email_domain: domain,
      workspace_name: workspaceName,
      full_name: fullName,
      requested_org_hint: workspaceName,
      status: 'pending',
      review_note: reason,
    });
  }

  await logSignInEvent({
    email,
    eventType: 'request_access_submitted',
    source: 'request-access',
    success: true,
    metadata: { workspace_name: workspaceName },
  });

  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
  if (acceptsHtml) {
    const redirectTo = new URL('/request-access', request.url);
    redirectTo.searchParams.set('email', email);
    if (workspaceName) redirectTo.searchParams.set('workspace_name', workspaceName);
    redirectTo.searchParams.set('success', '1');
    return NextResponse.redirect(redirectTo, {
      status: 302,
      headers: buildRateLimitHeaders(rateLimit, 10),
    });
  }

  return NextResponse.json({ ok: true }, { headers: buildRateLimitHeaders(rateLimit, 10) });
}
