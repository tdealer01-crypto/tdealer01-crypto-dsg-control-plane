import { createClient } from '../supabase/server';
import { getSupabaseAdmin } from '../supabase-server';

export async function getOrg() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new Error('unauthorized');
  }

  const admin = getSupabaseAdmin() as any;

  const profile = await admin
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profile.data?.org_id && profile.data.is_active !== false) {
    return String(profile.data.org_id);
  }

  const orgMembership = await admin
    .from('org_members')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (orgMembership.data?.org_id) {
    return String(orgMembership.data.org_id);
  }

  throw new Error(profile.error?.message || orgMembership.error?.message || 'unauthorized');
}
