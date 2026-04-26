import { getSupabaseAdmin } from '../supabase-server';

export async function hasReleaseGateProAccess(email: string | null) {
  if (!email) {
    return false;
  }

  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from('release_gate_entitlements')
    .select('id')
    .eq('email', email)
    .in('status', ['active', 'trialing'])
    .limit(1);

  if (error) {
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}
