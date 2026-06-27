import { createClient } from '../supabase/server';
import { getSupabaseAdmin } from '../supabase-server';

export class OrgAuthError extends Error {
  status: number;

  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'OrgAuthError';
    this.status = status;
  }
}

export async function getOrg() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new OrgAuthError('Unauthorized', 401);
  }

  const admin = getSupabaseAdmin() as any;

  const profile = await admin
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profile.error) {
    throw profile.error;
  }

  if (!profile.data?.org_id || profile.data.is_active !== true) {
    throw new OrgAuthError('Unauthorized', 401);
  }

  return String(profile.data.org_id);
}
