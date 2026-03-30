import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

async function requireActiveProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const, orgId: String(profile.org_id) };
}

export async function GET() {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('approvals')
      .select('id, action, status, approved_at, used_at, expires_at, metadata')
      .eq('org_id', access.orgId)
      .order('approved_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
