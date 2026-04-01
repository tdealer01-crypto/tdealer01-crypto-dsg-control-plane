import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  const profile = await admin.from('users').select('org_id, is_active').eq('auth_user_id', user.id).maybeSingle();
  if (profile.error || !profile.data?.org_id || !profile.data.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = String(profile.data.org_id);
  const state = await admin
    .from('org_onboarding_states')
    .select('bootstrap_status, checklist, bootstrapped_at')
    .eq('org_id', orgId)
    .maybeSingle();

  const agents = await admin.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  const isEmpty = (agents.count ?? 0) === 0;

  return NextResponse.json({ org_id: orgId, onboarding: state.data ?? null, is_empty: isEmpty });
}
