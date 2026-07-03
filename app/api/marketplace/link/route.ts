/**
 * GET  /api/marketplace/link - View the org's GitHub Marketplace account link
 * POST /api/marketplace/link - Create/update the link (org owner/admin only)
 *
 * Linking a GitHub account lets the marketplace webhook resolve purchase
 * events to this org and sync billing_subscriptions + organizations.plan.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { readJsonBody } from '@/lib/security/request-json';
import { handleApiError } from '@/lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

type LinkBody = {
  github_account_id?: number;
  github_login?: string;
};

type Profile = {
  org_id: string;
  role: string;
  is_active: boolean;
};

async function resolveProfile(): Promise<{ profile: Profile | null; status: number; error: string | null }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { profile: null, status: 401, error: 'Unauthorized' };
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('users')
    .select('org_id, role, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.is_active || !profile?.org_id) {
    return { profile: null, status: 403, error: 'Forbidden' };
  }

  return { profile: profile as Profile, status: 200, error: null };
}

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'marketplace-link'),
      limit: 30,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 30) }
      );
    }

    const { profile, status, error } = await resolveProfile();
    if (!profile) {
      return NextResponse.json({ error }, { status });
    }

    const admin = getSupabaseAdmin() as any;
    const { data: link } = await admin
      .from('marketplace_account_links')
      .select('github_account_id, github_login, created_at, updated_at')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    return NextResponse.json({ link: link || null });
  } catch (error) {
    return handleApiError('marketplace-link', error);
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'marketplace-link'),
      limit: 10,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 10) }
      );
    }

    const { profile, status, error } = await resolveProfile();
    if (!profile) {
      return NextResponse.json({ error }, { status });
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only org owners/admins can manage the marketplace link' },
        { status: 403 }
      );
    }

    const body = await readJsonBody<LinkBody>(request, { maxBytes: 4_000 });
    if (!body.ok || !body.value) {
      return NextResponse.json({ error: body.error || 'invalid_body' }, { status: body.status });
    }

    const githubAccountId = Number(body.value.github_account_id);
    const githubLogin = String(body.value.github_login || '').trim();

    if (!Number.isSafeInteger(githubAccountId) || githubAccountId <= 0) {
      return NextResponse.json({ error: 'github_account_id must be a positive integer' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9-]{1,39}$/.test(githubLogin)) {
      return NextResponse.json({ error: 'github_login must be a valid GitHub username' }, { status: 400 });
    }

    const admin = getSupabaseAdmin() as any;
    const { error: upsertError } = await admin
      .from('marketplace_account_links')
      .upsert(
        {
          github_account_id: githubAccountId,
          github_login: githubLogin,
          org_id: profile.org_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'github_account_id' }
      );

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to save link' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      link: { github_account_id: githubAccountId, github_login: githubLogin },
    });
  } catch (error) {
    return handleApiError('marketplace-link', error);
  }
}
