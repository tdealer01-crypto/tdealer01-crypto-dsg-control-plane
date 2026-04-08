import { createClient } from '../supabase/server';

export type ActiveProfileAccess =
  | { ok: true; orgId: string; status?: never; error?: never }
  | { ok: false; status: 401 | 403; error: 'Unauthorized' | 'Forbidden' };

export async function requireActiveProfile(): Promise<ActiveProfileAccess> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, orgId: String(profile.org_id) };
}
