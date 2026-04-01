import { getSupabaseAdmin } from '../supabase-server';

const STARTER_STEPS = [
  'Create or inspect your first agent',
  'Review a starter policy',
  'Run your first controlled execution',
  'Inspect evidence or audit output',
  'Review quota/billing basics',
];

export async function bootstrapOrgStarterState(orgId: string, opts?: { initiatedByUserId?: string | null }) {
  const admin = getSupabaseAdmin();
  const existing = await admin.from('org_onboarding_states').select('id, bootstrap_status').eq('org_id', orgId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.bootstrap_status === 'completed') return { status: 'completed' as const, created: false };

  const agents = await admin.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  if (agents.error) throw agents.error;

  const now = new Date().toISOString();
  const checklist = {
    steps: STARTER_STEPS,
    next_action: (agents.count ?? 0) > 0 ? 'Open quickstart and run your first controlled execution' : 'Set up starter workspace',
    initiated_by_user_id: opts?.initiatedByUserId ?? null,
  };

  if (existing.data?.id) {
    await admin.from('org_onboarding_states').update({ checklist, bootstrap_status: 'completed', bootstrapped_at: now, updated_at: now }).eq('id', existing.data.id);
  } else {
    await admin.from('org_onboarding_states').insert({ org_id: orgId, checklist, bootstrap_status: 'completed', bootstrapped_at: now, created_at: now, updated_at: now });
  }

  return { status: 'completed' as const, created: !existing.data?.id };
}
