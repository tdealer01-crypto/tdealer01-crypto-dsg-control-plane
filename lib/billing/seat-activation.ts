import { getSupabaseAdmin } from '../supabase-server';

export async function getOrgBillingPolicy(orgId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('org_billing_policies')
    .select('org_id, seat_activation_policy, trial_requires_card, managed_user_billing_mode')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data ?? { org_id: orgId, seat_activation_policy: 'on_first_login', trial_requires_card: false, managed_user_billing_mode: 'bill_on_activation' };
}

export function isBillableRole(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'operator' || role === 'viewer';
}

export async function ensureSeatActivatedForUser(input: { orgId: string; email: string; userId?: string | null; role?: string | null; source?: string }) {
  if (!isBillableRole(input.role)) return { created: false, reason: 'non-billable-role' as const };

  const admin = getSupabaseAdmin();
  const existing = await admin.from('seat_activations').select('id').eq('org_id', input.orgId).eq('email', input.email.toLowerCase()).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return { created: false, reason: 'already-activated' as const };

  const now = new Date().toISOString();
  const { error } = await admin.from('seat_activations').insert({
    org_id: input.orgId,
    email: input.email.toLowerCase(),
    user_id: input.userId ?? null,
    role: input.role ?? null,
    source: input.source ?? 'auth_confirm',
    activated_at: now,
    billable_from: now,
  });
  if (error) throw error;
  return { created: true, reason: 'activated' as const };
}
