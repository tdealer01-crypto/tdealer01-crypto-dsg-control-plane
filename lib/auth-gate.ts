import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export async function requireProvisionedOperator(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    redirect('/login?error=not-provisioned');
  }

  return {
    userId: user.id,
    orgId: String(profile.org_id),
  };
}
